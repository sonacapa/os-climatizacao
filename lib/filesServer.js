// Servidor (Cloudflare Worker): acesso ao R2, login via Supabase e links assinados.
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const BUCKETS = ['os-photos', 'signatures', 'branding'];
export const MAX_BYTES = 10 * 1024 * 1024;

export const env = () => getCloudflareContext().env;

const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}

// Mesmo algoritmo da função laudo-public (supabase/functions/laudo-public)
export const signKey = (secret, key, exp) => hmac(secret, `${key}|${exp}`);
export async function verifySig(secret, key, exp, sig) {
  if (!secret || !exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const good = await signKey(secret, key, exp);
  return good.length === sig.length && good === sig;
}

// Valida o login do Supabase e devolve { ok, admin }
export async function checkUser(request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return { ok: false };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const h = { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' };
  const call = async (fn) => {
    const r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: 'POST', headers: h, body: '{}' });
    return r.ok ? r.json() : false;
  };
  const u = await fetch(`${base}/auth/v1/user`, { headers: h });
  if (!u.ok) return { ok: false };
  const [active, admin] = await Promise.all([call('is_active_user'), call('is_admin')]);
  return { ok: active === true, admin: admin === true };
}

// Caminho seguro: "bucket/pasta/arquivo"
export function parseKey(parts) {
  if (!parts?.length || parts.some((p) => !p || p === '.' || p === '..' || p.includes('\\'))) return null;
  const [bucket, ...rest] = parts;
  if (!BUCKETS.includes(bucket) || rest.length === 0) return null;
  return { bucket, key: parts.join('/') };
}
