import { supabase } from './supabase';
import { putFile, removeFile, removeFolder, signedUrl } from './files';
import { blobDelete, blobGet, blobPut, emitLocal, failedAdd, isNetworkError, isOffline, newId, outboxAdd, outboxAll, outboxCount, outboxDelete, refreshSync, setSyncing } from './offline';

const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

const save = async (table, row) => {
  const { id, ...rest } = row;
  const q = id ? supabase.from(table).update(rest).eq('id', id) : supabase.from(table).insert(rest);
  return must(await q.select().single());
};
const remove = async (table, id) => {
  must(await supabase.from(table).delete().eq('id', id));
};

// ----- alterações que precisam funcionar sem internet (fluxo do técnico)
// Cada alteração vira uma "op" simples. Com internet ela é enviada na hora; sem internet
// (ou se a rede cair no meio) fica na fila do aparelho e é enviada em ordem quando voltar.
const DUP = /duplicate key|already exists/i;

async function execOp(op, blob) {
  if (op.t === 'patch') must(await supabase.from(op.table).update(op.patch).eq('id', op.id));
  else if (op.t === 'insert') {
    const { error } = await supabase.from(op.table).insert(op.row);
    if (error && !DUP.test(error.message)) throw new Error(error.message);
  } else if (op.t === 'delete') must(await supabase.from(op.table).delete().eq('id', op.id));
  else if (op.t === 'upload') {
    const file = blob || (await blobGet(op.path));
    if (file) await putFile(op.bucket, op.path, file, op.contentType);
    await blobDelete(op.path);
    if (op.oldPath) await removeFile(op.bucket, op.oldPath).catch(() => {});
  }
}

let flushing = null;
export function flush() {
  if (flushing) return flushing;
  if (isOffline()) return Promise.resolve();
  flushing = (async () => {
    setSyncing(true);
    try {
      for (const rec of await outboxAll()) {
        try {
          await execOp(rec.op);
          await outboxDelete(rec.seq);
        } catch (e) {
          if (isNetworkError(e)) break;
          // o servidor recusou (ex.: regra de negócio): guarda o motivo para avisar a pessoa
          await outboxDelete(rec.seq);
          await failedAdd({ op: rec.op, error: e.message, at: Date.now() });
        }
      }
    } finally {
      flushing = null;
      setSyncing(false);
      await refreshSync();
    }
  })();
  return flushing;
}

async function queue(op, blob) {
  if (blob) await blobPut(op.path, blob);
  await outboxAdd(op);
  if (op.t !== 'upload') emitLocal(op);
  await refreshSync();
  flush();
}

async function submit(op) {
  if (!isOffline() && (await outboxCount()) === 0) {
    try {
      await execOp(op);
      return;
    } catch (e) {
      if (!isNetworkError(e)) throw e;
    }
  }
  await queue(op);
}

export const CHECKLISTS = {
  'Manutenção preventiva': [
    'Limpeza de filtros e carenagem',
    'Higienização de serpentina e bandeja de dreno',
    'Verificação elétrica, terminais e corrente',
    'Teste de rendimento térmico e pressão de gás'
  ],
  'Limpeza / higienização': [
    'Limpeza de filtros e carenagem',
    'Higienização de serpentina',
    'Limpeza da bandeja e do dreno',
    'Teste de funcionamento'
  ],
  Instalação: ['Fixação das unidades', 'Tubulação, dreno e isolamento', 'Vácuo e carga de gás', 'Teste de funcionamento'],
  'Reparo / corretiva': ['Diagnóstico do defeito', 'Correção realizada', 'Teste de funcionamento'],
  'Visita técnica / orçamento': ['Avaliação do equipamento', 'Registro de fotos e medidas']
};
export const checklistFor = (type) => CHECKLISTS[type] || CHECKLISTS['Manutenção preventiva'];

async function addItems(osId, equipmentIds, serviceType, startPos = 0) {
  if (!equipmentIds.length) return;
  const items = must(
    await supabase
      .from('work_order_items')
      .insert(equipmentIds.map((equipment_id, i) => ({ work_order_id: osId, equipment_id, position: startPos + i })))
      .select()
  );
  const rows = items.flatMap((it) =>
    checklistFor(serviceType).map((label, i) => ({ work_order_id: osId, item_id: it.id, label, position: i }))
  );
  must(await supabase.from('checklist_items').insert(rows));
}

export const api = {
  save,
  remove,

  // ----- O.S.
  async createOrder({ equipment_ids, ...row }) {
    const os = await save('work_orders', row);
    await addItems(os.id, equipment_ids, row.service_type);
    return os;
  },
  async updateOrder({ id, equipment_ids, ...row }, currentItems) {
    await save('work_orders', { id, ...row });
    const have = new Map(currentItems.map((i) => [i.equipment_id, i]));
    const wanted = new Set(equipment_ids);
    const toRemove = currentItems.filter((i) => !wanted.has(i.equipment_id) && i.status === 'pendente');
    for (const it of toRemove) await remove('work_order_items', it.id);
    await addItems(id, equipment_ids.filter((e) => !have.has(e)), row.service_type, currentItems.length);
  },
  async deleteOrder(id) {
    // apaga também as fotos e assinatura, para não acumular arquivos órfãos
    for (const bucket of ['os-photos', 'signatures']) await removeFolder(bucket, id).catch(() => {});
    await remove('work_orders', id);
  },
  patchOrder: (id, patch) => submit({ t: 'patch', table: 'work_orders', id, patch }),
  async setOrderStatus(os, status) {
    const now = new Date().toISOString();
    const patch = { status };
    if (status === 'em_rota' && !os.started_travel_at) patch.started_travel_at = now;
    if (status === 'no_local' && !os.arrived_at) patch.arrived_at = now;
    if (status === 'finalizada') patch.completed_at = now;
    return api.patchOrder(os.id, patch);
  },
  async addEquipmentToOrder(os, equipmentId) {
    await addItems(os.id, [equipmentId], os.service_type, os.items.length);
  },

  // ----- itens (um por equipamento)
  patchItem: (id, patch) => submit({ t: 'patch', table: 'work_order_items', id, patch }),
  removeItem: (id) => remove('work_order_items', id),

  setChecklistStatus: (id, status) => submit({ t: 'patch', table: 'checklist_items', id, patch: { status } }),
  addChecklistItem: (osId, itemId, label, position) =>
    submit({ t: 'insert', table: 'checklist_items', row: { id: newId(), work_order_id: osId, item_id: itemId, label, position, status: 'pending' } }),
  removeChecklistItem: (id) => submit({ t: 'delete', table: 'checklist_items', id }),

  addMaterial: (osId, itemId, m) => submit({ t: 'insert', table: 'materials_used', row: { id: newId(), work_order_id: osId, item_id: itemId, ...m } }),
  removeMaterial: (id) => submit({ t: 'delete', table: 'materials_used', id }),

  async uploadFile(bucket, osId, name, blob, contentType, oldPath) {
    const ext = name.split('.').pop();
    const base = name.replace(/\.[^.]+$/, '');
    const path = `${osId}/${base}-${Date.now()}.${ext}`;
    const op = { t: 'upload', bucket, path, contentType, oldPath };
    if (!isOffline() && (await outboxCount()) === 0) {
      try {
        await execOp(op, blob);
        return path;
      } catch (e) {
        if (!isNetworkError(e)) throw e;
      }
    }
    await queue(op, blob); // sem internet: a foto fica no aparelho e sobe depois
    return path;
  },
  async createSignedUrl(bucket, path) {
    return signedUrl(bucket, path);
  },

  // atendimento avulso a partir de um equipamento (leitura de QR)
  startService: async (equipmentId, serviceType) =>
    must(await supabase.rpc('start_service', { p_equipment_id: equipmentId, p_service_type: serviceType })),
  findEquipment: async (key) => must(await supabase.rpc('find_equipment', { p_key: key })),

  // ----- empresa, perfil, equipe
  updateSettings: async (patch) => {
    must(await supabase.from('company_settings').update(patch).eq('id', 1));
  },
  async uploadLogo(blob, oldPath) {
    const path = `logo-${Date.now()}.png`;
    await putFile('branding', path, blob, 'image/png');
    must(await supabase.from('company_settings').update({ logo_path: path }).eq('id', 1));
    if (oldPath) await removeFile('branding', oldPath).catch(() => {});
    return path;
  },
  async removeLogo(oldPath) {
    must(await supabase.from('company_settings').update({ logo_path: null }).eq('id', 1));
    if (oldPath) await removeFile('branding', oldPath).catch(() => {});
  },
  updateMyProfile: async (name, phone) => {
    must(await supabase.rpc('update_my_profile', { p_name: name, p_phone: phone }));
  },
  updateProfile: async (id, patch) => {
    must(await supabase.from('profiles').update(patch).eq('id', id));
  },
  changePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },
  async adminUsers(body) {
    const { data, error } = await supabase.functions.invoke('admin-users', { body });
    if (error) {
      let msg = error.message;
      try {
        const j = await error.context.json();
        if (j?.error) msg = j.error;
      } catch {}
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }
};
