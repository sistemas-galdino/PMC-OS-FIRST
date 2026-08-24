-- Rollback da transferência da carteira Fernanda→Bruna (20260823).
-- Devolve APENAS as linhas registradas no backup — quem já era da Bruna antes
-- não é tocado.

BEGIN;

UPDATE public.clientes_entrada_new c
   SET sc = b.valor_antigo
  FROM public.backup_carteira_fernanda_20260823 b
 WHERE b.tabela = 'clientes_entrada_new' AND b.coluna = 'sc'
   AND c.id_entrada::text = b.pk AND c.sc = 'Bruna';

UPDATE public.cliente_atividades a
   SET responsavel_cs = b.valor_antigo
  FROM public.backup_carteira_fernanda_20260823 b
 WHERE b.tabela = 'cliente_atividades' AND b.coluna = 'responsavel_cs'
   AND a.id::text = b.pk AND a.responsavel_cs = 'Bruna';

UPDATE public.vitrine_oportunidades o
   SET cs_responsavel = b.valor_antigo
  FROM public.backup_carteira_fernanda_20260823 b
 WHERE b.tabela = 'vitrine_oportunidades' AND b.coluna = 'cs_responsavel'
   AND o.id::text = b.pk AND o.cs_responsavel = 'Bruna';

UPDATE public.vitrine_capturas k
   SET cs_responsavel = b.valor_antigo
  FROM public.backup_carteira_fernanda_20260823 b
 WHERE b.tabela = 'vitrine_capturas' AND b.coluna = 'cs_responsavel'
   AND k.cs_responsavel = 'Bruna' AND k.id::text = b.pk;

UPDATE public.configuracoes_links SET ativo = true  WHERE chave = 'suporte_fernanda';
UPDATE public.configuracoes_links SET ativo = false WHERE chave = 'suporte_bruna';

DROP TABLE IF EXISTS public.backup_carteira_fernanda_20260823;

COMMIT;
