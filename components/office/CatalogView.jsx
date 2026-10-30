'use client';
import { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { norm } from '@/lib/utils';
import { useApp } from '../AppContext';
import { PageHeader } from '../shared';
import { Btn, Card, EmptyState, SearchBox } from '../ui';

export default function CatalogView() {
  const { data, openModal } = useApp();
  const [q, setQ] = useState('');
  const list = data.catalog.filter((c) => !q || norm(`${c.name} ${c.category}`).includes(norm(q)));
  const cats = [...new Set(list.map((c) => c.category))].sort();

  return (
    <div>
      <PageHeader title="Catálogo" subtitle="Materiais, peças e serviços que o técnico escolhe com um toque.">
        <Btn icon={Plus} onClick={() => openModal('catalog')}>Novo item</Btn>
      </PageHeader>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar item" className="mb-4" />
      {list.length === 0 ? (
        <EmptyState icon={Package} title={q ? 'Nada encontrado' : 'Catálogo vazio'} text={q ? undefined : 'Cadastre os itens que você mais usa.'} />
      ) : (
        <div className="space-y-4">
          {cats.map((cat) => (
            <section key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{cat}</h3>
              <Card className="divide-y divide-slate-100 overflow-hidden">
                {list.filter((c) => c.category === cat).map((c) => (
                  <button key={c.id} onClick={() => openModal('catalog', { item: c })} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50">
                    <span className="font-medium text-slate-900">{c.name}</span>
                    <span className="text-sm text-slate-500">{c.unit}</span>
                  </button>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
