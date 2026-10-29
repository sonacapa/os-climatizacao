'use client';
import { useMemo, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { OPEN, addDaysISO, norm, osLabel, relDay, todayISO } from '@/lib/utils';
import { useApp } from '../AppContext';
import { PageHeader } from '../shared';
import { Btn, EmptyState, SearchBox, Segmented, inputCls } from '../ui';
import OsCard from './OsCard';

export default function OrdersView({ filter, setFilter }) {
  const { data, openModal, getClient, getTech, getEq } = useApp();
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState('0');
  const [techId, setTechId] = useState('');
  const today = todayISO();

  const counts = useMemo(() => ({
    abertas: data.orders.filter((o) => OPEN.includes(o.status)).length,
    hoje: data.orders.filter((o) => o.scheduled_date === today && o.status !== 'cancelada').length,
    concluidas: data.orders.filter((o) => o.status === 'finalizada').length,
    canceladas: data.orders.filter((o) => o.status === 'cancelada').length
  }), [data.orders, today]);

  const list = useMemo(() => {
    const n = norm(q);
    let l = data.orders.filter((o) => {
      if (filter === 'abertas' && !OPEN.includes(o.status)) return false;
      if (filter === 'hoje' && !(o.scheduled_date === today && o.status !== 'cancelada')) return false;
      if (filter === 'concluidas' && o.status !== 'finalizada') return false;
      if (filter === 'canceladas' && o.status !== 'cancelada') return false;
      if (techId && o.tech_id !== techId) return false;
      if (period !== '0' && !['abertas', 'hoje'].includes(filter) && o.scheduled_date < addDaysISO(today, -Number(period))) return false;
      if (!n) return true;
      const hay = norm([osLabel(o), getClient(o.client_id)?.name, getTech(o.tech_id)?.name, ...o.items.map((i) => { const e = getEq(i.equipment_id); return e ? `${e.code} ${e.location_tag} ${e.brand}` : ''; })].join(' '));
      return hay.includes(n);
    });
    const asc = filter === 'abertas' || filter === 'hoje';
    l = [...l].sort((a, b) => {
      const k = `${a.scheduled_date} ${a.scheduled_time}`.localeCompare(`${b.scheduled_date} ${b.scheduled_time}`);
      return asc ? k : -k;
    });
    return l;
  }, [data.orders, filter, q, today, period, techId]); // eslint-disable-line react-hooks/exhaustive-deps

  let lastDate = null;
  return (
    <div>
      <PageHeader title="Ordens de serviço" subtitle="Cada O.S. é uma visita a um cliente, com um ou vários aparelhos.">
        <Btn icon={Plus} onClick={() => openModal('os')}>Nova O.S.</Btn>
      </PageHeader>

      <div className="space-y-3 mb-4">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <Segmented value={filter} onChange={setFilter} options={[
            { value: 'abertas', label: 'Em aberto', count: counts.abertas },
            { value: 'hoje', label: 'Hoje', count: counts.hoje },
            { value: 'concluidas', label: 'Concluídas', count: counts.concluidas },
            { value: 'canceladas', label: 'Canceladas', count: counts.canceladas },
            { value: 'todas', label: 'Todas' }
          ]} />
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por cliente, técnico, nº da O.S. ou local do aparelho" />
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          <select value={techId} onChange={(e) => setTechId(e.target.value)} className={inputCls} aria-label="Técnico">
            <option value="">Todos os técnicos</option>
            {data.profiles.filter((p) => p.role === 'tech' || p.does_field).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={inputCls} aria-label="Período" disabled={['abertas', 'hoje'].includes(filter)}>
            <option value="0">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={ClipboardList} title={q ? 'Nada encontrado' : 'Nenhuma O.S. aqui'} text={q ? 'Tente outro termo de busca.' : 'Quando você abrir uma O.S., ela aparece nesta lista.'}
          action={!q && <Btn icon={Plus} onClick={() => openModal('os')}>Nova O.S.</Btn>} />
      ) : (
        <div className="space-y-2">
          {list.map((o) => {
            const head = o.scheduled_date !== lastDate;
            lastDate = o.scheduled_date;
            return (
              <div key={o.id}>
                {head && <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mt-4 mb-1.5 first:mt-0">{relDay(o.scheduled_date)}</h3>}
                <OsCard os={o} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
