export const STATUS = {
  agendada: { label: 'Agendada', cls: 'bg-amber-100 text-amber-800' },
  em_rota: { label: 'A caminho', cls: 'bg-sky-100 text-sky-800' },
  no_local: { label: 'No local', cls: 'bg-indigo-100 text-indigo-800' },
  concluida_rua: { label: 'Concluída na rua', cls: 'bg-emerald-100 text-emerald-800' },
  finalizada: { label: 'Finalizada', cls: 'bg-slate-200 text-slate-700' },
  cancelada: { label: 'Cancelada', cls: 'bg-rose-100 text-rose-800' }
};

export const DONE = ['concluida_rua', 'finalizada'];

export const todayISO = () => new Date().toLocaleDateString('en-CA');

export const addDaysISO = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
};

export const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

export const osLabel = (os) => `OS-${String(os.number).padStart(4, '0')}`;

export const isWarrantyActive = (date) => !!date && date >= todayISO();

// Vencida ou vencendo nos próximos `days` dias
export const isDue = (date, days = 30) => !!date && date <= addDaysISO(todayISO(), days);

export const waLink = (phone, text) => {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  return `https://wa.me/55${digits}?text=${encodeURIComponent(text)}`;
};

export const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');

export const qrUrl = (eq) => `${siteUrl()}/qr/${eq.qr_token}`;

// Reduz a foto antes do envio (celular gera arquivos de vários MB)
export async function compressImage(file, maxSide = 1600, quality = 0.8) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
}

export const friendlyError = (msg = '') => {
  if (/foreign key/i.test(msg)) return 'Não é possível excluir: existem aparelhos ou O.S. ligados a este registro.';
  if (/row-level security/i.test(msg)) return 'Você não tem permissão para esta ação.';
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha inválidos.';
  return msg;
};
