import { checkUser, env, parseKey, signKey } from '@/lib/filesServer';

// Gera links temporários (1 hora) para exibir fotos e assinaturas em <img>
export async function POST(request) {
  if (!(await checkUser(request)).ok) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const { items } = await request.json();
  const secret = env().FILES_SIGNING_SECRET;
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const urls = await Promise.all((items || []).slice(0, 20).map(async ({ bucket, path }) => {
    const k = parseKey([bucket, ...String(path || '').split('/')]);
    if (!k) return null;
    const s = await signKey(secret, k.key, exp);
    return `/api/files/${k.key.split('/').map(encodeURIComponent).join('/')}?e=${exp}&s=${s}`;
  }));
  return Response.json({ urls });
}
