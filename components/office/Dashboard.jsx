'use client';
import { AlertTriangle, BellRing, CalendarCheck, CheckCircle2, Plus, Truck, UserPlus } from 'lucide-react';
import { OPEN, fmtDate, relDay, todayISO } from '@/lib/utils';
import { useApp } from '../AppContext';
import { PageHeader, dueGroups, spDate } from '../shared';
import { Btn, Card } from '../ui';
import OsCard from './OsCard';

function Stat({ icon: Icon, tone, value, label, onClick }) {
  const tones = { sky: 'bg-sky-50 text-sky-700', indigo: 'bg-indigo-50 text-indigo-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700' };
  return (
    <button onClick={onClick} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-left hover:border-sky-300 transition">
      <span className={`inline-flex p-2 rounded-xl ${tones[tone]}`}><Icon className="w-5 h-5" /></span>
      <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </button>
  );
}

export default function Dashboard({ go }) {
  const { data, me, openModal } = useApp();
  const today = todayISO();
  const open = data.orders.filter((o) => OPEN.includes(o.status));
  const todays = open.filter((o) => o.scheduled_date === today);
  const late = open.filter((o) => o.scheduled_date < today);
  const running = open.filter((o) => o.status !== 'agendada');
  const doneToday = data.orders.filter((o) => o.status === 'finalizada' && (spDate(o.completed_at) === today || o.scheduled_date === today)).length;
  const due = dueGroups(data, 30);
  const firstName = me.name.split(' ')[0];
  const fresh = data.clients.length === 0 || data.company?.name === 'Minha Empresa de Climatização';

  return (
    <div className="space-y-6">
      <PageHeader title={`Olá, ${firstName}`} subtitle={fmtDate(today)}>
        <Btn icon={Plus} onClick={() => openModal('os')}>Nova O.S.</Btn>
        <Btn variant="secondary" icon={UserPlus} onClick={() => openModal('client')}>Novo cliente</Btn>
      </PageHeader>

      {fresh && (
        <Card className="p-5 bg-sky-50 border-sky-200">
          <h2 className="font-bold text-slate-900">Primeiros passos</h2>
          <ol className="mt-2 text-sm text-slate-700 space-y-1 list-decimal pl-5">
            <li><button className="text-sky-700 font-semibold" onClick={() => go('empresa')}>Preencha os dados da empresa</button> e envie a logomarca.</li>
            <li><button className="text-sky-700 font-semibold" onClick={() => go('equipe')}>Crie os acessos</button> dos técnicos e do escritório.</li>
            <li><button className="text-sky-700 font-semibold" onClick={() => go('clientes')}>Cadastre clientes e aparelhos</button> e imprima as etiquetas QR.</li>
            <li><button className="text-sky-700 font-semibold" onClick={() => openModal('os')}>Abra a primeira O.S.</button> para um técnico.</li>
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={CalendarCheck} tone="sky" value={todays.length} label="Visitas hoje" onClick={() => go('os', { filter: 'hoje' })} />
        <Stat icon={Truck} tone="indigo" value={running.length} label="Em andamento" onClick={() => go('os', { filter: 'abertas' })} />
        <Stat icon={CheckCircle2} tone="green" value={doneToday} label="Concluídas hoje" onClick={() => go('os', { filter: 'concluidas' })} />
        <Stat icon={BellRing} tone="amber" value={due.length} label={due.length === 1 ? 'Cliente com preventiva' : 'Clientes com preventiva'} onClick={() => go('preventivas')} />
      </div>

      {late.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Atrasadas ({late.length})</h2>
          <div className="grid gap-2 md:grid-cols-2">{late.slice(0, 4).map((o) => <OsCard key={o.id} os={o} showDate={relDay(o.scheduled_date)} />)}</div>
          {late.length > 4 && <button onClick={() => go('os', { filter: 'abertas' })} className="text-sm font-semibold text-sky-700">Ver todas</button>}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-bold text-slate-900">Agenda de hoje</h2>
        {todays.length === 0 ? (
          <Card className="p-6 text-center text-sm text-slate-500">Nenhuma visita agendada para hoje.</Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">{todays.map((o) => <OsCard key={o.id} os={o} />)}</div>
        )}
      </section>

      {due.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Preventivas para avisar</h2>
            <button onClick={() => go('preventivas')} className="text-sm font-semibold text-sky-700">Ver todas</button>
          </div>
          <Card className="divide-y divide-slate-100">
            {due.slice(0, 4).map((g) => (
              <button key={g.client.id} onClick={() => go('preventivas')} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                <span className="font-semibold text-slate-900 truncate">{g.client.name}</span>
                <span className="text-sm text-slate-500 shrink-0">{g.machines.length} {g.machines.length === 1 ? 'aparelho' : 'aparelhos'} · {fmtDate(g.machines[0].next_maintenance)}</span>
              </button>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
