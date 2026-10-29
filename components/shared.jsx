'use client';
import { useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { daysUntil, fmtDate, isWarrantyActive, norm } from '@/lib/utils';
import { Chip, inputCls } from './ui';
import { useApp } from './AppContext';

export const eqTitle = (eq) => [eq.brand, eq.model].filter(Boolean).join(' ') || 'Aparelho';
export const eqSpecs = (eq) => [eq.btus && `${eq.btus} BTUs`, eq.gas, eq.voltage].filter(Boolean).join(' · ');

export function MaintChip({ eq }) {
  const d = daysUntil(eq.next_maintenance);
  if (d === null) return null;
  if (d < 0) return <Chip tone="red">Preventiva vencida há {-d} {-d === 1 ? 'dia' : 'dias'}</Chip>;
  if (d <= 30) return <Chip tone="amber">Preventiva em {d === 0 ? 'hoje' : `${d} ${d === 1 ? 'dia' : 'dias'}`}</Chip>;
  return <Chip>Próxima preventiva {fmtDate(eq.next_maintenance)}</Chip>;
}

export function WarrantyChip({ eq }) {
  return isWarrantyActive(eq.warranty_until) ? <Chip tone="green">Garantia até {fmtDate(eq.warranty_until)}</Chip> : null;
}

// Serviços concluídos de um equipamento, do mais recente para o mais antigo
export function historyFor(orders, equipmentId) {
  return orders
    .flatMap((os) => os.items.filter((it) => it.equipment_id === equipmentId && it.status === 'feito').map((item) => ({ os, item })))
    .sort((a, b) => String(b.item.completed_at).localeCompare(String(a.item.completed_at)));
}

export const spDate = (ts) => (ts ? new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) : null);

// Busca de cliente com lista de resultados (funciona bem mesmo com centenas de clientes)
export function ClientPicker({ value, onChange, onCreate }) {
  const { data } = useApp();
  const [q, setQ] = useState('');
  const selected = data.clients.find((c) => c.id === value);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 bg-brand-50 border border-brand-200 rounded-xl px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 truncate">{selected.name}</p>
          <p className="text-xs text-slate-500 truncate">{selected.address || selected.phone || 'Sem endereço'}</p>
        </div>
        <button type="button" onClick={() => onChange('')} className="text-brand-700 text-sm font-semibold shrink-0">Trocar</button>
      </div>
    );
  }

  const n = norm(q.trim());
  const list = n
    ? data.clients.filter((c) => norm(`${c.name} ${c.phone} ${c.address} ${c.document}`).includes(n)).slice(0, 6)
    : [];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite o nome, telefone ou endereço do cliente" className={`${inputCls} pl-10`} aria-label="Buscar cliente" />
      </div>
      {n && (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
          {list.map((c) => (
            <button key={c.id} type="button" onClick={() => onChange(c.id)} className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50">
              <p className="font-medium text-slate-900 text-sm">{c.name}</p>
              <p className="text-xs text-slate-500 truncate">{c.address || c.phone || '—'}</p>
            </button>
          ))}
          {list.length === 0 && <p className="px-3.5 py-3 text-sm text-slate-500">Nenhum cliente encontrado para “{q.trim()}”.</p>}
        </div>
      )}
      {onCreate && (
        <button type="button" onClick={onCreate} className="text-sm font-semibold text-brand-700 hover:underline">
          + Cadastrar novo cliente
        </button>
      )}
    </div>
  );
}

export function CheckRow({ checked, disabled, onChange, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`w-full flex items-center gap-3 text-left rounded-xl border px-3 py-2.5 transition-colors ${
        checked ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50'
      } ${disabled ? 'opacity-70' : ''}`}
    >
      <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${checked ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 bg-white'}`}>
        {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </button>
  );
}

export function ClearableChip({ children, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 bg-slate-100 rounded-full pl-3 pr-1.5 py-1 text-sm">
      {children}
      <button type="button" onClick={onClear} aria-label="Remover" className="p-0.5 rounded-full hover:bg-slate-200"><X className="w-3.5 h-3.5" /></button>
    </span>
  );
}

import { OPEN, addDaysISO, todayISO } from '@/lib/utils';

// Preventivas por cliente: um cartão por cliente, nunca um por aparelho.
// Aparelhos que já estão em uma O.S. aberta saem da lista de "a avisar".
export function dueGroups(data, windowDays) {
  const limit = addDaysISO(todayISO(), windowDays);
  const scheduled = new Set(
    data.orders.filter((o) => OPEN.includes(o.status)).flatMap((o) => o.items.filter((i) => i.status === 'pendente').map((i) => i.equipment_id))
  );
  const map = new Map();
  for (const eq of data.equipment) {
    if (!eq.next_maintenance || eq.next_maintenance > limit) continue;
    const g = map.get(eq.client_id) || { client: data.clients.find((c) => c.id === eq.client_id), machines: [], scheduled: [] };
    (scheduled.has(eq.id) ? g.scheduled : g.machines).push(eq);
    map.set(eq.client_id, g);
  }
  return [...map.values()]
    .filter((g) => g.client && g.machines.length > 0)
    .map((g) => ({ ...g, machines: g.machines.sort((a, b) => a.next_maintenance.localeCompare(b.next_maintenance)) }))
    .sort((a, b) => a.machines[0].next_maintenance.localeCompare(b.machines[0].next_maintenance));
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-[1.65rem] leading-tight font-bold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex gap-2 flex-wrap">{children}</div>}
    </div>
  );
}
