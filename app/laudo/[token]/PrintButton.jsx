'use client';
import { Printer } from 'lucide-react';

export default function PrintButton({ label = 'Baixar / imprimir PDF' }) {
  return (
    <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-brand-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-brand-700">
      <Printer className="w-4 h-4" /> {label}
    </button>
  );
}
