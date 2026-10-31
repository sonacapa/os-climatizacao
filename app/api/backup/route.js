import { checkUser, env } from '@/lib/filesServer';

// Backups do banco no R2 (pasta backups/, fora do alcance de /api/files).
// POST: recebe o arquivo da função "backup" do Supabase, assinado com FILES_SIGNING_SECRET.
// GET: lista os backups (só administrador) ou baixa um com ?file=nome.
const KEEP = 12;
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const json = (body, status = 200) => Response.json(body, { status });

export async function POST(request) {
  const e = env();
  const ts = request.headers.get('x-backup-ts') || '';
  const sig = request.headers.get('x-backup-sig') || '';
  if (!e.FILES_SIGNING_SECRET || !/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 600) return json({ error: 'Não autorizado' }, 401);
  const body = await request.arrayBuffer();
  if (body.byteLength > 50 * 1024 * 1024) return json({ error: 'Backup grande demais' }, 413);
  const digest = hex(await crypto.subtle.digest('SHA-256', body));
  const key = await crypto.subtle.importKey('raw', enc.encode(e.FILES_SIGNING_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const good = hex(await crypto.subtle.sign('HMAC', key, enc.encode(`backup|${ts}|${digest}`)));
  if (good !== sig) return json({ error: 'Não autorizado' }, 401);

  const day = new Date(Number(ts) * 1000).toISOString().slice(0, 10);
  const name = `climaos-${day}.json.gz`;
  await e.FILES.put(`backups/${name}`, body, { httpMetadata: { contentType: 'application/gzip' } });

  // mantém só os mais recentes
  const list = await e.FILES.list({ prefix: 'backups/' });
  const old = list.objects.map((o) => o.key).sort().reverse().slice(KEEP);
  if (old.length) await e.FILES.delete(old);
  return json({ ok: true, file: name, kept: Math.min(list.objects.length, KEEP) });
}

export async function GET(request) {
  const who = await checkUser(request);
  if (!who.ok || !who.admin) return json({ error: 'Não autorizado' }, 401);
  const e = env();
  const file = new URL(request.url).searchParams.get('file');
  if (file) {
    if (!/^climaos-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(file)) return json({ error: 'Arquivo inválido' }, 400);
    const obj = await e.FILES.get(`backups/${file}`);
    if (!obj) return json({ error: 'Backup não encontrado' }, 404);
    return new Response(obj.body, { headers: { 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="${file}"` } });
  }
  const list = await e.FILES.list({ prefix: 'backups/' });
  return json({ backups: list.objects.map((o) => ({ file: o.key.slice(8), size: o.size, at: o.uploaded })).sort((a, b) => b.file.localeCompare(a.file)) });
}
