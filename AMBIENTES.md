# Ambientes (Produção × Desenvolvimento)

Este projeto usa **dois projetos Supabase separados** para nunca testar direto na base de produção.
Padrão reutilizável para os próximos projetos também.

## Os dois ambientes

| Ambiente | Projeto Supabase | Project ref | Quando usar |
|---|---|---|---|
| **Produção** | `PMC-OS-V2` | `hqczwextifessaztyyyk` | App no ar (Vercel `main`), usuários reais |
| **Desenvolvimento** | `PMC-OS-DEV` | `jkwpxttxkksqiffodonb` | Testar mudanças localmente antes de promover |

> Plano Supabase: **Free** (2 projetos por org). Por isso NÃO usamos as *preview branches* nativas
> (exigem plano Pro) — usamos um projeto DEV dedicado, de graça.

## Como o frontend escolhe o ambiente (Vite)

O código lê `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — nada é hardcoded. Quem decide o ambiente
são os arquivos de env, por **modo** do Vite (precedência: `.env.[modo].local` > `.env.local`):

| Arquivo | Commitado? | Aponta pra | Carregado em |
|---|---|---|---|
| `web/.env.local` | não (`*.local`) | **PRODUÇÃO** | todos os modos (base) |
| `web/.env.development.local` | não | **DEV** | modo `development` (sobrepõe o `.env.local`) |
| `web/.env.example` | **sim** | — | template (sem segredos) |

### Comandos

```bash
cd web
npm run dev        # http://localhost:5173  -> DEV  (seguro, mostra banner "Ambiente dev")
npm run dev:prod   # roda local apontando pra PRODUÇÃO (uso raro; sem banner)
npm run build      # build de produção (a Vercel injeta os envs pelo dashboard)
```

O componente `web/src/components/ambiente-banner.tsx` mostra uma faixa amarela **"Ambiente dev"** sempre
que `VITE_APP_ENV != producao`, pra você nunca confundir onde está mexendo.

> ⚠️ Os scripts em `/scripts/*.mjs` (sincronização de reuniões com o Google Calendar) leem o
> `web/.env.local` **direto** e rodam contra **produção** de propósito. Por isso o `.env.local` NÃO é
> repontado pro DEV — quem aponta pro DEV é o `.env.development.local`.

## Fluxo de trabalho (promoção de mudanças)

1. Escreva a mudança de schema como migration em `supabase-migrations/AAAAMMDD_nome.sql`
   (e o par de rollback em `supabase-migrations/rollback/`).
2. Aplique **primeiro no DEV** (`jkwpxttxkksqiffodonb`) — via MCP `apply_migration` ou `psql`.
3. Teste com `npm run dev` (ou no preview da Vercel).
4. Validado → aplique a **mesma** migration em **produção** (`hqczwextifessaztyyyk`).
5. Edge functions: deploy no DEV → testar → deploy no prod.

## Clonar / re-sincronizar o schema (prod → DEV)

O DEV começa vazio e pode sofrer *drift* com o tempo. Para (re)criar o schema espelhando a produção:

```bash
# Connection strings + senha em: Supabase Dashboard > Project Settings > Database
pg_dump "postgresql://postgres:[SENHA]@db.hqczwextifessaztyyyk.supabase.co:5432/postgres" \
  --schema-only --schema=public -f prod-schema.sql
psql   "postgresql://postgres:[SENHA]@db.jkwpxttxkksqiffodonb.supabase.co:5432/postgres" \
  -f prod-schema.sql
```

**Não copie dados de clientes reais para o DEV** (privacidade) — só tabelas de configuração/referência
(`mentores`, `feriados`, `ferramentas_ia`, `guardiao_*`, `roadmap_itens`, `funis_*`, `consultores_*`)
e 1–2 registros de teste. Crie no **Auth do DEV** um admin de teste e o cliente demo (usuários não vêm
no dump de schema).

> Não recrie os cron jobs (`20260518_cron_sincronizar.sql`, `20260525_cron_watchdog_gcal.sql`) no DEV:
> eles têm a URL de produção hardcoded e chamariam as functions de produção.
