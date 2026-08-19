-- Rollback do backfill: remove só as linhas que ESTE backfill criou — vitórias
-- vindas do cliente que ainda estão intocadas em 'aguardando'. O que a curadoria
-- já mexeu (aprovou, reprovou ou virou case) fica, porque aí virou trabalho do
-- time. A correção do cadastrado_por no trigger não é revertida de propósito:
-- voltar a gravar id_cliente numa coluna de usuário seria reintroduzir o bug.
DELETE FROM repositorio_vitorias
WHERE cliente_vitoria_id IS NOT NULL
  AND status = 'aguardando'
  AND cadastrado_por IS NULL
  AND NOT EXISTS (SELECT 1 FROM vitrine_cases c WHERE c.repositorio_vitoria_id = repositorio_vitorias.id);
