'use client';
import { useState } from 'react';
import { History, MapPin, Wrench } from 'lucide-react';
import { api } from '@/lib/api';
import { OPEN, SERVICE_TYPES, fmtDate } from '@/lib/utils';
import { useApp } from '../AppContext';
import { MaintChip, WarrantyChip, eqSpecs, eqTitle } from '../shared';
import { Btn, Field, Modal, inputCls } from '../ui';

export default function ScanResultModal({ info }) {
  const { data, me, run, closeAll, openModal, setScreen, toast } = useApp();
  const { equipment: eq, client, history } = info;
  const [type, setType] = useState(SERVICE_TYPES[0]);
  const [busy, setBusy] = useState(false);

  // já existe um chamado meu em aberto com este aparelho?
  const existing = data.orders.find((o) => o.tech_id === me.id && OPEN.includes(o.status) && o.items.some((i) => i.equipment_id === eq.id && i.status === 'pendente'));
  const existingItem = existing?.items.find((i) => i.equipment_id === eq.id && i.status === 'pendente');

  const go = async () => {
    if (existing) {
      if (existing.status !== 'no_local') await run(() => api.setOrderStatus(existing, 'no_local'));
      closeAll();
      return setScreen({ osId: existing.id, itemId: existingItem.id });
    }
    setBusy(true);
    const r = await run(() => api.startService(eq.id, type));
    setBusy(false);
    if (!r) return;
    closeAll();
    setScreen({ osId: r.value, itemId: null, pickFirst: true });
  };

  const fullEq = data.equipment.find((e) => e.id === eq.id) || eq;

  return (
    <Modal title={eq.location_tag || eq.code} subtitle={`${eq.code} · ${client.name}`} onClose={() => closeAll()}
      footer={<Btn size="lg" icon={Wrench} loading={busy} className="w-full" onClick={go}>{existing ? 'Continuar atendimento' : 'Iniciar atendimento'}</Btn>}>
      <div className="space-y-4">
        <div>
          <p className="font-semibold text-slate-900">{eqTitle(eq)}</p>
          <p className="text-sm text-slate-500">{eqSpecs(eq) || 'Sem detalhes técnicos'}</p>
          <div className="flex flex-wrap gap-1.5 mt-2"><WarrantyChip eq={fullEq} /><MaintChip eq={fullEq} /></div>
        </div>
        {client.address && <p className="text-sm text-slate-600 flex gap-2"><MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> {client.address}</p>}
        <div>
          <h4 className="font-semibold text-slate-900 mb-1.5 flex items-center gap-2"><History className="w-4 h-4 text-slate-400" /> Últimos serviços</h4>
          {history.length === 0 ? <p className="text-sm text-slate-500">Nenhum serviço registrado neste aparelho.</p> : (
            <ul className="text-sm text-slate-700 space-y-1">
              {history.map((h, i) => <li key={i}>{fmtDate(h.date)} · {h.service}</li>)}
            </ul>
          )}
        </div>
        {existing ? (
          <p className="text-sm bg-brand-50 text-brand-800 rounded-lg px-3 py-2">Este aparelho está no chamado de {client.name} que já está na sua agenda.</p>
        ) : (
          <Field label="Tipo de serviço">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
