-- Transfere a carteira da CS Gabriela (saiu da empresa) para a Kathelyn.
--
-- Mesmo racional da migration Fernanda→Bruna (20260823): "quem é a CS do cliente"
-- é texto livre em clientes_entrada_new.sc, casado por igualdade exata de string
-- em ~20 telas. Enquanto o valor for 'Gabriela' os 71 clientes dela não aparecem
-- no Meu Dia de ninguém, as atividades ficam órfãs e o convite automático da CS
-- no agendamento (supabase/functions/criar-agendamento) não acha e-mail nenhum.
--
-- A Kathelyn já existe em mentores (id 12, papel='cs', carteira_sc='Kathelyn',
-- atendimento_02@ — a mesma caixa que era da Gabriela) e já tem login. Aqui só
-- move os dados.
--
-- Escopo (decisão do David): TODOS os clientes com sc='Gabriela', inclusive
-- cancelados e desistências, para o nome dela sair dos filtros de CS. As reuniões
-- já realizadas (reunioes_mentoria_new.mentor) NÃO são tocadas: são histórico de
-- quem atendeu — e no PROD não há nenhuma com esse nome, de todo jeito.
--
-- Colunas conferidas no PROD em 07/09/2026 (varredura por todas as colunas de CS
-- do schema public). Além das 4 da migration da Fernanda, apareceu
-- vitrine_clientes.cs_responsavel (19 linhas), que aquela migration não cobria.
--
-- Idempotente: rodar de novo afeta 0 linhas. No DEV afeta ~0 linhas.

BEGIN;

-- Backup do estado anterior. Sem isso o rollback não sabe distinguir os clientes
-- que vieram da Gabriela dos que já eram da Kathelyn.
CREATE TABLE IF NOT EXISTS public.backup_carteira_gabriela_20260907 (
  tabela       text NOT NULL,
  coluna       text NOT NULL,
  pk           text NOT NULL,
  valor_antigo text NOT NULL,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tabela, coluna, pk)
);
ALTER TABLE public.backup_carteira_gabriela_20260907 ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.backup_carteira_gabriela_20260907 IS
  'Estado anterior à transferência da carteira Gabriela→Kathelyn (20260907). Só para rollback; pode ser dropada depois de validado.';

INSERT INTO public.backup_carteira_gabriela_20260907 (tabela, coluna, pk, valor_antigo)
SELECT 'clientes_entrada_new', 'sc', id_entrada::text, sc
  FROM public.clientes_entrada_new WHERE sc = 'Gabriela'
UNION ALL
SELECT 'cliente_atividades', 'responsavel_cs', id::text, responsavel_cs
  FROM public.cliente_atividades WHERE responsavel_cs = 'Gabriela'
UNION ALL
SELECT 'vitrine_clientes', 'cs_responsavel', id::text, cs_responsavel
  FROM public.vitrine_clientes WHERE cs_responsavel = 'Gabriela'
UNION ALL
SELECT 'vitrine_oportunidades', 'cs_responsavel', id::text, cs_responsavel
  FROM public.vitrine_oportunidades WHERE cs_responsavel = 'Gabriela'
UNION ALL
SELECT 'vitrine_capturas', 'cs_responsavel', id::text, cs_responsavel
  FROM public.vitrine_capturas WHERE cs_responsavel = 'Gabriela'
ON CONFLICT (tabela, coluna, pk) DO NOTHING;

-- Carteira (71 clientes no PROD em 07/09/2026)
UPDATE public.clientes_entrada_new SET sc = 'Kathelyn' WHERE sc = 'Gabriela';

-- Atividades do CRM (38)
UPDATE public.cliente_atividades SET responsavel_cs = 'Kathelyn' WHERE responsavel_cs = 'Gabriela';

-- Vitrine de cases (19 clientes + 5 oportunidades + 2 capturas)
UPDATE public.vitrine_clientes      SET cs_responsavel = 'Kathelyn' WHERE cs_responsavel = 'Gabriela';
UPDATE public.vitrine_oportunidades SET cs_responsavel = 'Kathelyn' WHERE cs_responsavel = 'Gabriela';
UPDATE public.vitrine_capturas      SET cs_responsavel = 'Kathelyn' WHERE cs_responsavel = 'Gabriela';

-- Botão de suporte do painel do cliente: a chave é 'suporte_' || sc normalizado
-- (web/src/pages/inicio.tsx, client-dashboard.tsx, recursos.tsx). Sem a chave da
-- Kathelyn os 71 clientes transferidos ficariam sem botão de suporte, então a
-- linha nova nasce com o número que estava na da Gabriela (mesma caixa
-- atendimento_02@). David confere o WhatsApp em Configurações → Links.
INSERT INTO public.configuracoes_links (chave, label, descricao, url, ativo)
SELECT 'suporte_kathelyn', 'Suporte — Kathelyn',
       'WhatsApp da CS Kathelyn (botão de suporte do painel do cliente)',
       COALESCE(l.url, ''), COALESCE(l.ativo, false)
  FROM (SELECT url, ativo FROM public.configuracoes_links WHERE chave = 'suporte_gabriela') l
ON CONFLICT (chave) DO NOTHING;

-- Fallback: se não existia a linha da Gabriela, ainda assim cria a da Kathelyn
-- (inativa, sem URL) para o admin ter onde preencher.
INSERT INTO public.configuracoes_links (chave, label, descricao, url, ativo)
VALUES ('suporte_kathelyn', 'Suporte — Kathelyn', 'WhatsApp da CS Kathelyn (botão de suporte do painel do cliente)', '', false)
ON CONFLICT (chave) DO NOTHING;

-- O número da Gabriela sai do ar (linha mantida para histórico).
UPDATE public.configuracoes_links SET ativo = false WHERE chave = 'suporte_gabriela';

COMMIT;
