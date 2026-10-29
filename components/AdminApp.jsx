'use client';
import { useState } from 'react';
import {
  Building2, Check, ClipboardCheck, Copy, Edit3, FileText, History, Package, Plus, Printer,
  QrCode, Search, Sparkles, Trash2, UserCheck, Users, Wind
} from 'lucide-react';
import { api } from '@/lib/api';
import { DONE, fmtDate, fmtTime, isDue, isWarrantyActive, osLabel, waLink } from '@/lib/utils';
import { useApp } from './AppContext';
import Modals from './Modals';
import { Field, StatusBadge, inputCls } from './ui';

const TABS = [
  { key: 'os', label: 'Quadro de O.S. (ao vivo)', icon: ClipboardCheck },
  { key: 'clients', label: 'Clientes e máquinas', icon: Users },
  { key: 'alerts', label: 'Alertas de preventiva', icon: Sparkles },
  { key: 'catalog', label: 'Catálogo de peças', icon: Package },
  { key: 'team', label: 'Equipe e acessos', icon: UserCheck },
  { key: 'settings', label: 'Dados da empresa', icon: Building2 }
];

const COLUMNS = [
  { key: 'agendadas', title: 'Agendadas', statuses: ['agendada'], badge: 'bg-amber-100 text-amber-800' },
  { key: 'rua', title: 'Na rua / em execução', statuses: ['em_rota', 'no_local'], badge: 'bg-sky-100 text-sky-800' },
  { key: 'conferencia', title: 'Concluídas na rua', statuses: ['concluida_rua'], badge: 'bg-indigo-100 text-indigo-800' },
  { key: 'finalizadas', title: 'Finalizadas e canceladas', statuses: ['finalizada', 'cancelada'], badge: 'bg-emerald-100 text-emerald-800' }
];

export default function AdminApp() {
  const { data } = useApp();
  const [tab, setTab] = useState('os');
  const [modal, setModal] = useState(null);
  const dueCount = data.equipment.filter((e) => isDue(e.next_maintenance)).length;

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0">
      <aside className="md:w-64 bg-slate-900 text-slate-300 flex md:flex-col shrink-0 border-r border-slate-800 no-print overflow-x-auto">
        <div className="hidden md:flex p-5 items-center gap-3 border-b border-slate-800">
          <div className="bg-sky-500 p-2.5 rounded-xl text-white"><Wind className="w-6 h-6" /></div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">{data.company?.name}</h1>
            <span className="text-[11px] text-sky-400">Central de operações</span>
          </div>
        </div>
        <nav className="flex md:flex-col p-2 md:p-3 gap-1 md:flex-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                tab === key ? 'bg-sky-500 text-white' : 'hover:bg-slate-800 text-slate-300'
              }`}>
              <span className="flex items-center gap-3"><Icon className="w-4 h-4" /> {label}</span>
              {key === 'alerts' && dueCount > 0 && (
                <span className="bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px]">{dueCount}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {tab === 'os' && <BoardTab setModal={setModal} />}
        {tab === 'clients' && <ClientsTab setModal={setModal} />}
        {tab === 'alerts' && <AlertsTab setModal={setModal} />}
        {tab === 'catalog' && <CatalogTab setModal={setModal} />}
        {tab === 'team' && <TeamTab setModal={setModal} />}
        {tab === 'settings' && <SettingsTab />}
      </main>
      <Modals modal={modal} setModal={setModal} />
    </div>
  );
}

// ---------------------------------------------------------------- Quadro de O.S.
function BoardTab({ setModal }) {
  const { data, run, getClient, getEq, getTech } = useApp();
  const [query, setQuery] = useState('');

  const clone = (os) => {
    const list = data.equipment.filter((e) => e.client_id === os.client_id);
    const other = list.find((e) => e.id !== os.equipment_id) || list[0];
    setModal({
      type: 'os', mode: 'create',
      data: { equipment_id: other?.id, tech_id: os.tech_id, service_type: os.service_type, notes: `Clonada da ${osLabel(os)} — mesma visita técnica.` }
    });
  };

  const remove = (os) => {
    if (window.confirm(`Excluir ${osLabel(os)}? Esta ação não pode ser desfeita.`)) run(() => api.remove('work_orders', os.id), 'O.S. excluída');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Ordens de serviço</h2>
          <p className="text-xs text-slate-500">Acompanhe os técnicos em tempo real, edite agendamentos e emita laudos.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar O.S., cliente ou máquina…" aria-label="Buscar"
              className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs w-64" />
          </div>
          <button onClick={() => setModal({ type: 'os', mode: 'create' })} disabled={data.equipment.length === 0}
            title={data.equipment.length === 0 ? 'Cadastre um cliente e um equipamento primeiro' : ''}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova O.S.
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const q = query.toLowerCase();
          const orders = data.orders.filter((os) => {
            if (!col.statuses.includes(os.status)) return false;
            if (!q) return true;
            const c = getClient(os.client_id);
            const eq = getEq(os.equipment_id);
            return (
              osLabel(os).toLowerCase().includes(q) || c?.name.toLowerCase().includes(q) ||
              eq?.brand.toLowerCase().includes(q) || eq?.location_tag.toLowerCase().includes(q)
            );
          });
          return (
            <section key={col.key} className="bg-slate-200/70 rounded-2xl p-3.5 space-y-3 min-h-[200px]">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-xs text-slate-800">{col.title}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>{orders.length}</span>
              </div>
              {orders.map((os) => {
                const client = getClient(os.client_id);
                const eq = getEq(os.equipment_id);
                const tech = getTech(os.tech_id);
                return (
                  <article key={os.id} className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{osLabel(os)} · {fmtDate(os.scheduled_date)} {os.scheduled_time?.slice(0, 5)}</span>
                      <div className="flex items-center gap-1">
                        <button title="Clonar para outro aparelho do cliente" aria-label="Clonar" onClick={() => clone(os)} className="p-1 text-slate-400 hover:text-sky-600"><Copy className="w-3.5 h-3.5" /></button>
                        <button title="Editar" aria-label="Editar" onClick={() => setModal({ type: 'os', mode: 'edit', data: os })} className="p-1 text-slate-400 hover:text-slate-800"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button title="Excluir" aria-label="Excluir" onClick={() => remove(os)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sky-700">{os.service_type}</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{client?.name}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                      <button onClick={() => setModal({ type: 'passport', eqId: eq?.id })} className="text-left flex-1">
                        <p className="text-xs font-semibold text-slate-800">{eq?.brand} {eq?.btus} BTUs</p>
                        <p className="text-[11px] text-slate-500">{eq?.location_tag} · <span className="font-mono text-sky-700">{eq?.code}</span></p>
                      </button>
                      <button title="Imprimir etiqueta QR" aria-label="Imprimir etiqueta QR" onClick={() => setModal({ type: 'qr', eq })} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {os.materials_used.length > 0 && (
                      <div className="bg-sky-50/60 p-2 rounded-lg border border-sky-100">
                        <p className="text-[11px] font-bold text-sky-900 mb-1">Itens aplicados ({os.materials_used.length})</p>
                        <ul className="text-[11px] text-sky-800 space-y-0.5">
                          {os.materials_used.map((m) => (<li key={m.id}>{m.quantity} {m.unit} — {m.name}</li>))}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Técnico: <strong>{tech?.name?.split(' ')[0] || 'sem técnico'}</strong></span>
                      <StatusBadge status={os.status} extra={os.status === 'no_local' ? fmtTime(os.arrived_at) : os.status === 'em_rota' ? fmtTime(os.started_travel_at) : ''} />
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setModal({ type: 'laudo', osId: os.id })} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1">
                        <FileText className="w-3 h-3" /> Laudo
                      </button>
                      {os.status === 'concluida_rua' && (
                        <button onClick={() => run(() => api.setOrderStatus(os, 'finalizada'), 'O.S. finalizada')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> Finalizar
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Clientes e máquinas
function ClientsTab({ setModal }) {
  const { data, run, getClient } = useApp();
  const [selected, setSelected] = useState(null);
  const selectedId = selected || data.clients[0]?.id;
  const client = getClient(selectedId);

  const removeClient = (c) => {
    if (window.confirm(`Excluir o cliente "${c.name}"? Só é possível se ele não tiver aparelhos nem O.S.`)) run(() => api.remove('clients', c.id), 'Cliente excluído');
  };
  const removeEq = (eq) => {
    if (window.confirm(`Excluir o aparelho ${eq.code}? Só é possível se ele não tiver O.S.`)) run(() => api.remove('equipment', eq.id), 'Equipamento excluído');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <section className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 space-y-4 h-fit">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Clientes</h3>
            <p className="text-xs text-slate-500">Selecione para ver os aparelhos</p>
          </div>
          <button onClick={() => setModal({ type: 'client', mode: 'create', onSaved: (c) => setSelected(c.id) })} className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Novo cliente
          </button>
        </div>
        {data.clients.length === 0 && <p className="text-xs text-slate-500">Nenhum cliente ainda. Cadastre o primeiro para começar.</p>}
        <div className="space-y-2">
          {data.clients.map((c) => {
            const count = data.equipment.filter((e) => e.client_id === c.id).length;
            return (
              <div key={c.id} onClick={() => setSelected(c.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${c.id === selectedId ? 'bg-sky-50 border-sky-500' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.document} {c.document && '·'} {c.phone}</p>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button aria-label="Editar cliente" onClick={() => setModal({ type: 'client', mode: 'edit', data: c })} className="p-1 text-slate-500 hover:text-slate-900"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button aria-label="Excluir cliente" onClick={() => removeClient(c)} className="p-1 text-slate-500 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 truncate">{c.address}</p>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Contato: {c.contact_name || '—'}</span>
                  <span className="font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">{count} aparelhos</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        {client ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-sky-600">Parque de máquinas</span>
                <h3 className="text-lg font-bold text-slate-900">{client.name}</h3>
                <p className="text-xs text-slate-500">{client.address}</p>
              </div>
              <button onClick={() => setModal({ type: 'equipment', mode: 'create', data: { client_id: client.id } })} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Cadastrar equipamento
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.equipment.filter((e) => e.client_id === client.id).map((eq) => {
                const history = data.orders.filter((o) => o.equipment_id === eq.id && DONE.includes(o.status));
                const warranty = isWarrantyActive(eq.warranty_until);
                return (
                  <div key={eq.id} className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/60">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5 text-sky-400" /> {eq.code}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal({ type: 'qr', eq })} className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-500"><Printer className="w-3 h-3" /> QR</button>
                        <button aria-label="Editar equipamento" onClick={() => setModal({ type: 'equipment', mode: 'edit', data: eq })} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button aria-label="Excluir equipamento" onClick={() => removeEq(eq)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{eq.brand} {eq.model} · {eq.btus} BTUs</h4>
                      <p className="text-xs text-slate-600">Local: <strong>{eq.location_tag}</strong> · Gás: <strong>{eq.gas}</strong> ({eq.voltage})</p>
                      <p className="text-[11px] text-slate-400">Série: {eq.serial_number || '—'}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${warranty ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                        {warranty ? `Garantia até ${fmtDate(eq.warranty_until)}` : 'Fora da garantia'}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">Próx. preventiva: {fmtDate(eq.next_maintenance)}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-2">
                      <button onClick={() => setModal({ type: 'passport', eqId: eq.id })} className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5"><History className="w-3.5 h-3.5" /> Histórico ({history.length})</button>
                      <button onClick={() => setModal({ type: 'passport', eqId: eq.id, publicView: true })} className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5"><QrCode className="w-3.5 h-3.5 text-emerald-600" /> Visão do cliente</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">Cadastre um cliente ao lado para começar.</p>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Alertas de preventiva
function AlertsTab({ setModal }) {
  const { data, getClient } = useApp();
  const rows = [...data.equipment].sort((a, b) => (a.next_maintenance || '0000').localeCompare(b.next_maintenance || '0000'));

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Revisão preventiva e higienização</h3>
        <p className="text-xs text-slate-500">Aparelhos vencidos ou que vencem nos próximos 30 dias. Avise o cliente pelo WhatsApp ou abra a O.S. com um clique.</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum equipamento cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 px-3">Equipamento</th>
                <th className="py-3 px-3">Cliente e ambiente</th>
                <th className="py-3 px-3">Última visita</th>
                <th className="py-3 px-3">Preventiva</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((eq) => {
                const client = getClient(eq.client_id);
                const never = !eq.next_maintenance;
                const due = isDue(eq.next_maintenance);
                const text = `Olá ${client?.contact_name || client?.name}! Aqui é da ${data.company?.name}. O aparelho ${eq.brand} ${eq.btus} BTUs (${eq.location_tag}, etiqueta ${eq.code}) está no prazo da manutenção preventiva${never ? '' : ` (${fmtDate(eq.next_maintenance)})`}. Vamos agendar a higienização?`;
                return (
                  <tr key={eq.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{eq.brand} {eq.model} ({eq.btus} BTUs)</p>
                      <span className="font-mono text-[11px] text-slate-500">{eq.code}</span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">{client?.name}</p>
                      <p className="text-slate-500">{eq.location_tag}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{fmtDate(eq.last_maintenance)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full font-bold ${never ? 'bg-slate-200 text-slate-700' : due ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {never ? 'Sem visita registrada' : `${fmtDate(eq.next_maintenance)} · ${due ? 'vencida ou vencendo' : 'em dia'}`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                      <a href={waLink(client?.phone, text)} target="_blank" rel="noreferrer" className="inline-flex items-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg">Avisar no WhatsApp</a>
                      <button onClick={() => setModal({ type: 'os', mode: 'create', data: { equipment_id: eq.id, service_type: 'Higienização & preventiva', notes: 'Agendada pelo alerta de preventiva.' } })} className="inline-flex items-center bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-lg">Abrir O.S.</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Catálogo
function CatalogTab({ setModal }) {
  const { data, run } = useApp();
  const remove = (item) => {
    if (window.confirm(`Excluir "${item.name}" do catálogo? As O.S. já feitas mantêm o nome do item.`)) run(() => api.remove('catalog_items', item.id), 'Item excluído');
  };
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Catálogo de peças, fluidos e insumos</h3>
          <p className="text-xs text-slate-500">Itens padronizados para o técnico apontar o que usou em cada visita, sem valores nem controle de estoque.</p>
        </div>
        <button onClick={() => setModal({ type: 'catalog', mode: 'create' })} className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" /> Novo item</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.catalog.map((item) => (
          <div key={item.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">{item.category}</span>
              <p className="font-bold text-sm text-slate-900 mt-1">{item.name}</p>
              <p className="text-xs text-slate-500">Unidade: <strong>{item.unit}</strong></p>
            </div>
            <div className="flex items-center gap-1">
              <button aria-label="Editar item" onClick={() => setModal({ type: 'catalog', mode: 'edit', data: item })} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900"><Edit3 className="w-3.5 h-3.5" /></button>
              <button aria-label="Excluir item" onClick={() => remove(item)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Equipe
function TeamTab({ setModal }) {
  const { data } = useApp();
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Equipe e acessos</h3>
        <p className="text-xs text-slate-500">Defina quem acessa a central do escritório e quem usa o app de rua.</p>
      </div>
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-950">
        Para adicionar alguém: no painel do Supabase, abra <strong>Authentication → Users → Add user</strong> e crie o e-mail e a senha.
        A pessoa aparece aqui <strong>bloqueada</strong>; clique em editar para liberar o acesso e escolher o perfil.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.profiles.map((u) => {
          const done = data.orders.filter((o) => o.tech_id === u.id && DONE.includes(o.status)).length;
          return (
            <div key={u.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {u.role === 'admin' ? 'Escritório / admin' : 'Técnico de campo'}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{u.name}</h4>
                  <p className="text-xs text-slate-500">{u.phone || 'Sem telefone'}</p>
                </div>
                <button aria-label="Editar acesso" onClick={() => setModal({ type: 'profile', data: u })} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700"><Edit3 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                <span className={u.active ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>{u.active ? 'Acesso ativo' : 'Acesso bloqueado'}</span>
                <span className="text-slate-600 font-medium">{done} O.S. concluídas</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Dados da empresa
function SettingsTab() {
  const { data, run } = useApp();
  const c = data.company;

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    await run(
      () => api.updateSettings({
        name: f.get('name'),
        document: f.get('document'),
        phone: f.get('phone'),
        technical_responsible: f.get('technical_responsible'),
        warranty_days: Number(f.get('warranty_days')),
        preventive_months: Number(f.get('preventive_months'))
      }),
      'Dados da empresa salvos'
    );
  };

  if (!c) return null;
  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Dados da empresa e prazos</h3>
        <p className="text-xs text-slate-500">Saem nos laudos, nas etiquetas QR e na página pública do cliente. Os prazos valem para as próximas O.S. concluídas.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome fantasia / razão social" className="sm:col-span-2"><input name="name" required defaultValue={c.name} className={inputCls} /></Field>
        <Field label="CNPJ"><input name="document" defaultValue={c.document} className={inputCls} /></Field>
        <Field label="WhatsApp de atendimento"><input name="phone" defaultValue={c.phone} className={inputCls} /></Field>
        <Field label="Responsável técnico (CREA / CFT)" className="sm:col-span-2"><input name="technical_responsible" defaultValue={c.technical_responsible} className={inputCls} /></Field>
        <Field label="Garantia do serviço (dias)"><input type="number" min="0" name="warranty_days" required defaultValue={c.warranty_days} className={inputCls} /></Field>
        <Field label="Ciclo de preventiva (meses)"><input type="number" min="1" name="preventive_months" required defaultValue={c.preventive_months} className={inputCls} /></Field>
      </div>
      <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl">Salvar dados</button>
    </form>
  );
}
