'use client';
import { useState } from 'react';
import { CalendarX, MapPin, Navigation, Phone, Route } from 'lucide-react';
import { api } from '@/lib/api';
import { OPEN, STATUS, addDaysISO, fmtDate, fmtTime, mapsLink, norm, osLabel, relDay, todayISO } from '@/lib/utils';
import { useApp } from '../AppContext';
import { savedRoute } from './RouteModal';
import { Btn, EmptyState, Segmented, SearchBox, StatusBadge, pillCls } from '../ui';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };

export default function JobsTab() {
  const { data, me, setScreen, openModal } = useApp();
  const [view, setView] = useState('hoje');
  const [order, setOrder] = useState(() => (typeof window === 'undefined' ? null : savedRoute()));
  const today = todayISO();
  const mine = data.orders.filter((o) => o.tech_id === me.id);
  const open = mine.filter((o) => OPEN.includes(o.status)).sort((a, b) => `${a.scheduled_date} ${a.scheduled_time}`.localeCompare(`${b.scheduled_date} ${b.scheduled_time}`));
  const lists = {
    hoje: open.filter((o) => o.scheduled_date <= today).sort((a, b) => { if (!order) return 0; const i = order.indexOf(a.id), j = order.indexOf(b.id); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); }),
    proximos: open.filter((o) => o.scheduled_date > today),
    feitos: mine.filter((o) => !OPEN.includes(o.status))
  };
  const list = lists[view];
  const n = lists.hoje.length;

  return (
    <div>
      <div className="pt-1 pb-4">
        <h1 className="text-[1.5rem] leading-tight font-semibold text-ink">{greeting()}, {me.name.trim().split(/\s+/)[0].toLowerCase().replace(/^./, (c) => c.toUpperCase())}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{n === 0 ? 'Nenhum chamado para hoje.' : n === 1 ? '1 chamado para hoje.' : `${n} chamados para hoje.`}</p>
      </div>
      <div className="space-y-4">
      <Segmented className="w-full" value={view} onChange={setView} options={[
        { value: 'hoje', label: 'Hoje', count: lists.hoje.length },
        { value: 'proximos', label: 'Próximos', count: lists.proximos.length },
        { value: 'feitos', label: 'Histórico' }
      ]} />
      {view === 'hoje' && n >= 2 && (
        <button onClick={() => openModal('route', { osIds: lists.hoje.map((o) => o.id), onApply: setOrder })} className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3 text-left">
          <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0"><Route className="w-5 h-5" /></span><span className="flex-1"><span className="block text-sm font-medium text-ink">Rota do dia</span><span className="block text-xs text-slate-500">Ver a melhor ordem para {n} visitas</span></span>
        </button>
      )}
      {view === 'feitos' ? <History list={list} /> : list.length === 0 ? (
        <EmptyState icon={CalendarX} title={view === 'hoje' ? 'Nenhum chamado para hoje' : view === 'proximos' ? 'Nenhum chamado futuro' : 'Nada por aqui ainda'}
          text={view === 'hoje' ? 'Quando o escritório agendar uma visita para você, ela aparece aqui. Para atender um aparelho agora, use “Ler QR”.' : undefined} />
      ) : (
        <div className="space-y-3">{list.map((o, i) => <JobCard key={o.id} os={o} hero={view === 'hoje' && i === 0} onOpen={() => setScreen({ osId: o.id })} />)}</div>
      )}
      </div>
    </div>
  );
}

function JobCard({ os, onOpen, hero = false }) {
  const { run, getClient, setScreen } = useApp();
  const client = getClient(os.client_id);
  const today = todayISO();
  const done = os.items.filter((i) => i.status !== 'pendente').length;
  const late = OPEN.includes(os.status) && os.scheduled_date < today;
  const closed = os.status === 'finalizada' || os.status === 'cancelada';
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  const main = {
    agendada: { label: 'Iniciar rota', fn: () => run(() => api.setOrderStatus(os, 'em_rota'), 'Bom caminho!') },
    em_rota: { label: 'Cheguei ao local', fn: async () => { const r = await run(() => api.setOrderStatus(os, 'no_local')); if (r) setScreen({ osId: os.id }); } },
    no_local: { label: 'Continuar atendimento', fn: () => setScreen({ osId: os.id }) }
  }[os.status];

  const dark = hero && !!main;
  const hl = dark;
  const sub = 'text-slate-600';
  const iconBtn = 'border-slate-300 text-slate-700';

  return (
    <div className={`rounded-xl overflow-hidden border shadow-sm ${dark ? 'bg-white border-brand-300 ring-1 ring-brand-200' : 'bg-white border-slate-200'}`}>
      <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} className="p-4 space-y-3 cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`num font-semibold leading-none ${dark ? 'text-4xl' : 'text-2xl'} ${late ? 'text-rose-600' : ''}`}>{fmtTime(os.scheduled_time) || '--:--'}</p>
            <p className={`text-xs font-semibold mt-1.5 ${late ? 'text-rose-600' : sub}`}>
              {closed ? fmtDate(os.scheduled_date) : relDay(os.scheduled_date)}{late ? ' · atrasado' : ''}
            </p>
          </div>
          {dark ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-50 text-brand-700 rounded-md px-2 py-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-600" />{STATUS[os.status].label}</span>
          ) : <StatusBadge status={os.status} />}
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-tight">{client?.name}</p>
          <p className={`text-xs mt-0.5 ${sub}`}>{osLabel(os)} · {os.service_type} · {os.items.length} {os.items.length === 1 ? 'aparelho' : 'aparelhos'}{done > 0 ? ` (${done} feito${done > 1 ? 's' : ''})` : ''}</p>
        </div>
        {client?.address && <p className={`text-sm flex gap-1.5 ${sub}`}><MapPin className="w-4 h-4 opacity-70 mt-0.5 shrink-0" /> {client.address}</p>}
        {os.notes && <p className={`text-sm rounded-lg px-3 py-2 ${'bg-amber-50 text-amber-900'}`}>{os.notes}</p>}
      </div>
      {main ? (
        <div className="px-4 pb-4 flex gap-2">
          <Btn variant="primary" size="lg" className="flex-1" onClick={stop(main.fn)}>{main.label}</Btn>
          {client?.address && <a href={mapsLink(client.address)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label="Abrir rota" className={`inline-flex items-center justify-center w-14 rounded-lg border ${iconBtn}`}><Navigation className="w-5 h-5" /></a>}
          {client?.phone && <a href={`tel:${client.phone}`} onClick={(e) => e.stopPropagation()} aria-label="Ligar" className={`inline-flex items-center justify-center w-14 rounded-lg border ${iconBtn}`}><Phone className="w-5 h-5" /></a>}
        </div>
      ) : (
        <div className="px-4 pb-4"><Btn variant="secondary" className="w-full" onClick={onOpen}>{os.status === 'finalizada' ? 'Ver visita e enviar laudos' : 'Ver detalhes'}</Btn></div>
      )}
    </div>
  );
}


const PERIODS = [['0', 'Todo o período'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias']];

function History({ list }) {
  const { getClient, getEq, setScreen } = useApp();
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState('30');
  const [status, setStatus] = useState('todas');
  const [limit, setLimit] = useState(20);
  const since = period === '0' ? '' : addDaysISO(todayISO(), -Number(period));
  const n = norm(q);

  const rows = list
    .filter((o) => (status === 'todas' || o.status === status) && (!since || o.scheduled_date >= since))
    .filter((o) => !n || norm([osLabel(o), getClient(o.client_id)?.name, getClient(o.client_id)?.address, ...o.items.map((i) => { const e = getEq(i.equipment_id); return e ? `${e.location_tag} ${e.code} ${e.brand}` : ''; })].join(' ')).includes(n));

  return (
    <div className="space-y-3">
      <SearchBox value={q} onChange={(v) => { setQ(v); setLimit(20); }} placeholder="Buscar por cliente, endereço, local ou nº da O.S." />
      <div className="flex gap-2">
        <select value={period} onChange={(e) => { setPeriod(e.target.value); setLimit(20); }} className={pillCls} aria-label="Período">
          {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setLimit(20); }} className={pillCls} aria-label="Situação">
          <option value="todas">Todas</option>
          <option value="finalizada">Concluídas</option>
          <option value="cancelada">Canceladas</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={CalendarX} title="Nenhum atendimento encontrado" text="Mude a busca ou o período." />
      ) : (
        <>
          <p className="text-xs text-slate-500">{rows.length} {rows.length === 1 ? 'atendimento' : 'atendimentos'}</p>
          <div className="space-y-3">
            {rows.slice(0, limit).map((o) => <JobCard key={o.id} os={o} onOpen={() => setScreen({ osId: o.id })} />)}
          </div>
          {rows.length > limit && <Btn variant="secondary" className="w-full" onClick={() => setLimit(limit + 20)}>Mostrar mais</Btn>}
        </>
      )}
    </div>
  );
}
