'use client';
import { LogOut, UserCog } from 'lucide-react';
import { useApp } from '../AppContext';
import { Btn, Card } from '../ui';
import InstallCard from '../InstallCard';

export default function AccountTab() {
  const { me, openModal, signOut, data } = useApp();
  return (
    <div className="space-y-4">
      <Card className="p-5 flex items-center gap-4">
        <span className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 text-xl font-bold flex items-center justify-center">{me.name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 truncate">{me.name}</p>
          <p className="text-sm text-slate-500 truncate">{me.email}</p>
          <p className="text-xs text-slate-400">{data.company?.name}</p>
        </div>
      </Card>
      <InstallCard />
      <Btn variant="secondary" size="lg" icon={UserCog} className="w-full" onClick={() => openModal('account')}>Meus dados e senha</Btn>
      <a href="/privacidade" target="_blank" rel="noreferrer" className="block text-center text-sm text-slate-500 underline underline-offset-2">Política de privacidade</a>
      <Btn variant="dangerSoft" size="lg" icon={LogOut} className="w-full" onClick={signOut}>Sair</Btn>
    </div>
  );
}
