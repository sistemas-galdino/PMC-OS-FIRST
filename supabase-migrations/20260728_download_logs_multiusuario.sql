-- download_logs multiusuário: separa QUEM baixou (login) de QUAL EMPRESA é o download.
--
-- Antes, registrar_download() resolvia a empresa com `clientes_entrada_new.id_cliente
-- = auth.uid()`, o que só funciona para o login principal (dono). Com N logins por
-- empresa (empresa_usuarios), todo download de colaborador entrava com
-- cliente_nome/empresa NULL e a tela do admin mostrava "—".
--
-- Agora: id_cliente = a EMPRESA (via meu_id_cliente()), auth_user_id = o LOGIN.

ALTER TABLE download_logs ADD COLUMN IF NOT EXISTS auth_user_id uuid;
CREATE INDEX IF NOT EXISTS download_logs_auth_user_idx ON download_logs(auth_user_id);

-- 1) O que estava em id_cliente era, na verdade, o auth.uid() de quem clicou.
UPDATE download_logs SET auth_user_id = id_cliente WHERE auth_user_id IS NULL;

-- 2) Recupera as linhas órfãs (colaboradores): reaponta pra empresa do vínculo
--    e preenche nome/empresa que ficaram nulos.
UPDATE download_logs d
   SET id_cliente   = eu.id_cliente,
       cliente_nome = NULLIF(btrim(c.nome_cliente_formatado), ''),
       empresa      = NULLIF(btrim(c.nome_empresa_formatado), '')
  FROM empresa_usuarios eu
  JOIN clientes_entrada_new c ON c.id_cliente = eu.id_cliente
 WHERE eu.auth_user_id = d.auth_user_id
   AND d.cliente_nome IS NULL;

-- 3) Passa a gravar já resolvido pelo vínculo. Mesma assinatura (o front não muda).
CREATE OR REPLACE FUNCTION public.registrar_download(
  p_tipo text,
  p_recurso_id text DEFAULT NULL,
  p_recurso_nome text DEFAULT NULL,
  p_url text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_auth uuid := auth.uid();
  v_cliente uuid;
  v_nome text;
  v_empresa text;
BEGIN
  IF v_auth IS NULL THEN RETURN; END IF;
  -- Resolve a empresa do login (cobre dono E colaborador).
  v_cliente := meu_id_cliente();
  SELECT NULLIF(btrim(nome_cliente_formatado), ''), NULLIF(btrim(nome_empresa_formatado), '')
    INTO v_nome, v_empresa
    FROM clientes_entrada_new WHERE id_cliente = v_cliente;
  INSERT INTO download_logs (id_cliente, auth_user_id, cliente_nome, empresa, tipo, recurso_id, recurso_nome, url)
  VALUES (v_cliente, v_auth, v_nome, v_empresa, COALESCE(NULLIF(btrim(p_tipo), ''), 'outro'), p_recurso_id, p_recurso_nome, p_url);
END; $$;
REVOKE ALL ON FUNCTION public.registrar_download(text, text, text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.registrar_download(text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_download(text, text, text, text) TO authenticated;
