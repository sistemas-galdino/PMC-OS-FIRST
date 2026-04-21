-- RPC para aba admin "Acessos" — métricas de login/ativação dos clientes.
-- Faz 1 join server-side (clientes_entrada_new + clientes_formulario + auth.users
-- + cliente_onboarding + invite_resend_attempts), retornando linha por cliente.
--
-- SECURITY DEFINER porque precisa ler auth.users (bloqueado por RLS para anon/authenticated).
-- Guard interno verifica que o caller está em public.mentores (admin do painel).

DROP FUNCTION IF EXISTS public.get_client_access_overview();

CREATE OR REPLACE FUNCTION public.get_client_access_overview()
RETURNS TABLE (
  id_entrada integer,
  id_cliente uuid,
  nome_cliente text,
  nome_empresa text,
  email text,
  sc text,
  status_atual text,
  nivel_engajamento text,
  data_cadastro_formulario timestamptz,
  tem_auth_user boolean,
  last_sign_in_at timestamptz,
  data_criacao_auth timestamptz,
  email_confirmed_at timestamptz,
  senha_definida boolean,
  status_onboarding text,
  qtd_convites_reenviados integer
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
    RAISE EXCEPTION 'forbidden: only admin can read access overview';
  END IF;

  RETURN QUERY
  SELECT
    e.id_entrada,
    e.id_cliente,
    e.nome_cliente_formatado          AS nome_cliente,
    e.nome_empresa_formatado          AS nome_empresa,
    f.email,
    e.sc,
    e.status_atual,
    e.nivel_engajamento,
    f.created_at::timestamptz         AS data_cadastro_formulario,
    (u.id IS NOT NULL)                AS tem_auth_user,
    u.last_sign_in_at,
    u.created_at                      AS data_criacao_auth,
    u.email_confirmed_at,
    o.senha_definida,
    o.status                          AS status_onboarding,
    COALESCE(ir.qtd, 0)::integer      AS qtd_convites_reenviados
  FROM clientes_entrada_new e
  LEFT JOIN clientes_formulario f ON f.id_cliente = e.id_cliente
  LEFT JOIN auth.users         u ON u.id          = e.id_cliente
  LEFT JOIN cliente_onboarding o ON o.id_cliente = e.id_cliente
  LEFT JOIN (
    SELECT email, COUNT(*)::integer AS qtd
    FROM invite_resend_attempts
    GROUP BY email
  ) ir ON ir.email = f.email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_access_overview() TO authenticated;
