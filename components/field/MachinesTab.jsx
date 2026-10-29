'use client';
import { useState } from 'react';
import { Boxes } from 'lucide-react';
import { norm } from '@/lib/utils';
import { useApp } from '../AppContext';
import { MaintChip, eqSpecs, eqTitle } from '../shared';
import { Card, EmptyState, SearchBox } from '../ui';
import { lookupEquipment } from './ScanTab';

export default function MachinesTab() {
  const ctx = useApp();
  const { data, getClient } = ctx;
  const [q, setQ] = useState('');
  const n = norm(q);
  const list = data.equipment.filter((e) => !n || norm(`${e.code} ${e.brand} ${e.model} ${e.location_tag} ${getClient(e.client_id)?.name}`).includes(n));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Aparelhos dos seus clientes</h1>
        <p className="text-sm text-slate-500">Toque em um aparelho para ver o histórico e iniciar o atendimento.</p>
      </div>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar por cliente, local ou código" />
      {list.length === 0 ? (
        <EmptyState icon={Boxes} title="Nenhum aparelho" text="Aparecem aqui os aparelhos dos clientes que têm chamado com você." />
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {list.map((e) => (
            <button key={e.id} onClick={() => lookupEquipment(e.code, ctx)} className="w-full text-left px-4 py-3 hover:bg-slate-50">
              <p className="font-semibold text-slate-900 truncate">{e.location_tag || e.code}</p>
              <p className="text-xs text-slate-500 truncate">{getClient(e.client_id)?.name} · {eqTitle(e)}{eqSpecs(e) ? ` · ${eqSpecs(e)}` : ''}</p>
              <div className="mt-1"><MaintChip eq={e} /></div>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
