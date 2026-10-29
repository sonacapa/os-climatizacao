'use client';
import { useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';
import { canPrompt, isIOS, isStandalone, promptInstall, subscribeInstall } from '@/lib/pwa';
import { Btn, Card } from './ui';

// Convite para instalar o aplicativo na tela inicial.
export default function InstallCard() {
  const [, tick] = useState(0);
  const [standalone, setStandalone] = useState(true);
  useEffect(() => {
    setStandalone(isStandalone());
    return subscribeInstall(() => { tick((n) => n + 1); setStandalone(isStandalone()); });
  }, []);

  if (standalone) return null;
  if (canPrompt()) {
    return (
      <Card className="p-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0"><Download className="w-5 h-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Instalar o aplicativo</p>
          <p className="text-sm text-slate-600">Abre mais rápido, em tela cheia, e funciona sem internet.</p>
        </div>
        <Btn size="sm" onClick={promptInstall}>Instalar</Btn>
      </Card>
    );
  }
  if (isIOS()) {
    return (
      <Card className="p-4 flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0"><Share className="w-5 h-5" /></span>
        <div>
          <p className="font-semibold text-ink">Instalar no iPhone</p>
          <p className="text-sm text-slate-600">Toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p>
        </div>
      </Card>
    );
  }
  return null;
}
