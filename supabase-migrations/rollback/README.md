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

---

# Rollbacks — Método MC, Comunidade e Conhecimento (2026-07-10 → 2026-07-14)

Pares "down" das migrations do Método MC (`/metodo`), do HUB PMC, do feed de
Novidades e das telas de Conhecimento (Estudos de Caso, Multiplicadores, Skills).
Como sempre: nada é aplicado automaticamente — rode manualmente no SQL editor do
Supabase se precisar reverter. Todos usam `DROP ... IF EXISTS`, então são seguros
mesmo com a migration só parcialmente aplicada.

## Ordem de aplicação (reversão completa)

Reverta na ordem **inversa** da aplicação (mais novo antes; dados antes do
schema). Dependências entre migrations estão anotadas:

1. `20260714_conhecimento_multiplicadores_skills.down.sql` — dropa a policy do
   storage, o bucket `skills-arquivos`, as policies e as tabelas
   `conhecimento_skills` e `conhecimento_multiplicadores` (o seed de 12+14 linhas
   some junto no `DROP TABLE`).
2. `20260714_clientes_data_cancelamento.down.sql` — `DROP COLUMN data_cancelamento`
   de `clientes_entrada_new`.
3. `20260714_canais_vendas_metas.down.sql` — dropa a policy e a tabela
   `canais_vendas_metas`.
4. `20260712_novidades_feed.down.sql` — dropa as policies e as tabelas
   `comunidade_novidades_comentarios` e `comunidade_novidades_likes` e remove as
   colunas `categoria`/`autor_avatar_url` de `comunidade_novidades`. **NÃO** dropa
   `comunidade_novidades` (isso é do passo 7). **Reverta antes do passo 7** — as
   curtidas/comentários têm FK para `comunidade_novidades`.
5. `20260711_hub_pmc_distribuicao.down.sql` — dropa a RPC `hub_pmc_distribuicao()`
   (o GRANT sai junto).
6. `20260711_conhecimento_estudos_caso.down.sql` — dropa as policies e a tabela
   `conhecimento_estudos_caso`.
7. `20260711_comunidade_novidades.down.sql` — dropa as policies e a tabela
   `comunidade_novidades` (só rode **depois** do passo 4).
8. `20260711_empresa_analise_ia.down.sql` — `DROP COLUMN analise_ia` /
   `analise_ia_em` de `cliente_informacoes_empresa`.
9. `20260711_metodo_area_ciclo_documento.down.sql` — dropa a policy do storage, o
   bucket `metodo-documentos` e as colunas `documento_nome`/`documento_url` de
   `metodo_area_ciclos`. **Reverta antes do passo 11** (a coluna vive numa tabela
   do Método MC).
10. `20260711_metodo_guardiao_foto.down.sql` — dropa a policy do storage, o bucket
    `guardiao-fotos` e a coluna `foto_url` de `metodo_guardioes`. **Reverta antes
    do passo 11.**
11. `20260711_create_metodo_mc.down.sql` — dropa as 8 tabelas do Método MC
    (`metodo_economias`, `metodo_ferramentas`, `metodo_sistemas`,
    `metodo_copilotos`, `metodo_gargalos`, `metodo_area_ciclos`, `metodo_areas`,
    `metodo_guardioes`) em ordem reversa de FK + as policies `<tabela>_rw`.
12. `20260710_create_cliente_etapas_metodo.down.sql` — dropa as policies e a
    tabela `cliente_etapas_metodo`.

## Notas sobre storage buckets

Três migrations criam bucket público: `guardiao-fotos` (passo 10),
`metodo-documentos` (passo 9) e `skills-arquivos` (passo 1). Os downs fazem
`DELETE FROM storage.buckets WHERE id = '<bucket>'` **depois** de dropar a policy
em `storage.objects`. O `DELETE` do bucket **falha se ainda houver arquivos**
(`storage.objects` referencia `bucket_id`) — esvazie o bucket antes se precisar
de um teardown total, ou remova o `DELETE FROM storage.buckets` para manter o
bucket (só a policy é removida).
