'use client';
import { useState } from 'react';
import { Boxes, ClipboardList, ScanLine, UserCircle } from 'lucide-react';
import { useApp } from '../AppContext';
import ModeSwitch from '../ModeSwitch';
import { Logo } from '../ui';
import JobsTab from './JobsTab';
import ScanTab from './ScanTab';
import MachinesTab from './MachinesTab';
import AccountTab from './AccountTab';
import VisitScreen from './VisitScreen';
import ItemScreen from './ItemScreen';

const TABS = [
  { id: 'chamados', label: 'Chamados', icon: ClipboardList },
  { id: 'scan', label: 'Ler QR', icon: ScanLine },
  { id: 'maquinas', label: 'Aparelhos', icon: Boxes },
  { id: 'conta', label: 'Conta', icon: UserCircle }
];

export default function FieldApp() {
  const { data, screen, setScreen } = useApp();
  const [tab, setTab] = useState('chamados');

  if (screen) {
    const os = data.orders.find((o) => o.id === screen.osId);
    if (!os) return <div className="p-6 text-center text-sm text-slate-500">Carregando…</div>;
    const itemId = screen.itemId || (screen.pickFirst ? os.items[0]?.id : null);
    if (itemId) return <ItemScreen osId={os.id} itemId={itemId} onBack={() => setScreen({ osId: os.id })} />;
    return <VisitScreen osId={os.id} onBack={() => setScreen(null)} onItem={(id) => setScreen({ osId: os.id, itemId: id })} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 text-ink px-4 h-14 flex items-center gap-3">
        <Logo company={data.company} size="sm" />
        <p className="font-display font-semibold text-lg flex-1 truncate">{data.company?.name}</p>
        <ModeSwitch />
      </header>
      <main className="flex-1 w-full max-w-2xl mx-auto p-4 pb-36">
        {tab === 'chamados' && <JobsTab />}
        {tab === 'scan' && <ScanTab />}
        {tab === 'maquinas' && <MachinesTab />}
        {tab === 'conta' && <AccountTab />}
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 safe-bottom">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 pt-2 pb-2.5 text-[11px] font-medium ${tab === t.id ? 'text-brand-700' : 'text-slate-500'}`}>
              <span className={`px-5 py-1 rounded-full transition-colors ${tab === t.id ? 'bg-brand-50 text-brand-700' : ''}`}><t.icon className="w-5 h-5" /></span> {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
