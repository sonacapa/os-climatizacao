// Armazenamento local (IndexedDB) e fila de alterações para trabalhar sem internet.
// Nada aqui depende do Supabase: quem envia a fila é o lib/api.js.

const DB_NAME = 'os-offline';

let dbPromise;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        d.createObjectStore('kv');
        d.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
        d.createObjectStore('failed', { keyPath: 'seq', autoIncrement: true });
        d.createObjectStore('blobs');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const safe = async (fn, fallback) => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

// ----- cópia local dos dados (para abrir o app sem internet)
export const saveSnapshot = (uid, data) => safe(() => run('kv', 'readwrite', (s) => s.put({ uid, data, at: Date.now() }, 'snapshot')), undefined);
export const loadSnapshot = (uid) =>
  safe(async () => {
    const snap = await run('kv', 'readonly', (s) => s.get('snapshot'));
    return snap && snap.uid === uid ? snap.data : null;
  }, null);

// ----- fila de alterações
export const outboxAdd = (op) => run('outbox', 'readwrite', (s) => s.add({ op, at: Date.now() }));
export const outboxAll = () => safe(() => run('outbox', 'readonly', (s) => s.getAll()), []);
export const outboxCount = () => safe(() => run('outbox', 'readonly', (s) => s.count()), 0);
export const outboxDelete = (seq) => run('outbox', 'readwrite', (s) => s.delete(seq));

export const failedAdd = (rec) => safe(() => run('failed', 'readwrite', (s) => s.add(rec)), undefined);
export const failedAll = () => safe(() => run('failed', 'readonly', (s) => s.getAll()), []);
export const failedClear = () => safe(() => run('failed', 'readwrite', (s) => s.clear()), undefined);

// ----- fotos e assinaturas que ainda não subiram
export const blobPut = (path, blob) => run('blobs', 'readwrite', (s) => s.put(blob, path));
export const blobGet = (path) => safe(() => run('blobs', 'readonly', (s) => s.get(path)), undefined);
export const blobDelete = (path) => safe(() => run('blobs', 'readwrite', (s) => s.delete(path)), undefined);

// ----- estado de conexão e sincronização
export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
export const isNetworkError = (e) => /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|offline|econn/i.test(String(e?.message || e || ''));

const state = { online: true, pending: 0, syncing: false, failed: [] };
const subs = new Set();
const emit = () => subs.forEach((cb) => cb({ ...state }));

export const getSync = () => ({ ...state });
export const subscribeSync = (cb) => {
  subs.add(cb);
  return () => subs.delete(cb);
};
export const setSyncing = (v) => {
  state.syncing = v;
  emit();
};
export async function refreshSync() {
  state.pending = await outboxCount();
  state.failed = await failedAll();
  state.online = !isOffline();
  emit();
}

if (typeof window !== 'undefined') {
  state.online = !isOffline();
  window.addEventListener('online', refreshSync);
  window.addEventListener('offline', refreshSync);
  refreshSync();
}

// ----- alterações locais (para a tela mudar na hora, antes de enviar)
const localSubs = new Set();
export const onLocalOp = (cb) => {
  localSubs.add(cb);
  return () => localSubs.delete(cb);
};
export const emitLocal = (op) => localSubs.forEach((cb) => cb(op));

// Aplica uma alteração da fila nos dados já carregados.
export function applyOp(data, op) {
  const now = new Date().toISOString();
  const orders = (fn) => ({ ...data, orders: data.orders.map(fn) });
  const items = (fn) => orders((o) => ({ ...o, items: o.items.map(fn) }));

  if (op.t === 'patch') {
    if (op.table === 'work_orders') return orders((o) => (o.id === op.id ? { ...o, ...op.patch } : o));
    if (op.table === 'work_order_items') {
      return items((i) => (i.id === op.id ? { ...i, ...op.patch, ...(op.patch.status === 'feito' ? { completed_at: now } : {}) } : i));
    }
    if (op.table === 'checklist_items') {
      return items((i) => ({ ...i, checklist: i.checklist.map((c) => (c.id === op.id ? { ...c, ...op.patch } : c)) }));
    }
  }
  if (op.t === 'insert') {
    if (op.table === 'checklist_items') {
      return items((i) => (i.id === op.row.item_id ? { ...i, checklist: [...i.checklist, op.row].sort((a, b) => a.position - b.position) } : i));
    }
    if (op.table === 'materials_used') {
      return items((i) => (i.id === op.row.item_id ? { ...i, materials: [...i.materials, op.row] } : i));
    }
  }
  if (op.t === 'delete') {
    if (op.table === 'checklist_items') return items((i) => ({ ...i, checklist: i.checklist.filter((c) => c.id !== op.id) }));
    if (op.table === 'materials_used') return items((i) => ({ ...i, materials: i.materials.filter((m) => m.id !== op.id) }));
  }
  return data;
}

// Sessão guardada no aparelho: deixa abrir o app sem internet mesmo com o token vencido.
export function cachedSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (/^sb-.+-auth-token$/.test(k)) {
        const s = JSON.parse(localStorage.getItem(k));
        if (s?.user) return s;
      }
    }
  } catch {}
  return null;
}

export const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
