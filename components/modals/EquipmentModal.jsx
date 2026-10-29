'use client';
import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '../AppContext';
import { ClientPicker } from '../shared';
import { Btn, Field, Modal, inputCls } from '../ui';

const BRANDS = ['Samsung', 'LG', 'Midea', 'Springer', 'Carrier', 'Elgin', 'Gree', 'Daikin', 'Consul', 'Philco', 'Agratto', 'Fujitsu', 'Hitachi', 'Komeco'];
const BTUS = ['7000', '9000', '12000', '18000', '24000', '30000', '36000', '48000', '60000'];

export default function EquipmentModal({ equipment, clientId, onSaved }) {
  const { run, closeModal, confirm, data, toast, openModal } = useApp();
  const editing = !!equipment;
  const [f, setF] = useState({
    client_id: clientId || '', location_tag: '', brand: '', model: '', btus: '', gas: '', voltage: '', serial_number: '',
    ...(equipment || {})
  });
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);
  const locRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const brands = [...new Set([...BRANDS, ...data.equipment.map((e) => e.brand).filter(Boolean)])];
  const hasMore = !!(f.model || f.gas || f.voltage || f.serial_number);

  const payload = () => ({
    id: equipment?.id, client_id: f.client_id, location_tag: f.location_tag.trim(), brand: f.brand.trim(), model: f.model.trim(),
    btus: String(f.btus).replace(/\D/g, ''), gas: f.gas.trim(), voltage: f.voltage.trim(), serial_number: f.serial_number.trim()
  });

  const submit = async (again) => {
    if (!f.client_id) return toast('Escolha o cliente.', 'error');
    if (!f.location_tag.trim()) return toast('Informe onde o aparelho está (ex.: Sala 2).', 'error');
    setBusy(true);
    const r = await run(() => api.save('equipment', payload()), editing ? 'Aparelho atualizado' : 'Aparelho cadastrado');
    setBusy(false);
    if (!r) return;
    onSaved?.(r.value);
    if (again) {
      setAdded((n) => n + 1);
      setF({ ...f, location_tag: '', serial_number: '' });
      setTimeout(() => locRef.current?.focus(), 50);
    } else {
      closeModal();
    }
  };

  const del = async () => {
    if (data.orders.some((o) => o.items.some((i) => i.equipment_id === equipment.id))) {
      return toast('Este aparelho tem histórico de serviços e não pode ser excluído.', 'error');
    }
    if (!(await confirm({ title: 'Excluir aparelho?', message: `${equipment.code} será removido. A etiqueta QR já impressa deixará de funcionar.`, confirmLabel: 'Excluir', danger: true }))) return;
    const r = await run(() => api.remove('equipment', equipment.id), 'Aparelho excluído');
    if (r) closeModal();
  };

  const clientName = data.clients.find((c) => c.id === f.client_id)?.name;

  return (
    <Modal
      title={editing ? `Editar ${equipment.code}` : 'Novo aparelho'}
      subtitle={!editing && clientName ? clientName : undefined}
      onClose={closeModal}
      footer={
        <div className="flex flex-wrap gap-2 justify-between">
          {editing ? <Btn variant="dangerSoft" onClick={del}>Excluir</Btn> : <span />}
          <div className="flex gap-2 flex-wrap justify-end">
            <Btn variant="secondary" onClick={closeModal}>{added ? 'Fechar' : 'Cancelar'}</Btn>
            {!editing && <Btn variant="soft" loading={busy} onClick={() => submit(true)}>Salvar e adicionar outro</Btn>}
            <Btn loading={busy} onClick={() => submit(false)}>Salvar</Btn>
          </div>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(false); }} className="space-y-3">
        {added > 0 && <p className="text-sm bg-emerald-50 text-emerald-800 rounded-lg px-3 py-2">{added} {added === 1 ? 'aparelho cadastrado' : 'aparelhos cadastrados'} neste cliente. Preencha o próximo.</p>}
        {(!clientId || editing) && (
          <Field label="Cliente *"><ClientPicker value={f.client_id} onChange={(v) => setF({ ...f, client_id: v })} onCreate={() => openModal('client', { onSaved: (c) => setF((s) => ({ ...s, client_id: c.id })) })} /></Field>
        )}
        <Field label="Onde fica? *" hint="Ex.: Sala 2, Quarto casal, Recepção.">
          <input ref={locRef} autoFocus value={f.location_tag} onChange={set('location_tag')} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Marca">
            <input list="brands" value={f.brand} onChange={set('brand')} className={inputCls} />
            <datalist id="brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
          </Field>
          <Field label="Capacidade (BTUs)">
            <input list="btus" inputMode="numeric" value={f.btus} onChange={set('btus')} placeholder="12000" className={inputCls} />
            <datalist id="btus">{BTUS.map((b) => <option key={b} value={b} />)}</datalist>
          </Field>
        </div>
        <details open={hasMore} className="group rounded-xl border border-slate-200">
          <summary className="flex items-center justify-between px-3.5 py-2.5 text-sm font-medium text-slate-600 cursor-pointer list-none">
            Mais detalhes (opcional) <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="px-3.5 pb-3.5 space-y-3">
            <Field label="Modelo"><input value={f.model} onChange={set('model')} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Gás">
                <input list="gases" value={f.gas} onChange={set('gas')} className={inputCls} />
                <datalist id="gases">{['R410A', 'R32', 'R22', 'R134a', 'R404A'].map((g) => <option key={g} value={g} />)}</datalist>
              </Field>
              <Field label="Tensão">
                <select value={f.voltage} onChange={set('voltage')} className={inputCls}>
                  <option value="">—</option><option>127V</option><option>220V</option><option>Trifásico</option>
                </select>
              </Field>
            </div>
            <Field label="Nº de série"><input value={f.serial_number} onChange={set('serial_number')} className={inputCls} /></Field>
          </div>
        </details>
      </form>
    </Modal>
  );
}
