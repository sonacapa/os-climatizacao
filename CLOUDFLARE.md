# Hospedagem na Cloudflare (Workers + R2)

- Site: Next.js rodando em Cloudflare Workers via `@opennextjs/cloudflare` (o caminho atual da Cloudflare para Next.js; o Pages antigo foi substituído por Workers com os mesmos builds pelo Git).
- Arquivos (fotos, assinaturas, logo): bucket R2 `os-climatizacao-files`, acessado só pelo site em `/api/files`.
- Banco, login e funções continuam no Supabase.

## Variáveis (no painel do Worker)
Build e execução: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
Segredo: `FILES_SIGNING_SECRET` (o mesmo valor também na função `laudo-public` do Supabase, junto com `FILES_BASE_URL` = endereço do site).

## Build no Git
Build: `npx opennextjs-cloudflare build` · Deploy: `npx opennextjs-cloudflare deploy`

## Copiar arquivos antigos
`SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-storage.mjs`
