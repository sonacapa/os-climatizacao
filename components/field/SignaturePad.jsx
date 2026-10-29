'use client';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '../AppContext';
import { Btn, Field, SavedField, StorageImage, inputCls } from '../ui';

// Assinatura do cliente na tela. Só é enviada quando o técnico toca em "Salvar assinatura".
export default function SignaturePad({ os }) {
  const { run, toast } = useApp();
  const ref = useRef(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const point = (e) => {
    const c = ref.current;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const down = (e) => {
    const c = ref.current;
    c.setPointerCapture(e.pointerId);
    const ctx = c.getContext('2d');
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = ref.current.getContext('2d');
    const { x, y } = point(e);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(x, y);
    ctx.stroke();
    setDirty(true);
  };
  const up = () => { drawing.current = false; };
  const clear = () => {
    const c = ref.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    setDirty(false);
  };
  const save = () => {
    if (!dirty) return toast('Peça para o cliente assinar no quadro.', 'error');
    setBusy(true);
    ref.current.toBlob(async (blob) => {
      await run(async () => {
        const path = await api.uploadFile('signatures', os.id, 'assinatura.png', blob, 'image/png', os.signature_path);
        await api.patchOrder(os.id, { signature_path: path });
      }, 'Assinatura salva');
      setBusy(false);
    }, 'image/png');
  };

  return (
    <div className="space-y-3">
      <Field label="Nome de quem assina">
        <SavedField value={os.signature_name} onSave={(v) => run(() => api.patchOrder(os.id, { signature_name: v }))} placeholder="Nome do cliente ou responsável" className={inputCls} />
      </Field>
      {os.signature_path ? (
        <div className="space-y-2">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
            <StorageImage bucket="signatures" path={os.signature_path} alt="Assinatura do cliente" className="h-28 mx-auto" />
          </div>
          <Btn variant="dangerSoft" size="sm" onClick={() => run(() => api.patchOrder(os.id, { signature_path: null }))}>Refazer assinatura</Btn>
        </div>
      ) : (
        <div className="space-y-2">
          <canvas ref={ref} width={640} height={240} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            aria-label="Quadro de assinatura" className="w-full bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl" style={{ touchAction: 'none' }} />
          <div className="flex gap-2">
            <Btn variant="secondary" className="flex-1" onClick={clear}>Limpar</Btn>
            <Btn className="flex-1" loading={busy} onClick={save}>Salvar assinatura</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
