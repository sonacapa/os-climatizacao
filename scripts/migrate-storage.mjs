// Copia os arquivos do Supabase Storage para o bucket R2 (rodar uma vez, no seu computador).
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-storage.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2 = process.env.R2_BUCKET || 'os-climatizacao-files';
if (!url || !key) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
const h = { apikey: key, Authorization: `Bearer ${key}` };
const tmp = mkdtempSync(join(tmpdir(), 'mig-'));

async function walk(bucket, prefix = '') {
  const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit: 1000 }) });
  const items = await res.json();
  let out = [];
  for (const it of items) {
    const path = prefix ? `${prefix}/${it.name}` : it.name;
    if (it.id === null) out = out.concat(await walk(bucket, path));
    else out.push({ path, type: it.metadata?.mimetype || 'application/octet-stream' });
  }
  return out;
}

let n = 0;
for (const bucket of ['os-photos', 'signatures', 'branding']) {
  for (const f of await walk(bucket)) {
    const r = await fetch(`${url}/storage/v1/object/${bucket}/${f.path}`, { headers: h });
    const file = join(tmp, `${n++}`);
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `${R2}/${bucket}/${f.path}`, '--file', file, '--content-type', f.type, '--remote'], { stdio: 'inherit' });
    console.log('copiado', bucket, f.path);
  }
}
console.log(`Pronto: ${n} arquivos.`);
