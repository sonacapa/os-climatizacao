import { env } from '@/lib/filesServer';

// Temporária: copia arquivos do Supabase Storage para o R2 na migração. Apagar depois de usar.
export async function POST(request) {
  const e = env();
  if (!e.FILES_SIGNING_SECRET || request.headers.get('x-migrate-secret') !== e.FILES_SIGNING_SECRET) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { bucket, path, url } = await request.json();
  const host = new URL(url).hostname;
  if (!host.endsWith('.supabase.co') || !['os-photos', 'signatures', 'branding'].includes(bucket)) {
    return Response.json({ error: 'Origem inválida' }, { status: 400 });
  }
  const r = await fetch(url);
  if (!r.ok) return Response.json({ error: `Falha ao baixar (${r.status})` }, { status: 502 });
  await e.FILES.put(`${bucket}/${path}`, await r.arrayBuffer(), { httpMetadata: { contentType: r.headers.get('content-type') || 'application/octet-stream' } });
  return Response.json({ ok: true });
}
