-- Rollback de 20260831_corrige_empresas_sem_formulario.sql
--
-- ATENÇÃO ao que este rollback NÃO desfaz, de propósito:
--   * as linhas criadas em clientes_formulario ficam. Apagá-las levaria junto,
--     por CASCADE, tudo que o cliente preencheu depois em cliente_metas,
--     cliente_produtos, cliente_canais, cliente_objetivos_programa e
--     cliente_informacoes_empresa — perda de dado real do cliente.
--   * a renumeração de codigo_cliente fica. Voltar o código recriaria a
--     duplicidade, e o novo código pode já ter sido comunicado ao cliente.
-- Se for mesmo necessário reverter esses dois, é trabalho manual, caso a caso.

-- 1. meu_id_cliente() volta a NÃO consultar clientes_formulario
CREATE OR REPLACE FUNCTION public.meu_id_cliente()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE(
    (SELECT ea.id_cliente
       FROM empresa_ativa ea
       JOIN empresa_usuarios eu
         ON eu.auth_user_id = ea.auth_user_id
        AND eu.id_cliente   = ea.id_cliente
      WHERE ea.auth_user_id = auth.uid()),
    (SELECT eu.id_cliente
       FROM empresa_usuarios eu
      WHERE eu.auth_user_id = auth.uid()
      ORDER BY eu.criado_em, eu.id_cliente
      LIMIT 1),
    (SELECT e.id_cliente FROM clientes_entrada_new e WHERE e.id_cliente = auth.uid())
  );
$fn$;

-- 2. Trigger de proteção
DROP TRIGGER IF EXISTS trg_garante_clientes_formulario ON public.clientes_entrada_new;
DROP FUNCTION IF EXISTS public.tg_garante_clientes_formulario();

-- 3. FK de cliente_informacoes_empresa volta para auth.users(id)
--    Só funciona se nenhuma linha tiver id_cliente que não seja um auth.user —
--    ou seja, se as empresas fora do padrão ainda não tiverem preenchido a tela.
ALTER TABLE public.cliente_informacoes_empresa
  DROP CONSTRAINT IF EXISTS cliente_informacoes_empresa_id_cliente_fkey;

DO $$
BEGIN
  ALTER TABLE public.cliente_informacoes_empresa
    ADD CONSTRAINT cliente_informacoes_empresa_id_cliente_fkey
    FOREIGN KEY (id_cliente) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Não dá para voltar a FK para auth.users: há linhas cujo id_cliente não é um auth.users.id (empresas cadastradas fora do padrão que já preencheram a tela). Limpe essas linhas antes.';
  WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
