import { notFound } from 'next/navigation';
import LaudoView from '@/components/Laudo';
import PrintButton from '../../laudo/[token]/PrintButton';

// Todos os laudos de uma visita num único link (um por aparelho, no mesmo PDF).
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Laudos da visita', robots: { index: false, follow: false } };

async function load(token) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/laudo-public?v=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function VisitPage({ params }) {
  const { token } = await params;
  const d = await load(token);
  if (!d || d.error || !d.laudos?.length) notFound();

  return (
    <main className="min-h-screen bg-slate-100 py-4 sm:py-8">
      <div className="max-w-3xl mx-auto px-3 space-y-4">
        <div className="no-print flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">{d.laudos.length} {d.laudos.length === 1 ? 'laudo' : 'laudos'} nesta visita</p>
          <PrintButton label="Baixar todos em PDF" />
        </div>
        <div className="print-area space-y-4">
          {d.laudos.map((l, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-8 break-after-page last:break-after-auto">
              <LaudoView d={l} />
            </div>
          ))}
        </div>
        <p className="no-print text-center text-xs text-slate-400">Documentos gerados por {d.laudos[0].company.name}</p>
      </div>
    </main>
  );
}
