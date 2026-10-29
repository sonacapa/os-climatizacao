import { fmtDate, addDaysISO } from '@/lib/utils';

const RESULT = { ok: 'Conforme', attention: 'Atenção', na: 'N/A', pending: '—' };
const spDate = (ts) => (ts ? new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) : null);

// Laudo de UM equipamento. Serve para a tela, impressão/PDF e para a página pública.
export default function LaudoView({ d }) {
  const { company, client, tech, os, item, equipment: eq, checklist, materials, photos } = d;
  const done = spDate(item.completed_at);
  const wDays = Number(item.warranty_days) || 0;
  const warrantyUntil = done && wDays > 0 ? addDaysISO(done, wDays) : null;
  const nextPrev = done && Number(item.preventive_months) > 0 ? (() => {
    const dt = new Date(`${done}T12:00:00`);
    dt.setMonth(dt.getMonth() + Number(item.preventive_months));
    return dt.toLocaleDateString('en-CA');
  })() : null;

  return (
    <article className="bg-white text-slate-900 text-[13px] leading-snug">
      <header className="flex items-center gap-4 border-b-2 border-slate-800 pb-3">
        {company.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logo_url} alt="" className="h-16 w-16 object-contain shrink-0" />
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-bold">{company.name}</h1>
          <p className="text-slate-600 text-xs">
            {[company.document && `CNPJ/CPF ${company.document}`, company.phone, company.email].filter(Boolean).join(' · ')}
          </p>
          {company.address && <p className="text-slate-600 text-xs">{company.address}</p>}
        </div>
      </header>

      <div className="flex items-end justify-between gap-3 mt-3">
        <h2 className="text-base font-bold uppercase tracking-wide">Laudo técnico</h2>
        <p className="text-xs text-slate-600">O.S. {String(os.number).padStart(4, '0')} · {fmtDate(done || os.date)}</p>
      </div>
      <p className="text-slate-600 text-xs">{os.service_type}</p>

      <section className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-xs">
        <p><span className="text-slate-500">Cliente:</span> <strong>{client.name}</strong></p>
        <p><span className="text-slate-500">Técnico:</span> <strong>{tech || '—'}</strong></p>
        <p className="col-span-2"><span className="text-slate-500">Endereço:</span> {client.address || '—'}</p>
      </section>

      <section className="mt-3 border border-slate-300 rounded-lg p-3 text-xs">
        <p className="font-bold text-sm mb-1">Equipamento {eq.code}</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
          <p><span className="text-slate-500">Local:</span> {eq.location_tag || '—'}</p>
          <p><span className="text-slate-500">Marca/modelo:</span> {[eq.brand, eq.model].filter(Boolean).join(' ') || '—'}</p>
          <p><span className="text-slate-500">Capacidade:</span> {eq.btus ? `${eq.btus} BTUs` : '—'}</p>
          <p><span className="text-slate-500">Gás / tensão:</span> {[eq.gas, eq.voltage].filter(Boolean).join(' / ') || '—'}</p>
          {eq.serial_number && <p className="col-span-2"><span className="text-slate-500">Nº de série:</span> {eq.serial_number}</p>}
        </div>
      </section>

      {checklist.length > 0 && (
        <section className="mt-3">
          <h3 className="font-bold text-sm mb-1">Serviços executados</h3>
          <table className="w-full text-xs border border-slate-300">
            <tbody>
              {checklist.map((c, i) => (
                <tr key={i} className="border-b border-slate-200 last:border-0">
                  <td className="px-2 py-1">{c.label}</td>
                  <td className="px-2 py-1 w-24 text-right font-semibold">{RESULT[c.status] || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {materials.length > 0 && (
        <section className="mt-3">
          <h3 className="font-bold text-sm mb-1">Materiais e peças utilizados</h3>
          <ul className="text-xs list-disc pl-5">
            {materials.map((m, i) => <li key={i}>{m.quantity} {m.unit} — {m.name}</li>)}
          </ul>
        </section>
      )}

      {item.notes && (
        <section className="mt-3">
          <h3 className="font-bold text-sm mb-1">Observações do técnico</h3>
          <p className="text-xs whitespace-pre-wrap">{item.notes}</p>
        </section>
      )}

      {(photos.before || photos.after) && (
        <section className="mt-3 grid grid-cols-2 gap-3 break-inside-avoid">
          {[['Antes', photos.before], ['Depois', photos.after]].map(([label, src]) => src && (
            <figure key={label}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Foto ${label.toLowerCase()}`} className="w-full h-40 object-cover rounded-lg border border-slate-300" />
              <figcaption className="text-[11px] text-slate-500 text-center mt-0.5">{label}</figcaption>
            </figure>
          ))}
        </section>
      )}

      <section className="mt-3 grid grid-cols-2 gap-3 break-inside-avoid">
        <div className="border border-slate-300 rounded-lg p-2.5">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Garantia do serviço</p>
          <p className="font-bold text-sm">{wDays > 0 ? `${wDays} dias` : 'Sem garantia'}</p>
          {warrantyUntil && <p className="text-xs text-slate-600">Válida até {fmtDate(warrantyUntil)}</p>}
        </div>
        <div className="border border-slate-300 rounded-lg p-2.5">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Próxima preventiva</p>
          <p className="font-bold text-sm">{nextPrev ? fmtDate(nextPrev) : 'Não programada'}</p>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-8 text-center text-xs break-inside-avoid">
        <div>
          <div className="h-16 flex items-end justify-center border-b border-slate-700">
            {photos.signature && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos.signature} alt="Assinatura do cliente" className="max-h-16" />
            )}
          </div>
          <p className="mt-1 font-semibold">{os.signature_name || client.name}</p>
          <p className="text-slate-500">Cliente</p>
        </div>
        <div>
          <div className="h-16 border-b border-slate-700" />
          <p className="mt-1 font-semibold">{company.technical_responsible || tech || '—'}</p>
          <p className="text-slate-500">Responsável técnico</p>
        </div>
      </section>
    </article>
  );
}
