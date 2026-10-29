import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: 'Sessão inválida.' }, 401);
    const { data: me } = await admin.from('profiles').select('role, active').eq('id', u.user.id).maybeSingle();
    if (!me || me.role !== 'admin' || !me.active) return json({ error: 'Apenas administradores.' }, 403);

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const name = String(body.name || '').trim();
      if (!email || !name) return json({ error: 'Informe nome e e-mail.' }, 400);
      if (password.length < 6) return json({ error: 'A senha precisa ter ao menos 6 caracteres.' }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { name }
      });
      if (error) return json({ error: /already/i.test(error.message) ? 'Este e-mail já está cadastrado.' : error.message }, 400);
      const role = body.role === 'admin' ? 'admin' : 'tech';
      const { error: e2 } = await admin.from('profiles').update({
        name, email, phone: String(body.phone || ''), role,
        does_field: role === 'tech' ? true : !!body.does_field, active: true
      }).eq('id', data.user.id);
      if (e2) return json({ error: e2.message }, 400);
      return json({ ok: true, id: data.user.id });
    }

    if (action === 'set_password') {
      const password = String(body.password || '');
      if (password.length < 6) return json({ error: 'A senha precisa ter ao menos 6 caracteres.' }, 400);
      const { error } = await admin.auth.admin.updateUserById(body.id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'delete') {
      if (body.id === u.user.id) return json({ error: 'Você não pode excluir o seu próprio acesso.' }, 400);
      const { count } = await admin.from('work_orders').select('id', { count: 'exact', head: true }).eq('tech_id', body.id);
      if (count && count > 0) {
        // tem histórico: apenas bloqueia o acesso
        await admin.from('profiles').update({ active: false }).eq('id', body.id);
        await admin.auth.admin.updateUserById(body.id, { ban_duration: '876000h' });
        return json({ ok: true, blocked: true });
      }
      const { error } = await admin.auth.admin.deleteUser(body.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'Ação desconhecida.' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
