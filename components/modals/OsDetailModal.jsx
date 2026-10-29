'use client';
import { Calendar, Copy, FileText, MapPin, MessageCircle, Pencil, Phone, Send, Trash2, User, XCircle, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { OPEN, fmtClock, fmtDate, fmtTime, laudoUrl, osLabel, waLink } from '@/lib/utils';
import { useApp } from '../AppContext';
import { eqSpecs, eqTitle } from '../shared';
import { Btn, ItemBadge, Modal, StatusBadge } from '../ui';

export default function OsDetailModal({ osId }) {
  const { data, run, closeModal, openModal, confirm, getClient, getEq, getTech } = useApp();
  const os = data.orders.find((o) => o.id === osId);
  if (!os) return null;
  const client = getClient(os.client_id);
  const tech = getTech(os.tech_id);
  const open = OPEN.includes(os.status);
  const doneCount = os.items.filter((i) => i.status === 'feito').length;

  const cancel = async () => {
    if (!(await confirm({ title: 'Cancelar esta O.S.?', message: 'O chamado some da agenda do técnico. Você pode reativá-lo depois.', confirmLabel: 'Cancelar O.S.', cancelLabel: 'Manter', danger: true }))) return;
    const r = await run(() => api.setOrderStatus(os, 'cancelada'), 'O.S. cancelada');
    if (r) closeModal();
  };
  const reactivate = () => run(() => api.patchOrder(os.id, { status: 'agendada', completed_at: null }), 'O.S. reativada');
  const del = async () => {
    if (!(await confirm({ title: 'Excluir O.S.?', message: `${osLabel(os)} e os dados dos aparelhos nela serão apagados. Isso não pode ser desfeito.`, confirmLabel: 'Excluir', danger: true }))) return;
    const r = await run(() => api.deleteOrder(os.id), 'O.S. excluída');
    if (r) closeModal();
  };
  const repeat = () => {
    closeModal();
    openModal('os', { preset: { client_id: os.client_id, equipment_ids: os.items.map((i) => i.equipment_id), service_type: os.service_type, tech_id: os.tech_id } });
  };

  return (
    <Modal
      title={`${osLabel(os)} · ${client?.name}`}
      subtitle={os.service_type}
      maxWidth="max-w-xl"
      onClose={closeModal}
      footer={
        <div className="flex flex-wrap gap-2 justify-between">
          <div className="flex gap-2">
            {open && <Btn variant="secondary" icon={Pencil} onClick={() => openModal('os', { os })}>Editar</Btn>}
            <Btn variant="secondary" icon={Copy} onClick={repeat}>Repetir</Btn>
            {os.status === 'cancelada' && <Btn variant="secondary" icon={RotateCcw} onClick={reactivate}>Reativar</Btn>}
          </div>
          <div className="flex gap-2">
            {open && <Btn variant="dangerSoft" icon={XCircle} onClick={cancel}>Cancelar</Btn>}
            {!open && <Btn variant="dangerSoft" icon={Trash2} onClick={del}>Excluir</Btn>}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={os.status} />
          {os.started_travel_at && <span className="text-xs text-slate-500">saiu {fmtClock(os.started_travel_at)}</span>}
          {os.arrived_at && <span className="text-xs text-slate-500">chegou {fmtClock(os.arrived_at)}</span>}
          {os.status === 'finalizada' && os.completed_at && <span className="text-xs text-slate-500">concluída {fmtClock(os.completed_at)}</span>}
        </div>

        <dl className="grid gap-2 text-sm">
          <div className="flex gap-2"><Calendar className="w-4 h-4 text-slate-400 mt-0.5" /> {fmtDate(os.scheduled_date)} às {fmtTime(os.scheduled_time)}</div>
          <div className="flex gap-2"><User className="w-4 h-4 text-slate-400 mt-0.5" /> {tech ? tech.name : <span className="text-amber-700">Sem técnico definido</span>}</div>
          {client?.address && <div className="flex gap-2"><MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> {client.address}</div>}
          {client?.phone && <div className="flex gap-2"><Phone className="w-4 h-4 text-slate-400 mt-0.5" /> {client.phone}</div>}
          {os.notes && <p className="bg-slate-50 rounded-lg px-3 py-2 text-slate-700 whitespace-pre-wrap">{os.notes}</p>}
        </dl>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-slate-900">Aparelhos ({doneCount}/{os.items.length} feitos)</h4>
            {doneCount > 0 && <Btn variant="whatsapp" size="sm" icon={Send} onClick={() => openModal('shareLaudos', { osId: os.id })}>Enviar laudos</Btn>}
          </div>
          <ul className="space-y-2">
            {os.items.map((it) => {
              const eq = getEq(it.equipment_id);
              if (!eq) return null;
              return (
                <li key={it.id} className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{eq.location_tag || eq.code}</p>
                      <p className="text-xs text-slate-500">{eqTitle(eq)}{eqSpecs(eq) ? ` · ${eqSpecs(eq)}` : ''} · {eq.code}</p>
                    </div>
                    <ItemBadge status={it.status} />
                  </div>
                  {it.service_type && it.service_type !== os.service_type && <p className="text-xs text-slate-600">Serviço: {it.service_type}</p>}
                  {it.status !== 'pendente' && it.notes && <p className="text-xs text-slate-600 whitespace-pre-wrap">“{it.notes}”</p>}
                  {it.status === 'feito' && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-slate-500">
                        {it.materials.length > 0 ? `${it.materials.length} material(is) · ` : ''}Garantia {it.warranty_days ? `${it.warranty_days} dias` : 'sem'}
                      </span>
                      <div className="flex gap-1.5">
                        <Btn variant="secondary" size="sm" icon={FileText} onClick={() => openModal('laudo', { osId: os.id, itemId: it.id })}>Laudo</Btn>
                        <a href={waLink(client?.phone, `Olá! Segue o laudo do aparelho ${eqTitle(eq)} (${eq.location_tag || eq.code}): ${laudoUrl(it)}`)} target="_blank" rel="noreferrer" aria-label="Enviar laudo por WhatsApp" className="inline-flex items-center justify-center rounded-xl bg-[#25D366] text-white px-2.5"><MessageCircle className="w-4 h-4" /></a>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
