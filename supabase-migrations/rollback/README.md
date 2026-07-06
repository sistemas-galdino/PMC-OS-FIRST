# Rollbacks — Perfil do Guardião

Pares "down" das migrations `20260703_guardiao_*` e `20260706_guardiao_*`.
Nada aqui é aplicado automaticamente — rode manualmente no SQL editor do
Supabase (projeto PMC OS `hqczwextifessaztyyyk`) se precisar reverter.

## Ordem de aplicação (reversão completa)

Reverta na ordem inversa da aplicação (mais novo antes; dados antes do schema):

1. `20260706_guardiao_share_links.down.sql` — dropa as 2 RPCs
   (`guardiao_resolve_share`, `guardiao_get_or_create_share_link`), as policies
   e a tabela `guardiao_share_links` (feature de link único por tipo, padrão
   Typeform). Independente das tabelas da Fase 1 — pode reverter só isto.
2. `20260703_guardiao_seed.down.sql` — remove o banco de perguntas semeado
   (assessments/questions/options). **Só funciona se ainda não houver respostas
   de candidatos** (`guardiao_candidate_responses` referencia `question_id`/
   `option_id` sem cascade). Se já houver, pule direto para o passo 3.
3. `20260703_guardiao_schema.down.sql` — dropa RPCs, policies e as 6 tabelas
   `guardiao_*` (em ordem reversa de FK). Isso apaga TODO o schema e dados
   junto, tornando o passo 2 desnecessário num teardown total.

Para reverter **só o link único** (mantendo o resto): rode apenas o passo 1.
Para reverter **só o seed** (mantendo o schema): rode apenas o passo 2.
Para reverter **tudo**: rode o passo 1 e depois o passo 3 (o `DROP TABLE
... CASCADE` implícito leva o seed junto).

## Edge Function

A Edge Function `guardiao-submit` não é coberta por SQL. Para removê-la:

```bash
supabase functions delete guardiao-submit
```

(ou remova pelo dashboard: Edge Functions → guardiao-submit → Delete).

## Notas

- Esta migration **não** cria triggers nem enums nativos (o PMC usa
  `text` + `CHECK`), então não há o que dropar nessas categorias.
- O rollback de schema usa `DROP ... IF EXISTS`, então é seguro rodar mesmo
  que a migration só tenha sido parcialmente aplicada.
