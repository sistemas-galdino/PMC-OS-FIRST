-- Rollback de 20260728_download_logs_multiusuario.sql
-- Volta registrar_download() a resolver a empresa por auth.uid() (só login
-- principal) e remove a coluna auth_user_id.
--
-- NOTA: o backfill de cliente_nome/empresa das linhas órfãs NÃO é revertido —
-- é correção de dado (as linhas passaram a apontar pra empresa certa), não
-- estrutura. Reverter reintroduziria os "—" na tela sem ganho nenhum.

CREATE OR REPLACE FUNCTION public.registrar_download(
  p_tipo text,
  p_recurso_id text DEFAULT NULL,
  p_recurso_nome text DEFAULT NULL,
  p_url text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  v_nome text;
  v_empresa text;
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  SELECT NULLIF(btrim(nome_cliente_formatado), ''), NULLIF(btrim(nome_empresa_formatado), '')
    INTO v_nome, v_empresa
    FROM clientes_entrada_new WHERE id_cliente = me;
  INSERT INTO download_logs (id_cliente, cliente_nome, empresa, tipo, recurso_id, recurso_nome, url)
  VALUES (me, v_nome, v_empresa, COALESCE(NULLIF(btrim(p_tipo), ''), 'outro'), p_recurso_id, p_recurso_nome, p_url);
END; $$;
REVOKE ALL ON FUNCTION public.registrar_download(text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.registrar_download(text, text, text, text) TO authenticated;

DROP INDEX IF EXISTS download_logs_auth_user_idx;
ALTER TABLE download_logs DROP COLUMN IF EXISTS auth_user_id;
