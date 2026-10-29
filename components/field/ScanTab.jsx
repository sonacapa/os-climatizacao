'use client';
import { useState } from 'react';
import { Keyboard, ScanLine } from 'lucide-react';
import { api } from '@/lib/api';
import { friendlyError } from '@/lib/utils';
import { useApp } from '../AppContext';
import { Btn, Card, Field, inputCls } from '../ui';
import QrScanner from './QrScanner';

export const extractKey = (text) => {
  const m = String(text).match(/\/qr\/([A-Za-z0-9]+)/);
  return (m ? m[1] : String(text)).trim();
};

export async function lookupEquipment(text, { openModal, toast }) {
  try {
    const info = await api.findEquipment(extractKey(text));
    if (!info) return toast('Aparelho não encontrado. Confira o QR ou o código.', 'error');
    openModal('scanResult', { info });
  } catch (e) {
    toast(friendlyError(e.message), 'error');
  }
}

export default function ScanTab() {
  const ctx = useApp();
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const found = async (text) => {
    setScanning(false);
    setBusy(true);
    await lookupEquipment(text, ctx);
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Ler QR do aparelho</h1>
        <p className="text-sm text-slate-500">Aponte a câmera para a etiqueta. O aparelho abre com o histórico, pronto para atender.</p>
      </div>
      {scanning ? (
        <div className="space-y-3">
          <QrScanner onResult={found} />
          <Btn variant="secondary" className="w-full" onClick={() => setScanning(false)}>Cancelar</Btn>
        </div>
      ) : (
        <Btn size="lg" icon={ScanLine} loading={busy} className="w-full py-6 text-lg" onClick={() => setScanning(true)}>Abrir câmera</Btn>
      )}
      <Card className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) found(code); }} className="space-y-3">
          <Field label="Sem câmera? Digite o código da etiqueta" hint="Exemplo: QR-CLIMA-0001">
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} className={`${inputCls} uppercase`} autoCapitalize="characters" />
              <Btn type="submit" variant="secondary" icon={Keyboard}>Buscar</Btn>
            </div>
          </Field>
        </form>
      </Card>
    </div>
  );
}
