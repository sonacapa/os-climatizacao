'use client';
import { useCallback, useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppData } from '@/hooks/useAppData';
import { friendlyError } from '@/lib/utils';
import { AppCtx } from './AppContext';
import { FullLoading } from './ui';
import Login from './Login';
import AdminApp from './AdminApp';
import TechApp from './TechApp';

export default function AppShell() {
  const [session, setSession] = useState(undefined); // undefined = verificando, null = sem login

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <FullLoading />;
  if (!session) return <Login />;
  return <Authed session={session} />;
}

function Authed({ session }) {
  const app = useAppData(true);
  const [toastMsg, setToastMsg] = useState(null);

  const toast = useCallback((message, type = 'ok') => {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  // Executa uma ação, recarrega os dados e mostra erro amigável se falhar. Devolve o resultado (ou undefined se falhou).
  const run = useCallback(
    async (fn, okMsg) => {
      try {
        const result = await fn();
        await app.reload();
        if (okMsg) toast(okMsg);
        return result === undefined ? true : result;
      } catch (e) {
        toast(friendlyError(e.message), 'error');
        return undefined;
      }
    },
    [app, toast]
  );

  const me = app.profiles.find((p) => p.id === session.user.id);
  const signOut = () => supabase.auth.signOut();

  if (app.loading) return <FullLoading />;

  if (!me || !me.active) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-8 text-center space-y-4">
          <h1 className="text-lg font-bold text-white">Acesso aguardando liberação</h1>
          <p className="text-sm text-slate-400">
            Seu usuário ({session.user.email}) ainda não foi ativado. Peça ao administrador para liberar o acesso.
          </p>
          <button onClick={signOut} className="bg-slate-800 text-slate-200 text-sm px-4 py-2 rounded-xl">Sair</button>
        </div>
      </div>
    );
  }

  const ctx = {
    data: app,
    me,
    run,
    toast,
    reload: app.reload,
    signOut,
    getClient: (id) => app.clients.find((c) => c.id === id),
    getEq: (id) => app.equipment.find((e) => e.id === id),
    getTech: (id) => app.profiles.find((p) => p.id === id)
  };

  return (
    <AppCtx.Provider value={ctx}>
      <div className="min-h-screen flex flex-col">
        <div className="bg-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between gap-2 border-b border-slate-800 no-print">
          <span className="text-slate-400">
            {app.company?.name} · <strong className="text-white">{me.name}</strong> ({me.role === 'admin' ? 'Escritório' : 'Técnico'})
          </span>
          <button onClick={signOut} className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
        {app.error && (
          <p role="alert" className="bg-rose-100 text-rose-800 text-xs px-4 py-2 no-print">Erro ao carregar dados: {app.error}</p>
        )}
        {me.role === 'admin' ? <AdminApp /> : <TechApp />}
        {toastMsg && (
          <div role="status"
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg no-print ${
              toastMsg.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
            }`}>
            {toastMsg.message}
          </div>
        )}
      </div>
    </AppCtx.Provider>
  );
}
