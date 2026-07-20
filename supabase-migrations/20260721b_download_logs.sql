-- Registro central de downloads do PMC OS. Toda vez que um cliente baixa algo
-- (skill, multiplicador, gravação, estudo de caso, arquivo...), o front chama
-- registrar_download() e a linha entra aqui. Nome/empresa são denormalizados no
-- insert para o admin listar sem join. Leitura só admin.
CREATE TABLE IF NOT EXISTS download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid,
  cliente_nome text,
  empresa text,
  tipo text NOT NULL,          -- skill | multiplicador | gravacao | estudo_caso | arquivo | outro
  recurso_id text,             -- id/slug do recurso baixado
  recurso_nome text,           -- nome amigável
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS download_logs_created_idx ON download_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS download_logs_tipo_idx ON download_logs(tipo);
CREATE INDEX IF NOT EXISTS download_logs_cliente_idx ON download_logs(id_cliente);

ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;
-- Só o admin lê o registro. Cliente não insere direto (vai pela RPC).
DROP POLICY IF EXISTS download_logs_admin_read ON download_logs;
CREATE POLICY download_logs_admin_read ON download_logs
  FOR SELECT TO authenticated USING (is_admin());

-- Registra um download do cliente logado (denormaliza nome/empresa).
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

-- (aplicado junto) Pontos MC de todos os clientes — visão admin Gestão de Clientes.
CREATE OR REPLACE FUNCTION public.admin_clientes_pontos()
RETURNS TABLE (id_cliente uuid, pontos int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id_cliente, pontos_mc(c.id_cliente)
  FROM clientes_entrada_new c
  WHERE is_admin();
$$;
REVOKE ALL ON FUNCTION public.admin_clientes_pontos() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_clientes_pontos() TO authenticated;
