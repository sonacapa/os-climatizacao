'use client';
import { useEffect, useState } from 'react';
import { Bell, BellOff, Send } from 'lucide-react';
import { disablePush, enablePush, pushStatus, testPush } from '@/lib/push';
import { useApp } from './AppContext';
import { Btn } from './ui';

// Ativar avisos automáticos neste aparelho (preventivas para o escritório, agenda do dia para o técnico)
export default function PushSettings() {
  const { me, run } = useApp();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => pushStatus().then(setStatus).catch(() => setStatus('unsupported'));
  useEffect(() => { refresh(); }, []);

  const what = [
    me.role === 'admin' && 'preventivas vencendo (todo dia às 7h)',
    (me.role === 'tech' || me.does_field) && 'sua agenda do dia com a primeira visita (às 7h)'
  ].filter(Boolean).join(' e ');

  const act = async (fn, msg) => {
    setBusy(true);
    await run(fn, msg);
    setBusy(false);
    refresh();
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-slate-900">Notificações</h4>
        <p className="text-xs text-slate-500">Receba neste aparelho: {what || 'avisos do ClimaOS'}.</p>
      </div>
      {status === null && <p className="text-sm text-slate-500">Verificando…</p>}
      {status === 'unsupported' && <p className="text-sm text-slate-600">Este navegador não aceita notificações. Use o Chrome no Android ou o app instalado.</p>}
      {status === 'needs-install' && <p className="text-sm text-slate-600">No iPhone, primeiro instale o app (Compartilhar → Adicionar à Tela de Início) e ative por lá.</p>}
      {status === 'denied' && <p className="text-sm text-rose-700">As notificações foram bloqueadas. Libere nas configurações do navegador (cadeado ao lado do endereço) e volte aqui.</p>}
      {status === 'off' && <Btn icon={Bell} loading={busy} className="w-full" onClick={() => act(enablePush, 'Notificações ativadas')}>Ativar notificações</Btn>}
      {status === 'on' && (
        <div className="flex gap-2">
          <Btn variant="secondary" icon={Send} loading={busy} className="flex-1" onClick={() => act(testPush, 'Teste enviado')}>Enviar teste</Btn>
          <Btn variant="dangerSoft" icon={BellOff} disabled={busy} className="flex-1" onClick={() => act(disablePush, 'Notificações desativadas')}>Desativar</Btn>
        </div>
      )}
    </div>
  );
}
