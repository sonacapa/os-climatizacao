'use client';
import { useEffect } from 'react';
import '@/lib/pwa';

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // guarda os arquivos que esta página já carregou, para abrir sem internet na próxima vez
        const urls = performance
          .getEntriesByType('resource')
          .map((r) => r.name)
          .filter((u) => u.startsWith(location.origin) && /\/_next\/static\//.test(u));
        reg.active?.postMessage({ type: 'cache', urls });
      })
      .catch(() => {});
  }, []);
  return null;
}
