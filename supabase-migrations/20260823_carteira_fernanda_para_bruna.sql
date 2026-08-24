-- Transfere a carteira da CS Fernanda (saiu da empresa) para a Bruna.
--
-- "Quem é a CS do cliente" é texto livre em clientes_entrada_new.sc, casado por
-- igualdade exata de string em ~20 telas (carteira, Meu Dia, Radar de Renovação,
-- CRM, Acessos, Onboarding). Enquanto o valor for 'Fernanda' os clientes dela não
-- aparecem no Meu Dia de ninguém e as atividades ficam órfãs.
--
-- A Bruna já existe em mentores (papel='cs', atendimento_01@), já tem login e já
-- tem agenda ativa na Central do Sucesso do Cliente — aqui só move os dados.
--
-- Escopo (decisão do David): TODOS os clientes com sc='Fernanda', inclusive
-- cancelados e desistências, para o nome dela sair dos filtros de CS. As reuniões
-- já realizadas (reunioes_mentoria_new.mentor='Fernanda') NÃO são tocadas: são
-- histórico de quem atendeu.
--
-- Idempotente: rodar de novo afeta 0 linhas. No DEV afeta 0 linhas (não tem esses dados).

BEGIN;

-- Backup do estado anterior. Sem isso o rollback não sabe distinguir os clientes
-- que vieram da Fernanda dos que já eram da Bruna.
CREATE TABLE IF NOT EXISTS public.backup_carteira_fernanda_20260823 (
  tabela      text NOT NULL,
  coluna      text NOT NULL,
  pk          text NOT NULL,
  valor_antigo text NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tabela, coluna, pk)
);
ALTER TABLE public.backup_carteira_fernanda_20260823 ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.backup_carteira_fernanda_20260823 IS
  'Estado anterior à transferência da carteira Fernanda→Bruna (20260823). Só para rollback; pode ser dropada depois de validado.';

INSERT INTO public.backup_carteira_fernanda_20260823 (tabela, coluna, pk, valor_antigo)
SELECT 'clientes_entrada_new', 'sc', id_entrada::text, sc
  FROM public.clientes_entrada_new WHERE sc = 'Fernanda'
UNION ALL
SELECT 'cliente_atividades', 'responsavel_cs', id::text, responsavel_cs
  FROM public.cliente_atividades WHERE responsavel_cs = 'Fernanda'
UNION ALL
SELECT 'vitrine_oportunidades', 'cs_responsavel', id::text, cs_responsavel
  FROM public.vitrine_oportunidades WHERE cs_responsavel = 'Fernanda'
UNION ALL
SELECT 'vitrine_capturas', 'cs_responsavel', id::text, cs_responsavel
  FROM public.vitrine_capturas WHERE cs_responsavel = 'Fernanda'
ON CONFLICT (tabela, coluna, pk) DO NOTHING;

-- Carteira (69 clientes no PROD em 23/08/2026)
UPDATE public.clientes_entrada_new SET sc = 'Bruna' WHERE sc = 'Fernanda';

-- Atividades abertas do CRM (31: 30 pendentes + 1 em andamento)
UPDATE public.cliente_atividades SET responsavel_cs = 'Bruna' WHERE responsavel_cs = 'Fernanda';

-- Vitrine de cases (4 oportunidades + 2 capturas)
UPDATE public.vitrine_oportunidades SET cs_responsavel = 'Bruna' WHERE cs_responsavel = 'Fernanda';
UPDATE public.vitrine_capturas      SET cs_responsavel = 'Bruna' WHERE cs_responsavel = 'Fernanda';

-- Botão de suporte do painel do cliente: a chave é 'suporte_' || sc normalizado
-- (web/src/pages/inicio.tsx, client-dashboard.tsx, recursos.tsx). Sem a chave da
-- Bruna os clientes transferidos ficariam sem botão de suporte.
INSERT INTO public.configuracoes_links (chave, label, descricao, url, ativo)
VALUES ('suporte_bruna', 'Suporte — Bruna', 'WhatsApp da CS Bruna (botão de suporte do painel do cliente)', '', false)
ON CONFLICT (chave) DO NOTHING;

-- O número da Fernanda sai do ar (linha mantida para histórico).
UPDATE public.configuracoes_links SET ativo = false WHERE chave = 'suporte_fernanda';

COMMIT;
