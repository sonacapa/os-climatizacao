'use client';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '../AppContext';
import { Btn, Field, Modal, inputCls } from '../ui';
import InstallCard from '../InstallCard';

export default function AccountModal() {
  const { me, run, closeModal, signOut, toast } = useApp();
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone || '');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyPw, setBusyPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await run(() => api.updateMyProfile(name, phone), 'Dados atualizados');
    setBusy(false);
    if (r) closeModal();
  };
  const savePw = async () => {
    if (pw.length < 6) return toast('A senha precisa ter ao menos 6 caracteres.', 'error');
    if (pw !== pw2) return toast('As senhas não são iguais.', 'error');
    setBusyPw(true);
    const r = await run(() => api.changePassword(pw), 'Senha alterada');
    setBusyPw(false);
    if (r) {
      setPw('');
      setPw2('');
    }
  };

  return (
    <Modal title="Minha conta" subtitle={me.email} onClose={closeModal}>
      <div className="mb-3"><InstallCard /></div>
      <form onSubmit={saveProfile} className="space-y-3">
        <Field label="Nome"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
        <Field label="Telefone"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></Field>
        <Btn type="submit" loading={busy} className="w-full">Salvar dados</Btn>
      </form>
      <div className="border-t border-slate-100 mt-5 pt-5 space-y-3">
        <h4 className="font-semibold text-slate-900">Trocar senha</h4>
        <Field label="Nova senha"><input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} /></Field>
        <Field label="Repita a nova senha"><input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputCls} /></Field>
        <Btn variant="secondary" loading={busyPw} onClick={savePw} className="w-full">Alterar senha</Btn>
      </div>
      <div className="border-t border-slate-100 mt-5 pt-5">
        <Btn variant="dangerSoft" icon={LogOut} onClick={signOut} className="w-full">Sair do sistema</Btn>
      </div>
    </Modal>
  );
}
