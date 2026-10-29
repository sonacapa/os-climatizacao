'use client';
import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { compressImage, logoUrl, siteUrl } from '@/lib/utils';
import { useApp } from '../AppContext';
import { PageHeader } from '../shared';
import { Btn, Card, Field, Logo, inputCls } from '../ui';

export default function SettingsView() {
  const { data, run, toast } = useApp();
  const c = data.company;
  const [f, setF] = useState({
    name: c.name || '', document: c.document || '', phone: c.phone || '', email: c.email || '', address: c.address || '',
    technical_responsible: c.technical_responsible || '', warranty_days: c.warranty_days ?? 90, preventive_months: c.preventive_months ?? 6
  });
  const [busy, setBusy] = useState(false);
  const [busyLogo, setBusyLogo] = useState(false);
  const fileRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast('Informe o nome da empresa.', 'error');
    setBusy(true);
    await run(() => api.updateSettings({ ...f, name: f.name.trim(), warranty_days: Number(f.warranty_days) || 0, preventive_months: Number(f.preventive_months) || 0 }), 'Dados da empresa salvos');
    setBusy(false);
  };

  const pickLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusyLogo(true);
    await run(async () => {
      const blob = await compressImage(file, 600, 0.92, 'image/png');
      await api.uploadLogo(blob, c.logo_path);
    }, 'Logomarca atualizada');
    setBusyLogo(false);
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Dados da empresa" subtitle="Aparecem nos laudos, na página do QR Code e no sistema." />
      <div className="space-y-5">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Logomarca</h2>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {c.logo_path ? <Logo company={c} size="lg" /> : <ImagePlus className="w-8 h-8 text-slate-300" />}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Btn variant="secondary" icon={ImagePlus} loading={busyLogo} onClick={() => fileRef.current?.click()}>{c.logo_path ? 'Trocar logo' : 'Enviar logo'}</Btn>
                {c.logo_path && <Btn variant="dangerSoft" icon={Trash2} onClick={() => run(() => api.removeLogo(c.logo_path), 'Logomarca removida')}>Remover</Btn>}
              </div>
              <p className="text-xs text-slate-500">PNG ou JPG, de preferência quadrada. Será usada nos laudos e nas telas.</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={pickLogo} className="hidden" />
        </Card>

        <form onSubmit={save}>
          <Card className="p-5 space-y-3">
            <h2 className="font-semibold text-slate-900">Informações</h2>
            <Field label="Nome da empresa *"><input value={f.name} onChange={set('name')} className={inputCls} /></Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="CNPJ / CPF"><input value={f.document} onChange={set('document')} className={inputCls} /></Field>
              <Field label="WhatsApp"><input type="tel" value={f.phone} onChange={set('phone')} className={inputCls} /></Field>
              <Field label="E-mail"><input type="email" value={f.email} onChange={set('email')} className={inputCls} /></Field>
              <Field label="Responsável técnico"><input value={f.technical_responsible} onChange={set('technical_responsible')} className={inputCls} /></Field>
            </div>
            <Field label="Endereço"><input value={f.address} onChange={set('address')} className={inputCls} /></Field>

            <h2 className="font-semibold text-slate-900 pt-3">Valores padrão</h2>
            <p className="text-xs text-slate-500 -mt-2">O técnico pode mudar a garantia e a próxima preventiva em cada serviço. Estes valores só são sugeridos.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Garantia sugerida (dias)"><input type="number" min="0" value={f.warranty_days} onChange={set('warranty_days')} className={inputCls} /></Field>
              <Field label="Preventiva a cada (meses)"><input type="number" min="0" value={f.preventive_months} onChange={set('preventive_months')} className={inputCls} /></Field>
            </div>
            <Btn type="submit" loading={busy} className="w-full sm:w-auto">Salvar dados</Btn>
          </Card>
        </form>

        <Card className="p-5 text-sm text-slate-600 space-y-1">
          <h2 className="font-semibold text-slate-900">Endereço do sistema</h2>
          <p className="break-all">{siteUrl()}</p>
          <p className="text-xs text-slate-500">É este endereço que vai dentro dos QR Codes. Se mudar de domínio no futuro, as etiquetas já impressas deixam de abrir.</p>
        </Card>
      </div>
    </div>
  );
}
