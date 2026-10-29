'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { failedClear, getSync, refreshSync, subscribeSync } from '@/lib/offline';

// Aviso discreto sobre conexão e alterações aguardando envio.
export default function SyncPill({ reload, toast }) {
  const [s, setS] = useState(getSync());
  useEffect(() => {
    refreshSync();
    return subscribeSync(setS);
  }, []);

  const base = 'fixed left-1/2 -translate-x-1/2 bottom-[6.5rem] md:bottom-6 z-[65] max-w-[92vw] inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lift no-print';

  if (s.failed.length > 0) {
    return (
      <button
        onClick={async () => {
          toast(`Não foi possível enviar uma alteração: ${s.failed[0].error}`, 'error');
          await failedClear();
          await refreshSync();
          reload();
        }}
        className={`${base} bg-rose-600 text-white`}
      >
        <AlertCircle className="w-4 h-4 shrink-0" />
        {s.failed.length} {s.failed.length === 1 ? 'alteração não enviada' : 'alterações não enviadas'} · ver
      </button>
    );
  }
  if (!s.online) {
    return (
      <div role="status" className={`${base} bg-ink text-white`}>
        <CloudOff className="w-4 h-4 shrink-0 text-heat-400" />
        Sem internet{s.pending > 0 ? ` · ${s.pending} para enviar` : ' · o que você fizer fica salvo'}
      </div>
    );
  }
  if (s.pending > 0) {
    return (
      <button onClick={reload} className={`${base} bg-ink text-white`}>
        {s.syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        {s.syncing ? 'Enviando…' : `${s.pending} ${s.pending === 1 ? 'alteração' : 'alterações'} para enviar · enviar agora`}
      </button>
    );
  }
  return null;
}
