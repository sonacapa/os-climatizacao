// Notificações no celular (Web Push) do ClimaOS.
// mode "key":   devolve a chave pública (gera o par de chaves na primeira vez; a privada nunca sai do servidor)
// mode "test":  manda uma notificação de teste para o usuário logado
// mode "daily": chamado pelo agendador (pg_cron) às 07:00 — preventivas para o escritório e agenda do dia para o técnico
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const enc = new TextEncoder();
const b64u = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s: string) => {
  const p = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(p + '='.repeat((4 - (p.length % 4)) % 4)), (c) => c.charCodeAt(0));
};
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
const hkdf = async (salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) => {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
};

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
type Keys = { publicKey: string; privateKey: CryptoKey };

// Criptografia do conteúdo (RFC 8291, aes128gcm)
async function encrypt(sub: Sub, payload: string) {
  const uaPublic = fromB64u(sub.p256dh);
  const authSecret = fromB64u(sub.auth);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

// Identificação do servidor (RFC 8292, VAPID)
async function vapidHeader(endpoint: string, keys: Keys) {
  const aud = new URL(endpoint).origin;
  const header = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:avisos@climaos.app' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${keys.publicKey}`;
}

async function sendPush(db: any, keys: Keys, sub: Sub, msg: { title: string; body: string; url?: string; tag?: string }) {
  const body = await encrypt(sub, JSON.stringify(msg));
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(sub.endpoint, keys),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '43200',
      Urgency: 'normal'
    },
    body
  });
  if (r.status === 404 || r.status === 410) await db.from('push_subscriptions').delete().eq('id', sub.id); // aparelho desinstalou ou recusou
  return r.status;
}

async function loadKeys(db: any): Promise<Keys & { cronSecret: string }> {
  let { data: cfg } = await db.rpc('automation_get');
  if (!cfg?.vapid_public) {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const pub = b64u(await crypto.subtle.exportKey('raw', pair.publicKey));
    const priv = await crypto.subtle.exportKey('jwk', pair.privateKey);
    await db.rpc('automation_set_vapid', { p_public: pub, p_private: priv });
    ({ data: cfg } = await db.rpc('automation_get')); // se duas chamadas correrem juntas, vale a que gravou primeiro
  }
  const privateKey = await crypto.subtle.importKey('jwk', cfg.vapid_private_jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return { publicKey: cfg.vapid_public, privateKey, cronSecret: cfg.cron_secret };
}

const spToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const OPEN = ['agendada', 'em_rota', 'no_local'];

async function daily(db: any, keys: Keys) {
  const today = spToday();
  const week = addDays(today, 7);
  const [{ data: profiles }, { data: subs }, { data: equipment }, { data: orders }, { data: clients }] = await Promise.all([
    db.from('profiles').select('id,name,role,does_field,active'),
    db.from('push_subscriptions').select('*'),
    db.from('equipment').select('id,client_id,next_maintenance').not('next_maintenance', 'is', null).lte('next_maintenance', week),
    db.from('work_orders').select('id,tech_id,client_id,scheduled_date,scheduled_time,status,work_order_items(equipment_id,status)').in('status', OPEN),
    db.from('clients').select('id,name,address')
  ]);
  const byUser = new Map<string, Sub[]>();
  for (const s of subs || []) byUser.set(s.user_id, [...(byUser.get(s.user_id) || []), s]);

  // Preventivas: aparelhos vencidos ou vencendo em 7 dias que ainda não estão em nenhuma O.S. aberta
  const scheduled = new Set((orders || []).flatMap((o: any) => (o.work_order_items || []).filter((i: any) => i.status === 'pendente').map((i: any) => i.equipment_id)));
  const due = (equipment || []).filter((e: any) => !scheduled.has(e.id));
  const overdue = due.filter((e: any) => e.next_maintenance < today).length;
  const soon = due.length - overdue;
  const dueClients = new Set(due.map((e: any) => e.client_id)).size;
  const clientById = new Map((clients || []).map((c: any) => [c.id, c]));

  let sent = 0;
  for (const p of profiles || []) {
    if (!p.active) continue;
    const devices = byUser.get(p.id) || [];
    if (devices.length === 0) continue;
    const first = String(p.name || '').split(' ')[0];
    const msgs: { title: string; body: string; url: string; tag: string }[] = [];

    if (p.role === 'admin' && due.length > 0) {
      const parts = [overdue > 0 && plural(overdue, 'vencida', 'vencidas'), soon > 0 && `${soon} nos próximos 7 dias`].filter(Boolean).join(' e ');
      msgs.push({
        title: 'Preventivas para avisar',
        body: `${parts} · ${plural(dueClients, 'cliente', 'clientes')}. Toque para avisar ou agendar.`,
        url: '/?aba=preventivas',
        tag: 'preventivas'
      });
    }
    if (p.role === 'tech' || p.does_field) {
      const mine = (orders || [])
        .filter((o: any) => o.tech_id === p.id && o.scheduled_date === today)
        .sort((a: any, b: any) => String(a.scheduled_time || '99').localeCompare(String(b.scheduled_time || '99')));
      if (mine.length > 0) {
        const o = mine[0];
        const c: any = clientById.get(o.client_id);
        const when = o.scheduled_time ? `às ${String(o.scheduled_time).slice(0, 5)}` : 'primeira';
        msgs.push({
          title: `Bom dia, ${first}! ${plural(mine.length, 'visita', 'visitas')} hoje`,
          body: `${when}: ${c?.name || 'cliente'}${c?.address ? ` — ${c.address}` : ''}. Toque para ver a rota.`,
          url: '/',
          tag: 'agenda'
        });
      }
    }
    for (const m of msgs) for (const d of devices) if ((await sendPush(db, keys, d, m)) < 300) sent++;
  }
  return { sent, overdue, soon };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { mode } = await req.json().catch(() => ({ mode: '' }));
    const keys = await loadKeys(db);

    if (mode === 'key') return json({ publicKey: keys.publicKey });

    if (mode === 'daily') {
      if (req.headers.get('x-cron-secret') !== keys.cronSecret) return json({ error: 'Não autorizado' }, 401);
      return json(await daily(db, keys));
    }

    if (mode === 'test') {
      const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
      const { data: u } = await db.auth.getUser(token);
      if (!u?.user) return json({ error: 'Faça login novamente.' }, 401);
      const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', u.user.id);
      if (!subs?.length) return json({ error: 'Este usuário não tem nenhum aparelho com notificações ativadas.' }, 400);
      const results = [];
      for (const s of subs) results.push(await sendPush(db, keys, s, { title: 'ClimaOS', body: 'Notificações funcionando neste aparelho. ✅', url: '/', tag: 'teste' }));
      return json({ results });
    }
    return json({ error: 'Modo inválido' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
