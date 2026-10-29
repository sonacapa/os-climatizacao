import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Wind } from 'lucide-react';
import { fmtDate, isWarrantyActive, logoUrl, waLink } from '@/lib/utils';

// Página pública aberta ao ler o QR Code. Nunca guarda cache: o histórico precisa estar sempre atualizado.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Histórico do equipamento' };

async function load(token) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await supabase.rpc('get_equipment_public', { p_token: token });
  if (error || !data) return null;
  return data;
}

export default async function PublicEquipmentPage({ params }) {
  const { token } = await params;
  const info = await load(token);
  if (!info) notFound();

  const { company, equipment: eq, history } = info;
  const warranty = isWarrantyActive(eq.warranty_until);
  const wa = waLink(
    company.phone,
    `Olá! Li o QR Code (${eq.code}) do aparelho ${eq.brand} ${eq.btus} BTUs (${eq.location}) e gostaria de solicitar atendimento.`
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-5 py-4 flex items-center gap-3">
        {company.logo_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl(company.logo_path)} alt="" className="w-10 h-10 object-contain rounded-lg bg-white" />
        ) : (
          <div className="bg-brand-500 p-2 rounded-xl"><Wind className="w-5 h-5" /></div>
        )}
        <div>
          <p className="text-sm font-bold leading-tight">{company.name}</p>
          <p className="text-xs text-slate-400">Histórico do equipamento</p>
        </div>
      </header>

      <div className="max-w-xl mx-auto p-4 space-y-4">
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <span className="font-mono text-xs font-bold bg-slate-900 text-emerald-400 px-2.5 py-1 rounded-lg">{eq.code}</span>
          <h1 className="text-lg font-bold text-slate-900">{eq.brand} {eq.model} · {eq.btus} BTUs</h1>
          <p className="text-sm text-slate-600">{eq.location} · Gás {eq.gas} · {eq.voltage}</p>
          <dl className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
            <div>
              <dt className="text-slate-400">Última manutenção</dt>
              <dd className="font-semibold text-slate-900">{fmtDate(eq.last_maintenance)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Próxima preventiva</dt>
              <dd className="font-semibold text-slate-900">{fmtDate(eq.next_maintenance)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-400">Garantia do serviço</dt>
              <dd>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded font-bold ${warranty ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {warranty ? `Válida até ${fmtDate(eq.warranty_until)}` : 'Encerrada'}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <a href={wa} target="_blank" rel="noreferrer"
          className="block text-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl">
          Solicitar visita pelo WhatsApp
        </a>

        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-bold text-sm text-slate-900">Serviços realizados ({history.length})</h2>
          {history.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum serviço registrado para este aparelho ainda.</p>
          ) : (
            <ul className="space-y-3 border-l-2 border-brand-500 pl-4">
              {history.map((h, i) => (
                <li key={i} className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900">{fmtDate(h.date)} · {h.service}</p>
                  {h.warranty_days > 0 && <p className="text-xs text-slate-500">Garantia de {h.warranty_days} dias</p>}
                  {h.token && <a href={`/laudo/${h.token}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg">Ver laudo desta visita →</a>}
                  {h.materials.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {h.materials.map((m, j) => (
                        <span key={j} className="text-[11px] bg-brand-100 text-brand-900 font-semibold px-2.5 py-1 rounded-lg">
                          {m.quantity} {m.unit} · {m.name}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
          <p className="no-print text-center text-xs text-slate-400 pb-6"><a href="/privacidade" className="underline">Política de privacidade</a></p>
    </main>
  );
}
