-- CRM — visão da lista de conversas do Atendimento.
--
-- A tela de Atendimento precisa, para CADA grupo, só de três coisas: a última
-- mensagem (autor, texto, quando), se ela partiu do cliente e quantas mensagens
-- do cliente estão sem resposta. Trazer todas as mensagens de todos os grupos
-- para o navegador só para calcular isso não escala — quando o provedor de
-- WhatsApp estiver ligado, uma carteira de 300 clientes vira dezenas de
-- milhares de linhas. As mensagens de um grupo são buscadas quando ele é
-- aberto; a lista sai daqui.
--
-- "Sem resposta" = mensagens do cliente posteriores à última resposta do time.
-- É a mesma regra do sistema original (naoLidas), agora calculada no banco.

DROP VIEW IF EXISTS public.crm_conversas_v;
CREATE VIEW public.crm_conversas_v
WITH (security_invoker = true) AS
  SELECT
    c.id,
    c.grupo_id,
    c.grupo_nome,
    c.id_cliente,
    c.cs_responsavel,
    c.arquivada,
    c.ultima_mensagem_em,
    u.id           AS ultima_id,
    u.autor        AS ultima_autor,
    u.da_cs        AS ultima_da_cs,
    u.texto        AS ultima_texto,
    u.em           AS ultima_em,
    u.anexo_nome   AS ultima_anexo_nome,
    u.anexo_tipo   AS ultima_anexo_tipo,
    coalesce(n.nao_lidas, 0) AS nao_lidas
  FROM public.crm_conversas c
  LEFT JOIN LATERAL (
    SELECT m.id, m.autor, m.da_cs, m.texto, m.em, m.anexo_nome, m.anexo_tipo
      FROM public.crm_mensagens m
     WHERE m.conversa_id = c.id
     ORDER BY m.em DESC, m.created_at DESC
     LIMIT 1
  ) u ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS nao_lidas
      FROM public.crm_mensagens m
     WHERE m.conversa_id = c.id
       AND NOT m.da_cs
       AND m.em > coalesce(
             (SELECT max(x.em) FROM public.crm_mensagens x
               WHERE x.conversa_id = c.id AND x.da_cs),
             '-infinity'::timestamptz)
  ) n ON true;

GRANT SELECT ON public.crm_conversas_v TO authenticated;
