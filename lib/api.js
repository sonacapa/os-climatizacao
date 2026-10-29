import { supabase } from './supabase';

const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// Insere (sem id) ou atualiza (com id) e devolve a linha salva
const save = async (table, row) => {
  const { id, ...rest } = row;
  const q = id ? supabase.from(table).update(rest).eq('id', id) : supabase.from(table).insert(rest);
  return must(await q.select().single());
};

const remove = async (table, id) => must(await supabase.from(table).delete().eq('id', id));

export const DEFAULT_CHECKLIST = [
  'Limpeza de filtros e carenagem',
  'Higienização de serpentina e bandeja de dreno',
  'Verificação elétrica, terminais e corrente',
  'Teste de rendimento térmico e pressão de gás'
];

export const api = {
  save,
  remove,

  async createWorkOrder(row) {
    const os = await save('work_orders', row);
    must(
      await supabase.from('checklist_items').insert(
        DEFAULT_CHECKLIST.map((label, i) => ({ work_order_id: os.id, label, position: i }))
      )
    );
    return os;
  },

  patchOrder: async (id, patch) => must(await supabase.from('work_orders').update(patch).eq('id', id)),

  async setOrderStatus(os, status) {
    const now = new Date().toISOString();
    const patch = { status };
    if (status === 'em_rota' && !os.started_travel_at) patch.started_travel_at = now;
    if (status === 'no_local' && !os.arrived_at) patch.arrived_at = now;
    if ((status === 'concluida_rua' || status === 'finalizada') && !os.completed_at) patch.completed_at = now;
    return api.patchOrder(os.id, patch);
  },

  addChecklistItem: async (osId, label, position) =>
    must(await supabase.from('checklist_items').insert({ work_order_id: osId, label, position, status: 'ok' })),
  setChecklistStatus: async (id, status) =>
    must(await supabase.from('checklist_items').update({ status }).eq('id', id)),
  removeChecklistItem: (id) => remove('checklist_items', id),

  addMaterial: async (osId, m) =>
    must(await supabase.from('materials_used').insert({ work_order_id: osId, ...m })),
  removeMaterial: (id) => remove('materials_used', id),

  // Envia arquivo para a pasta da O.S. e apaga o anterior (se houver)
  async uploadFile(bucket, osId, name, blob, contentType, oldPath) {
    const ext = name.split('.').pop();
    const base = name.replace(/\.[^.]+$/, '');
    const path = `${osId}/${base}-${Date.now()}.${ext}`;
    must(await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: true }));
    if (oldPath) await supabase.storage.from(bucket).remove([oldPath]);
    return path;
  },

  updateSettings: async (patch) => must(await supabase.from('company_settings').update(patch).eq('id', 1)),
  updateProfile: async (id, patch) => must(await supabase.from('profiles').update(patch).eq('id', id))
};
