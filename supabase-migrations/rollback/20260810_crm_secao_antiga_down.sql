-- Desfaz 20260810_crm_secao_antiga.sql: devolve a seção RBAC da aba antiga.
--
-- Só recria o que a migration removeu de fato: a chave `crm` e a permissão do
-- papel `cs`. Overrides por pessoa não são restaurados — não havia nenhum
-- quando a migration rodou (conferido em DEV e PROD em 10/08/2026).

INSERT INTO public.secoes_catalogo (chave, label, grupo, ordem, sensivel)
VALUES ('crm', 'CRM', 'Clientes & CRM', 220, true)
ON CONFLICT (chave) DO NOTHING;

INSERT INTO public.papel_secoes (papel_chave, secao_chave)
VALUES ('cs', 'crm')
ON CONFLICT DO NOTHING;
