-- 20260719_fix_rls_cs_evidencias.sql
-- Corrige RLS permissivo na tabela cs_evidencias (mesmo caso do cs_acompanhamento).
--
-- Problema: policy `allow_all_evidencias` era FOR ALL TO public USING(true) WITH CHECK(true).
-- Qualquer portador da chave pública (anon inclusive) podia LER/INSERIR/ALTERAR/APAGAR as
-- evidências internas de CS de todos os clientes (codigo_cliente, nome_cliente, nome_empresa,
-- cs_responsavel, descricao, tipo).
--
-- Correção: restringe a quem está em `mentores` (padrão do projeto). Automações via
-- service_role ignoram RLS e seguem funcionando. Nenhum código do front/scripts usa a tabela.

drop policy if exists allow_all_evidencias on public.cs_evidencias;

create policy cs_evidencias_equipe_all on public.cs_evidencias
  for all to public
  using  (exists (select 1 from public.mentores where mentores.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.mentores where mentores.email = auth.jwt() ->> 'email'));
