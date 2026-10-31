import { MAX_BYTES, checkUser, env, parseKey, verifySig } from '@/lib/filesServer';

const json = (body, status = 200) => Response.json(body, { status });

async function params(ctx) {
  const { path } = await ctx.params;
  return (path || []).map(decodeURIComponent);
}

// Ler: logo é pública; fotos e assinaturas exigem login ou link assinado
export async function GET(request, ctx) {
  const parts = await params(ctx);
  const k = parseKey(parts);
  if (!k) return json({ error: 'Caminho inválido' }, 400);
  const e = env();
  const url = new URL(request.url);
  if (k.bucket !== 'branding') {
    const signed = await verifySig(e.FILES_SIGNING_SECRET, k.key, url.searchParams.get('e'), url.searchParams.get('s'));
    if (!signed && !(await checkUser(request)).ok) return json({ error: 'Não autorizado' }, 401);
  }
  const obj = await e.FILES.get(k.key);
  if (!obj) return json({ error: 'Arquivo não encontrado' }, 404);
  const headers = new Headers();
  headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('ETag', obj.httpEtag);
  headers.set('Cache-Control', k.bucket === 'branding' ? 'public, max-age=31536000, immutable' : 'private, max-age=3600');
  return new Response(obj.body, { headers });
}

// Enviar: usuário logado e ativo (logo só administrador)
export async function PUT(request, ctx) {
  const k = parseKey(await params(ctx));
  if (!k) return json({ error: 'Caminho inválido' }, 400);
  const who = await checkUser(request);
  if (!who.ok || (k.bucket === 'branding' && !who.admin)) return json({ error: 'Não autorizado' }, 401);
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BYTES) return json({ error: 'Arquivo grande demais' }, 413);
  const e = env();
  if (await e.FILES.head(k.key)) return json({ error: 'already exists' }, 409);
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return json({ error: 'Arquivo grande demais' }, 413);
  await e.FILES.put(k.key, body, { httpMetadata: { contentType: request.headers.get('content-type') || 'application/octet-stream' } });
  return json({ ok: true });
}

// Apagar um arquivo, ou uma pasta inteira com ?folder=1
export async function DELETE(request, ctx) {
  const url = new URL(request.url);
  const folder = url.searchParams.get('folder') === '1';
  const k = parseKey(await params(ctx));
  if (!k) return json({ error: 'Caminho inválido' }, 400);
  const who = await checkUser(request);
  if (!who.ok || (k.bucket === 'branding' && !who.admin)) return json({ error: 'Não autorizado' }, 401);
  const e = env();
  if (!folder) {
    await e.FILES.delete(k.key);
    return json({ ok: true });
  }
  let n = 0;
  let cursor;
  do {
    const list = await e.FILES.list({ prefix: `${k.key}/`, cursor });
    if (list.objects.length) await e.FILES.delete(list.objects.map((o) => o.key));
    n += list.objects.length;
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  return json({ ok: true, removed: n });
}
