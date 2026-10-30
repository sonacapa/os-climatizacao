'use client';
import { MapPin, User } from 'lucide-react';
import { fmtTime, osLabel } from '@/lib/utils';
import { useApp } from '../AppContext';
import { StatusBadge } from '../ui';

export default function OsCard({ os, showDate }) {
  const { openModal, getClient, getTech, getEq } = useApp();
  const client = getClient(os.client_id);
  const tech = getTech(os.tech_id);
  const done = os.items.filter((i) => i.status !== 'pendente').length;
  const places = os.items.slice(0, 3).map((i) => getEq(i.equipment_id)?.location_tag).filter(Boolean);

  return (
    <button
      onClick={() => openModal('osDetail', { osId: os.id })}
      className="w-full min-w-0 text-left bg-white rounded-xl border border-slate-200 hover:border-brand-400 transition-colors p-4 flex gap-4"
    >
      <div className="w-14 shrink-0 text-center pt-0.5">
        <p className="num text-xl font-semibold text-ink leading-none">{fmtTime(os.scheduled_time) || '--:--'}</p>
        {showDate && <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-tight">{showDate}</p>}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 border-l border-slate-200 pl-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-ink leading-snug">{client?.name}</p>
            <p className="text-xs text-slate-500">{osLabel(os)} · {os.service_type}</p>
          </div>
          <StatusBadge status={os.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> {tech?.name || <em className="text-heat-600 not-italic font-semibold">sem técnico</em>}</span>
          {client?.address && <span className="inline-flex items-center gap-1.5 min-w-0"><MapPin className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate max-w-[16rem]">{client.address}</span></span>}
        </div>
        <p className="text-xs text-slate-500">
          <strong className="text-slate-700">{os.items.length} {os.items.length === 1 ? 'aparelho' : 'aparelhos'}</strong>
          {os.status !== 'cancelada' && os.items.length > 0 && ` · ${done}/${os.items.length} atendidos`}
          {places.length > 0 && ` · ${places.join(', ')}${os.items.length > 3 ? '…' : ''}`}
        </p>
      </div>
    </button>
  );
}
