# Ordens de Serviço · Climatização

App Next.js + Supabase para gestão de O.S., equipamentos com QR Code, laudos e app do técnico (celular).

## Rodar localmente
```bash
cp .env.example .env.local
npm install
npm run dev     # http://localhost:3000
```

## Publicar (GitHub + Vercel)
1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel: *Add New → Project* → importe o repositório (Next.js é detectado sozinho).
3. Em *Settings → Environment Variables* cadastre as 3 variáveis do `.env.example`.
4. **Defina o domínio definitivo e coloque em `NEXT_PUBLIC_SITE_URL` antes de imprimir etiquetas** (o QR guarda essa URL).

## Primeiro acesso
O primeiro usuário criado no Supabase (*Authentication → Users → Add user*) vira admin. Os demais entram bloqueados
e são liberados pelo admin na aba *Equipe e acessos*. Desative o cadastro aberto em *Authentication → Sign In / Providers*.
