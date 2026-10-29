'use client';
import { UserPlus } from 'lucide-react';
import { useApp } from '../AppContext';
import { PageHeader } from '../shared';
import { Btn, Card, Chip } from '../ui';

const label = (p) => (p.role === 'tech' ? 'Só rua' : p.does_field ? 'Escritório e rua' : 'Só escritório');

export default function TeamView() {
  const { data, openModal, me } = useApp();
  return (
    <div>
      <PageHeader title="Equipe e acessos" subtitle="Quem pode entrar no sistema e o que cada pessoa enxerga.">
        <Btn icon={UserPlus} onClick={() => openModal('member')}>Novo usuário</Btn>
      </PageHeader>
      <Card className="divide-y divide-slate-100 overflow-hidden">
        {data.profiles.map((p) => (
          <button key={p.id} onClick={() => openModal('member', { member: p })} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50">
            <span className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0">{p.name.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-900 truncate">{p.name}{p.id === me.id && <span className="text-slate-400 font-normal"> (você)</span>}</span>
              <span className="block text-xs text-slate-500 truncate">{p.email || '—'}</span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <Chip tone="sky">{label(p)}</Chip>
              {!p.active && <Chip tone="red">Bloqueado</Chip>}
            </span>
          </button>
        ))}
      </Card>
      <p className="text-sm text-slate-500 mt-4">Ao criar um usuário, você define a senha inicial e pode enviá-la por WhatsApp. A própria pessoa troca a senha em “Minha conta” ou usa “Esqueci minha senha” na tela de entrada.</p>
    </div>
  );
}
