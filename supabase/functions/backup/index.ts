// Backup semanal do banco do ClimaOS no Cloudflare R2.
// Chamado pelo agendador (pg_cron, domingo 03:00) com o segredo interno, ou por um administrador logado.
// Junta todas as tabelas num JSON compactado e envia ao site, que grava em R2 (pasta backups/, guarda 12 semanas).
import { createClient } from 'npm:@supabase/supabase-js@2';

const TABLES = ['company_settings', 'profiles', 'clients', 'equipment', 'catalog_items', 'work_orders', 'work_order_items', 'checklist_items', 'materials_used'];
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

Deno.serve(async (req) => {
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: cfg } = await db.rpc('automation_get');
    let allowed = !!cfg?.cron_secret && req.headers.get('x-cron-secret') === cfg.cron_secret;
    if (!allowed) {
      const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
      const { data: u } = await db.auth.getUser(token);
      if (u?.user) {
        const { data: p } = await db.from('profiles').select('role,active').eq('id', u.user.id).maybeSingle();
        allowed = p?.role === 'admin' && p?.active === true;
      }
    }
    if (!allowed) return json({ error: 'Não autorizado' }, 401);

    const dump: Record<string, unknown[]> = {};
    for (const t of TABLES) {
      const rows: unknown[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from(t).select('*').range(from, from + 999);
        if (error) throw new Error(`${t}: ${error.message}`);
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      dump[t] = rows;
    }
    const doc = JSON.stringify({ app: 'ClimaOS', version: 1, created_at: new Date().toISOString(), tables: dump });
    const gz = new Uint8Array(await new Response(new Blob([doc]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());

    // assinatura com o mesmo segredo usado nos links de arquivos
    const ts = String(Math.floor(Date.now() / 1000));
    const digest = hex(await crypto.subtle.digest('SHA-256', gz));
    const key = await crypto.subtle.importKey('raw', enc.encode(Deno.env.get('FILES_SIGNING_SECRET') || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = hex(await crypto.subtle.sign('HMAC', key, enc.encode(`backup|${ts}|${digest}`)));
    const base = (Deno.env.get('FILES_BASE_URL') || '').replace(/\/$/, '');
    const r = await fetch(`${base}/api/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/gzip', 'x-backup-ts': ts, 'x-backup-sig': sig },
      body: gz
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: out.error || `Falha ao gravar (${r.status})` }, 502);
    return json({ ok: true, ...out, rows: Object.fromEntries(Object.entries(dump).map(([t, v]) => [t, v.length])), bytes: gz.length });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
