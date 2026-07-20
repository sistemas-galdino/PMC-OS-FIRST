-- 20260719_fix_rls_survey.sql
-- Corrige RLS permissivo em survey_links e survey_responses.
--
-- Problema: ambas com policy `ALL / public / true / true` — qualquer portador da
-- chave pública podia ler/inserir/alterar/apagar todos os links e respostas de
-- pesquisa (consultor, codigo_cliente, empresa, respostas).
--
-- Investigação (2026-07-19): fluxo de pesquisa está MORTO — survey_responses nunca
-- recebeu um insert (pg_stat n_tup_ins=0), survey_links tem só 5 links de teste
-- (23/06, nenhum usado), sem consumidor no código (front/edge/scripts/n8n) e sem
-- tráfego na API. Foi substituído pelo fluxo guardiao_* (edge guardiao-submit +
-- RPC guardiao_resolve_share). Logo, não há flow público a preservar.
--
-- Correção: restringe a quem está em `mentores` (admin/mentor), como no
-- cs_acompanhamento. Automações via service_role ignoram RLS.
--
-- NOTA: se um dia o fluxo de pesquisa for reativado com respondente anônimo,
-- NÃO reabrir acesso público — usar o padrão do Guardião (RPC security definer
-- que resolve o token e insere a resposta), nunca USING(true) na tabela.

drop policy if exists allow_all_survey_links on public.survey_links;
create policy survey_links_equipe_all on public.survey_links
  for all to public
  using  (exists (select 1 from public.mentores where mentores.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.mentores where mentores.email = auth.jwt() ->> 'email'));

drop policy if exists allow_all_survey_responses on public.survey_responses;
create policy survey_responses_equipe_all on public.survey_responses
  for all to public
  using  (exists (select 1 from public.mentores where mentores.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.mentores where mentores.email = auth.jwt() ->> 'email'));
