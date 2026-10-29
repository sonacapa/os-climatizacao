export const STATUS = {
  agendada: { label: 'Agendada', cls: 'bg-amber-100 text-amber-800' },
  em_rota: { label: 'A caminho', cls: 'bg-sky-100 text-sky-800' },
  no_local: { label: 'No local', cls: 'bg-indigo-100 text-indigo-800' },
  finalizada: { label: 'Concluída', cls: 'bg-emerald-100 text-emerald-800' },
  cancelada: { label: 'Cancelada', cls: 'bg-rose-100 text-rose-800' }
};
export const OPEN = ['agendada', 'em_rota', 'no_local'];

export const ITEM_STATUS = {
  pendente: { label: 'Pendente', cls: 'bg-slate-100 text-slate-600' },
  feito: { label: 'Feito', cls: 'bg-emerald-100 text-emerald-800' },
  nao_feito: { label: 'Não realizado', cls: 'bg-rose-100 text-rose-800' }
};

export const SERVICE_TYPES = [
  'Manutenção preventiva',
  'Limpeza / higienização',
  'Instalação',
  'Reparo / corretiva',
  'Visita técnica / orçamento'
];

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

export const fmtDateShort = (iso) => {
  if (!iso) return '—';
  const [, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}`;
};

export const fmtTime = (t) => (t ? String(t).slice(0, 5) : '');
export const fmtClock = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

// "Hoje", "Amanhã", "Ontem" ou a data
export const relDay = (iso) => {
  const t = todayISO();
  if (iso === t) return 'Hoje';
  if (iso === addDaysISO(t, 1)) return 'Amanhã';
  if (iso === addDaysISO(t, -1)) return 'Ontem';
  return fmtDate(iso);
};

export const osLabel = (os) => `OS-${String(os.number).padStart(4, '0')}`;

export const isWarrantyActive = (date) => !!date && date >= todayISO();

// dias até a data (negativo = vencida)
export const daysUntil = (iso) => {
  if (!iso) return null;
  const a = new Date(`${todayISO()}T12:00:00`);
  const b = new Date(`${iso}T12:00:00`);
  return Math.round((b - a) / 86400000);
};

export const addDaysTo = (iso, days) => addDaysISO(iso, Number(days) || 0);

export const digits = (s) => String(s || '').replace(/\D/g, '');

export const waLink = (phone, text) => {
  let d = digits(phone);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return `https://wa.me/${d ? '55' + d : ''}?text=${encodeURIComponent(text)}`;
};

export const mapsLink = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
export const wazeLink = (address) => `https://waze.com/ul?q=${encodeURIComponent(address || '')}&navigate=yes`;

export const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
export const qrUrl = (eq) => `${siteUrl()}/qr/${eq.qr_token}`;
export const laudoUrl = (item) => `${siteUrl()}/laudo/${item.share_token}`;

export const logoUrl = (path) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branding/${path}` : null;

// Minúsculas e sem acento, para busca
export const norm = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function compressImage(file, maxSide = 1600, quality = 0.8, type = 'image/jpeg') {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

export const friendlyError = (msg = '') => {
  if (/foreign key|violates foreign/i.test(msg)) return 'Não é possível excluir: existem registros ligados a este item.';
  if (/row-level security/i.test(msg)) return 'Você não tem permissão para esta ação.';
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem conexão. Verifique a internet e tente de novo.';
  if (/same password/i.test(msg)) return 'Escolha uma senha diferente da atual.';
  if (/Password should be/i.test(msg)) return 'A senha precisa ter ao menos 6 caracteres.';
  if (/rate limit|after \d+ seconds/i.test(msg)) return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
  return msg;
};

export const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const arr = new Uint32Array(8);
  crypto.getRandomValues(arr);
  arr.forEach((n) => (out += chars[n % chars.length]));
  return out;
};
