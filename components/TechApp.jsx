'use client';
import { useRef, useState } from 'react';
import {
  ArrowLeft, Calendar, Camera, CheckCircle2, ClipboardCheck, Edit3, Eye, FileText, History,
  MapPin, Navigation, Plus, Printer, QrCode, Search, Trash2, Wind
} from 'lucide-react';
import { api } from '@/lib/api';
import { DONE, compressImage, fmtTime, osLabel } from '@/lib/utils';
import { useApp } from './AppContext';
import Modals from './Modals';
import { SavedField, StatusBadge, StorageImage } from './ui';

const ACTIVE = ['agendada', 'em_rota', 'no_local', 'concluida_rua'];

export default function TechApp() {
  const { data, me } = useApp();
  const [tab, setTab] = useState('agenda');
  const [activeId, setActiveId] = useState(null);
  const [modal, setModal] = useState(null);

  const mine = data.orders.filter((o) => ACTIVE.includes(o.status));
  const openExec = (id) => {
    setActiveId(id);
    setTab('exec');
  };

  return (
    <div className="flex-1 flex justify-center bg-slate-950 p-0 sm:p-6">
      <div className="w-full max-w-md bg-slate-50 min-h-[calc(100vh-40px)] sm:min-h-[780px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-4 border-slate-800">
        <div className="bg-slate-900 text-white p-4 flex items-center gap-2.5 no-print">
          <div className="bg-emerald-500 p-2 rounded-xl"><Wind className="w-5 h-5 text-white" /></div>
          <div>
            <h2 className="font-bold text-sm leading-tight">{data.company?.name}</h2>
            <p className="text-[11px] text-emerald-400">Técnico em campo: {me.name.split(' ')[0]}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'agenda' && <AgendaTab orders={mine} setModal={setModal} openExec={openExec} />}
          {tab === 'exec' && <ExecTab orders={mine} activeId={activeId} setActiveId={setActiveId} setModal={setModal} goAgenda={() => setTab('agenda')} />}
          {tab === 'qr' && <MachinesTab setModal={setModal} />}
        </div>

        <div className="bg-white border-t border-slate-200 grid grid-cols-3 py-2 px-4 no-print">
          {[
            { key: 'agenda', label: 'Minha rota', icon: Calendar },
            { key: 'exec', label: 'Executar O.S.', icon: ClipboardCheck },
            { key: 'qr', label: 'Máquinas e QR', icon: QrCode }
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)} className={`flex flex-col items-center gap-1 py-1 rounded-xl ${tab === key ? 'text-sky-600 font-bold' : 'text-slate-400'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[11px]">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <Modals modal={modal} setModal={setModal} />
    </div>
  );
}

// ---------------------------------------------------------------- Minha rota
function AgendaTab({ orders, setModal, openExec }) {
  const { data, run, getClient, getEq } = useApp();

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-base">Minha rota de chamados</h3>
          <p className="text-xs text-slate-500">Toque para iniciar o deslocamento ou ver o histórico</p>
        </div>
        <button onClick={() => setModal({ type: 'equipment', mode: 'create', data: { client_id: data.clients[0]?.id } })}
          className="bg-slate-900 text-white text-[11px] font-bold px-3 py-2 rounded-xl flex items-center gap-1">
          <Plus className="w-3.5 h-3.5 text-emerald-400" /> Máquina
        </button>
      </div>

      {orders.length === 0 && <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-4">Nenhum chamado na sua rota por enquanto.</p>}

      {orders.map((os) => {
        const client = getClient(os.client_id);
        const eq = getEq(os.equipment_id);
        const time = os.status === 'em_rota' ? fmtTime(os.started_travel_at) : os.status === 'no_local' ? fmtTime(os.arrived_at) : '';
        return (
          <article key={os.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">{osLabel(os)} · {os.scheduled_time?.slice(0, 5)}</span>
              <StatusBadge status={os.status} extra={time} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{client?.name}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {client?.address}</p>
              <p className="text-xs font-semibold text-sky-700 mt-1">{os.service_type}</p>
            </div>

            {eq && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="font-mono text-[11px] font-bold bg-slate-900 text-emerald-400 px-2 py-0.5 rounded">{eq.code}</span>
                <p className="text-xs font-bold text-slate-800">{eq.brand} {eq.model} ({eq.btus} BTUs)</p>
                <p className="text-[11px] text-slate-500">Local: <strong>{eq.location_tag}</strong> · Gás: {eq.gas}</p>
                <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200">
                  <button onClick={() => setModal({ type: 'passport', eqId: eq.id })} className="text-[11px] bg-white border border-slate-300 py-1.5 rounded-lg font-semibold text-sky-700 flex items-center justify-center gap-1"><History className="w-3 h-3" /> Histórico</button>
                  <button onClick={() => setModal({ type: 'equipment', mode: 'edit', data: eq })} className="text-[11px] bg-white border border-slate-300 py-1.5 rounded-lg font-semibold text-slate-700 flex items-center justify-center gap-1"><Edit3 className="w-3 h-3" /> Editar</button>
                  <button onClick={() => setModal({ type: 'qr', eq })} className="text-[11px] bg-white border border-slate-300 py-1.5 rounded-lg font-semibold text-emerald-700 flex items-center justify-center gap-1"><Printer className="w-3 h-3" /> QR</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(client?.address || '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium py-2 rounded-xl"><Navigation className="w-3.5 h-3.5 text-sky-600" /> Google Maps</a>
              <a href={`https://waze.com/ul?q=${encodeURIComponent(client?.address || '')}&navigate=yes`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium py-2 rounded-xl"><MapPin className="w-3.5 h-3.5 text-indigo-600" /> Waze</a>
            </div>

            {os.status === 'agendada' && (
              <button onClick={() => run(() => api.setOrderStatus(os, 'em_rota'))} className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-2">
                <Navigation className="w-4 h-4" /> Iniciar deslocamento (estou a caminho)
              </button>
            )}
            {os.status === 'em_rota' && (
              <button onClick={async () => { if (await run(() => api.setOrderStatus(os, 'no_local'))) openExec(os.id); }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Cheguei ao local (abrir checklist)
              </button>
            )}
            {os.status === 'no_local' && (
              <button onClick={() => openExec(os.id)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-2">
                <ClipboardCheck className="w-4 h-4" /> Continuar a O.S.
              </button>
            )}
            {os.status === 'concluida_rua' && (
              <div className="flex gap-2">
                <button onClick={() => setModal({ type: 'laudo', osId: os.id })} className="flex-1 bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Ver laudo</button>
                <button onClick={() => openExec(os.id)} className="px-3 py-2.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl">Editar</button>
              </div>
            )}
          </article>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------- Executar O.S.
function ExecTab({ orders, activeId, setActiveId, setModal, goAgenda }) {
  const { data, run, getClient, getEq } = useApp();
  const os = orders.find((o) => o.id === activeId) || orders.find((o) => o.status === 'no_local') || null;

  const [newItem, setNewItem] = useState('');
  const [catalogId, setCatalogId] = useState('');
  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState('');
  const [customUnit, setCustomUnit] = useState('un');

  if (!os) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-600 space-y-3">
        <p>Nenhuma O.S. em execução. Inicie um chamado na aba <strong>Minha rota</strong>.</p>
        <button onClick={goAgenda} className="bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl">Ir para Minha rota</button>
      </div>
    );
  }

  const client = getClient(os.client_id);
  const eq = getEq(os.equipment_id);
  const clientEquipment = data.equipment.filter((e) => e.client_id === os.client_id);
  const card = 'bg-white p-4 rounded-2xl border border-slate-200 space-y-3';
  const title = 'text-xs font-bold text-slate-800 block';

  const addCatalogItem = () => {
    const item = data.catalog.find((c) => c.id === catalogId);
    if (!item) return;
    run(() => api.addMaterial(os.id, { catalog_id: item.id, name: item.name, quantity: Number(qty) || 1, unit: item.unit }));
    setQty(1);
  };
  const addCustomItem = () => {
    if (!custom.trim()) return;
    run(() => api.addMaterial(os.id, { catalog_id: null, name: custom.trim(), quantity: Number(qty) || 1, unit: customUnit }));
    setCustom('');
    setQty(1);
  };
  const addChecklist = () => {
    if (!newItem.trim()) return;
    run(() => api.addChecklistItem(os.id, newItem.trim(), os.checklist_items.length));
    setNewItem('');
  };
  const conclude = async () => {
    if (!os.signature_path && !window.confirm('Concluir sem a assinatura do cliente?')) return;
    if (await run(() => api.setOrderStatus(os, 'concluida_rua'), 'Visita concluída e gravada no histórico')) goAgenda();
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-[11px] text-emerald-400 font-semibold">{osLabel(os)} · {os.service_type}</span>
          <h4 className="font-bold text-sm">{client?.name}</h4>
        </div>
        <button onClick={goAgenda} className="text-xs bg-slate-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Voltar</button>
      </div>

      {orders.length > 1 && (
        <select value={os.id} onChange={(e) => setActiveId(e.target.value)} aria-label="Trocar de O.S." className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold">
          {orders.map((o) => (<option key={o.id} value={o.id}>{osLabel(o)} — {getClient(o.client_id)?.name}</option>))}
        </select>
      )}

      {/* 1. Equipamento */}
      <section className={card}>
        <div className="flex items-center justify-between">
          <span className={title}>1. Equipamento do cliente</span>
          <button onClick={() => setModal({ type: 'equipment', mode: 'create', data: { client_id: os.client_id }, bindOsId: os.id })} className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold">
            <Plus className="w-3.5 h-3.5" /> Nova máquina
          </button>
        </div>
        <select value={os.equipment_id} onChange={(e) => run(() => api.patchOrder(os.id, { equipment_id: e.target.value }))} aria-label="Aparelho atendido" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold">
          {clientEquipment.map((e) => (<option key={e.id} value={e.id}>[{e.code}] {e.brand} {e.btus} BTUs — {e.location_tag}</option>))}
        </select>
        {eq && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2.5">
            <div>
              <p className="font-bold text-slate-900">{eq.brand} {eq.model} · {eq.btus} BTUs</p>
              <p className="text-slate-600">Ambiente: <strong>{eq.location_tag}</strong> · Gás: <strong>{eq.gas}</strong> · {eq.voltage}</p>
              <p className="text-[11px] text-slate-500">Série: {eq.serial_number || 'não informada'}</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200">
              <button onClick={() => setModal({ type: 'equipment', mode: 'edit', data: eq })} className="bg-white border border-slate-300 text-slate-800 py-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1"><Edit3 className="w-3.5 h-3.5 text-amber-600" /> Editar</button>
              <button onClick={() => setModal({ type: 'qr', eq })} className="bg-slate-900 text-white py-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1"><Printer className="w-3.5 h-3.5 text-emerald-400" /> QR</button>
              <button onClick={() => setModal({ type: 'passport', eqId: eq.id })} className="bg-sky-50 border border-sky-200 text-sky-800 py-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1"><History className="w-3.5 h-3.5" /> Histórico</button>
            </div>
          </div>
        )}
      </section>

      {/* 2. Checklist */}
      <section className={card}>
        <span className={title}>2. Checklist de inspeção</span>
        <div className="space-y-2">
          {os.checklist_items.map((item) => (
            <div key={item.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-slate-800">{item.label}</span>
                <button aria-label="Remover item" onClick={() => run(() => api.removeChecklistItem(item.id))} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[['ok', 'OK / feito', 'bg-emerald-600'], ['attention', 'Atenção', 'bg-amber-500'], ['na', 'Não se aplica', 'bg-slate-600']].map(([st, label, on]) => (
                  <button key={st} onClick={() => run(() => api.setChecklistStatus(item.id, st))} className={`py-1.5 rounded-lg text-[11px] font-bold transition ${item.status === st ? `${on} text-white` : 'bg-white border border-slate-300 text-slate-600'}`}>{label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Adicionar tarefa ao checklist…" aria-label="Nova tarefa" className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
          <button onClick={addChecklist} className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Incluir</button>
        </div>
      </section>

      {/* 3. Materiais */}
      <section className={card}>
        <div>
          <span className={title}>3. Peças e materiais usados</span>
          <p className="text-[11px] text-slate-500">Fica gravado no histórico desta máquina.</p>
        </div>
        <div className="space-y-1.5">
          {os.materials_used.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">Nenhum material apontado ainda.</p>
          ) : (
            os.materials_used.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                <span className="font-medium text-slate-800">{m.name}</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-bold rounded-md">{m.quantity} {m.unit}</span>
                  <button aria-label="Remover material" onClick={() => run(() => api.removeMaterial(m.id))} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
          <p className="text-[11px] font-semibold text-slate-600">Do catálogo:</p>
          <select value={catalogId} onChange={(e) => setCatalogId(e.target.value)} aria-label="Item do catálogo" className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs">
            <option value="">Escolha a peça, fluido ou insumo…</option>
            {data.catalog.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.unit})</option>))}
          </select>
          <div className="flex gap-2">
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Quantidade" className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs" />
            <button onClick={addCatalogItem} className="flex-1 bg-sky-600 text-white text-xs font-semibold py-1.5 rounded-lg">Apontar item</button>
          </div>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
          <p className="text-[11px] font-semibold text-slate-600">Ou digite um item avulso (usa a quantidade acima):</p>
          <div className="flex gap-1.5">
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ex.: fita PVC" aria-label="Item avulso" className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs" />
            <select value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} aria-label="Unidade" className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs">
              <option value="un">un</option><option value="m">m</option><option value="g">g</option><option value="kg">kg</option>
            </select>
            <button onClick={addCustomItem} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Incluir</button>
          </div>
        </div>
      </section>

      {/* 4. Fotos */}
      <section className={card}>
        <span className={title}>4. Fotos antes e depois</span>
        <div className="grid grid-cols-2 gap-2.5">
          <PhotoSlot os={os} field="photo_before_path" fileName="antes.jpg" label="Foto antes" />
          <PhotoSlot os={os} field="photo_after_path" fileName="depois.jpg" label="Foto depois" />
        </div>
      </section>

      {/* 5. Parecer e assinatura */}
      <section className={card}>
        <span className={title}>5. Parecer técnico e assinatura</span>
        <SavedField as="textarea" rows={2} value={os.notes} onSave={(v) => run(() => api.patchOrder(os.id, { notes: v }))} placeholder="Descreva o serviço realizado ou recomendações…" aria-label="Parecer técnico" className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs" />
        <label className="block">
          <span className="block text-[11px] font-semibold text-slate-600 mb-1">Nome de quem acompanhou o serviço</span>
          <SavedField value={os.signature_name} onSave={(v) => run(() => api.patchOrder(os.id, { signature_name: v }))} placeholder="Ex.: Sr. Roberto / portaria" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
        </label>
        <SignaturePad os={os} />
        <button onClick={conclude} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs shadow-md flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Concluir visita e gravar no histórico
        </button>
      </section>
    </div>
  );
}

function PhotoSlot({ os, field, fileName, label }) {
  const { run, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const path = os[field];

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const blob = await compressImage(file);
      await run(async () => {
        const newPath = await api.uploadFile('os-photos', os.id, fileName, blob, 'image/jpeg', path);
        await api.patchOrder(os.id, { [field]: newPath });
      });
    } catch {
      toast('Não foi possível processar a foto. Tente novamente.', 'error');
    }
    setBusy(false);
  };

  return (
    <label className="border-2 border-dashed border-slate-300 rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 min-h-[120px]">
      {busy ? (
        <span className="text-[11px] text-slate-500">Enviando…</span>
      ) : path ? (
        <StorageImage bucket="os-photos" path={path} alt={label} className="w-full h-28 object-cover rounded-lg" />
      ) : (
        <>
          <Camera className="w-6 h-6 text-slate-400 mb-1" />
          <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        </>
      )}
      <input type="file" accept="image/*" onChange={onFile} className="hidden" />
    </label>
  );
}

// Quadro de assinatura: o traço só é enviado quando o técnico toca em "Salvar assinatura"
function SignaturePad({ os }) {
  const { run, toast } = useApp();
  const ref = useRef(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  const point = (e) => {
    const c = ref.current;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const down = (e) => {
    const c = ref.current;
    c.setPointerCapture(e.pointerId);
    const ctx = c.getContext('2d');
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = ref.current.getContext('2d');
    const { x, y } = point(e);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(x, y);
    ctx.stroke();
    setDirty(true);
  };
  const up = () => {
    drawing.current = false;
  };
  const clear = () => {
    const c = ref.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    setDirty(false);
  };
  const save = () => {
    if (!dirty) return toast('Peça para o cliente assinar no quadro.', 'error');
    ref.current.toBlob(async (blob) => {
      await run(async () => {
        const path = await api.uploadFile('signatures', os.id, 'assinatura.png', blob, 'image/png', os.signature_path);
        await api.patchOrder(os.id, { signature_path: path });
      }, 'Assinatura salva');
    }, 'image/png');
  };

  if (os.signature_path) {
    return (
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-slate-600 block">Assinatura do cliente</span>
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-2">
          <StorageImage bucket="signatures" path={os.signature_path} alt="Assinatura do cliente" className="h-24 mx-auto" />
        </div>
        <button onClick={() => run(() => api.patchOrder(os.id, { signature_path: null }))} className="text-[11px] text-rose-600 font-semibold">Refazer assinatura</button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-600">Assinatura na tela</span>
        <button onClick={clear} className="text-[11px] text-rose-600 font-medium">Limpar quadro</button>
      </div>
      <canvas ref={ref} width={640} height={220} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        aria-label="Quadro de assinatura" className="w-full bg-slate-50 border border-slate-300 rounded-xl cursor-crosshair" style={{ touchAction: 'none' }} />
      <button onClick={save} className="w-full bg-slate-900 text-white text-xs font-semibold py-2.5 rounded-xl">Salvar assinatura</button>
    </div>
  );
}

// ---------------------------------------------------------------- Máquinas e QR
function MachinesTab({ setModal }) {
  const { data, getClient } = useApp();
  const [query, setQuery] = useState('');
  const q = query.toLowerCase();

  const list = data.equipment.filter((eq) => {
    const c = getClient(eq.client_id);
    return !q || eq.code.toLowerCase().includes(q) || eq.brand.toLowerCase().includes(q) || eq.location_tag.toLowerCase().includes(q) || c?.name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3">
        <div className="flex items-center gap-2.5">
          <QrCode className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <h3 className="font-bold text-sm">Equipamentos e etiquetas QR</h3>
            <p className="text-[11px] text-slate-300">Veja o histórico, edite dados ou imprima a etiqueta na hora.</p>
          </div>
        </div>
        <button onClick={() => setModal({ type: 'equipment', mode: 'create', data: { client_id: data.clients[0]?.id } })} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5">
          <Plus className="w-4 h-4" /> Cadastrar novo equipamento
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código, marca, sala ou cliente…" aria-label="Buscar máquina" className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs" />
      </div>

      {list.length === 0 && <p className="text-sm text-slate-500">Nenhuma máquina encontrada entre os seus clientes.</p>}

      <div className="space-y-2.5">
        {list.map((eq) => {
          const client = getClient(eq.client_id);
          const count = data.orders.filter((o) => o.equipment_id === eq.id && DONE.includes(o.status)).length;
          return (
            <div key={eq.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold bg-slate-900 text-emerald-400 px-2.5 py-1 rounded-lg">{eq.code}</span>
                <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full">{count} visitas</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">{eq.brand} {eq.model} ({eq.btus} BTUs · {eq.gas})</p>
                <p className="text-xs text-slate-500">{client?.name} · <strong>{eq.location_tag}</strong></p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => setModal({ type: 'passport', eqId: eq.id })} className="bg-slate-900 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5"><History className="w-3.5 h-3.5 text-sky-400" /> Prontuário</button>
                <button onClick={() => setModal({ type: 'qr', eq })} className="bg-emerald-600 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Imprimir QR</button>
                <button onClick={() => setModal({ type: 'equipment', mode: 'edit', data: eq })} className="bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5"><Edit3 className="w-3.5 h-3.5" /> Editar</button>
                <button onClick={() => setModal({ type: 'passport', eqId: eq.id, publicView: true })} className="bg-slate-100 text-emerald-800 border border-slate-300 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Visão do cliente</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
