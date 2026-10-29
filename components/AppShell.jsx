'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppData } from '@/hooks/useAppData';
import { friendlyError } from '@/lib/utils';
import { AppCtx } from './AppContext';
import { Btn, FullLoading, Modal } from './ui';
import Login, { SetPassword } from './Login';
import OfficeApp from './office/OfficeApp';
import FieldApp from './field/FieldApp';
import ModalHost from './modals/ModalHost';

export default function AppShell() {
  const [session, setSession] = useState(undefined);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <FullLoading />;
  if (!session) return <Login />;
  if (recovery) return <SetPassword onDone={() => setRecovery(false)} />;
  return <Authed session={session} />;
}

function Authed({ session }) {
  const app = useAppData(true);
  const appRef = useRef(app);
  appRef.current = app;
  const [toasts, setToasts] = useState([]);
  const [modals, setModals] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [mode, setModeState] = useState(null);
  const [screen, setScreen] = useState(null); // tela cheia da visão de rua: {osId, itemId?}

  const me = app.profiles.find((p) => p.id === session.user.id);
  const canSwitch = !!me && me.role === 'admin' && me.does_field;

  useEffect(() => {
    if (!me || mode) return;
    let saved = null;
    try { saved = localStorage.getItem('os-mode'); } catch {}
    if (me.role !== 'admin') setModeState('field');
    else if (!me.does_field) setModeState('office');
    else setModeState(saved === 'field' ? 'field' : 'office');
  }, [me, mode]);

  const setMode = useCallback((m) => {
    setModeState(m);
    try { localStorage.setItem('os-mode', m); } catch {}
    window.scrollTo(0, 0);
  }, []);

  const toast = useCallback((message, type = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 5000 : 3000);
  }, []);

  // Executa uma ação e recarrega. Devolve {value} se deu certo e null se falhou (a tela só fecha quando vier {value}).
  const run = useCallback(
    async (fn, okMsg) => {
      try {
        const value = await fn();
        try { await appRef.current.reload(); } catch {}
        if (okMsg) toast(okMsg);
        return { value };
      } catch (e) {
        toast(friendlyError(e.message), 'error');
        return null;
      }
    },
    [toast]
  );

  const openModal = useCallback((type, props = {}) => setModals((m) => [...m, { key: Math.random(), type, props }]), []);
  const closeModal = useCallback(() => setModals((m) => m.slice(0, -1)), []);
  const closeAll = useCallback(() => setModals([]), []);

  const confirm = useCallback(
    (opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })),
    []
  );
  const answer = (v) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  if (app.loading || (me && me.active && !mode)) return <FullLoading />;

  if (!me || !me.active) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-8 text-center space-y-4 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Acesso aguardando liberação</h1>
          <p className="text-sm text-slate-500">
            O usuário {session.user.email} ainda não foi liberado. Peça ao administrador para ativar o seu acesso.
          </p>
          <Btn variant="secondary" onClick={signOut}>Sair</Btn>
        </div>
      </div>
    );
  }

  const ctx = {
    data: app, me, mode, screen, setScreen, setMode, canSwitch, run, toast, reload: app.reload, signOut,
    openModal, closeModal, closeAll, confirm,
    getClient: (id) => app.clients.find((c) => c.id === id),
    getEq: (id) => app.equipment.find((e) => e.id === id),
    getTech: (id) => app.profiles.find((p) => p.id === id)
  };

  return (
    <AppCtx.Provider value={ctx}>
      {app.error && <p role="alert" className="bg-rose-100 text-rose-800 text-sm px-4 py-2 no-print">Não foi possível carregar tudo: {app.error}</p>}
      {mode === 'field' ? <FieldApp /> : <OfficeApp />}
      <ModalHost modals={modals} />

      {confirmState && (
        <Modal title={confirmState.title} onClose={() => answer(false)} maxWidth="max-w-sm"
          footer={
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => answer(false)}>{confirmState.cancelLabel || 'Voltar'}</Btn>
              <Btn variant={confirmState.danger ? 'danger' : 'primary'} onClick={() => answer(true)}>{confirmState.confirmLabel || 'Confirmar'}</Btn>
            </div>
          }>
          <p className="text-sm text-slate-600">{confirmState.message}</p>
        </Modal>
      )}

      <div className="fixed bottom-20 md:bottom-6 inset-x-0 z-[70] flex flex-col items-center gap-2 pointer-events-none px-4 no-print" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg max-w-md ${t.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
            {t.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
            {t.message}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}
