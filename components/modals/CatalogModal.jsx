'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '../AppContext';
import { Btn, Field, Modal, inputCls } from '../ui';

export default function CatalogModal({ item }) {
  const { run, closeModal, confirm, data, toast } = useApp();
  const [f, setF] = useState({ name: '', category: 'Material', unit: 'un', ...(item || {}) });
  const [busy, setBusy] = useState(false);
  const cats = [...new Set(['Material', 'Peça', 'Gás', 'Serviço', ...data.catalog.map((c) => c.category)])];

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast('Informe o nome do item.', 'error');
    setBusy(true);
    const r = await run(() => api.save('catalog_items', { id: item?.id, name: f.name.trim(), category: f.category.trim() || 'Material', unit: f.unit.trim() || 'un' }), item ? 'Item atualizado' : 'Item adicionado');
    setBusy(false);
    if (r) closeModal();
  };
  const del = async () => {
    if (!(await confirm({ title: 'Excluir item?', message: `${item.name} sairá do catálogo. O que já foi usado em O.S. continua registrado.`, confirmLabel: 'Excluir', danger: true }))) return;
    const r = await run(() => api.remove('catalog_items', item.id), 'Item excluído');
    if (r) closeModal();
  };

  return (
    <Modal
      title={item ? 'Editar item' : 'Novo item do catálogo'}
      onClose={closeModal}
      footer={
        <div className="flex gap-2 justify-between">
          {item ? <Btn variant="dangerSoft" onClick={del}>Excluir</Btn> : <span />}
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={closeModal}>Cancelar</Btn>
            <Btn type="submit" form="cat-form" loading={busy}>Salvar</Btn>
          </div>
        </div>
      }
    >
      <form id="cat-form" onSubmit={submit} className="space-y-3">
        <Field label="Nome *"><input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Tubo de cobre 1/4" className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <input list="cats" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={inputCls} />
            <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Unidade">
            <input list="units" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className={inputCls} />
            <datalist id="units">{['un', 'm', 'kg', 'g', 'kit', 'h', 'L'].map((u) => <option key={u} value={u} />)}</datalist>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
