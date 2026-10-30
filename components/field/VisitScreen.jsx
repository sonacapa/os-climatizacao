'use client';
import { useState } from 'react';
import { CheckCircle2, ChevronRight, MapPin, MessageCircle, Navigation, Phone, Plus, Send, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { OPEN, fmtDate, mapsLink, osLabel, waLink, wazeLink } from '@/lib/utils';
import { useApp } from '../AppContext';
import { CheckRow, eqSpecs, eqTitle } from '../shared';
import { Btn, Card, Field, ItemBadge, Modal, StatusBadge, inputCls } from '../ui';
import ScreenFrame from './ScreenFrame';
import SignaturePad from './SignaturePad';

export default function VisitScreen({ osId, onBack, onItem }) {
  const { data, run, openModal, confirm, getClient, getEq, toast } = useApp();
  const os = data.orders.find((o) => o.id === osId);
  const [adding, setAdding] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!os) return null;
  const client = getClient(os.client_id);
  const open = OPEN.includes(os.status);
  const pending = os.items.filter((i) => i.status === 'pendente').length;
  const done = os.items.filter((i) => i.status === 'feito').length;

  const startItem = async (it) => {
    if (open && os.status !== 'no_local') await run(() => api.setOrderStatus(os, 'no_local'));
    onItem(it.id);
  };

  const conclude = async () => {
    if (!(await confirm({ title: 'Concluir a visita?', message: `${done} ${done === 1 ? 'aparelho atendido' : 'aparelhos atendidos'}. Depois disso o escritório recebe tudo e você pode enviar os laudos ao cliente.`, confirmLabel: 'Concluir visita', cancelLabel: 'Voltar' }))) return;
    setBusy(true);
    const r = await run(() => api.setOrderStatus(os, 'finalizada'), 'Visita concluída');
    setBusy(false);
    if (r && done > 0) openModal('shareLaudos', { osId: os.id });
  };

  const cancel = async () => {
    setBusy(true);
    const note = `${os.notes ? os.notes + '\n' : ''}Cancelado pelo técnico: ${reason.trim() || 'sem motivo informado'}`;
    const r = await run(() => api.patchOrder(os.id, { status: 'cancelada', notes: note }), 'Chamado cancelado');
    setBusy(false);
    if (r) { setCancelling(false); onBack(); }
  };

  const others = data.equipment.filter((e) => e.client_id === os.client_id && !os.items.some((i) => i.equipment_id === e.id));

  return (
    <ScreenFrame title={client?.name} subtitle={`${osLabel(os)} · ${os.service_type}`} onBack={onBack} right={<StatusBadge status={os.status} className="mr-2" />}
      footer={open ? (
        <Btn size="lg" variant="success" icon={CheckCircle2} className="w-full" disabled={pending > 0} loading={busy} onClick={conclude}>
          {pending > 0 ? `Faltam ${pending} ${pending === 1 ? 'aparelho' : 'aparelhos'}` : 'Concluir visita'}
        </Btn>
      ) : os.status === 'finalizada' && done > 0 ? (
        <Btn size="lg" variant="whatsapp" icon={Send} className="w-full" onClick={() => openModal('shareLaudos', { osId: os.id })}>Enviar laudos ao cliente</Btn>
      ) : null}>
      <Card className="p-4 space-y-3">
        <div className="text-sm text-slate-700 space-y-1.5">
          <p>{fmtDate(os.scheduled_date)} às {String(os.scheduled_time).slice(0, 5)}</p>
          {client?.address && <p className="flex gap-1.5"><MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> {client.address}</p>}
          {os.notes && <p className="bg-amber-50 text-amber-900 rounded-lg px-3 py-2 whitespace-pre-wrap">{os.notes}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {client?.address && <a href={mapsLink(client.address)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700"><Navigation className="w-4 h-4" /> Rota (Maps)</a>}
          {client?.address && <a href={wazeLink(client.address)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700"><Navigation className="w-4 h-4" /> Rota (Waze)</a>}
          {client?.phone && <a href={`tel:${client.phone}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700"><Phone className="w-4 h-4" /> Ligar</a>}
          {client?.phone && <a href={waLink(client.phone, `Olá, ${client.name.split(' ')[0]}! Sou da ${data.company.name} e estou ${os.status === 'em_rota' ? 'a caminho' : 'indo'} para o atendimento.`)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white py-2.5 text-sm font-semibold"><MessageCircle className="w-4 h-4" /> WhatsApp</a>}
        </div>
      </Card>

      <section className="space-y-2">
        <h2 className="font-semibold text-slate-900">Aparelhos ({done}/{os.items.length})</h2>
        {os.items.map((it) => {
          const eq = getEq(it.equipment_id);
          if (!eq) return null;
          return (
            <button key={it.id} onClick={() => startItem(it)} className="w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 active:bg-slate-50">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 truncate">{eq.location_tag || eq.code}</p>
                <p className="text-xs text-slate-500 truncate">{eqTitle(eq)}{eqSpecs(eq) ? ` · ${eqSpecs(eq)}` : ''}</p>
                <div className="mt-1.5"><ItemBadge status={it.status} /></div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          );
        })}
        {open && (
          <div className="flex gap-2">
            {others.length > 0 && <Btn variant="secondary" className="flex-1" icon={Plus} onClick={() => setAdding(true)}>Outro aparelho do cliente</Btn>}
            <Btn variant="secondary" className="flex-1" icon={Plus} onClick={() => openModal('equipment', { clientId: os.client_id, onSaved: (eq) => api.addEquipmentToOrder(os, eq.id).then(() => run(async () => {}), (e) => toast(e.message, 'error')) })}>Cadastrar aparelho novo</Btn>
          </div>
        )}
      </section>

      {open && (
        <section className="space-y-2">
          <h2 className="font-semibold text-slate-900">Assinatura do cliente</h2>
          <Card className="p-4"><SignaturePad os={os} /></Card>
        </section>
      )}
      {!open && os.signature_path && (
        <Card className="p-4"><SignaturePad os={os} /></Card>
      )}

      {open && <Btn variant="dangerSoft" icon={XCircle} className="w-full" onClick={() => setCancelling(true)}>Cancelar este chamado</Btn>}

      {adding && (
        <AddMachines machines={others} onClose={() => setAdding(false)} onAdd={async (ids) => {
          const r = await run(async () => { for (const id of ids) await api.addEquipmentToOrder({ ...os, items: [...os.items] }, id); }, 'Aparelhos adicionados');
          if (r) setAdding(false);
        }} />
      )}
      {cancelling && (
        <Modal title="Cancelar o chamado?" onClose={() => setCancelling(false)} maxWidth="max-w-sm"
          footer={<div className="flex gap-2 justify-end"><Btn variant="secondary" onClick={() => setCancelling(false)}>Voltar</Btn><Btn variant="danger" loading={busy} onClick={cancel}>Cancelar chamado</Btn></div>}>
          <Field label="Motivo"><textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: cliente ausente, endereço não localizado" className={inputCls} /></Field>
        </Modal>
      )}
    </ScreenFrame>
  );
}

function AddMachines({ machines, onAdd, onClose }) {
  const [sel, setSel] = useState(new Set());
  return (
    <Modal title="Adicionar aparelhos" onClose={onClose} footer={<Btn className="w-full" disabled={sel.size === 0} onClick={() => onAdd([...sel])}>Adicionar {sel.size || ''}</Btn>}>
      <div className="space-y-1.5">
        {machines.map((m) => (
          <CheckRow key={m.id} checked={sel.has(m.id)} onChange={(v) => { const n = new Set(sel); v ? n.add(m.id) : n.delete(m.id); setSel(n); }}>
            <p className="text-sm font-semibold truncate">{m.location_tag || m.code}</p>
            <p className="text-xs text-slate-500 truncate">{eqTitle(m)} · {m.code}</p>
          </CheckRow>
        ))}
      </div>
    </Modal>
  );
}
