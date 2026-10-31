'use client';
import { useState } from 'react';
import { BellRing, Building2, Plus, ClipboardList, Home, LogOut, MoreHorizontal, Package, UserCircle, UserCog, Users } from 'lucide-react';
import { useApp } from '../AppContext';
import ModeSwitch from '../ModeSwitch';
import { Logo, Modal } from '../ui';
import { dueGroups } from '../shared';
import Dashboard from './Dashboard';
import OrdersView from './OrdersView';
import ClientsView from './ClientsView';
import AlertsView from './AlertsView';
import CatalogView from './CatalogView';
import TeamView from './TeamView';
import SettingsView from './SettingsView';

const TABS = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'os', label: 'O.S.', icon: ClipboardList },
  { id: 'clientes', label: 'Clientes e aparelhos', short: 'Clientes', icon: Users },
  { id: 'preventivas', label: 'Preventivas', icon: BellRing },
  { id: 'catalogo', label: 'Catálogo', icon: Package },
  { id: 'equipe', label: 'Equipe e acessos', short: 'Equipe', icon: UserCog },
  { id: 'empresa', label: 'Dados da empresa', short: 'Empresa', icon: Building2 }
];
const MAIN = TABS.slice(0, 4);

export default function OfficeApp() {
  const { data, me, signOut, openModal, canSwitch } = useApp();
  // ?aba=preventivas abre direto numa aba (usado pelas notificações)
  const [tab, setTab] = useState(() => {
    if (typeof window === 'undefined') return 'inicio';
    const aba = new URLSearchParams(window.location.search).get('aba');
    if (aba) window.history.replaceState(null, '', window.location.pathname);
    return TABS.some((t) => t.id === aba) ? aba : 'inicio';
  });
  const [more, setMore] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState('abertas');
  const alerts = dueGroups(data, 30).length;

  const go = (t, opts) => {
    if (opts?.filter) setOrdersFilter(opts.filter);
    setTab(t);
    setMore(false);
    window.scrollTo(0, 0);
  };
  const badge = (id) => (id === 'preventivas' && alerts > 0 ? alerts : 0);
  const current = TABS.find((t) => t.id === tab);

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200 text-slate-600 h-screen sticky top-0 no-print">
        <div className="px-4 py-5 flex items-center gap-3">
          <Logo company={data.company} />
          <p className="font-display font-semibold text-ink leading-tight">{data.company?.name}</p>
        </div>
        <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left ${tab === t.id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'}`}>
              <t.icon className="w-[18px] h-[18px]" /> <span className="flex-1">{t.label}</span>
              {badge(t.id) > 0 && <span className="bg-brand-600 text-white text-xs font-semibold rounded-md px-1.5 py-0.5">{badge(t.id)}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200 space-y-2">
          <ModeSwitch className="w-full" />
          <button onClick={() => openModal('account')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-left">
            <UserCircle className="w-8 h-8 text-slate-400" />
            <span className="min-w-0"><span className="block text-sm font-semibold text-ink truncate">{me.name}</span><span className="block text-xs text-slate-500">Minha conta</span></span>
          </button>
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-rose-600"><LogOut className="w-4 h-4" /> Sair</button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 text-ink h-14 px-4 flex items-center gap-3 no-print">
          <Logo company={data.company} size="sm" />
          <h2 className="font-display font-semibold text-lg flex-1 truncate">{current?.short || current?.label}</h2>
          <ModeSwitch />
        </header>

        <main className="flex-1 p-4 md:p-8 pb-36 md:pb-10 w-full max-w-6xl mx-auto">
          {tab === 'inicio' && <Dashboard go={go} />}
          {tab === 'os' && <OrdersView filter={ordersFilter} setFilter={setOrdersFilter} />}
          {tab === 'clientes' && <ClientsView />}
          {tab === 'preventivas' && <AlertsView />}
          {tab === 'catalogo' && <CatalogView />}
          {tab === 'equipe' && <TeamView />}
          {tab === 'empresa' && <SettingsView />}
        </main>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 grid grid-cols-5 safe-bottom no-print">
          {MAIN.map((t) => (
            <button key={t.id} onClick={() => go(t.id)} className={`relative flex flex-col items-center gap-1 pt-2 pb-2.5 text-[11px] font-medium ${tab === t.id ? 'text-brand-700' : 'text-slate-500'}`}>
              <span className={`px-4 py-1 rounded-full transition-colors ${tab === t.id ? 'bg-brand-50 text-brand-700' : ''}`}><t.icon className="w-5 h-5" /></span> {t.short || t.label}
              {badge(t.id) > 0 && <span className="absolute top-1 right-[22%] bg-brand-600 text-white text-[10px] font-semibold rounded-full px-1.5">{badge(t.id)}</span>}
            </button>
          ))}
          <button onClick={() => setMore(true)} className={`flex flex-col items-center gap-1 pt-2 pb-2.5 text-[11px] font-medium ${['catalogo', 'equipe', 'empresa'].includes(tab) ? 'text-brand-700' : 'text-slate-500'}`}>
            <span className={`px-4 py-1 rounded-full ${['catalogo', 'equipe', 'empresa'].includes(tab) ? 'bg-brand-50 text-brand-700' : ''}`}><MoreHorizontal className="w-5 h-5" /></span> Mais
          </button>
        </nav>
      </div>

      {['inicio', 'os'].includes(tab) && (
        <button onClick={() => openModal('os')} aria-label="Nova O.S." className="fixed right-4 bottom-24 md:right-8 md:bottom-8 z-30 w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lift flex items-center justify-center active:scale-95">
          <Plus className="w-7 h-7" />
        </button>
      )}

      {more && (
        <Modal title="Mais opções" onClose={() => setMore(false)}>
          <div className="grid gap-2">
            {TABS.slice(4).map((t) => (
              <button key={t.id} onClick={() => go(t.id)} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 text-left font-semibold text-slate-800">
                <t.icon className="w-5 h-5 text-brand-600" /> {t.label}
              </button>
            ))}
            <button onClick={() => { setMore(false); openModal('account'); }} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 text-left font-semibold text-slate-800">
              <UserCircle className="w-5 h-5 text-brand-600" /> Minha conta
            </button>
            <button onClick={signOut} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-rose-200 text-left font-semibold text-rose-700">
              <LogOut className="w-5 h-5" /> Sair
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
