'use client';
import { useState } from 'react';
import { BellRing, CalendarPlus, ChevronDown, MessageCircle } from 'lucide-react';
import { daysUntil, fmtDate, waLink } from '@/lib/utils';
import { useApp } from '../AppContext';
import { PageHeader, dueGroups, eqTitle } from '../shared';
import { Btn, Card, Chip, EmptyState, Segmented } from '../ui';

const WINDOWS = [
  { value: -1, label: 'Vencidas' },
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' }
];

export default function AlertsView() {
  const { data } = useApp();
  const [win, setWin] = useState(30);
  const groups = dueGroups(data, win);
  const total = groups.reduce((s, g) => s + g.machines.length, 0);

  return (
    <div>
      <PageHeader title="Preventivas" subtitle="Um cartão por cliente. Avise ou agende todos os aparelhos de uma vez." />
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-4">
        <Segmented value={win} onChange={setWin} options={WINDOWS} />
      </div>
      {groups.length > 0 && <p className="text-sm text-slate-500 mb-3">{groups.length} {groups.length === 1 ? 'cliente' : 'clientes'} · {total} {total === 1 ? 'aparelho' : 'aparelhos'}</p>}
      {groups.length === 0 ? (
        <EmptyState icon={BellRing} title="Tudo em dia" text={win < 0 ? 'Nenhuma preventiva vencida.' : 'Nenhum aparelho com preventiva neste prazo, ou já estão agendados.'} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">{groups.map((g) => <GroupCard key={g.client.id} g={g} />)}</div>
      )}
    </div>
  );
}

function GroupCard({ g }) {
  const { data, openModal } = useApp();
  const [all, setAll] = useState(false);
  const { client, machines, scheduled } = g;
  const list = all ? machines : machines.slice(0, 3);
  const overdue = machines.filter((m) => daysUntil(m.next_maintenance) < 0).length;

  const msg =
    `Olá, ${client.name.split(' ')[0]}! Aqui é da ${data.company.name}. A manutenção preventiva dos seus aparelhos está chegando:\n` +
    machines.map((m) => `• ${m.location_tag || m.code} – ${eqTitle(m)} (${daysUntil(m.next_maintenance) < 0 ? 'vencida em' : 'vence em'} ${fmtDate(m.next_maintenance)})`).join('\n') +
    '\n\nPodemos agendar uma visita para cuidar de todos de uma vez?';

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-slate-900 truncate">{client.name}</p>
          <p className="text-xs text-slate-500 truncate">{client.address || client.phone || ''}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Chip tone="amber">{machines.length} {machines.length === 1 ? 'aparelho' : 'aparelhos'}</Chip>
          {overdue > 0 && <Chip tone="red">{overdue} vencido{overdue > 1 ? 's' : ''}</Chip>}
        </div>
      </div>
      <ul className="text-sm divide-y divide-slate-100 border border-slate-100 rounded-xl">
        {list.map((m) => {
          const d = daysUntil(m.next_maintenance);
          return (
            <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="truncate"><strong className="font-semibold">{m.location_tag || m.code}</strong> <span className="text-slate-500">· {eqTitle(m)}</span></span>
              <span className={`text-xs font-semibold shrink-0 ${d < 0 ? 'text-rose-700' : 'text-amber-700'}`}>{fmtDate(m.next_maintenance)}</span>
            </li>
          );
        })}
      </ul>
      {machines.length > 3 && (
        <button onClick={() => setAll(!all)} className="text-sm font-semibold text-sky-700 inline-flex items-center gap-1">
          {all ? 'Mostrar menos' : `Ver mais ${machines.length - 3}`} <ChevronDown className={`w-4 h-4 ${all ? 'rotate-180' : ''}`} />
        </button>
      )}
      {scheduled.length > 0 && <p className="text-xs text-emerald-700">{scheduled.length} aparelho(s) deste cliente já estão em uma O.S. aberta.</p>}
      <div className="flex gap-2">
        <a href={waLink(client.phone, msg)} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold">
          <MessageCircle className="w-4 h-4" /> Avisar cliente
        </a>
        <Btn className="flex-1" icon={CalendarPlus} onClick={() => openModal('os', { preset: { client_id: client.id, equipment_ids: machines.map((m) => m.id), service_type: 'Manutenção preventiva' } })}>
          Agendar visita
        </Btn>
      </div>
    </Card>
  );
}
