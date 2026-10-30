'use client';
import { useEffect, useMemo, useState } from 'react';
import { Navigation, Route } from 'lucide-react';
import { fmtTime, todayISO } from '@/lib/utils';
import { planRoute, roadKm, routeLink } from '@/lib/geo';
import { useApp } from '../AppContext';
import { Btn, Modal } from '../ui';

export const routeKey = () => `route-order-${todayISO()}`;
export const savedRoute = () => { try { return JSON.parse(localStorage.getItem(routeKey()) || 'null'); } catch { return null; } };

// Sugere a melhor ordem das visitas de hoje (estimativa por distância; não considera trânsito)
export default function RouteModal({ osIds, onApply }) {
  const { data, closeModal, getClient, toast } = useApp();
  const [start, setStart] = useState(undefined); // undefined = buscando, null = sem GPS
  useEffect(() => {
    if (!navigator.geolocation) return setStart(null);
    navigator.geolocation.getCurrentPosition((p) => setStart({ lat: p.coords.latitude, lng: p.coords.longitude }), () => setStart(null), { timeout: 8000, maximumAge: 120000 });
  }, []);

  const stops = useMemo(() => osIds.map((id) => data.orders.find((o) => o.id === id)).filter(Boolean).map((o) => ({ os: o, client: getClient(o.client_id) })), [osIds, data.orders]); // eslint-disable-line react-hooks/exhaustive-deps
  const located = stops.filter((s) => s.client?.lat != null).map((s) => ({ ...s, lat: s.client.lat, lng: s.client.lng }));
  const missing = stops.filter((s) => s.client?.lat == null);

  const plan = useMemo(() => (start === undefined ? [] : planRoute(located, start || undefined)), [start, located.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const legs = plan.map((p, i) => { const from = i === 0 ? start : plan[i - 1]; return from ? roadKm(from, p) : 0; });
  const totalKm = legs.reduce((a, b) => a + b, 0);
  const ordered = [...plan, ...missing];

  const apply = () => {
    try { localStorage.setItem(routeKey(), JSON.stringify(ordered.map((s) => s.os.id))); } catch {}
    onApply?.(ordered.map((s) => s.os.id));
    toast('Ordem do dia atualizada');
    closeModal();
  };

  return (
    <Modal title="Rota do dia" subtitle="Melhor ordem para visitar os clientes de hoje" onClose={closeModal}
      footer={
        <div className="grid gap-2">
          <Btn size="lg" icon={Route} onClick={apply} disabled={start === undefined}>Usar esta ordem</Btn>
          <a href={routeLink([start ? `${start.lat},${start.lng}` : null, ...ordered.map((s) => s.client?.address)].slice(start ? 1 : 0))} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 py-3 text-[15px] font-medium text-slate-700"><Navigation className="w-4 h-4" /> Abrir tudo no Google Maps</a>
        </div>
      }>
      {start === undefined ? <p className="text-sm text-slate-500">Buscando sua localização…</p> : (
        <>
          <p className="text-xs text-slate-500 mb-3">{start ? 'Saindo de onde você está agora.' : 'Sem GPS: a rota começa pela primeira parada.'} Distâncias são estimativas pelas ruas, sem considerar trânsito.</p>
          <ol className="space-y-2">
            {ordered.map((s, i) => (
              <li key={s.os.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <span className="num w-7 h-7 shrink-0 rounded-full bg-ink text-white grid place-items-center text-sm">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink truncate">{s.client?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{s.client?.address || 'Sem endereço'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Marcado às <span className="num">{fmtTime(s.os.scheduled_time) || '--:--'}</span>{i < plan.length && legs[i] > 0 && ` · ~${legs[i].toFixed(1).replace('.', ',')} km`}{i >= plan.length && ' · endereço não localizado'}</p>
                </div>
              </li>
            ))}
          </ol>
          {plan.length > 1 && <p className="text-sm text-slate-700 mt-3">Total estimado: <strong className="num">{totalKm.toFixed(1).replace('.', ',')} km</strong></p>}
          {missing.length > 0 && <p className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2 mt-3">{missing.length} cliente(s) sem localização ficam no fim. O escritório pode usar “Localizar endereços” em Clientes.</p>}
        </>
      )}
    </Modal>
  );
}
