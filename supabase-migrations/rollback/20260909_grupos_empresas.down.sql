-- Desfaz o grupo de empresas (20260909): volta as policies de SELECT de reunião
-- para "só a minha empresa" e derruba as tabelas/funções do grupo.

BEGIN;

ALTER POLICY "Clients can read their own meetings" ON public.reunioes_mentoria_new
  USING (((meu_id_cliente() = id_cliente)
          AND (SELECT pode_secao_cliente('reunioes'))) OR is_admin());

ALTER POLICY reunioes_galdino_select ON public.reunioes_galdino
  USING (((meu_id_cliente() = id_cliente)
          AND (SELECT pode_secao_cliente('reunioes-galdino'))) OR is_admin());

ALTER POLICY reunioes_blackcrm_select ON public.reunioes_blackcrm
  USING ((((meu_id_cliente())::text = id_cliente)
          AND (SELECT pode_secao_cliente('reunioes-blackcrm'))) OR is_admin());

ALTER POLICY reuniao_anexos_select ON public.reuniao_anexos
  USING ((((meu_id_cliente())::text = id_cliente)
          AND (SELECT pode_secao_cliente('reunioes'))) OR is_admin());

DROP FUNCTION IF EXISTS public.ids_do_grupo(uuid);
DROP FUNCTION IF EXISTS public.meus_ids_cliente();
DROP TABLE IF EXISTS public.grupos_empresas_membros;
DROP TABLE IF EXISTS public.grupos_empresas;

COMMIT;
