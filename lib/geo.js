// Localização de endereços e rota do dia (estimativa em linha reta, não é rota de trânsito).
const R = 6371;
const rad = (x) => (x * Math.PI) / 180;
export const km = (a, b) => {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
// fator para aproximar o caminho real pelas ruas
export const roadKm = (a, b) => km(a, b) * 1.3;

export async function geocode(address) {
  const q = String(address || '').trim();
  if (q.length < 6) return null;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    const j = await r.json();
    return j[0] ? { lat: Number(j[0].lat), lng: Number(j[0].lon) } : null;
  } catch {
    return null;
  }
}

const total = (pts, start) => pts.reduce((s, p, i) => s + km(i === 0 ? start : pts[i - 1], p), 0);

// Ordena as paradas: vizinho mais próximo + melhoria 2-opt. start = {lat,lng}
export function planRoute(stops, start) {
  if (stops.length < 2) return stops;
  const left = [...stops];
  let cur = start || left[0];
  const out = [];
  if (!start) out.push(left.shift());
  while (left.length) {
    let bi = 0;
    left.forEach((p, i) => { if (km(cur, p) < km(cur, left[bi])) bi = i; });
    cur = left.splice(bi, 1)[0];
    out.push(cur);
  }
  const s = start || out[0];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < out.length - 1; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const cand = [...out.slice(0, i), ...out.slice(i, j + 1).reverse(), ...out.slice(j + 1)];
        if (total(cand, s) + 1e-9 < total(out, s)) { out.splice(0, out.length, ...cand); improved = true; }
      }
    }
  }
  return out;
}

export const routeLink = (addresses) => {
  const a = addresses.filter(Boolean).slice(0, 10);
  if (!a.length) return '';
  const dest = a[a.length - 1];
  const wp = a.slice(0, -1);
  return `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(dest)}${wp.length ? `&waypoints=${encodeURIComponent(wp.join('|'))}` : ''}`;
};
