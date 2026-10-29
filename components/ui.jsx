'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STATUS } from '@/lib/utils';

export const inputCls = 'w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white';

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="font-semibold text-slate-600 block mb-1 text-xs">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children, maxWidth = 'max-w-md', printArea = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-label={title}
        className={`bg-white rounded-2xl ${maxWidth} w-full shadow-2xl my-auto max-h-[92vh] overflow-y-auto ${printArea ? 'print-area' : ''}`}
      >
        <div className="flex items-center justify-between px-5 pt-5 no-print">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatusBadge({ status, extra }) {
  const s = STATUS[status] || STATUS.agendada;
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
      {extra ? ` (${extra})` : ''}
    </span>
  );
}

// Imagem de um bucket privado: busca um link temporário assinado
export function StorageImage({ bucket, path, alt, className = '' }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (!path) return undefined;
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600)
      .then(({ data }) => alive && setUrl(data?.signedUrl || null));
    return () => {
      alive = false;
    };
  }, [bucket, path]);

  if (!path) return null;
  if (!url) return <div className={`${className} bg-slate-100 animate-pulse`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}

// Campo que guarda o texto localmente e só grava ao sair do campo
export function SavedField({ value, onSave, as = 'input', ...props }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => setV(value ?? ''), [value]);
  const Tag = as;
  return <Tag {...props} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (value ?? '') && onSave(v)} />;
}

export function FullLoading({ text = 'Carregando…' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300 text-sm">{text}</div>
  );
}
