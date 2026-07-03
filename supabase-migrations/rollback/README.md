# Rollbacks — Perfil do Guardião (Fase 1)

Pares "down" das migrations `20260703_guardiao_*`. Nada aqui é aplicado
automaticamente — rode manualmente no SQL editor do Supabase (projeto PMC OS
`hqczwextifessaztyyyk`) se precisar reverter.

## Ordem de aplicação (reversão completa)

Reverta na ordem inversa da aplicação (dados antes do schema):

1. `20260703_guardiao_seed.down.sql` — remove o banco de perguntas semeado
   (assessments/questions/options). **Só funciona se ainda não houver respostas
   de candidatos** (`guardiao_candidate_responses` referencia `question_id`/
   `option_id` sem cascade). Se já houver, pule direto para o passo 2.
2. `20260703_guardiao_schema.down.sql` — dropa RPCs, policies e as 6 tabelas
   `guardiao_*` (em ordem reversa de FK). Isso apaga TODO o schema e dados
   junto, tornando o passo 1 desnecessário num teardown total.

Para reverter **só o seed** (mantendo o schema): rode apenas o passo 1.
Para reverter **tudo**: rode direto o passo 2 (o `DROP TABLE ... CASCADE`
implícito leva o seed junto).

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
