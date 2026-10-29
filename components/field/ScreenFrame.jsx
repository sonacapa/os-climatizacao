'use client';
import { ArrowLeft } from 'lucide-react';

export default function ScreenFrame({ title, subtitle, onBack, right, children, footer }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-2 h-14 flex items-center gap-1">
        <button onClick={onBack} aria-label="Voltar" className="p-2.5 rounded-xl text-slate-700 hover:bg-slate-100"><ArrowLeft className="w-6 h-6" /></button>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 truncate leading-tight">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
        {right}
      </header>
      <main className={`flex-1 w-full max-w-2xl mx-auto p-4 space-y-4 ${footer ? 'pb-32' : 'pb-10'}`}>{children}</main>
      {footer && <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 safe-bottom"><div className="max-w-2xl mx-auto p-3">{footer}</div></div>}
    </div>
  );
}
