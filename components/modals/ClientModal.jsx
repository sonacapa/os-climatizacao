'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { geocode } from '@/lib/geo';
import { useApp } from '../AppContext';
import { Btn, Field, Modal, inputCls } from '../ui';

export default function ClientModal({ client, onSaved }) {
  const { run, closeModal, confirm, data, toast } = useApp();
  const [f, setF] = useState({ name: '', document: '', phone: '', address: '', contact_name: '', ...(client || {}) });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast('Informe o nome do cliente.', 'error');
    setBusy(true);
    const address = f.address.trim();
    let geo = {};
    if (address && address !== client?.geo_address) {
      const g = await geocode(address);
      geo = g ? { lat: g.lat, lng: g.lng, geo_address: address } : { lat: null, lng: null, geo_address: null };
    }
    const r = await run(
      () => api.save('clients', { id: client?.id, name: f.name.trim(), document: f.document.trim(), phone: f.phone.trim(), address, contact_name: f.contact_name.trim(), ...geo }),
      client ? 'Cliente atualizado' : 'Cliente cadastrado'
    );
    setBusy(false);
    if (r) {
      closeModal();
      onSaved?.(r.value);
    }
  };

  const del = async () => {
    if (data.equipment.some((e) => e.client_id === client.id) || data.orders.some((o) => o.client_id === client.id)) {
      return toast('Este cliente tem máquinas ou O.S. cadastradas e não pode ser excluído.', 'error');
    }
    if (!(await confirm({ title: 'Excluir cliente?', message: `${client.name} será removido. Isso não pode ser desfeito.`, confirmLabel: 'Excluir', danger: true }))) return;
    const r = await run(() => api.remove('clients', client.id), 'Cliente excluído');
    if (r) closeModal();
  };

  return (
    <Modal
      title={client ? 'Editar cliente' : 'Novo cliente'}
      onClose={closeModal}
      footer={
        <div className="flex gap-2 justify-between">
          {client ? <Btn variant="dangerSoft" onClick={del}>Excluir</Btn> : <span />}
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={closeModal}>Cancelar</Btn>
            <Btn type="submit" form="client-form" loading={busy}>Salvar</Btn>
          </div>
        </div>
      }
    >
      <form id="client-form" onSubmit={submit} className="space-y-3">
        <Field label="Nome do cliente *"><input autoFocus value={f.name} onChange={set('name')} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="WhatsApp / telefone"><input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="(11) 99999-9999" className={inputCls} /></Field>
          <Field label="CPF / CNPJ"><input value={f.document} onChange={set('document')} className={inputCls} /></Field>
        </div>
        <Field label="Endereço"><input value={f.address} onChange={set('address')} placeholder="Rua, número, bairro, cidade" className={inputCls} /></Field>
        <Field label="Pessoa de contato" hint="Opcional, para empresas."><input value={f.contact_name} onChange={set('contact_name')} className={inputCls} /></Field>
      </form>
    </Modal>
  );
}
