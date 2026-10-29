'use client';
import { Clock, MapPin, User } from 'lucide-react';
import { fmtTime, osLabel } from '@/lib/utils';
import { useApp } from '../AppContext';
import { StatusBadge } from '../ui';

export default function OsCard({ os, showDate }) {
  const { openModal, getClient, getTech, getEq } = useApp();
  const client = getClient(os.client_id);
  const tech = getTech(os.tech_id);
  const done = os.items.filter((i) => i.status !== 'pendente').length;
  const first = os.items.slice(0, 3).map((i) => getEq(i.equipment_id)?.location_tag).filter(Boolean);

  return (
    <button
      onClick={() => openModal('osDetail', { osId: os.id })}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 hover:shadow transition p-4 space-y-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-900 truncate">{client?.name}</p>
          <p className="text-xs text-slate-500">{osLabel(os)} · {os.service_type}</p>
        </div>
        <StatusBadge status={os.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> {showDate ? `${showDate} · ` : ''}{fmtTime(os.scheduled_time)}</span>
        <span className="inline-flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> {tech?.name || <em className="text-amber-700 not-italic">sem técnico</em>}</span>
        {client?.address && <span className="inline-flex items-center gap-1.5 min-w-0"><MapPin className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate max-w-[16rem]">{client.address}</span></span>}
      </div>
      <p className="text-xs text-slate-500">
        <strong className="text-slate-700">{os.items.length} {os.items.length === 1 ? 'aparelho' : 'aparelhos'}</strong>
        {os.status !== 'cancelada' && os.items.length > 0 && ` · ${done}/${os.items.length} atendidos`}
        {first.length > 0 && ` · ${first.join(', ')}${os.items.length > 3 ? '…' : ''}`}
      </p>
    </button>
  );
}
