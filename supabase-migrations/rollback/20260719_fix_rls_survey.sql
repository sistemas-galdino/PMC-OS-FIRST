-- ROLLBACK de 20260719_fix_rls_survey.sql
-- Restaura as policies permissivas originais. ATENÇÃO: reabre acesso público total.

drop policy if exists survey_links_equipe_all on public.survey_links;
create policy allow_all_survey_links on public.survey_links
  for all to public using (true) with check (true);

drop policy if exists survey_responses_equipe_all on public.survey_responses;
create policy allow_all_survey_responses on public.survey_responses
  for all to public using (true) with check (true);
