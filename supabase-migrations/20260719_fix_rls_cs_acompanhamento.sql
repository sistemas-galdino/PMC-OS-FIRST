-- 20260719_fix_rls_cs_acompanhamento.sql
-- Corrige RLS permissivo na tabela cs_acompanhamento.
--
-- Problema: a policy `allow_all_cs` era FOR ALL TO public USING(true) WITH CHECK(true),
-- ou seja, qualquer portador da chave pública (anon inclusive — que vai no bundle do
-- front) podia LER, INSERIR, ALTERAR e APAGAR as anotações internas de CS de TODOS os
-- clientes (observação, plano de ação, nível de escalada, etc.).
--
-- Correção: restringe o acesso a quem está cadastrado em `mentores` (mesmo padrão do
-- `equipe_all` em cliente_vitorias). Automações que usam service_role ignoram RLS e
-- seguem funcionando. Nenhum código do front lê/escreve esta tabela.

drop policy if exists allow_all_cs on public.cs_acompanhamento;

create policy cs_acompanhamento_equipe_all on public.cs_acompanhamento
  for all to public
  using  (exists (select 1 from public.mentores where mentores.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.mentores where mentores.email = auth.jwt() ->> 'email'));
