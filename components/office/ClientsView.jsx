'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, History, MapPin, MessageCircle, Pencil, Phone, Plus, QrCode, UserPlus, Users } from 'lucide-react';
import { norm, waLink } from '@/lib/utils';
import { useApp } from '../AppContext';
import { MaintChip, PageHeader, WarrantyChip, eqSpecs, eqTitle } from '../shared';
import { Btn, Card, EmptyState, IconBtn, SearchBox } from '../ui';

const machineText = (e) => norm(`${e.code} ${e.brand} ${e.model} ${e.location_tag} ${e.serial_number}`);

export default function ClientsView() {
  const { data, openModal } = useApp();
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState(null);

  const rows = useMemo(() => {
    const n = norm(q);
    return data.clients
      .map((c) => {
        const machines = data.equipment.filter((e) => e.client_id === c.id);
        const clientHit = !n || norm(`${c.name} ${c.phone} ${c.address} ${c.document} ${c.contact_name}`).includes(n);
        const hits = n ? machines.filter((m) => machineText(m).includes(n)) : [];
        return { c, count: machines.length, hits: clientHit ? [] : hits, show: clientHit || hits.length > 0 };
      })
      .filter((r) => r.show);
  }, [data.clients, data.equipment, q]);

  const selected = data.clients.find((c) => c.id === selId);

  return (
    <div>
      <PageHeader title="Clientes e aparelhos" subtitle="Busque por nome, telefone, endereço, código ou local do aparelho.">
        <Btn icon={UserPlus} onClick={() => openModal('client', { onSaved: (c) => setSelId(c.id) })}>Novo cliente</Btn>
      </PageHeader>

      <div className="grid md:grid-cols-[22rem_1fr] gap-5 items-start">
        <div className={`space-y-3 ${selected ? 'hidden md:block' : ''}`}>
          <SearchBox value={q} onChange={setQ} placeholder="Buscar cliente ou aparelho" />
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {rows.map(({ c, count, hits }) => (
              <button key={c.id} onClick={() => setSelId(c.id)} className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${selId === c.id ? 'bg-brand-50' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                  <span className="text-xs text-slate-500 shrink-0">{count} {count === 1 ? 'aparelho' : 'aparelhos'}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{c.address || c.phone || 'Sem endereço'}</p>
                {hits.length > 0 && <p className="text-xs text-brand-700 mt-0.5 truncate">Aparelho: {hits.slice(0, 2).map((h) => `${h.code} · ${h.location_tag}`).join(', ')}</p>}
              </button>
            ))}
            {rows.length === 0 && (
              <EmptyState icon={Users} title={q ? 'Nada encontrado' : 'Nenhum cliente ainda'} text={q ? 'Tente outro termo.' : 'Cadastre o primeiro cliente para começar.'}
                action={!q && <Btn icon={UserPlus} onClick={() => openModal('client', { onSaved: (c) => setSelId(c.id) })}>Novo cliente</Btn>} />
            )}
          </Card>
        </div>

        <div className={selected ? '' : 'hidden md:block'}>
          {selected ? <ClientDetail client={selected} onBack={() => setSelId(null)} /> : (
            <Card className="hidden md:block"><EmptyState icon={Users} title="Selecione um cliente" text="Os aparelhos, o histórico e as ações aparecem aqui." /></Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientDetail({ client, onBack }) {
  const { data, openModal } = useApp();
  const [q, setQ] = useState('');
  const machines = data.equipment.filter((e) => e.client_id === client.id);
  const shown = machines.filter((m) => !q || machineText(m).includes(norm(q)));
  const orders = data.orders.filter((o) => o.client_id === client.id).length;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="md:hidden inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700"><ArrowLeft className="w-4 h-4" /> Todos os clientes</button>
      <Card className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900">{client.name}</h2>
            {client.contact_name && <p className="text-sm text-slate-500">Contato: {client.contact_name}</p>}
          </div>
          <IconBtn icon={Pencil} label="Editar cliente" onClick={() => openModal('client', { client })} />
        </div>
        <div className="text-sm text-slate-600 space-y-1">
          {client.phone && <p className="flex gap-2"><Phone className="w-4 h-4 text-slate-400 mt-0.5" /> {client.phone}</p>}
          {client.address && <p className="flex gap-2"><MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> {client.address}</p>}
          {client.document && <p className="text-slate-500">CPF/CNPJ: {client.document}</p>}
          <p className="text-slate-500">{orders} {orders === 1 ? 'visita registrada' : 'visitas registradas'}</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Btn icon={ClipboardList} onClick={() => openModal('os', { preset: { client_id: client.id } })}>Nova O.S.</Btn>
          {client.phone && <a href={waLink(client.phone, `Olá, ${client.name.split(' ')[0]}!`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold"><MessageCircle className="w-4 h-4" /> WhatsApp</a>}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-slate-900">Aparelhos ({machines.length})</h3>
        <div className="flex gap-2">
          {machines.length > 0 && <Btn variant="secondary" size="sm" icon={QrCode} onClick={() => openModal('qrLabels', { equipment: machines })}>Etiquetas QR</Btn>}
          <Btn size="sm" icon={Plus} onClick={() => openModal('equipment', { clientId: client.id })}>Novo aparelho</Btn>
        </div>
      </div>
      {machines.length > 6 && <SearchBox value={q} onChange={setQ} placeholder="Buscar neste cliente" />}

      {machines.length === 0 ? (
        <Card><EmptyState title="Nenhum aparelho cadastrado" text="Cadastre os aparelhos deste cliente. Basta o local e, se quiser, marca e BTUs." action={<Btn icon={Plus} onClick={() => openModal('equipment', { clientId: client.id })}>Novo aparelho</Btn>} /></Card>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {shown.map((m) => (
            <div key={m.id} className="flex items-center gap-2 pr-2">
              <button onClick={() => openModal('passport', { equipmentId: m.id })} className="flex-1 min-w-0 text-left px-4 py-3 hover:bg-slate-50">
                <p className="font-semibold text-slate-900 truncate">{m.location_tag || m.code}</p>
                <p className="text-xs text-slate-500 truncate">{eqTitle(m)}{eqSpecs(m) ? ` · ${eqSpecs(m)}` : ''} · {m.code}</p>
                <div className="flex flex-wrap gap-1.5 mt-1"><WarrantyChip eq={m} /><MaintChip eq={m} /></div>
              </button>
              <IconBtn icon={History} label="Histórico" onClick={() => openModal('passport', { equipmentId: m.id })} />
              <IconBtn icon={QrCode} label="Etiqueta QR" onClick={() => openModal('qrLabels', { equipment: m })} />
              <IconBtn icon={Pencil} label="Editar aparelho" onClick={() => openModal('equipment', { equipment: m })} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
