-- Migration: lockdown RLS — fechar gaps de autorização identificados em 2026-04-27.
-- Estado pré-existente: a maioria das tabelas já tinha RLS+policies, mas várias
-- com brechas (USING(true) pra anon/authenticated). Esse migration:
--  - dropa policies frouxas
--  - adiciona policies faltantes em tabelas que tinham RLS sem cobertura completa
--  - habilita RLS + adiciona policies em tabelas que ainda não tinham (reunioes_galdino, encontros_ao_vivo)
--
-- Usa is_admin() que já existia no banco (é equivalente ao is_mentor() introduzido na migration anterior).

-- 1. clientes_entrada_new — leitura geral aberta (incluindo anon!) → fechar
DROP POLICY IF EXISTS "Permitir leitura para anon" ON public.clientes_entrada_new;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.clientes_entrada_new;
CREATE POLICY clientes_entrada_select_self_or_admin ON public.clientes_entrada_new
  FOR SELECT TO authenticated
  USING (auth.uid() = id_cliente OR is_admin());

-- 2. clientes_formulario — DELETE faltava
CREATE POLICY clientes_formulario_delete_admin ON public.clientes_formulario
  FOR DELETE TO authenticated
  USING (is_admin());

-- 3. reunioes_mentoria_new — só tinha SELECT; INSERT/UPDATE/DELETE eram negadas (RLS+sem policy = deny)
CREATE POLICY reunioes_mentoria_new_insert ON public.reunioes_mentoria_new
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id_cliente OR is_admin());
CREATE POLICY reunioes_mentoria_new_update ON public.reunioes_mentoria_new
  FOR UPDATE TO authenticated
  USING (auth.uid() = id_cliente OR is_admin())
  WITH CHECK (auth.uid() = id_cliente OR is_admin());
CREATE POLICY reunioes_mentoria_new_delete ON public.reunioes_mentoria_new
  FOR DELETE TO authenticated
  USING (auth.uid() = id_cliente OR is_admin());

-- 4. reunioes_galdino — sem RLS
ALTER TABLE public.reunioes_galdino ENABLE ROW LEVEL SECURITY;
CREATE POLICY reunioes_galdino_select ON public.reunioes_galdino
  FOR SELECT TO authenticated
  USING (auth.uid() = id_cliente OR is_admin());
CREATE POLICY reunioes_galdino_modify ON public.reunioes_galdino
  FOR ALL TO authenticated
  USING (auth.uid() = id_cliente OR is_admin())
  WITH CHECK (auth.uid() = id_cliente OR is_admin());

-- 5. reunioes_blackcrm — tinha "Allow all for anon" (qualquer um, incluindo não-logados)
DROP POLICY IF EXISTS "Allow all for anon" ON public.reunioes_blackcrm;
CREATE POLICY reunioes_blackcrm_select ON public.reunioes_blackcrm
  FOR SELECT TO authenticated
  USING (auth.uid()::text = id_cliente OR is_admin());
CREATE POLICY reunioes_blackcrm_modify ON public.reunioes_blackcrm
  FOR ALL TO authenticated
  USING (auth.uid()::text = id_cliente OR is_admin())
  WITH CHECK (auth.uid()::text = id_cliente OR is_admin());

-- 6. encontros_ao_vivo — sem RLS (calendário shared do programa)
ALTER TABLE public.encontros_ao_vivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY encontros_ao_vivo_select_all ON public.encontros_ao_vivo
  FOR SELECT TO authenticated USING (true);
CREATE POLICY encontros_ao_vivo_modify_admin ON public.encontros_ao_vivo
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 7. recursos_programa — leitura/escrita aberta (incluindo anon!)
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.recursos_programa;
DROP POLICY IF EXISTS "Allow select for anon" ON public.recursos_programa;
CREATE POLICY recursos_programa_select_all ON public.recursos_programa
  FOR SELECT TO authenticated USING (true);
CREATE POLICY recursos_programa_modify_admin ON public.recursos_programa
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 8. mentores — qualquer authenticated lia (vazava lista de consultores)
DROP POLICY IF EXISTS "Allow authenticated users to read mentors for role check" ON public.mentores;
CREATE POLICY mentores_admin_select ON public.mentores
  FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY mentores_admin_modify ON public.mentores
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 9. configuracoes_links — "Anyone can read" abria pra anon também
DROP POLICY IF EXISTS "Anyone can read links" ON public.configuracoes_links;
CREATE POLICY configuracoes_links_select_authenticated ON public.configuracoes_links
  FOR SELECT TO authenticated USING (true);
