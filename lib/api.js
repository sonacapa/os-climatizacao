import { supabase } from './supabase';

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
  deleteOrder: (id) => remove('work_orders', id),
  patchOrder: async (id, patch) => {
    must(await supabase.from('work_orders').update(patch).eq('id', id));
  },
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
  patchItem: async (id, patch) => {
    must(await supabase.from('work_order_items').update(patch).eq('id', id));
  },
  removeItem: (id) => remove('work_order_items', id),

  setChecklistStatus: async (id, status) => {
    must(await supabase.from('checklist_items').update({ status }).eq('id', id));
  },
  addChecklistItem: async (osId, itemId, label, position) => {
    must(await supabase.from('checklist_items').insert({ work_order_id: osId, item_id: itemId, label, position }));
  },
  removeChecklistItem: (id) => remove('checklist_items', id),

  addMaterial: async (osId, itemId, m) => {
    must(await supabase.from('materials_used').insert({ work_order_id: osId, item_id: itemId, ...m }));
  },
  removeMaterial: (id) => remove('materials_used', id),

  async uploadFile(bucket, osId, name, blob, contentType, oldPath) {
    const ext = name.split('.').pop();
    const base = name.replace(/\.[^.]+$/, '');
    const path = `${osId}/${base}-${Date.now()}.${ext}`;
    must(await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: true }));
    if (oldPath) await supabase.storage.from(bucket).remove([oldPath]);
    return path;
  },
  async createSignedUrl(bucket, path) {
    if (!path) return null;
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    return data?.signedUrl || null;
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
    must(await supabase.storage.from('branding').upload(path, blob, { contentType: 'image/png', upsert: true }));
    must(await supabase.from('company_settings').update({ logo_path: path }).eq('id', 1));
    if (oldPath) await supabase.storage.from('branding').remove([oldPath]);
    return path;
  },
  async removeLogo(oldPath) {
    must(await supabase.from('company_settings').update({ logo_path: null }).eq('id', 1));
    if (oldPath) await supabase.storage.from('branding').remove([oldPath]);
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
