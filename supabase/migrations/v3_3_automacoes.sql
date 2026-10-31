-- Automações: notificações no celular (push), avisos diários e backup semanal.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Configuração interna (fora da API): segredo do agendador e chaves do push.
-- As chaves do push são geradas pela própria função "notify" e nunca saem do servidor.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.automation (
  id int primary key default 1 check (id = 1),
  cron_secret text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  vapid_public text,
  vapid_private_jwk jsonb
);
insert into private.automation (id) values (1) on conflict do nothing;

create or replace function public.automation_get()
returns jsonb language sql security definer set search_path to ''
as $$ select to_jsonb(a) from private.automation a where a.id = 1 $$;

create or replace function public.automation_set_vapid(p_public text, p_private jsonb)
returns void language sql security definer set search_path to ''
as $$ update private.automation set vapid_public = p_public, vapid_private_jwk = p_private where id = 1 and vapid_public is null $$;

revoke all on function public.automation_get() from public, anon, authenticated;
revoke all on function public.automation_set_vapid(text, jsonb) from public, anon, authenticated;
grant execute on function public.automation_get() to service_role;
grant execute on function public.automation_set_vapid(text, jsonb) to service_role;

-- Aparelhos (celular/computador) que aceitaram receber notificações
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push: dono lê" on public.push_subscriptions;
create policy "push: dono lê" on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));

-- Salva/remove a inscrição deste aparelho (troca de usuário no mesmo aparelho também funciona)
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void language sql security definer set search_path to ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  select auth.uid(), p_endpoint, p_p256dh, p_auth where auth.uid() is not null;
$$;
create or replace function public.remove_push_subscription(p_endpoint text)
returns void language sql security definer set search_path to ''
as $$ delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid() $$;

revoke all on function public.save_push_subscription(text, text, text) from public, anon;
revoke all on function public.remove_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.remove_push_subscription(text) to authenticated;

-- Agendamentos (horário UTC): avisos todo dia às 07:00 de Brasília; backup domingo às 03:00 de Brasília
select cron.unschedule(jobid) from cron.job where jobname in ('climaos-avisos-diarios', 'climaos-backup-semanal');

select cron.schedule('climaos-avisos-diarios', '0 10 * * *', $job$
  select net.http_post(
    url := 'https://yzmyuweyivyjbdgwuizy.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', (select cron_secret from private.automation where id = 1)),
    body := '{"mode":"daily"}'::jsonb,
    timeout_milliseconds := 60000
  )
$job$);

select cron.schedule('climaos-backup-semanal', '0 6 * * 0', $job$
  select net.http_post(
    url := 'https://yzmyuweyivyjbdgwuizy.supabase.co/functions/v1/backup',
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', (select cron_secret from private.automation where id = 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
$job$);
