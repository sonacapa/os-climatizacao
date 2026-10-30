'use client';
import { useMemo, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react';
import { STATUS, addDaysISO, fmtTime, todayISO } from '@/lib/utils';
import { useApp } from '../AppContext';
import { Segmented, pillCls } from '../ui';
import OsCard from './OsCard';

const WEEK = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const dt = (iso) => new Date(`${iso}T12:00:00`);
const startOfWeek = (iso) => addDaysISO(iso, -dt(iso).getDay());
const monthLabel = (iso) => dt(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const dayLabel = (iso) => dt(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

function Mini({ os, client, onOpen }) {
  const st = STATUS[os.status];
  return (
    <button onClick={onOpen} className="w-full min-w-0 text-left flex items-center gap-2 rounded-md bg-slate-50 hover:bg-slate-100 px-2 py-1.5 text-xs">
      <span className={`w-1 self-stretch rounded-full ${st.dot}`} />
      <span className="num text-slate-500">{fmtTime(os.scheduled_time) || '--:--'}</span>
      <span className="truncate text-ink">{client?.name}</span>
    </button>
  );
}

export default function AgendaView() {
  const { data, openModal, getClient, getTech } = useApp();
  const today = todayISO();
  const [mode, setMode] = useState('mes');
  const [cursor, setCursor] = useState(today);
  const [sel, setSel] = useState(today);
  const [techId, setTechId] = useState('');
  const [status, setStatus] = useState('');

  const orders = useMemo(() => data.orders.filter((o) => o.status !== 'cancelada' || status === 'cancelada')
    .filter((o) => (!techId || o.tech_id === techId) && (!status || o.status === status)), [data.orders, techId, status]);
  const byDay = useMemo(() => {
    const m = {};
    orders.forEach((o) => { (m[o.scheduled_date] ||= []).push(o); });
    Object.values(m).forEach((l) => l.sort((a, b) => String(a.scheduled_time).localeCompare(String(b.scheduled_time))));
    return m;
  }, [orders]);
  const dayList = (d) => byDay[d] || [];

  const step = (dir) => {
    if (mode === 'mes') { const d = dt(cursor); d.setDate(1); d.setMonth(d.getMonth() + dir); setCursor(d.toLocaleDateString('en-CA')); }
    else setCursor(addDaysISO(cursor, dir * (mode === 'semana' ? 7 : 1)));
  };
  const goToday = () => { setCursor(today); setSel(today); };
  const title = mode === 'mes' ? monthLabel(cursor) : mode === 'semana' ? `${dt(startOfWeek(cursor)).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${dt(addDaysISO(startOfWeek(cursor), 6)).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}` : dayLabel(cursor);

  const techs = data.profiles.filter((p) => p.role === 'tech' || p.does_field);

  const DayItems = ({ day }) => {
    const l = dayList(day);
    if (!l.length) return <p className="text-sm text-slate-500 py-6 text-center">Nenhuma visita neste dia.</p>;
    return (
      <div className="space-y-2">
        {l.map((o) => (
          <div key={o.id}>
            <OsCard os={o} />
            {['agendada', 'em_rota', 'no_local'].includes(o.status) && (
              <button onClick={() => openModal('reschedule', { osId: o.id })} className="mt-1 ml-1 inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"><CalendarClock className="w-3.5 h-3.5" /> Reagendar</button>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ----- mês
  const monthGrid = () => {
    const first = new Date(dt(cursor).getFullYear(), dt(cursor).getMonth(), 1, 12).toLocaleDateString('en-CA');
    const start = startOfWeek(first);
    const cells = Array.from({ length: 42 }, (_, i) => addDaysISO(start, i));
    const cm = dt(cursor).getMonth();
    return (
      <>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 text-center text-[11px] uppercase tracking-wide text-slate-500">
            {WEEK.map((w) => <div key={w} className="py-2">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            {cells.map((d) => {
              const l = dayList(d);
              const inMonth = dt(d).getMonth() === cm;
              const on = d === sel;
              return (
                <button key={d} onClick={() => setSel(d)} className={`bg-white min-h-[56px] md:min-h-[92px] p-1 md:p-1.5 text-left flex flex-col gap-1 ${inMonth ? '' : 'opacity-40'} ${on ? 'ring-2 ring-inset ring-brand-500' : 'hover:bg-slate-50'}`}>
                  <span className={`num text-xs w-6 h-6 inline-flex items-center justify-center rounded-full ${d === today ? 'bg-heat-500 text-white' : 'text-slate-700'}`}>{dt(d).getDate()}</span>
                  <span className="hidden md:flex flex-col gap-0.5 min-w-0">
                    {l.slice(0, 3).map((o) => <span key={o.id} className="flex items-center gap-1 min-w-0 text-[11px] text-slate-700"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS[o.status].dot}`} /><span className="truncate">{getClient(o.client_id)?.name}</span></span>)}
                    {l.length > 3 && <span className="text-[11px] text-slate-500">+{l.length - 3} mais</span>}
                  </span>
                  {l.length > 0 && <span className="md:hidden flex gap-0.5 flex-wrap">{l.slice(0, 4).map((o) => <span key={o.id} className={`w-1.5 h-1.5 rounded-full ${STATUS[o.status].dot}`} />)}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <h3 className="text-sm font-medium text-slate-600 mt-5 mb-2 capitalize">{dayLabel(sel)}</h3>
        <DayItems day={sel} />
      </>
    );
  };

  // ----- semana
  const weekGrid = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDaysISO(startOfWeek(cursor), i));
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d) => (
          <div key={d} className={`rounded-xl border bg-white p-2 min-w-0 ${d === today ? 'border-heat-500' : 'border-slate-200'}`}>
            <p className="text-xs text-slate-500 mb-1.5 capitalize"><span className="num text-ink text-sm">{dt(d).getDate()}</span> {WEEK[dt(d).getDay()]}</p>
            <div className="space-y-1">
              {dayList(d).length === 0 ? <p className="text-xs text-slate-400">—</p> : dayList(d).map((o) => <Mini key={o.id} os={o} client={getClient(o.client_id)} onOpen={() => openModal('osDetail', { osId: o.id })} />)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ----- técnico (dia escolhido, uma coluna por técnico)
  const techGrid = () => {
    const groups = [...techs.map((t) => ({ id: t.id, name: t.name })), { id: null, name: 'Sem técnico' }];
    const l = dayList(cursor);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {groups.filter((g) => !techId || g.id === techId).map((g) => {
          const mine = l.filter((o) => (o.tech_id || null) === g.id);
          return (
            <div key={g.id || 'none'} className="rounded-xl border border-slate-200 bg-white p-3 min-w-0">
              <p className="text-sm font-medium text-ink mb-2">{g.name} <span className="text-slate-400 font-normal">· {mine.length}</span></p>
              <div className="space-y-1">
                {mine.length === 0 ? <p className="text-xs text-slate-400">Livre neste dia</p> : mine.map((o) => <Mini key={o.id} os={o} client={getClient(o.client_id)} onOpen={() => openModal('osDetail', { osId: o.id })} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        <Segmented value={mode} onChange={setMode} options={[
          { value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }, { value: 'tecnico', label: 'Técnico' }
        ]} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button aria-label="Anterior" onClick={() => step(-1)} className="w-9 h-9 rounded-full border border-slate-300 bg-white grid place-items-center"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={goToday} className="h-9 px-3.5 rounded-full border border-slate-300 bg-white text-sm">Hoje</button>
          <button aria-label="Próximo" onClick={() => step(1)} className="w-9 h-9 rounded-full border border-slate-300 bg-white grid place-items-center"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <p className="font-display text-lg font-semibold capitalize mr-auto">{mode === 'tecnico' ? dayLabel(cursor) : title}</p>
        <select value={techId} onChange={(e) => setTechId(e.target.value)} className={pillCls} aria-label="Técnico">
          <option value="">Técnicos</option>
          {techs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={pillCls} aria-label="Situação">
          <option value="">Situação</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {mode === 'mes' && monthGrid()}
      {mode === 'semana' && weekGrid()}
      {mode === 'dia' && <DayItems day={cursor} />}
      {mode === 'tecnico' && techGrid()}
    </div>
  );
}
