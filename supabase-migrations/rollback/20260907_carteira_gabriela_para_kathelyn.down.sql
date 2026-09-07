-- Desfaz a transferência da carteira Gabriela→Kathelyn (20260907).
--
-- Usa a tabela de backup para devolver 'Gabriela' SÓ nas linhas que eram dela —
-- as que já eram da Kathelyn antes ficam como estão.
--
-- Só funciona enquanto backup_carteira_gabriela_20260907 existir. Se ela já foi
-- dropada, não há como distinguir as linhas e o rollback é impossível.

BEGIN;

UPDATE public.clientes_entrada_new c SET sc = b.valor_antigo
  FROM public.backup_carteira_gabriela_20260907 b
 WHERE b.tabela = 'clientes_entrada_new' AND b.coluna = 'sc'
   AND c.id_entrada::text = b.pk AND c.sc = 'Kathelyn';

UPDATE public.cliente_atividades a SET responsavel_cs = b.valor_antigo
  FROM public.backup_carteira_gabriela_20260907 b
 WHERE b.tabela = 'cliente_atividades' AND b.coluna = 'responsavel_cs'
   AND a.id::text = b.pk AND a.responsavel_cs = 'Kathelyn';

UPDATE public.vitrine_clientes v SET cs_responsavel = b.valor_antigo
  FROM public.backup_carteira_gabriela_20260907 b
 WHERE b.tabela = 'vitrine_clientes' AND b.coluna = 'cs_responsavel'
   AND v.id::text = b.pk AND v.cs_responsavel = 'Kathelyn';

UPDATE public.vitrine_oportunidades v SET cs_responsavel = b.valor_antigo
  FROM public.backup_carteira_gabriela_20260907 b
 WHERE b.tabela = 'vitrine_oportunidades' AND b.coluna = 'cs_responsavel'
   AND v.id::text = b.pk AND v.cs_responsavel = 'Kathelyn';

UPDATE public.vitrine_capturas v SET cs_responsavel = b.valor_antigo
  FROM public.backup_carteira_gabriela_20260907 b
 WHERE b.tabela = 'vitrine_capturas' AND b.coluna = 'cs_responsavel'
   AND v.id::text = b.pk AND v.cs_responsavel = 'Kathelyn';

-- Botão de suporte volta ao estado anterior.
UPDATE public.configuracoes_links SET ativo = true  WHERE chave = 'suporte_gabriela';
UPDATE public.configuracoes_links SET ativo = false WHERE chave = 'suporte_kathelyn';

COMMIT;
