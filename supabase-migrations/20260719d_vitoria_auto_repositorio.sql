-- Toda vitória registrada pelo cliente (cliente_vitorias) cai automaticamente
-- no kanban do Repositório de Vitórias (repositorio_vitorias), na coluna
-- "aguardando". Coluna de vínculo cliente_vitoria_id (única) torna o processo
-- idempotente e permite rastrear a origem. Trigger SECURITY DEFINER porque o
-- insert em repositorio_vitorias é admin-only por RLS.
ALTER TABLE repositorio_vitorias
  ADD COLUMN IF NOT EXISTS cliente_vitoria_id uuid;
-- Índice único simples (NULLs são distintos → registros manuais sem vínculo
-- coexistem; ON CONFLICT infere este índice, o que um índice parcial não permite).
CREATE UNIQUE INDEX IF NOT EXISTS repositorio_vitorias_cliente_vitoria_uidx
  ON repositorio_vitorias(cliente_vitoria_id);

CREATE OR REPLACE FUNCTION public.sync_vitoria_para_repositorio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
  v_desc text;
  v_ev_tipo text;
BEGIN
  SELECT COALESCE(NULLIF(btrim(nome_empresa_formatado), ''), NULLIF(btrim(nome_cliente_formatado), ''))
    INTO v_nome
    FROM clientes_entrada_new WHERE id_cliente = NEW.id_cliente;

  v_desc := 'Antes: ' || NEW.gargalo_antes
         || E'\nO que fez: ' || NEW.o_que_fez
         || E'\nAgora: ' || NEW.como_esta_agora;
  IF NEW.valor_antes IS NOT NULL OR NEW.valor_depois IS NOT NULL THEN
    v_desc := v_desc || E'\nValor: ' || COALESCE(NEW.valor_antes::text, '—') || ' → ' || COALESCE(NEW.valor_depois::text, '—');
  END IF;
  IF NEW.qtd_antes IS NOT NULL OR NEW.qtd_depois IS NOT NULL THEN
    v_desc := v_desc || E'\nQuantidade: ' || COALESCE(NEW.qtd_antes::text, '—') || ' → ' || COALESCE(NEW.qtd_depois::text, '—');
  END IF;

  v_ev_tipo := CASE
    WHEN NEW.evidencia_url IS NOT NULL THEN 'imagem'
    WHEN NEW.evidencia_link IS NOT NULL THEN 'link'
    ELSE 'imagem'
  END;

  INSERT INTO repositorio_vitorias (
    id_cliente, cliente_nome, titulo, descricao, area, origem,
    evidencia_tipo, evidencia_url, evidencia_link, status,
    cadastrado_por, cliente_vitoria_id
  )
  VALUES (
    NEW.id_cliente, v_nome, NEW.titulo, v_desc, NEW.area,
    COALESCE(NULLIF(btrim(NEW.origem), ''), 'Sucesso do Cliente'),
    v_ev_tipo, NEW.evidencia_url, NEW.evidencia_link, 'aguardando',
    NEW.id_cliente, NEW.id
  )
  ON CONFLICT (cliente_vitoria_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vitoria_repositorio ON cliente_vitorias;
CREATE TRIGGER trg_sync_vitoria_repositorio
  AFTER INSERT ON cliente_vitorias
  FOR EACH ROW EXECUTE FUNCTION public.sync_vitoria_para_repositorio();
