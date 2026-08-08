-- Rollback — volta a FK composta ao SET NULL sem lista de coluna (estado 727b).
-- ATENÇÃO: com isso, excluir um colaborador volta a falhar por not-null em
-- id_cliente. Só use como par exato do rollback de 727b.
ALTER TABLE public.metodo_tarefas
  DROP CONSTRAINT IF EXISTS metodo_tarefas_responsavel_mesma_empresa;
ALTER TABLE public.metodo_tarefas
  ADD CONSTRAINT metodo_tarefas_responsavel_mesma_empresa
  FOREIGN KEY (responsavel_id, id_cliente)
  REFERENCES public.cliente_colaboradores(id, id_cliente)
  ON DELETE SET NULL;

ALTER TABLE public.metodo_dia_fechamentos
  DROP CONSTRAINT IF EXISTS metodo_dia_fech_colaborador_mesma_empresa;
ALTER TABLE public.metodo_dia_fechamentos
  ADD CONSTRAINT metodo_dia_fech_colaborador_mesma_empresa
  FOREIGN KEY (colaborador_id, id_cliente)
  REFERENCES public.cliente_colaboradores(id, id_cliente)
  ON DELETE SET NULL;
