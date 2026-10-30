'use client';
import { Briefcase, Truck } from 'lucide-react';
import { useApp } from './AppContext';

export default function ModeSwitch({ className = '' }) {
  const { mode, setMode, canSwitch } = useApp();
  if (!canSwitch) return null;
  return (
    <div className={`inline-flex bg-slate-100 rounded-lg p-1 gap-0.5 ${className}`}>
      {[['office', 'Escritório', Briefcase], ['field', 'Rua', Truck]].map(([v, label, Icon]) => (
        <button key={v} onClick={() => setMode(v)} aria-pressed={mode === v}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${mode === v ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
          <Icon className="w-4 h-4" /> {label}
        </button>
      ))}
    </div>
  );
}
