'use client';
import { useState } from 'react';
import { Check, Dices } from 'lucide-react';
import { api } from '@/lib/api';
import { randomPassword, siteUrl, waLink } from '@/lib/utils';
import { useApp } from '../AppContext';
import { Btn, Field, Modal, Toggle, inputCls } from '../ui';

const ACCESS = [
  { v: 'field', title: 'Só rua (técnico)', text: 'Vê e executa os chamados que recebe, pelo celular.' },
  { v: 'both', title: 'Escritório e rua', text: 'Gerencia tudo e também pode atender chamados. Alterna entre as duas visões.' },
  { v: 'office', title: 'Só escritório', text: 'Gerencia tudo, mas não aparece como técnico nas O.S.' }
];
const accessOf = (m) => (m.role === 'tech' ? 'field' : m.does_field ? 'both' : 'office');
const toDb = (a) => ({ role: a === 'field' ? 'tech' : 'admin', does_field: a !== 'office' });

function AccessPicker({ value, onChange, disabled }) {
  return (
    <div className="space-y-2">
      {ACCESS.map((o) => (
        <button key={o.v} type="button" disabled={disabled} onClick={() => onChange(o.v)}
          className={`w-full text-left rounded-xl border px-3.5 py-2.5 flex gap-3 ${value === o.v ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'} disabled:opacity-60`}>
          <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${value === o.v ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300'}`}>
            {value === o.v && <Check className="w-3 h-3" strokeWidth={3} />}
          </span>
          <span><span className="block text-sm font-semibold text-slate-900">{o.title}</span><span className="block text-xs text-slate-500">{o.text}</span></span>
        </button>
      ))}
    </div>
  );
}

export default function MemberModal({ member }) {
  const { run, closeModal, confirm, me, toast, data } = useApp();
  const editing = !!member;
  const isSelf = member?.id === me.id;
  const [f, setF] = useState({ name: member?.name || '', email: member?.email || '', phone: member?.phone || '', access: member ? accessOf(member) : 'field', active: member?.active ?? true, password: editing ? '' : randomPassword() });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast('Informe o nome.', 'error');
    setBusy(true);
    if (editing) {
      const r = await run(async () => {
        await api.updateProfile(member.id, { name: f.name.trim(), phone: f.phone.trim(), active: f.active, ...toDb(f.access) });
        if (f.password) await api.adminUsers({ action: 'set_password', id: member.id, password: f.password });
      }, 'Usuário atualizado');
      setBusy(false);
      if (r) closeModal();
    } else {
      const r = await run(() => api.adminUsers({ action: 'create', email: f.email, name: f.name, phone: f.phone, password: f.password, ...toDb(f.access) }), 'Usuário criado');
      setBusy(false);
      if (r) setCreated({ email: f.email.trim().toLowerCase(), password: f.password, phone: f.phone });
    }
  };

  const remove = async () => {
    const hasOrders = data.orders.some((o) => o.tech_id === member.id);
    if (!(await confirm({
      title: hasOrders ? 'Bloquear acesso?' : 'Excluir usuário?',
      message: hasOrders ? `${member.name} tem O.S. no histórico, então o acesso será bloqueado e o histórico mantido.` : `${member.name} perderá o acesso ao sistema.`,
      confirmLabel: hasOrders ? 'Bloquear' : 'Excluir', danger: true
    }))) return;
    const r = await run(() => api.adminUsers({ action: 'delete', id: member.id }), 'Acesso removido');
    if (r) closeModal();
  };

  if (created) {
    const msg = `Olá! Seu acesso ao sistema de O.S. foi criado.\nEndereço: ${siteUrl()}\nE-mail: ${created.email}\nSenha: ${created.password}\nVocê pode trocar a senha em "Minha conta".`;
    return (
      <Modal title="Usuário criado" onClose={closeModal} footer={<Btn className="w-full" onClick={closeModal}>Concluir</Btn>}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Passe estes dados para a pessoa. Ela pode trocar a senha depois, em “Minha conta”.</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm space-y-1">
            <p><span className="text-slate-500">E-mail:</span> <strong>{created.email}</strong></p>
            <p><span className="text-slate-500">Senha:</span> <strong className="font-mono">{created.password}</strong></p>
            <p className="break-all"><span className="text-slate-500">Endereço:</span> {siteUrl()}</p>
          </div>
          <a href={waLink(created.phone, msg)} target="_blank" rel="noreferrer" className="flex items-center justify-center rounded-xl bg-[#25D366] text-white font-semibold py-2.5 text-sm">Enviar por WhatsApp</a>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={editing ? 'Editar usuário' : 'Novo usuário'}
      onClose={closeModal}
      footer={
        <div className="flex gap-2 justify-between">
          {editing && !isSelf ? <Btn variant="dangerSoft" onClick={remove}>Remover</Btn> : <span />}
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={closeModal}>Cancelar</Btn>
            <Btn type="submit" form="member-form" loading={busy}>{editing ? 'Salvar' : 'Criar usuário'}</Btn>
          </div>
        </div>
      }
    >
      <form id="member-form" onSubmit={submit} className="space-y-3">
        <Field label="Nome *"><input autoFocus value={f.name} onChange={set('name')} className={inputCls} /></Field>
        <Field label="E-mail de acesso *"><input type="email" required disabled={editing} value={f.email} onChange={set('email')} className={inputCls} /></Field>
        <Field label="WhatsApp / telefone"><input type="tel" value={f.phone} onChange={set('phone')} className={inputCls} /></Field>
        <div>
          <span className="text-sm font-medium text-slate-700 block mb-1">Tipo de acesso</span>
          <AccessPicker value={f.access} onChange={(a) => setF({ ...f, access: a })} disabled={isSelf} />
          {isSelf && <p className="text-xs text-slate-500 mt-1">Você não pode alterar o seu próprio tipo de acesso.</p>}
        </div>
        <Field label={editing ? 'Definir nova senha' : 'Senha inicial *'} hint={editing ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 6 caracteres. Sugerimos uma senha aleatória.'}>
          <div className="flex gap-2">
            <input value={f.password} onChange={set('password')} autoComplete="off" className={`${inputCls} font-mono`} />
            <Btn variant="secondary" icon={Dices} onClick={() => setF({ ...f, password: randomPassword() })} aria-label="Gerar senha" />
          </div>
        </Field>
        {editing && !isSelf && <Toggle label="Acesso liberado" checked={f.active} onChange={(v) => setF({ ...f, active: v })} />}
      </form>
    </Modal>
  );
}
