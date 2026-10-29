-- Aplicado no projeto Supabase (registro do que a migração v3 faz)
delete from public.work_orders where service_type = 'Teste';
update public.equipment set last_maintenance = null, next_maintenance = null, warranty_until = null where code = 'QR-CLIMA-0001';

create policy "branding: autenticados leem" on storage.objects for select to authenticated using (bucket_id = 'branding');

alter table public.work_orders add column share_token text not null unique default replace(gen_random_uuid()::text,'-','');

-- get_equipment_public passa a devolver 'token' (laudo) em cada item do histórico
-- guard_order_finish: bloqueia concluir a O.S. com aparelhos pendentes
-- work_order_items_os_eq_key: um aparelho por O.S.
-- item_done_needs_terms: concluir exige garantia e preventiva informadas
