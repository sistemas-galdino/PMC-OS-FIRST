-- CRM / Clientes — link de convite do grupo de WhatsApp.
--
-- POR QUE
-- A tela /clientes ganhou uma coluna com o ícone do WhatsApp que abre o grupo
-- da empresa. Só que o que temos guardado é o JID (120363...@g.us), e JID NÃO
-- abre por link: não existe deep link público do WhatsApp por JID. O único
-- endereço que abre um grupo é o convite https://chat.whatsapp.com/<código>,
-- obtido em GET /group/inviteCode da Evolution.
--
-- Esse convite é caro de obter (o WhatsApp responde 'rate-overlimit' quando as
-- chamadas vêm em rajada), então ele é buscado em lote pela edge function
-- crm-whatsapp-convites e guardado aqui. Nunca buscar na hora do clique.
--
-- SEGURANÇA
-- Link de convite é CREDENCIAL DE ENTRADA: quem tiver a URL entra no grupo do
-- cliente, mesmo sem ser da equipe. Por isso ele fica só aqui, numa coluna do
-- admin, e deliberadamente NÃO em clientes_entrada_new.link_grupo_whatsapp —
-- essa outra coluna é lida em web/src/pages/inicio.tsx, a home DO CLIENTE.

ALTER TABLE public.clientes_entrada_new
  ADD COLUMN IF NOT EXISTS whatsapp_grupo_convite text;

COMMENT ON COLUMN public.clientes_entrada_new.whatsapp_grupo_convite IS
  'Convite https://chat.whatsapp.com/<código> do grupo do cliente. É credencial de entrada no grupo: não expor em rota pública nem no painel do cliente. Espelho de crm_whatsapp_grupos.convite_url.';

ALTER TABLE public.crm_whatsapp_grupos
  ADD COLUMN IF NOT EXISTS convite_url text,
  ADD COLUMN IF NOT EXISTS convite_em  timestamptz;

COMMENT ON COLUMN public.crm_whatsapp_grupos.convite_url IS
  'Fonte do convite. Um admin do grupo pode revogar o código no WhatsApp, o que invalida esta URL — daí convite_em, para saber quando vale re-buscar.';

-- Só quem ainda não tem convite é buscado, então este índice parcial é o que a
-- função de lote consulta a cada rodada.
CREATE INDEX IF NOT EXISTS crm_whatsapp_grupos_sem_convite_idx
  ON public.crm_whatsapp_grupos (grupo_id) WHERE convite_url IS NULL;
