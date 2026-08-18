-- Central de Atendimentos do Sucesso do Cliente (separada da dos consultores).
--
-- Contexto: a equipe de CS (Geovana, Francielly, Gabriela, Fernanda, Danielly,
-- Maiara) criou agendas DENTRO da Central dos consultores. Resultado: os eventos
-- viram "[PMC] Acompanhamento com Consultor X" no Google Calendar e as reuniões
-- caem em reunioes_mentoria_new contando como reunião de CONSULTORIA nas telas e
-- métricas do cliente.
--
-- Modelagem: uma coluna `equipe` marca a AGENDA (consultores_atendimento) e outra
-- marca a REUNIÃO (reunioes_mentoria_new). A Central atual filtra equipe='consultor'
-- e a nova filtra 'sucesso_cliente' — mesma máquina, mesmos subcomponentes.
--
-- NÃO criamos tabela nova de reuniões de propósito: o CHECK de tabela_destino, o
-- TABELA_ORIGEM de 6 arquivos, a UNION da view, RLS e triggers teriam de mudar
-- para ganhar exatamente a mesma coisa.
--
-- Aditivo (só ADD COLUMN + GRANT + trigger + view): pode ser aplicado antes do
-- deploy do frontend.

-- ============================================
-- 1. Equipe da AGENDA
-- ============================================
ALTER TABLE public.consultores_atendimento
  ADD COLUMN IF NOT EXISTS equipe text NOT NULL DEFAULT 'consultor';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'consultores_atendimento_equipe_check'
      AND conrelid = 'public.consultores_atendimento'::regclass
  ) THEN
    ALTER TABLE public.consultores_atendimento
      ADD CONSTRAINT consultores_atendimento_equipe_check
      CHECK (equipe IN ('consultor', 'sucesso_cliente'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS consultores_atendimento_equipe_idx
  ON public.consultores_atendimento (equipe, ordem);

-- anon é column-scoped desde o hardening PARTE 2 (20260609). Sem este grant o
-- select() do link público quebra com 42501 ao pedir 'equipe'.
GRANT SELECT (equipe) ON public.consultores_atendimento TO anon;

-- ============================================
-- 2. Equipe da REUNIÃO
-- ============================================
ALTER TABLE public.reunioes_mentoria_new
  ADD COLUMN IF NOT EXISTS equipe text NOT NULL DEFAULT 'consultor';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reunioes_mentoria_new_equipe_check'
      AND conrelid = 'public.reunioes_mentoria_new'::regclass
  ) THEN
    ALTER TABLE public.reunioes_mentoria_new
      ADD CONSTRAINT reunioes_mentoria_new_equipe_check
      CHECK (equipe IN ('consultor', 'sucesso_cliente'));
  END IF;
END $$;

-- Índice parcial: as telas de consultoria filtram equipe='consultor' (a maioria),
-- quem se beneficia de índice é a minoria de CS.
CREATE INDEX IF NOT EXISTS reunioes_mentoria_new_equipe_cs_idx
  ON public.reunioes_mentoria_new (equipe) WHERE equipe = 'sucesso_cliente';

-- ============================================
-- 3. Rede de segurança: classifica no INSERT
--    (o criar-agendamento já grava explicitamente; isto cobre inserts que não
--     passam por ele — enrich-reunioes-semana.mjs, inserts manuais no SQL editor.)
--    Só BEFORE INSERT: correção manual por UPDATE continua possível.
-- ============================================
CREATE OR REPLACE FUNCTION public.set_equipe_reuniao_mentoria()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.equipe = 'consultor' AND NEW.mentor IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.consultores_atendimento c
      WHERE c.equipe = 'sucesso_cliente'
        AND (c.nome = NEW.mentor OR NEW.mentor = ANY (c.nomes_match))
    ) THEN
      NEW.equipe := 'sucesso_cliente';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reunioes_mentoria_set_equipe ON public.reunioes_mentoria_new;
CREATE TRIGGER reunioes_mentoria_set_equipe
  BEFORE INSERT ON public.reunioes_mentoria_new
  FOR EACH ROW EXECUTE FUNCTION public.set_equipe_reuniao_mentoria();

-- ============================================
-- 4. View unificada: acrescenta 'equipe' ao FIM (CREATE OR REPLACE só permite
--    adicionar coluna no final — preserva grants e o security_invoker).
--    Corpo copiado de 20260721_consultor_tipos_reuniao.sql.
-- ============================================
CREATE OR REPLACE VIEW public.agendamentos_central
WITH (security_invoker = true) AS
SELECT
  rg.id_unico::text AS id_unico,
  'galdino'::text AS origem,
  rg.id_reuniao,
  rg.data_reuniao,
  rg.horario,
  'Galdino'::text AS consultor_nome,
  rg.cliente_email,
  rg.pessoa AS cliente_nome,
  rg.empresa,
  rg.status_agendamento,
  rg.duracao_minutos,
  rg.link_meet,
  rg.link_gravacao,
  rg.link_geminidoc,
  rg.cliente_telefone,
  rg.id_cliente::text AS id_cliente,
  rg.codigo_cliente,
  rg.observacoes,
  rg.cliente_compareceu,
  rg.created_at AS criado_em,
  rg.updated_at AS atualizado_em,
  NULL::text AS assunto,
  'consultor'::text AS equipe
FROM public.reunioes_galdino rg

UNION ALL

SELECT
  rm.id_unico::text AS id_unico,
  'mentoria'::text AS origem,
  rm.id_reuniao,
  rm.data_reuniao,
  rm.horario,
  rm.mentor AS consultor_nome,
  rm.cliente_email,
  rm.pessoa AS cliente_nome,
  rm.empresa,
  rm.status_agendamento,
  rm.duracao_minutos,
  rm.link_meet,
  rm.link_gravacao,
  rm.link_geminidoc,
  rm.cliente_telefone,
  rm.id_cliente::text AS id_cliente,
  rm.codigo_cliente,
  rm.observacoes,
  rm.cliente_compareceu,
  rm.created_at AS criado_em,
  rm.updated_at AS atualizado_em,
  NULL::text AS assunto,
  rm.equipe
FROM public.reunioes_mentoria_new rm

UNION ALL

SELECT
  rb.id_unico AS id_unico,
  'blackcrm'::text AS origem,
  rb.id_reuniao,
  CASE WHEN rb.data_reuniao ~ '^\d{4}-\d{2}-\d{2}' THEN rb.data_reuniao::date ELSE NULL END AS data_reuniao,
  CASE WHEN rb.horario ~ '^\d{1,2}:\d{2}(:\d{2})?$' THEN rb.horario::time ELSE NULL END AS horario,
  rb.responsavel AS consultor_nome,
  rb.cliente_email,
  rb.pessoa AS cliente_nome,
  rb.empresa,
  rb.status_agendamento,
  rb.duracao_minutos,
  rb.link_meet,
  rb.link_gravacao,
  rb.link_geminidoc,
  rb.cliente_telefone,
  rb.id_cliente,
  rb.codigo_cliente::int AS codigo_cliente,
  rb.observacoes,
  rb.cliente_compareceu,
  CASE WHEN rb.created_at ~ '^\d{4}' THEN rb.created_at::timestamptz ELSE NULL END AS criado_em,
  rb.updated_at AS atualizado_em,
  rb.assunto,
  'consultor'::text AS equipe
FROM public.reunioes_blackcrm rb;

GRANT SELECT ON public.agendamentos_central TO authenticated;

-- ============================================
-- 5. RBAC: seção nova da Central de CS
--    (papel 'cs' mantém 'central-atendimentos' — decisão do David: as CS
--     continuam vendo as duas centrais. Admin/full já vê tudo.)
-- ============================================
INSERT INTO public.secoes_catalogo (chave, label, grupo, ordem, sensivel) VALUES
  ('central-sucesso-cliente', 'Central do Sucesso do Cliente', 'Atendimento', 50, false)
ON CONFLICT (chave) DO UPDATE
  SET label = excluded.label, grupo = excluded.grupo, ordem = excluded.ordem;

INSERT INTO public.papel_secoes (papel_chave, secao_chave)
VALUES ('cs', 'central-sucesso-cliente')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. Backfill (DML) — as 8 agendas de CS e as reuniões delas.
--    O UPDATE das reuniões é DERIVADO da equipe da agenda (não de uma lista de
--    nomes solta), então é idempotente e pega sozinho o que entrar depois.
-- ============================================
UPDATE public.consultores_atendimento
SET equipe = 'sucesso_cliente', updated_at = now()
WHERE slug IN (
  'geovana', 'geovana-onboarding', 'franciely', 'francielly-onboarding',
  'gabriela', 'fernanda', 'danielly', 'maiara-gadelha'
);

UPDATE public.reunioes_mentoria_new r
SET equipe = 'sucesso_cliente'
WHERE r.equipe = 'consultor'
  AND EXISTS (
    SELECT 1 FROM public.consultores_atendimento c
    WHERE c.equipe = 'sucesso_cliente'
      AND (c.nome = r.mentor OR r.mentor = ANY (c.nomes_match))
  );

-- Geovana/Francielly têm DUAS agendas cada (a normal e a de onboarding). Como é a
-- mesma pessoa, o alias faz uma bloquear o horário da outra em
-- horarios_ocupados_consultor (que casa por nome + unnest(nomes_match)).
UPDATE public.consultores_atendimento
SET nomes_match = ARRAY['Geovana'], updated_at = now()
WHERE slug = 'geovana-onboarding' AND coalesce(array_length(nomes_match, 1), 0) = 0;

UPDATE public.consultores_atendimento
SET nomes_match = ARRAY['Francielly'], updated_at = now()
WHERE slug = 'francielly-onboarding' AND coalesce(array_length(nomes_match, 1), 0) = 0;

NOTIFY pgrst, 'reload schema';
