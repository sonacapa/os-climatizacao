'use client';
import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-sky-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-sky-700">
      <Printer className="w-4 h-4" /> Baixar / imprimir PDF
    </button>
  );
}
