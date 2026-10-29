'use client';
import { useRef, useState } from 'react';
import { Camera, CheckCircle2, FileText, History, Minus, Plus, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { SERVICE_TYPES, addDaysISO, compressImage, fmtDate, laudoUrl, waLink } from '@/lib/utils';
import { useApp } from '../AppContext';
import { eqSpecs, eqTitle, spDate } from '../shared';
import { Btn, Card, Chip, Field, Modal, SavedField, StorageImage, inputCls } from '../ui';
import ScreenFrame from './ScreenFrame';
import { laudoMessage } from '../modals/LaudoModal';

const CHECK_OPTS = [['ok', 'OK', 'bg-emerald-600 text-white'], ['attention', 'Atenção', 'bg-amber-500 text-white'], ['na', 'N/A', 'bg-slate-600 text-white']];
const WARRANTY = [0, 30, 90, 180, 365];
const PREVENTIVE = [0, 3, 6, 12];

export default function ItemScreen({ osId, itemId, onBack }) {
  const { data, run, openModal, getClient, getEq, toast, confirm } = useApp();
  const os = data.orders.find((o) => o.id === osId);
  const item = os?.items.find((i) => i.id === itemId);
  const eq = item && getEq(item.equipment_id);
  const [warranty, setWarranty] = useState(null);
  const [preventive, setPreventive] = useState(null);
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!os || !item || !eq) return null;
  const client = getClient(os.client_id);
  const locked = item.status !== 'pendente';
  // garantia e preventiva são decididas pelo técnico em cada serviço (sem valor pré-marcado)
  const w = warranty ?? item.warranty_days ?? null;
  const p = preventive ?? item.preventive_months ?? null;
  const termsRef = useRef(null);
  const today = spDate(new Date().toISOString());
  const checklistPending = item.checklist.filter((c) => c.status === 'pending').length;

  const patch = (v) => run(() => api.patchItem(item.id, v));

  const finish = async () => {
    if (w === null || p === null) {
      termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return toast('Escolha a garantia e a próxima preventiva deste serviço.', 'error');
    }
    if (checklistPending > 0 && !(await confirm({ title: 'Checklist incompleto', message: `Há ${checklistPending} ${checklistPending === 1 ? 'etapa' : 'etapas'} sem resultado. Concluir mesmo assim?`, confirmLabel: 'Concluir', cancelLabel: 'Voltar' }))) return;
    setBusy(true);
    const r = await run(() => api.patchItem(item.id, { status: 'feito', warranty_days: Number(w), preventive_months: Number(p) }), 'Aparelho concluído');
    setBusy(false);
    if (r) onBack();
  };
  const fail = async () => {
    setBusy(true);
    const note = `${item.notes ? item.notes + '\n' : ''}Não realizado: ${reason.trim() || 'sem motivo informado'}`;
    const r = await run(() => api.patchItem(item.id, { status: 'nao_feito', notes: note }), 'Registrado como não realizado');
    setBusy(false);
    if (r) { setFailing(false); onBack(); }
  };

  return (
    <ScreenFrame title={eq.location_tag || eq.code} subtitle={`${eqTitle(eq)} · ${client?.name}`} onBack={onBack}
      footer={!locked ? (
        <div className="flex gap-3">
          <Btn size="lg" variant="dangerSoft" icon={XCircle} onClick={() => setFailing(true)} aria-label="Não foi possível realizar" className="px-4" />
          <Btn size="lg" variant="success" icon={CheckCircle2} className="flex-1" loading={busy} onClick={finish}>Serviço realizado</Btn>
        </div>
      ) : null}>
      {locked && (
        <Card className={`p-4 space-y-3 ${item.status === 'feito' ? 'border-emerald-300 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
          <p className="font-bold text-slate-900 flex items-center gap-2">
            {item.status === 'feito' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
            {item.status === 'feito' ? 'Serviço concluído neste aparelho' : 'Serviço não realizado'}
          </p>
          <div className="flex flex-wrap gap-2">
            {item.status === 'feito' && (
              <>
                <Btn variant="secondary" size="sm" icon={FileText} onClick={() => openModal('laudo', { osId: os.id, itemId: item.id })}>Ver laudo</Btn>
                <a href={waLink(client?.phone, laudoMessage(data.company, client, eq, item))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] text-white font-semibold px-3 py-1.5 text-sm">Enviar laudo por WhatsApp</a>
              </>
            )}
            {['agendada', 'em_rota', 'no_local'].includes(os.status) && (
              <Btn variant="secondary" size="sm" icon={RotateCcw} onClick={() => patch({ status: 'pendente' })}>Reabrir</Btn>
            )}
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-slate-900">{eqTitle(eq)}</p>
            <p className="text-sm text-slate-500">{eqSpecs(eq) || 'Sem detalhes técnicos'} · {eq.code}</p>
          </div>
          <Btn variant="ghost" size="sm" icon={History} onClick={() => openModal('passport', { equipmentId: eq.id })}>Histórico</Btn>
        </div>
        <Field label="Serviço neste aparelho" className="pt-2">
          <select disabled={locked} value={item.service_type || os.service_type} onChange={(e) => patch({ service_type: e.target.value })} className={inputCls}>
            {[...new Set([item.service_type || os.service_type, ...SERVICE_TYPES])].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </Card>

      <Section title="Checklist" right={!locked && checklistPending > 0 && (
        <button className="text-sm font-semibold text-brand-700" onClick={() => run(async () => { for (const c of item.checklist.filter((x) => x.status === 'pending')) await api.setChecklistStatus(c.id, 'ok'); })}>Marcar tudo OK</button>
      )}>
        <div className="space-y-2">
          {item.checklist.map((c) => (
            <div key={c.id} className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">{c.label}</p>
                {!locked && <button aria-label="Remover item" onClick={() => run(() => api.removeChecklistItem(c.id))} className="text-slate-300 hover:text-rose-600 p-0.5"><Trash2 className="w-4 h-4" /></button>}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {CHECK_OPTS.map(([st, label, on]) => (
                  <button key={st} disabled={locked} onClick={() => run(() => api.setChecklistStatus(c.id, c.status === st ? 'pending' : st))}
                    className={`py-2.5 rounded-xl text-sm font-bold ${c.status === st ? on : 'bg-white border border-slate-300 text-slate-600'}`}>{label}</button>
                ))}
              </div>
            </div>
          ))}
          {!locked && <AddLine placeholder="Adicionar etapa" onAdd={(label) => run(() => api.addChecklistItem(os.id, item.id, label, item.checklist.length))} />}
        </div>
      </Section>

      <Section title="Materiais e peças">
        <Materials os={os} item={item} locked={locked} />
      </Section>

      <Section title="Fotos">
        <div className="grid grid-cols-2 gap-3">
          <PhotoSlot os={os} item={item} field="photo_before_path" label="Antes" locked={locked} />
          <PhotoSlot os={os} item={item} field="photo_after_path" label="Depois" locked={locked} />
        </div>
      </Section>

      <Section title="Observações">
        <SavedField as="textarea" rows={3} disabled={locked} value={item.notes} onSave={(v) => patch({ notes: v })} placeholder="O que foi feito, o que foi encontrado, recomendações…" className={inputCls} />
      </Section>

      <Section title="Garantia e próxima preventiva">
        <div className="space-y-4" ref={termsRef}>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1.5">Garantia deste serviço</p>
            <Choice disabled={locked} options={WARRANTY} value={w === null ? null : Number(w)} onChange={(v) => { setWarranty(v); patch({ warranty_days: v }); }} fmt={(v) => (v === 0 ? 'Sem' : v === 365 ? '1 ano' : `${v} dias`)} custom={{ unit: 'dias' }} />
            <p className="text-xs text-slate-500 mt-1.5">{w === null ? 'Escolha uma opção.' : Number(w) > 0 ? `Válida até ${fmtDate(addDaysISO(item.completed_at ? spDate(item.completed_at) : today, Number(w)))}` : 'Este serviço não terá garantia.'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1.5">Próxima preventiva em</p>
            <Choice disabled={locked} options={PREVENTIVE} value={p === null ? null : Number(p)} onChange={(v) => { setPreventive(v); patch({ preventive_months: v }); }} fmt={(v) => (v === 0 ? 'Não' : v === 12 ? '1 ano' : `${v} meses`)} custom={{ unit: 'meses' }} />
          </div>
        </div>
      </Section>

      {failing && (
        <Modal title="Não foi possível realizar?" subtitle="O aparelho fica registrado como não realizado." onClose={() => setFailing(false)} maxWidth="max-w-sm"
          footer={<div className="flex gap-2 justify-end"><Btn variant="secondary" onClick={() => setFailing(false)}>Voltar</Btn><Btn variant="danger" loading={busy} onClick={fail}>Confirmar</Btn></div>}>
          <Field label="Motivo"><textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: aparelho sem acesso, cliente desistiu" className={inputCls} /></Field>
        </Modal>
      )}
    </ScreenFrame>
  );
}

function Section({ title, right, children }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">{title}</h2>{right}</div>
      <Card className="p-4">{children}</Card>
    </section>
  );
}

function AddLine({ placeholder, onAdd }) {
  const [v, setV] = useState('');
  const submit = (e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV(''); } };
  return (
    <form onSubmit={submit} className="flex gap-2 pt-1">
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={inputCls} />
      <Btn type="submit" variant="secondary" icon={Plus} aria-label="Adicionar" />
    </form>
  );
}

function Choice({ options, value, onChange, fmt, disabled, custom }) {
  const [editing, setEditing] = useState(false);
  const isCustom = value !== null && !options.includes(value);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} disabled={disabled} onClick={() => { setEditing(false); onChange(o); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold border ${value === o && !editing ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-300 text-slate-700'} disabled:opacity-60`}>{fmt(o)}</button>
      ))}
      {editing ? (
        <input autoFocus type="number" min="0" inputMode="numeric" placeholder={custom.unit} onBlur={(e) => { const n = Number(e.target.value); if (n >= 0 && e.target.value !== '') onChange(n); setEditing(false); }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className="w-24 border border-brand-500 rounded-xl px-3 py-2 text-sm" />
      ) : (
        <button disabled={disabled} onClick={() => setEditing(true)} className={`px-4 py-2 rounded-xl text-sm font-bold border ${isCustom ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-300 text-slate-700'} disabled:opacity-60`}>
          {isCustom ? `${value} ${custom.unit}` : 'Outro'}
        </button>
      )}
    </div>
  );
}

function Materials({ os, item, locked }) {
  const { data, run, toast } = useApp();
  const [catId, setCatId] = useState('');
  const [free, setFree] = useState('');
  const [qty, setQty] = useState('1');

  const add = async () => {
    const cat = data.catalog.find((c) => c.id === catId);
    const name = cat ? cat.name : free.trim();
    const q = Number(String(qty).replace(',', '.'));
    if (!name) return toast('Escolha um item do catálogo ou digite o nome.', 'error');
    if (!(q > 0)) return toast('Informe a quantidade.', 'error');
    const r = await run(() => api.addMaterial(os.id, item.id, { catalog_id: cat?.id || null, name, quantity: q, unit: cat?.unit || 'un' }));
    if (r) { setCatId(''); setFree(''); setQty('1'); }
  };

  return (
    <div className="space-y-3">
      {item.materials.length === 0 && <p className="text-sm text-slate-500">Nenhum material lançado.</p>}
      <ul className="divide-y divide-slate-100">
        {item.materials.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2 text-sm">
            <span>{m.quantity} {m.unit} — {m.name}</span>
            {!locked && <button aria-label="Remover material" onClick={() => run(() => api.removeMaterial(m.id))} className="text-slate-300 hover:text-rose-600 p-1"><Trash2 className="w-4 h-4" /></button>}
          </li>
        ))}
      </ul>
      {!locked && (
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className={inputCls} aria-label="Item do catálogo">
            <option value="">Escolher do catálogo…</option>
            {data.catalog.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>)}
          </select>
          {!catId && <input value={free} onChange={(e) => setFree(e.target.value)} placeholder="ou digite o material" aria-label="Material" className={inputCls} />}
          <div className="flex gap-2">
            <div className="flex items-center border border-slate-300 rounded-xl bg-white">
              <button type="button" aria-label="Diminuir" className="px-3 py-2.5" onClick={() => setQty(String(Math.max(1, (Number(qty) || 1) - 1)))}><Minus className="w-4 h-4" /></button>
              <input value={qty} inputMode="decimal" onChange={(e) => setQty(e.target.value)} aria-label="Quantidade" className="w-12 text-center py-2 bg-transparent focus:outline-none" />
              <button type="button" aria-label="Aumentar" className="px-3 py-2.5" onClick={() => setQty(String((Number(qty) || 0) + 1))}><Plus className="w-4 h-4" /></button>
            </div>
            <Btn variant="secondary" className="flex-1" icon={Plus} onClick={add}>Lançar material</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoSlot({ os, item, field, label, locked }) {
  const { run } = useApp();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const path = item[field];

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    await run(async () => {
      const blob = await compressImage(file, { maxSide: 1280, quality: 0.72, maxBytes: 260 * 1024 });
      const np = await api.uploadFile('os-photos', os.id, `${label.toLowerCase()}-${item.id.slice(0, 8)}.jpg`, blob, 'image/jpeg', path);
      await api.patchItem(item.id, { [field]: np });
    });
    setBusy(false);
  };

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <button disabled={locked || busy} onClick={() => ref.current?.click()}
        className="relative w-full aspect-[4/3] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center text-slate-400 disabled:cursor-default">
        {path ? <StorageImage bucket="os-photos" path={path} alt={`Foto ${label}`} className="absolute inset-0 w-full h-full object-cover" /> : (
          <span className="flex flex-col items-center gap-1 text-sm"><Camera className="w-7 h-7" /> {busy ? 'Enviando…' : 'Tirar foto'}</span>
        )}
        {path && busy && <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-sm font-semibold text-slate-700">Enviando…</span>}
      </button>
      <input ref={ref} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
    </div>
  );
}
