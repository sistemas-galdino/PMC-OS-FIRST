-- Sino automático — 6 novas fontes de notificação (triggers SECURITY DEFINER,
-- pois o insert em notificacoes é admin-only por RLS) + realtime na tabela.
-- Anti-spam: transições (não estados), e conteúdo marca notificado_em.

-- 1) Vitória aprovada / virou case (kanban do repositório) → avisa o cliente.
CREATE OR REPLACE FUNCTION public.notificar_vitoria_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.id_cliente IS NULL OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'aprovada' THEN
    INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
    VALUES (NEW.id_cliente, 'aviso', '🎉 Sua vitória foi aprovada!',
            '"' || NEW.titulo || '" foi validada pelo time do PMC.', '/vitorias');
  ELSIF NEW.status = 'case' THEN
    INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
    VALUES (NEW.id_cliente, 'aviso', '🏆 Sua vitória vai virar case!',
            '"' || NEW.titulo || '" foi selecionada — o time vai te chamar para gravar.', '/vitorias');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notificar_vitoria_status ON repositorio_vitorias;
CREATE TRIGGER trg_notificar_vitoria_status
  AFTER UPDATE ON repositorio_vitorias
  FOR EACH ROW EXECUTE FUNCTION public.notificar_vitoria_status();

-- 2) Candidato respondeu o assessment do Guardião → avisa o dono da empresa.
CREATE OR REPLACE FUNCTION public.notificar_assessment_respondido()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cliente uuid;
  v_nome text;
BEGIN
  SELECT id_cliente, candidate_name INTO v_cliente, v_nome
    FROM guardiao_invites WHERE id = NEW.invite_id;
  IF v_cliente IS NULL THEN RETURN NEW; END IF;
  INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
  VALUES (v_cliente, 'guardiao',
          COALESCE(NULLIF(btrim(v_nome), ''), 'Um candidato') || ' respondeu o assessment',
          'Aderência de ' || round(COALESCE(NEW.score_pct, 0)) || '% — veja o resultado por pilar.',
          '/guardiao?tab=candidatos');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notificar_assessment ON guardiao_assessment_results;
CREATE TRIGGER trg_notificar_assessment
  AFTER INSERT ON guardiao_assessment_results
  FOR EACH ROW EXECUTE FUNCTION public.notificar_assessment_respondido();

-- 3) Novo encontro ao vivo (futuro, não cancelado) → broadcast.
CREATE OR REPLACE FUNCTION public.notificar_novo_encontro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.status, '') = 'cancelado'
     OR NEW.data_encontro IS NULL
     OR NEW.data_encontro < to_char(CURRENT_DATE, 'YYYY-MM-DD') THEN
    RETURN NEW;
  END IF;
  INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
  VALUES (NULL, 'reuniao', 'Novo encontro ao vivo agendado',
          COALESCE(NEW.titulo_formatado, 'Encontro PMC') || ' · '
            || substring(NEW.data_encontro from 9 for 2) || '/' || substring(NEW.data_encontro from 6 for 2)
            || CASE WHEN NEW.horario_inicio IS NOT NULL THEN ' às ' || left(NEW.horario_inicio, 5) ELSE '' END,
          '/calendario');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notificar_novo_encontro ON encontros_ao_vivo;
CREATE TRIGGER trg_notificar_novo_encontro
  AFTER INSERT ON encontros_ao_vivo
  FOR EACH ROW EXECUTE FUNCTION public.notificar_novo_encontro();

-- 4) Gravação disponível (link vazio → preenchido) → broadcast.
CREATE OR REPLACE FUNCTION public.notificar_gravacao_disponivel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(btrim(OLD.link_gravacao), '') <> '' OR COALESCE(btrim(NEW.link_gravacao), '') = '' THEN
    RETURN NEW;
  END IF;
  INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
  VALUES (NULL, 'reuniao', 'Gravação disponível',
          'A gravação de "' || COALESCE(NEW.titulo_formatado, 'Encontro PMC') || '" já está no portal.',
          '/calendario');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notificar_gravacao ON encontros_ao_vivo;
CREATE TRIGGER trg_notificar_gravacao
  AFTER UPDATE ON encontros_ao_vivo
  FOR EACH ROW EXECUTE FUNCTION public.notificar_gravacao_disponivel();

-- 5) Reunião registrou ações (array vazio → com itens) → avisa o cliente.
CREATE OR REPLACE FUNCTION public.notificar_acoes_reuniao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n_novo int;
  n_antigo int;
  v_fonte text;
BEGIN
  n_novo := CASE WHEN jsonb_typeof(NEW.acoes_cliente) = 'array' THEN jsonb_array_length(NEW.acoes_cliente) ELSE 0 END;
  IF TG_OP = 'UPDATE' THEN
    n_antigo := CASE WHEN jsonb_typeof(OLD.acoes_cliente) = 'array' THEN jsonb_array_length(OLD.acoes_cliente) ELSE 0 END;
  ELSE
    n_antigo := 0;
  END IF;
  IF NEW.id_cliente IS NULL OR n_novo = 0 OR n_antigo > 0 THEN
    RETURN NEW;
  END IF;
  -- to_jsonb(NEW)->>'mentor': acesso seguro — reunioes_galdino não tem a coluna
  -- (NEW.mentor direto falha na compilação do plpgsql para essa tabela).
  v_fonte := CASE WHEN TG_TABLE_NAME = 'reunioes_galdino' THEN 'o Galdino'
                  ELSE COALESCE(NULLIF(btrim(to_jsonb(NEW)->>'mentor'), ''), 'seu consultor') END;
  INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
  VALUES (NEW.id_cliente, 'reuniao',
          'Sua reunião gerou ' || n_novo || ' ' || CASE WHEN n_novo = 1 THEN 'ação' ELSE 'ações' END,
          'A reunião com ' || v_fonte || ' definiu tarefas para você — veja seu plano de ação.',
          '/acoes');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notificar_acoes_galdino ON reunioes_galdino;
CREATE TRIGGER trg_notificar_acoes_galdino
  AFTER INSERT OR UPDATE ON reunioes_galdino
  FOR EACH ROW EXECUTE FUNCTION public.notificar_acoes_reuniao();
DROP TRIGGER IF EXISTS trg_notificar_acoes_mentoria ON reunioes_mentoria_new;
CREATE TRIGGER trg_notificar_acoes_mentoria
  AFTER INSERT OR UPDATE ON reunioes_mentoria_new
  FOR EACH ROW EXECUTE FUNCTION public.notificar_acoes_reuniao();

-- 6) Conteúdo publicado (estudo de caso / multiplicador / skill) → broadcast.
--    Guard: notificado_em (1 aviso por item, para sempre). Backfill marca os
--    já publicados para não spammar o histórico.
ALTER TABLE conhecimento_estudos_caso ADD COLUMN IF NOT EXISTS notificado_em timestamptz;
ALTER TABLE conhecimento_multiplicadores ADD COLUMN IF NOT EXISTS notificado_em timestamptz;
ALTER TABLE conhecimento_skills ADD COLUMN IF NOT EXISTS notificado_em timestamptz;
UPDATE conhecimento_estudos_caso SET notificado_em = now() WHERE publicado AND notificado_em IS NULL;
UPDATE conhecimento_multiplicadores SET notificado_em = now() WHERE publicado AND notificado_em IS NULL;
UPDATE conhecimento_skills SET notificado_em = now() WHERE publicado AND notificado_em IS NULL;

CREATE OR REPLACE FUNCTION public.notificar_conteudo_publicado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_titulo text;
  v_tipo_label text;
  v_link text;
BEGIN
  IF NOT NEW.publicado OR NEW.notificado_em IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'conhecimento_estudos_caso' THEN
    v_titulo := NEW.titulo; v_tipo_label := 'Novo estudo de caso'; v_link := '/estudos-caso';
  ELSIF TG_TABLE_NAME = 'conhecimento_multiplicadores' THEN
    v_titulo := NEW.nome; v_tipo_label := 'Novo multiplicador disponível'; v_link := '/multiplicadores';
  ELSE
    v_titulo := NEW.nome; v_tipo_label := 'Nova skill disponível'; v_link := '/skills';
  END IF;
  INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
  VALUES (NULL, 'novidade', v_tipo_label, '"' || v_titulo || '" já está no seu portal.', v_link);
  NEW.notificado_em := now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notificar_pub_estudos ON conhecimento_estudos_caso;
CREATE TRIGGER trg_notificar_pub_estudos
  BEFORE INSERT OR UPDATE ON conhecimento_estudos_caso
  FOR EACH ROW EXECUTE FUNCTION public.notificar_conteudo_publicado();
DROP TRIGGER IF EXISTS trg_notificar_pub_multiplicadores ON conhecimento_multiplicadores;
CREATE TRIGGER trg_notificar_pub_multiplicadores
  BEFORE INSERT OR UPDATE ON conhecimento_multiplicadores
  FOR EACH ROW EXECUTE FUNCTION public.notificar_conteudo_publicado();
DROP TRIGGER IF EXISTS trg_notificar_pub_skills ON conhecimento_skills;
CREATE TRIGGER trg_notificar_pub_skills
  BEFORE INSERT OR UPDATE ON conhecimento_skills
  FOR EACH ROW EXECUTE FUNCTION public.notificar_conteudo_publicado();

-- Realtime: sino acende na hora (o front assina INSERTs em notificacoes).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
