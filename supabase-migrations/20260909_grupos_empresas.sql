-- Grupo de empresas: várias empresas do mesmo dono compartilham as REUNIÕES.
--
-- Caso que motivou (09/09/2026): Four Light Academy (421), Pferrari (428),
-- CH Services of SWFL (429) e MS Home Solutions (430) são o mesmo grupo. As
-- reuniões são agendadas por quem estiver na frente, caem sob um único código
-- (hoje todas no 421) e sumiam do painel das outras três.
--
-- Escopo (decisão do David): SÓ leitura de reunião. Pontos, nível, balanço,
-- ações e qualquer escrita continuam por empresa — quem quiser mudar isso mexe
-- nas policies de escrita, não aqui.
--
-- Como funciona: `meus_ids_cliente()` devolve a empresa ativa do login MAIS as
-- irmãs de grupo; as policies de SELECT das 3 tabelas de reunião (+ anexos)
-- passam de `= meu_id_cliente()` para `in (select meus_ids_cliente())`. As views
-- agendamentos_central e crm_reunioes_v são security_invoker e herdam de graça.

BEGIN;

CREATE TABLE IF NOT EXISTS public.grupos_empresas (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.grupos_empresas IS
  'Grupos de empresas do mesmo dono. Hoje só afeta a leitura de reuniões (ver meus_ids_cliente).';

CREATE TABLE IF NOT EXISTS public.grupos_empresas_membros (
  -- PK no cliente: uma empresa pertence a no máximo um grupo.
  id_cliente uuid PRIMARY KEY REFERENCES public.clientes_formulario(id_cliente) ON DELETE CASCADE,
  grupo_id   uuid NOT NULL REFERENCES public.grupos_empresas(id) ON DELETE CASCADE,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS grupos_empresas_membros_grupo_idx
  ON public.grupos_empresas_membros(grupo_id);

ALTER TABLE public.grupos_empresas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_empresas_membros  ENABLE ROW LEVEL SECURITY;

-- Quem monta grupo é o admin. O cliente nunca lê estas tabelas direto: enxerga o
-- grupo só através das funções abaixo (SECURITY DEFINER).
DROP POLICY IF EXISTS grupos_empresas_admin ON public.grupos_empresas;
CREATE POLICY grupos_empresas_admin ON public.grupos_empresas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS grupos_empresas_membros_admin ON public.grupos_empresas_membros;
CREATE POLICY grupos_empresas_membros_admin ON public.grupos_empresas_membros
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Empresa ativa do login + irmãs de grupo. Sempre devolve pelo menos a própria
-- (empresa sem grupo se comporta exatamente como antes).
CREATE OR REPLACE FUNCTION public.meus_ids_cliente()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.meu_id_cliente()
  UNION
  SELECT m2.id_cliente
    FROM public.grupos_empresas_membros m1
    JOIN public.grupos_empresas_membros m2 USING (grupo_id)
   WHERE m1.id_cliente = public.meu_id_cliente();
$$;
COMMENT ON FUNCTION public.meus_ids_cliente() IS
  'meu_id_cliente() + empresas irmãs de grupo. Usada nas policies de SELECT de reunião.';

-- Versão para o front: as empresas do grupo de UM cliente. O admin pergunta por
-- qualquer cliente (Visão Operacional); o cliente só pelo próprio grupo.
CREATE OR REPLACE FUNCTION public.ids_do_grupo(p_id_cliente uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id FROM (
    SELECT p_id_cliente AS id
    UNION
    SELECT m2.id_cliente
      FROM public.grupos_empresas_membros m1
      JOIN public.grupos_empresas_membros m2 USING (grupo_id)
     WHERE m1.id_cliente = p_id_cliente
  ) t
  WHERE public.is_admin()
     OR p_id_cliente IN (SELECT m FROM public.meus_ids_cliente() m);
$$;
COMMENT ON FUNCTION public.ids_do_grupo(uuid) IS
  'Empresas do grupo de p_id_cliente. Vazio para quem não é admin nem do grupo.';

GRANT EXECUTE ON FUNCTION public.meus_ids_cliente()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.ids_do_grupo(uuid)   TO authenticated;

-- Policies de SELECT: de "a minha empresa" para "as empresas do meu grupo".
-- O gate de seção (pode_secao_cliente) continua igual — quem teve a aba fechada
-- não passa a ver reunião de ninguém.
ALTER POLICY "Clients can read their own meetings" ON public.reunioes_mentoria_new
  USING ((id_cliente IN (SELECT m FROM public.meus_ids_cliente() m)
          AND (SELECT pode_secao_cliente('reunioes'))) OR is_admin());

ALTER POLICY reunioes_galdino_select ON public.reunioes_galdino
  USING ((id_cliente IN (SELECT m FROM public.meus_ids_cliente() m)
          AND (SELECT pode_secao_cliente('reunioes-galdino'))) OR is_admin());

ALTER POLICY reunioes_blackcrm_select ON public.reunioes_blackcrm
  USING ((id_cliente IN (SELECT m::text FROM public.meus_ids_cliente() m)
          AND (SELECT pode_secao_cliente('reunioes-blackcrm'))) OR is_admin());

ALTER POLICY reuniao_anexos_select ON public.reuniao_anexos
  USING ((id_cliente IN (SELECT m::text FROM public.meus_ids_cliente() m)
          AND (SELECT pode_secao_cliente('reunioes'))) OR is_admin());

-- Grupo do caso que motivou a feature. Idempotente pelo nome.
INSERT INTO public.grupos_empresas (nome)
SELECT 'Grupo Four Light / Pferrari / CH Services / MS Home'
 WHERE NOT EXISTS (
   SELECT 1 FROM public.grupos_empresas
    WHERE nome = 'Grupo Four Light / Pferrari / CH Services / MS Home'
 );

INSERT INTO public.grupos_empresas_membros (id_cliente, grupo_id)
SELECT cf.id_cliente, g.id
  FROM public.clientes_formulario cf
 CROSS JOIN (
   SELECT id FROM public.grupos_empresas
    WHERE nome = 'Grupo Four Light / Pferrari / CH Services / MS Home'
 ) g
 WHERE cf.codigo_cliente IN (421, 428, 429, 430)
ON CONFLICT (id_cliente) DO NOTHING;

COMMIT;
