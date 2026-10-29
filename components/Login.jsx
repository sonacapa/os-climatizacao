'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { friendlyError, siteUrl } from '@/lib/utils';
import { Btn, Field, Logo, inputCls } from './ui';

function Shell({ company, title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo company={company} size="lg" />
          <p className="mt-3 font-bold text-slate-900">{company?.name || 'Ordens de Serviço'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function useBranding() {
  const [company, setCompany] = useState(null);
  useEffect(() => {
    supabase.rpc('get_branding').then(({ data }) => data && setCompany(data));
  }, []);
  return company;
}

export default function Login() {
  const company = useBranding();
  const [mode, setMode] = useState('signin'); // signin | forgot | sent
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError(friendlyError(err.message));
    setBusy(false);
  };

  const forgot = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setError('Informe o seu e-mail.');
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: siteUrl() });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setMode('sent');
  };

  if (mode === 'sent') {
    return (
      <Shell company={company} title="Verifique seu e-mail" subtitle={`Enviamos um link para ${email}. Abra-o neste aparelho para criar uma nova senha.`}>
        <div className="flex items-center gap-3 bg-brand-50 text-brand-800 rounded-xl p-3 text-sm">
          <MailCheck className="w-5 h-5 shrink-0" /> Não chegou? Veja a caixa de spam ou peça ao administrador para definir uma senha nova.
        </div>
        <Btn variant="secondary" className="w-full" onClick={() => setMode('signin')}>Voltar para o login</Btn>
      </Shell>
    );
  }

  if (mode === 'forgot') {
    return (
      <Shell company={company} title="Esqueci minha senha" subtitle="Informe o e-mail de acesso e enviaremos um link para criar uma nova senha.">
        <form onSubmit={forgot} className="space-y-4">
          <Field label="E-mail">
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
          <Btn type="submit" loading={busy} className="w-full">Enviar link</Btn>
          <button type="button" onClick={() => { setMode('signin'); setError(''); }} className="flex items-center gap-1.5 text-sm text-slate-500 mx-auto">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell company={company} title="Entrar" subtitle="Use o e-mail e a senha que o administrador cadastrou para você.">
      <form onSubmit={signIn} className="space-y-4">
        <Field label="E-mail">
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Senha">
          <div className="relative">
            <input type={show ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-11`} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </Field>
        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
        <Btn type="submit" loading={busy} className="w-full" size="lg">Entrar</Btn>
        <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="block text-sm text-brand-700 font-medium mx-auto">
          Esqueci minha senha
        </button>
      </form>
    </Shell>
  );
}

// Tela mostrada ao abrir o link de recuperação do e-mail
export function SetPassword({ onDone }) {
  const company = useBranding();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setError('A senha precisa ter ao menos 6 caracteres.');
    if (password !== again) return setError('As senhas não são iguais.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    onDone();
  };

  return (
    <Shell company={company} title="Criar nova senha" subtitle="Escolha uma senha para acessar o sistema.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nova senha">
          <input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Repita a senha">
          <input type="password" required autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={inputCls} />
        </Field>
        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
        <Btn type="submit" loading={busy} className="w-full" size="lg">Salvar senha e entrar</Btn>
      </form>
    </Shell>
  );
}
