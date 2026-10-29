import { notFound } from 'next/navigation';
import LaudoView from '@/components/Laudo';
import PrintButton from './PrintButton';

// Laudo de um equipamento aberto pelo link enviado ao cliente. Sempre atualizado.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Laudo técnico', robots: { index: false, follow: false } };

async function load(token) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/laudo-public?t=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function LaudoPage({ params }) {
  const { token } = await params;
  const d = await load(token);
  if (!d || d.error) notFound();

  return (
    <main className="min-h-screen bg-slate-100 py-4 sm:py-8">
      <div className="max-w-3xl mx-auto px-3">
        <div className="no-print flex justify-end mb-3"><PrintButton /></div>
        <div className="print-area bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8">
          <LaudoView d={d} />
        </div>
        <p className="no-print text-center text-xs text-slate-400 mt-4">Documento gerado por {d.company.name}</p>
      </div>
    </main>
  );
}
