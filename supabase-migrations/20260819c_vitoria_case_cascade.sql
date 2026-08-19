-- ============================================================================
-- Excluir a vitória do kanban passa a apagar o case da vitrine junto.
--
-- A 20260819_vitoria_para_case.sql criou o vínculo com ON DELETE SET NULL, sob o
-- argumento de que o texto já revisado valia mais que o registro de origem. Na
-- prática isso deixou o case ÓRFÃO E PUBLICADO: o time exclui a vitória e o case
-- continua na vitrine, sem nenhuma forma de removê-lo pelo kanban. Preservar o
-- texto não compensa o risco de apresentar ao cliente um case que o time
-- decidiu apagar. Passa a ser CASCADE.
--
-- Quem quer tirar da vitrine SEM perder o trabalho continua com dois caminhos:
-- devolver a vitória para aguardando/reprovada, ou desmarcar "Na vitrine" na
-- aba Cases. Excluir agora é excluir mesmo.
-- ============================================================================

-- 1. FK: SET NULL -> CASCADE (as vitrine_evidencias já cascateiam a partir do
--    case, então a evidência vai junto sem tratamento extra).
ALTER TABLE public.vitrine_cases
  DROP CONSTRAINT IF EXISTS vitrine_cases_repositorio_vitoria_id_fkey;
ALTER TABLE public.vitrine_cases
  ADD CONSTRAINT vitrine_cases_repositorio_vitoria_id_fkey
  FOREIGN KEY (repositorio_vitoria_id) REFERENCES public.repositorio_vitorias(id)
  ON DELETE CASCADE;

-- 2. Limpeza retroativa: cases que ficaram órfãos na janela em que o SET NULL
--    esteve valendo. O recorte por gerado_por_ia protege os 143 cases do
--    legado, que nasceram da importação e nunca tiveram vitória.
DELETE FROM public.vitrine_cases
WHERE gerado_por_ia = true
  AND repositorio_vitoria_id IS NULL;

-- 3. Ficha de cliente que a automação criou e que ficou sem nenhum case.
--    Sem logo, de propósito: ficha com logo é trabalho humano e fica, mesmo
--    vazia — a logo é reaproveitada quando a empresa voltar para a vitrine.
DELETE FROM public.vitrine_clientes vc
WHERE vc.vinculo_metodo = 'vitoria_aprovada'
  AND vc.logo_path IS NULL
  AND vc.logo_display_path IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.vitrine_cases c WHERE c.vitrine_cliente_id = vc.id);

NOTIFY pgrst, 'reload schema';
