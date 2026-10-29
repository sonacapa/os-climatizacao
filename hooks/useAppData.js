'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const EMPTY = { company: null, profiles: [], clients: [], equipment: [], catalog: [], orders: [] };

export function useAppData(enabled) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timer = useRef(null);

  const reload = useCallback(async () => {
    const [company, profiles, clients, equipment, catalog, orders] = await Promise.all([
      supabase.from('company_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('profiles').select('*').order('name'),
      supabase.from('clients').select('*').order('name'),
      supabase.from('equipment').select('*').order('code'),
      supabase.from('catalog_items').select('*').order('name'),
      supabase
        .from('work_orders')
        .select('*, work_order_items(*), checklist_items(*), materials_used(*)')
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false })
    ]);
    const failed = [company, profiles, clients, equipment, catalog, orders].find((r) => r.error);
    setError(failed ? failed.error.message : '');
    setData({
      company: company.data,
      profiles: profiles.data || [],
      clients: clients.data || [],
      equipment: equipment.data || [],
      catalog: catalog.data || [],
      orders: (orders.data || []).map((o) => {
        const items = [...(o.work_order_items || [])]
          .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
          .map((it) => ({
            ...it,
            checklist: (o.checklist_items || []).filter((c) => c.item_id === it.id).sort((a, b) => a.position - b.position),
            materials: (o.materials_used || []).filter((m) => m.item_id === it.id)
          }));
        const { work_order_items, checklist_items, materials_used, ...rest } = o;
        return { ...rest, items };
      })
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    reload();
    const bump = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(reload, 500);
    };
    const channel = supabase
      .channel('os-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_order_items' }, bump)
      .subscribe();
    const onVisible = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [enabled, reload]);

  return { ...data, loading, error, reload };
}
