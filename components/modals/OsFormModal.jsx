'use client';
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { SERVICE_TYPES, fmtTime, todayISO } from '@/lib/utils';
import { useApp } from '../AppContext';
import { CheckRow, ClientPicker, MaintChip, eqSpecs, eqTitle } from '../shared';
import { Btn, Field, Modal, SearchBox, inputCls } from '../ui';
import { norm } from '@/lib/utils';

export default function OsFormModal({ os, preset = {} }) {
  const { data, run, closeModal, openModal, toast } = useApp();
  const editing = !!os;
  const techs = data.profiles.filter((p) => p.active && (p.role === 'tech' || p.does_field));
  const [clientId, setClientId] = useState(os?.client_id || preset.client_id || '');
  const [sel, setSel] = useState(() => new Set(os ? os.items.map((i) => i.equipment_id) : preset.equipment_ids || []));
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    service_type: os?.service_type || preset.service_type || SERVICE_TYPES[0],
    scheduled_date: os?.scheduled_date || todayISO(),
    scheduled_time: os ? fmtTime(os.scheduled_time) : '09:00',
    tech_id: os?.tech_id || preset.tech_id || (techs.length === 1 ? techs[0].id : ''),
    notes: os?.notes || ''
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const locked = useMemo(() => new Set((os?.items || []).filter((i) => i.status !== 'pendente').map((i) => i.equipment_id)), [os]);
  const machines = data.equipment.filter((e) => e.client_id === clientId);
  const shown = machines.filter((e) => !q || norm(`${e.code} ${e.brand} ${e.model} ${e.location_tag}`).includes(norm(q)));

  const toggle = (id, on) => {
    const n = new Set(sel);
    on ? n.add(id) : n.delete(id);
    setSel(n);
  };
  const changeClient = (id) => {
    setClientId(id);
    setSel(new Set());
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!clientId) return toast('Escolha o cliente.', 'error');
    if (sel.size === 0) return toast('Marque ao menos um aparelho para atender.', 'error');
    setBusy(true);
    const row = { client_id: clientId, tech_id: f.tech_id || null, service_type: f.service_type, scheduled_date: f.scheduled_date, scheduled_time: f.scheduled_time || '09:00', notes: f.notes.trim(), equipment_ids: [...sel] };
    const r = await run(
      () => (editing ? api.updateOrder({ id: os.id, ...row }, os.items) : api.createOrder(row)),
      editing ? 'O.S. atualizada' : 'O.S. criada'
    );
    setBusy(false);
    if (r) closeModal();
  };

  return (
    <Modal
      title={editing ? 'Editar O.S.' : 'Nova O.S.'}
      subtitle="Uma O.S. é uma visita ao cliente e pode ter vários aparelhos."
      maxWidth="max-w-xl"
      onClose={closeModal}
      footer={
        <div className="flex gap-2 justify-end items-center">
          {clientId && <span className="text-sm text-slate-500 mr-auto">{sel.size} {sel.size === 1 ? 'aparelho' : 'aparelhos'}</span>}
          <Btn variant="secondary" onClick={closeModal}>Cancelar</Btn>
          <Btn loading={busy} onClick={submit}>{editing ? 'Salvar' : 'Criar O.S.'}</Btn>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Cliente *">
          <ClientPicker value={clientId} onChange={changeClient} onCreate={() => openModal('client', { onSaved: (c) => changeClient(c.id) })} />
        </Field>

        {clientId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Aparelhos a atender *</span>
              <div className="flex gap-3 text-sm font-semibold text-sky-700">
                <button type="button" onClick={() => setSel(new Set([...sel, ...machines.map((m) => m.id)]))}>Marcar todos</button>
                <button type="button" onClick={() => setSel(new Set([...locked]))}>Limpar</button>
              </div>
            </div>
            {machines.length > 6 && <SearchBox value={q} onChange={setQ} placeholder="Buscar por local, marca ou código" />}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
              {shown.map((m) => (
                <CheckRow key={m.id} checked={sel.has(m.id)} disabled={locked.has(m.id)} onChange={(v) => toggle(m.id, v)}>
                  <p className="text-sm font-semibold text-slate-900 truncate">{m.location_tag || m.code} <span className="font-normal text-slate-500">· {eqTitle(m)}</span></p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-slate-500">{m.code}{eqSpecs(m) ? ` · ${eqSpecs(m)}` : ''}</span>
                    <MaintChip eq={m} />
                  </div>
                </CheckRow>
              ))}
              {machines.length === 0 && <p className="text-sm text-slate-500 bg-slate-50 rounded-xl px-3.5 py-3">Este cliente ainda não tem aparelhos cadastrados.</p>}
              {machines.length > 0 && shown.length === 0 && <p className="text-sm text-slate-500 px-1">Nenhum aparelho encontrado.</p>}
            </div>
            <Btn variant="soft" size="sm" icon={Plus} onClick={() => openModal('equipment', { clientId, onSaved: (eq) => setSel((s) => new Set([...s, eq.id])) })}>
              Cadastrar aparelho neste cliente
            </Btn>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Serviço">
            <select value={f.service_type} onChange={set('service_type')} className={inputCls}>
              {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Técnico">
            <select value={f.tech_id} onChange={set('tech_id')} className={inputCls}>
              <option value="">A definir</option>
              {techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Data"><input type="date" required value={f.scheduled_date} onChange={set('scheduled_date')} className={inputCls} /></Field>
          <Field label="Horário"><input type="time" value={f.scheduled_time} onChange={set('scheduled_time')} className={inputCls} /></Field>
        </div>
        <Field label="Observações para o técnico" hint="Opcional. Ex.: portaria, horário combinado, defeito relatado.">
          <textarea rows={2} value={f.notes} onChange={set('notes')} className={inputCls} />
        </Field>
        {!f.tech_id && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Sem técnico definido, o chamado não aparece para ninguém na rua.</p>}
      </form>
    </Modal>
  );
}
