'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const EMPTY = { company: null, profiles: [], clients: [], equipment: [], catalog: [], orders: [] };

// Carrega tudo o que o usuário pode ver (a segurança por perfil é feita pelo banco, via RLS)
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
        .select('*, checklist_items(*), materials_used(*)')
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
      orders: (orders.data || []).map((o) => ({
        ...o,
        checklist_items: [...(o.checklist_items || [])].sort((a, b) => a.position - b.position)
      }))
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    reload();
    // "Ao vivo": quando qualquer O.S. muda, recarrega (com pequeno atraso para juntar mudanças)
    const channel = supabase
      .channel('os-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(reload, 400);
      })
      .subscribe();
    return () => {
      clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [enabled, reload]);

  return { ...data, loading, error, reload };
}
