'use client';
import { useState } from 'react';
import { CalendarX, Clock, MapPin, Navigation, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { OPEN, fmtTime, mapsLink, osLabel, relDay, todayISO } from '@/lib/utils';
import { useApp } from '../AppContext';
import { Btn, Card, EmptyState, Segmented, StatusBadge } from '../ui';

export default function JobsTab() {
  const { data, me, setScreen } = useApp();
  const [view, setView] = useState('hoje');
  const today = todayISO();
  const mine = data.orders.filter((o) => o.tech_id === me.id);
  const open = mine.filter((o) => OPEN.includes(o.status)).sort((a, b) => `${a.scheduled_date} ${a.scheduled_time}`.localeCompare(`${b.scheduled_date} ${b.scheduled_time}`));
  const lists = {
    hoje: open.filter((o) => o.scheduled_date <= today),
    proximos: open.filter((o) => o.scheduled_date > today),
    feitos: mine.filter((o) => !OPEN.includes(o.status)).slice(0, 40)
  };
  const list = lists[view];

  return (
    <div className="space-y-4">
      <Segmented className="w-full" value={view} onChange={setView} options={[
        { value: 'hoje', label: 'Hoje', count: lists.hoje.length },
        { value: 'proximos', label: 'Próximos', count: lists.proximos.length },
        { value: 'feitos', label: 'Histórico' }
      ]} />
      {list.length === 0 ? (
        <EmptyState icon={CalendarX} title={view === 'hoje' ? 'Nenhum chamado para hoje' : view === 'proximos' ? 'Nenhum chamado futuro' : 'Nada por aqui ainda'}
          text={view === 'hoje' ? 'Quando o escritório agendar uma visita para você, ela aparece aqui. Para atender um aparelho agora, use “Ler QR”.' : undefined} />
      ) : (
        <div className="space-y-3">{list.map((o) => <JobCard key={o.id} os={o} onOpen={() => setScreen({ osId: o.id })} />)}</div>
      )}
    </div>
  );
}

function JobCard({ os, onOpen }) {
  const { run, getClient, setScreen } = useApp();
  const client = getClient(os.client_id);
  const today = todayISO();
  const done = os.items.filter((i) => i.status !== 'pendente').length;
  const late = OPEN.includes(os.status) && os.scheduled_date < today;
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  const main = {
    agendada: { label: 'Iniciar deslocamento', fn: () => run(() => api.setOrderStatus(os, 'em_rota'), 'Bom caminho!') },
    em_rota: { label: 'Cheguei ao local', fn: async () => { const r = await run(() => api.setOrderStatus(os, 'no_local')); if (r) setScreen({ osId: os.id }); } },
    no_local: { label: 'Continuar atendimento', fn: () => setScreen({ osId: os.id }) }
  }[os.status];

  return (
    <Card className="overflow-hidden">
      <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} className="p-4 space-y-2 cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 leading-tight">{client?.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{osLabel(os)} · {os.service_type}</p>
          </div>
          <StatusBadge status={os.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
          <span className={`inline-flex items-center gap-1.5 font-semibold ${late ? 'text-rose-700' : ''}`}><Clock className="w-4 h-4" /> {relDay(os.scheduled_date)}, {fmtTime(os.scheduled_time)}{late ? ' (atrasado)' : ''}</span>
          <span className="font-semibold">{os.items.length} {os.items.length === 1 ? 'aparelho' : 'aparelhos'}{done > 0 ? ` · ${done} feito${done > 1 ? 's' : ''}` : ''}</span>
        </div>
        {client?.address && <p className="text-sm text-slate-600 flex gap-1.5"><MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> {client.address}</p>}
        {os.notes && <p className="text-sm bg-amber-50 text-amber-900 rounded-lg px-3 py-1.5">{os.notes}</p>}
      </div>
      {main ? (
        <div className="px-4 pb-4 flex gap-2">
          <Btn size="lg" className="flex-1" onClick={stop(main.fn)}>{main.label}</Btn>
          {client?.address && <a href={mapsLink(client.address)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label="Abrir rota" className="inline-flex items-center justify-center w-14 rounded-xl border border-slate-300 text-slate-700"><Navigation className="w-5 h-5" /></a>}
          {client?.phone && <a href={`tel:${client.phone}`} onClick={(e) => e.stopPropagation()} aria-label="Ligar" className="inline-flex items-center justify-center w-14 rounded-xl border border-slate-300 text-slate-700"><Phone className="w-5 h-5" /></a>}
        </div>
      ) : (
        <div className="px-4 pb-4"><Btn variant="secondary" className="w-full" onClick={onOpen}>{os.status === 'finalizada' ? 'Ver visita e enviar laudos' : 'Ver detalhes'}</Btn></div>
      )}
    </Card>
  );
}
