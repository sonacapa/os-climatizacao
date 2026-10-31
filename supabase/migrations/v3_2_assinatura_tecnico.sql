-- Assinatura do técnico cadastrada uma vez no perfil e usada em todos os laudos dele.
alter table public.profiles add column if not exists signature_path text;

create or replace function public.set_my_signature(p_path text)
returns void
language sql
security definer
set search_path to ''
as $$
  update public.profiles set signature_path = p_path where id = auth.uid();
$$;

revoke all on function public.set_my_signature(text) from public, anon;
grant execute on function public.set_my_signature(text) to authenticated;
