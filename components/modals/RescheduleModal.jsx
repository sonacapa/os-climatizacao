'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { fmtTime, osLabel } from '@/lib/utils';
import { useApp } from '../AppContext';
import { Btn, Field, Modal, inputCls } from '../ui';

// Troca data, horário e técnico de uma visita sem abrir o formulário completo
export default function RescheduleModal({ osId }) {
  const { data, closeModal, getClient, run } = useApp();
  const os = data.orders.find((o) => o.id === osId);
  const [f, setF] = useState({ date: os?.scheduled_date || '', time: fmtTime(os?.scheduled_time) || '09:00', tech: os?.tech_id || '' });
  const [busy, setBusy] = useState(false);
  if (!os) return null;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await run(() => api.patchOrder(os.id, { scheduled_date: f.date, scheduled_time: f.time || '09:00', tech_id: f.tech || null }), 'Visita reagendada');
    setBusy(false);
    if (r) closeModal();
  };

  return (
    <Modal title="Reagendar visita" subtitle={`${osLabel(os)} · ${getClient(os.client_id)?.name || ''}`} onClose={closeModal}
      footer={<Btn size="lg" className="w-full" loading={busy} onClick={save}>Salvar nova data</Btn>}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data"><input type="date" required value={f.date} onChange={set('date')} className={inputCls} /></Field>
          <Field label="Horário"><input type="time" value={f.time} onChange={set('time')} className={inputCls} /></Field>
        </div>
        <Field label="Técnico">
          <select value={f.tech} onChange={set('tech')} className={inputCls}>
            <option value="">Sem técnico</option>
            {data.profiles.filter((p) => p.role === 'tech' || p.does_field).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </form>
    </Modal>
  );
}
