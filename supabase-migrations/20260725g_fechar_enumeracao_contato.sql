-- Capturada do estado já aplicado (DEV+PROD) para alinhar o repositório ao banco.
-- CORRECAO DE SEGURANCA 2: contato_persona() e SECURITY DEFINER sem checagem de
-- autorizacao. Exposta ao papel authenticated, permitia enumerar o telefone de
-- QUALQUER empresa passando o id_cliente dela. Revogamos o acesso direto: so
-- funcoes SECURITY DEFINER do postgres (digests, meu_status_contato) a chamam.
REVOKE ALL ON FUNCTION public.contato_persona(uuid, text) FROM public, anon, authenticated;

-- A view precisa parar de depender dela (senao quebra para o admin, que tambem
-- e papel 'authenticated'). Logica embutida: normalizar_e164_br e funcao pura,
-- sem acesso a dado, entao continua publica sem risco.
-- security_invoker=true mantem a RLS valendo: cliente ve so a propria linha.
CREATE OR REPLACE VIEW public.cobertura_contato
WITH (security_invoker = true) AS
SELECT
  e.id_cliente,
  e.nome_empresa_formatado AS empresa,
  e.status_atual,
  coalesce(
    normalizar_e164_br((SELECT g.whatsapp FROM metodo_guardioes g
                         WHERE g.id_cliente = e.id_cliente
                         ORDER BY g.principal DESC NULLS LAST, g.created_at LIMIT 1)),
    normalizar_e164_br((SELECT c.whatsapp FROM cliente_colaboradores c
                         WHERE c.id_cliente = e.id_cliente AND c.guardiao_ia LIMIT 1)),
    normalizar_e164_br(e.guardiao_ia_telefone)
  ) IS NOT NULL AS tem_guardiao,
  normalizar_e164_br(e.telefone) IS NOT NULL AS tem_dono
FROM clientes_entrada_new e
WHERE e.data_cancelamento IS NULL;

COMMENT ON VIEW public.cobertura_contato IS 'Quem o gatilho alcanca hoje. security_invoker: respeita a RLS de quem consulta.';

-- Caminho seguro para o proprio cliente ver o SEU status de contato: nunca
-- aceita id de terceiro, sempre resolve por meu_id_cliente(). Telefone mascarado.
CREATE OR REPLACE FUNCTION public.meu_status_contato()
RETURNS TABLE(persona text, tem_contato boolean, mascara text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cliente uuid := meu_id_cliente(); v_fone text;
BEGIN
  IF v_cliente IS NULL THEN RETURN; END IF;
  FOREACH persona IN ARRAY ARRAY['guardiao','dono'] LOOP
    v_fone := contato_persona(v_cliente, persona);
    tem_contato := v_fone IS NOT NULL;
    mascara := CASE WHEN v_fone IS NULL THEN NULL
                    ELSE '+55 (' || substr(v_fone,3,2) || ') ••••-' || right(v_fone,4) END;
    RETURN NEXT;
  END LOOP;
END; $$;
COMMENT ON FUNCTION public.meu_status_contato() IS 'Status de contato do proprio cliente (mascarado). Nunca aceita id de terceiro.';
