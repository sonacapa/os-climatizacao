'use client';
import { FileText, MessageCircle } from 'lucide-react';
import { laudoUrl, waLink } from '@/lib/utils';
import { useApp } from '../AppContext';
import { eqTitle } from '../shared';
import { Btn, Modal } from '../ui';

// Envia os laudos de uma visita: um por aparelho ou todos juntos numa mensagem
export default function ShareLaudosModal({ osId }) {
  const { data, closeModal, getClient, getEq, openModal } = useApp();
  const os = data.orders.find((o) => o.id === osId);
  if (!os) return null;
  const client = getClient(os.client_id);
  const done = os.items.filter((i) => i.status === 'feito');
  const first = client.name.split(' ')[0];

  const one = (it) => {
    const eq = getEq(it.equipment_id);
    return `Olá, ${first}! Segue o laudo do aparelho ${eqTitle(eq)} (${eq.location_tag || eq.code}) – ${data.company.name}:\n${laudoUrl(it)}`;
  };
  const all = `Olá, ${first}! Seguem os laudos do atendimento de hoje – ${data.company.name}:\n\n` +
    done.map((it) => { const eq = getEq(it.equipment_id); return `• ${eqTitle(eq)} (${eq.location_tag || eq.code}): ${laudoUrl(it)}`; }).join('\n');

  return (
    <Modal title="Enviar laudos ao cliente" subtitle={client.name} onClose={closeModal}
      footer={done.length > 1 ? <a href={waLink(client.phone, all)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white font-semibold py-3 text-sm"><MessageCircle className="w-4 h-4" /> Enviar todos em uma mensagem</a> : undefined}>
      {!client.phone && <p className="text-sm bg-amber-50 text-amber-800 rounded-lg px-3 py-2 mb-3">Este cliente não tem WhatsApp cadastrado. Você poderá escolher o contato ao abrir o WhatsApp.</p>}
      {done.length === 0 && <p className="text-sm text-slate-500">Nenhum aparelho concluído nesta visita.</p>}
      <ul className="space-y-2">
        {done.map((it) => {
          const eq = getEq(it.equipment_id);
          return (
            <li key={it.id} className="border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{eq.location_tag || eq.code}</p>
                <p className="text-xs text-slate-500 truncate">{eqTitle(eq)} · {eq.code}</p>
              </div>
              <Btn variant="secondary" size="sm" icon={FileText} onClick={() => openModal('laudo', { osId: os.id, itemId: it.id })}>Ver</Btn>
              <a href={waLink(client.phone, one(it))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] text-white font-semibold px-3 py-1.5 text-sm">
                <MessageCircle className="w-4 h-4" /> Enviar
              </a>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
