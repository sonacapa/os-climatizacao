'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { flush } from '@/lib/api';
import { applyOp, isNetworkError, isOffline, loadSnapshot, onLocalOp, outboxCount, saveSnapshot } from '@/lib/offline';

const EMPTY = { company: null, profiles: [], clients: [], equipment: [], catalog: [], orders: [] };

export function useAppData(enabled, uid) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timer = useRef(null);
  const loaded = useRef(false);

  // Abre com a última cópia guardada no aparelho (usada quando não há internet).
  const fromSnapshot = useCallback(async () => {
    const snap = await loadSnapshot(uid);
    if (snap) {
      loaded.current = true;
      setData(snap);
    }
    setLoading(false);
  }, [uid]);

  const reload = useCallback(async () => {
    await flush().catch(() => {});
    // sem internet, ou com alterações ainda na fila: mantém o que está na tela
    if (isOffline() || (await outboxCount()) > 0) {
      if (!loaded.current) await fromSnapshot();
      return;
    }
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
    if (failed && isNetworkError(failed.error)) {
      if (!loaded.current) await fromSnapshot();
      setLoading(false);
      return;
    }
    setError(failed ? failed.error.message : '');
    const next = {
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
    };
    loaded.current = true;
    setData(next);
    setLoading(false);
    if (!failed) saveSnapshot(uid, next);
  }, [uid, fromSnapshot]);

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
    window.addEventListener('online', reload);
    // alterações feitas sem internet aparecem na tela na hora
    const offLocal = onLocalOp((op) => setData((d) => applyOp(d, op)));
    // tenta enviar a fila de tempos em tempos
    const retry = setInterval(async () => {
      if (!isOffline() && (await outboxCount()) > 0) reload();
    }, 15000);
    return () => {
      clearTimeout(timer.current);
      clearInterval(retry);
      offLocal();
      window.removeEventListener('online', reload);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [enabled, reload]);

  return { ...data, loading, error, reload };
}
