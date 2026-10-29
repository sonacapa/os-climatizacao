'use client';
import { useState } from 'react';
import { Wind } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError(friendlyError(err.message));
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-8 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-sky-500 p-3 rounded-xl text-white">
            <Wind className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Ordens de Serviço</h1>
            <p className="text-xs text-slate-400">Entre com seu e-mail e senha</p>
          </div>
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-slate-300 mb-1">E-mail</span>
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-300 mb-1">Senha</span>
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm" />
        </label>
        {error && <p role="alert" className="text-xs text-rose-300 bg-rose-950/50 p-2.5 rounded-lg">{error}</p>}
        <button type="submit" disabled={busy}
          className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
