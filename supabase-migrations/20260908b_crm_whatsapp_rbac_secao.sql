-- CRM — seção RBAC da aba "Meu WhatsApp" (/crm/whatsapp).
--
-- É onde cada CS conecta o próprio número por QR code. Vai para o papel `cs`
-- junto com o resto do dia a dia operacional, no molde de 20260810_crm_rbac_secoes.sql.
-- Ordem 226 encaixa logo depois de crm/atendimento (225), que é a aba que ela
-- destrava — e antes de crm/projetos, que foi empurrado para 226 na 20260810;
-- usamos 225.5 arredondado para 231 no fim do bloco para não renumerar nada.

INSERT INTO public.secoes_catalogo (chave, label, grupo, ordem, sensivel) VALUES
  ('crm/whatsapp', 'CRM · Meu WhatsApp (conexão)', 'CRM', 231, true)
ON CONFLICT (chave) DO UPDATE
  SET label = EXCLUDED.label, grupo = EXCLUDED.grupo,
      ordem = EXCLUDED.ordem, sensivel = EXCLUDED.sensivel;

INSERT INTO public.papel_secoes (papel_chave, secao_chave)
VALUES ('cs', 'crm/whatsapp')
ON CONFLICT DO NOTHING;
