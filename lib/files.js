// Arquivos (fotos, assinaturas, logo) ficam no Cloudflare R2, atrás de /api/files.
import { supabase } from './supabase';

const enc = (path) => path.split('/').map(encodeURIComponent).join('/');

async function auth() {
  const { data } = await supabase.auth.getSession();
  return data?.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function check(res) {
  if (res.ok) return res;
  const j = await res.json().catch(() => ({}));
  // 5xx: tratado como falha de conexão, a fila do aparelho tenta de novo
  if (res.status >= 500) throw new Error(`Servidor indisponível (timeout ${res.status})`);
  throw new Error(j.error || `Erro ${res.status}`);
}

export async function putFile(bucket, path, blob, contentType) {
  const res = await fetch(`/api/files/${bucket}/${enc(path)}`, { method: 'PUT', headers: { ...(await auth()), 'Content-Type': contentType }, body: blob });
  if (res.status === 409) return; // já enviado antes
  await check(res);
}

export async function removeFile(bucket, path) {
  if (path) await check(await fetch(`/api/files/${bucket}/${enc(path)}`, { method: 'DELETE', headers: await auth() }));
}

export async function removeFolder(bucket, prefix) {
  await check(await fetch(`/api/files/${bucket}/${enc(prefix)}?folder=1`, { method: 'DELETE', headers: await auth() }));
}

const cache = new Map();
export async function signedUrl(bucket, path) {
  if (!path) return null;
  const k = `${bucket}/${path}`;
  const hit = cache.get(k);
  if (hit && hit.until > Date.now()) return hit.url;
  const res = await fetch('/api/files-sign', { method: 'POST', headers: { ...(await auth()), 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ bucket, path }] }) });
  if (!res.ok) return null;
  const { urls } = await res.json();
  if (urls?.[0]) cache.set(k, { url: urls[0], until: Date.now() + 50 * 60 * 1000 });
  return urls?.[0] || null;
}
