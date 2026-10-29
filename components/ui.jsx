'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, Wind, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ITEM_STATUS, STATUS, logoUrl } from '@/lib/utils';

export const inputCls =
  'w-full border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-slate-700 block mb-1">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-500 block mt-1">{hint}</span>}
    </label>
  );
}

const VARIANTS = {
  primary: 'bg-sky-600 text-white hover:bg-sky-700 disabled:bg-sky-300',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  soft: 'bg-sky-50 text-sky-800 hover:bg-sky-100 disabled:opacity-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
  dangerSoft: 'bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50',
  whatsapp: 'bg-[#25D366] text-white hover:bg-[#1fbd5b] disabled:opacity-50',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:opacity-50'
};
const SIZES = { sm: 'px-3 py-1.5 text-sm gap-1.5', md: 'px-4 py-2.5 text-sm gap-2', lg: 'px-5 py-3.5 text-base gap-2' };

export function Btn({ variant = 'primary', size = 'md', icon: Icon, loading, className = '', children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center font-semibold rounded-xl transition-colors ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon ? <Icon className="w-4 h-4 shrink-0" /> : null}
      {children}
    </button>
  );
}

export function IconBtn({ icon: Icon, label, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 ${className}`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

// Janela: sobe da parte de baixo no celular, centralizada no computador.
export function Modal({ title, subtitle, onClose, children, footer, maxWidth = 'max-w-lg', printArea = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`sheet-in bg-white w-full ${maxWidth} rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[90vh] ${printArea ? 'print-area' : ''}`}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 no-print">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <IconBtn icon={X} label="Fechar" onClick={onClose} className="-mr-2 -mt-1" />
        </div>
        <div className="px-5 pb-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 bg-white rounded-b-2xl no-print safe-bottom">{footer}</div>}
      </div>
    </div>
  );
}

export function StatusBadge({ status, className = '' }) {
  const s = STATUS[status] || STATUS.agendada;
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${s.cls} ${className}`}>{s.label}</span>;
}
export function ItemBadge({ status }) {
  const s = ITEM_STATUS[status] || ITEM_STATUS.pendente;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

export function Chip({ children, tone = 'slate', className = '' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-rose-100 text-rose-800',
    sky: 'bg-sky-100 text-sky-800'
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${tones[tone]} ${className}`}>{children}</span>;
}

export function Card({ children, className = '', ...props }) {
  return (
    <div {...props} className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="text-center py-12 px-4">
      {Icon && <Icon className="w-9 h-9 text-slate-300 mx-auto mb-3" />}
      <p className="font-semibold text-slate-800">{title}</p>
      {text && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${inputCls} pl-10`}
      />
    </div>
  );
}

export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div className={`inline-flex bg-slate-100 rounded-xl p-1 gap-1 ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors flex-1 whitespace-nowrap ${
            value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {o.label}
          {o.count != null && <span className="ml-1.5 text-xs text-slate-400">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Logo({ company, size = 'md', dark = false }) {
  const url = logoUrl(company?.logo_path);
  const box = size === 'lg' ? 'w-16 h-16' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${box} object-contain rounded-lg bg-white shrink-0`} />;
  }
  return (
    <div className={`${box} rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0`}>
      <Wind className={size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
    </div>
  );
}

export function StorageImage({ bucket, path, alt, className = '' }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (!path) return undefined;
    supabase.storage.from(bucket).createSignedUrl(path, 3600).then(({ data }) => alive && setUrl(data?.signedUrl || null));
    return () => {
      alive = false;
    };
  }, [bucket, path]);
  if (!path) return null;
  if (!url) return <div className={`${className} bg-slate-100 animate-pulse`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}

// Grava ao sair do campo
export function SavedField({ value, onSave, as = 'input', ...props }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => setV(value ?? ''), [value]);
  const Tag = as;
  return <Tag {...props} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (value ?? '') && onSave(v)} />;
}

export function FullLoading({ text = 'Carregando…' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500 text-sm">
      <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
      {text}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full relative transition-colors ${checked ? 'bg-sky-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}
