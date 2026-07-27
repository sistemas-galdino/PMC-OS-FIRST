-- RPC para a aba admin "Acessos" — lista TODOS os logins de cada empresa, com email.
-- Cada empresa (id_cliente) pode ter N logins:
--   * principal (legado): auth.users cujo id == id_cliente (o "dono");
--   * vinculado: linhas em empresa_usuarios (auth_user_id -> id_cliente).
-- Retorna 1 linha por login (todos os clientes de uma vez), pra montar a
-- contagem por empresa e a lista expansível sem N chamadas.
--
-- SECURITY DEFINER porque precisa ler auth.users (bloqueado por RLS para
-- authenticated). Guard interno: caller precisa estar em public.mentores
-- (mesmo padrão de get_client_access_overview).

DROP FUNCTION IF EXISTS public.get_empresa_acessos();

CREATE OR REPLACE FUNCTION public.get_empresa_acessos()
RETURNS TABLE (
  id_cliente uuid,
  auth_user_id uuid,
  email text,
  papel text,
  tipo text,
  last_sign_in_at timestamptz,
  criado_em timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM mentores m
    WHERE m.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden: only admin can read empresa acessos';
  END IF;

  RETURN QUERY
  -- Login principal (legado): o dono, cujo auth.users.id == id_cliente.
  SELECT
    e.id_cliente,
    u.id                 AS auth_user_id,
    u.email::text        AS email,
    'dono'::text         AS papel,
    'principal'::text    AS tipo,
    u.last_sign_in_at,
    u.created_at         AS criado_em
  FROM clientes_entrada_new e
  JOIN auth.users u ON u.id = e.id_cliente

  UNION ALL

  -- Logins vinculados (Fase 2 multiusuário): N logins por empresa.
  SELECT
    eu.id_cliente,
    eu.auth_user_id,
    u.email::text        AS email,
    eu.papel             AS papel,
    'vinculado'::text    AS tipo,
    u.last_sign_in_at,
    eu.criado_em
  FROM empresa_usuarios eu
  JOIN auth.users u ON u.id = eu.auth_user_id
  -- Ignora self-link (auth_user_id == id_cliente): esse login já aparece como
  -- principal; incluí-lo aqui duplicaria a contagem e o guard de remoção o recusa.
  WHERE eu.auth_user_id <> eu.id_cliente;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_empresa_acessos() TO authenticated;
