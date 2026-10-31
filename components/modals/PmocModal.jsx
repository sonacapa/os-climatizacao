'use client';
import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { fmtDate, logoUrl } from '@/lib/utils';
import { useApp } from '../AppContext';
import { Btn, Modal } from '../ui';
import { eqTitle } from '../shared';

const spDate = (ts) => (ts ? new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) : null);

// Relatório anual de manutenção (PMOC) de um cliente: todos os aparelhos e serviços do ano num só documento.
export default function PmocModal({ clientId }) {
  const { data, closeModal, getTech } = useApp();
  const client = data.clients.find((c) => c.id === clientId);
  const thisYear = new Date().getFullYear();

  // serviços concluídos deste cliente, por aparelho
  const services = useMemo(() => {
    const list = [];
    for (const os of data.orders) {
      if (os.client_id !== clientId) continue;
      for (const it of os.items) {
        if (it.status !== 'feito') continue;
        const date = spDate(it.completed_at) || os.scheduled_date;
        list.push({ os, it, date });
      }
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [data.orders, clientId]);

  const years = [...new Set([thisYear, ...services.map((s) => Number(s.date.slice(0, 4)))])].sort((a, b) => b - a);
  const [year, setYear] = useState(thisYear);
  if (!client) return null;

  const machines = data.equipment.filter((e) => e.client_id === clientId).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  const inYear = services.filter((s) => s.date.startsWith(String(year)));
  const company = data.company || {};
  const logo = logoUrl(company.logo_path);
  const done = new Set(inYear.map((s) => s.it.equipment_id));

  return (
    <Modal
      title="Relatório PMOC"
      subtitle={client.name}
      maxWidth="max-w-4xl"
      printArea
      onClose={closeModal}
      footer={
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <label className="text-sm text-slate-600 flex items-center gap-2">
            Ano
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <Btn icon={Printer} onClick={() => window.print()}>Imprimir / PDF</Btn>
        </div>
      }
    >
      <article className="bg-white text-slate-900 text-[12px] leading-snug">
        <header className="flex items-center gap-4 border-b-2 border-slate-800 pb-3">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-14 w-14 object-contain shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="text-base font-semibold">{company.name}</h1>
            <p className="text-slate-600 text-xs">{[company.document && `CNPJ/CPF ${company.document}`, company.phone, company.email].filter(Boolean).join(' · ')}</p>
            {company.address && <p className="text-slate-600 text-xs">{company.address}</p>}
          </div>
        </header>

        <div className="mt-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Relatório de manutenção — PMOC {year}</h2>
          <p className="text-xs text-slate-600">Plano de Manutenção, Operação e Controle dos sistemas de climatização (Lei 13.589/2018)</p>
        </div>

        <section className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-xs">
          <p><span className="text-slate-500">Cliente:</span> <strong>{client.name}</strong></p>
          <p><span className="text-slate-500">CPF/CNPJ:</span> {client.document || '—'}</p>
          <p className="col-span-2"><span className="text-slate-500">Endereço:</span> {client.address || '—'}</p>
          <p><span className="text-slate-500">Período:</span> 01/01/{year} a 31/12/{year}</p>
          <p><span className="text-slate-500">Responsável técnico:</span> {company.technical_responsible || '—'}</p>
        </section>

        <section className="grid grid-cols-3 gap-2 mt-3 text-center">
          {[['Aparelhos', machines.length], ['Serviços no ano', inYear.length], ['Aparelhos atendidos', `${done.size} de ${machines.length}`]].map(([l, v]) => (
            <div key={l} className="border border-slate-300 rounded-lg p-2">
              <p className="text-[10px] uppercase text-slate-500 font-semibold">{l}</p>
              <p className="text-base font-semibold">{v}</p>
            </div>
          ))}
        </section>

        {machines.length === 0 && <p className="mt-4 text-sm text-slate-500">Nenhum aparelho cadastrado para este cliente.</p>}

        {machines.map((eq) => {
          const rows = inYear.filter((s) => s.it.equipment_id === eq.id);
          return (
            <section key={eq.id} className="mt-4 break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-400 pb-1">
                <p className="font-semibold text-[13px]">{eq.code} · {eq.location_tag || 'Sem local'}</p>
                <p className="text-xs text-slate-600">
                  {[eqTitle(eq), eq.btus && `${eq.btus} BTUs`, eq.gas, eq.serial_number && `Série ${eq.serial_number}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              {rows.length === 0 ? (
                <p className="text-xs text-slate-500 py-1.5">Nenhum serviço registrado em {year}.</p>
              ) : (
                <>
                {/* celular: um cartão por serviço */}
                <ul className="sm:hidden print:hidden mt-1 divide-y divide-slate-200">
                  {rows.map(({ os, it, date }) => {
                    const ok = it.checklist.filter((c) => c.status === 'ok').length;
                    const att = it.checklist.filter((c) => c.status === 'attention').length;
                    return (
                      <li key={it.id} className="py-1.5 text-xs">
                        <p className="flex justify-between gap-2"><strong>{fmtDate(date)}</strong><span className="text-slate-500">O.S. {String(os.number).padStart(4, '0')}</span></p>
                        <p>{it.service_type || os.service_type} · {getTech(os.tech_id)?.name || '—'}</p>
                        {it.checklist.length > 0 && <p className="text-slate-600">Checklist: {ok} conforme{att ? ` · ${att} atenção` : ''}</p>}
                        {it.notes && <p className="text-slate-500">{it.notes}</p>}
                      </li>
                    );
                  })}
                </ul>
                <table className="hidden sm:table print:table w-full text-xs mt-1">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="font-medium py-1 pr-2 w-20">Data</th>
                      <th className="font-medium py-1 pr-2">Serviço</th>
                      <th className="font-medium py-1 pr-2">Técnico</th>
                      <th className="font-medium py-1 pr-2">Checklist</th>
                      <th className="font-medium py-1">O.S.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ os, it, date }) => {
                      const ok = it.checklist.filter((c) => c.status === 'ok').length;
                      const att = it.checklist.filter((c) => c.status === 'attention').length;
                      return (
                        <tr key={it.id} className="border-t border-slate-200 align-top">
                          <td className="py-1 pr-2">{fmtDate(date)}</td>
                          <td className="py-1 pr-2">{it.service_type || os.service_type}{it.notes ? <span className="block text-slate-500">{it.notes}</span> : null}</td>
                          <td className="py-1 pr-2">{getTech(os.tech_id)?.name || '—'}</td>
                          <td className="py-1 pr-2">{it.checklist.length ? `${ok} conforme${att ? ` · ${att} atenção` : ''}` : '—'}</td>
                          <td className="py-1">{String(os.number).padStart(4, '0')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </>
              )}
              <p className="text-[11px] text-slate-500 mt-0.5">Próxima manutenção prevista: {eq.next_maintenance ? fmtDate(eq.next_maintenance) : 'não programada'}</p>
            </section>
          );
        })}

        <section className="mt-10 grid grid-cols-2 gap-8 text-center text-xs break-inside-avoid">
          <div>
            <div className="h-12 border-b border-slate-700" />
            <p className="mt-1 font-semibold">{company.technical_responsible || company.name}</p>
            <p className="text-slate-500">Responsável técnico</p>
          </div>
          <div>
            <div className="h-12 border-b border-slate-700" />
            <p className="mt-1 font-semibold">{client.contact_name || client.name}</p>
            <p className="text-slate-500">Cliente / responsável pelo imóvel</p>
          </div>
        </section>
        <p className="mt-4 text-[10px] text-slate-400 text-center">Emitido em {fmtDate(new Date().toLocaleDateString('en-CA'))} pelo ClimaOS</p>
      </article>
    </Modal>
  );
}
