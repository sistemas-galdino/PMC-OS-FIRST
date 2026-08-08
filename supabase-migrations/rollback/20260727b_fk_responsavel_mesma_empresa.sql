-- Rollback — volta às FKs simples (só id) e remove o unique par.
-- ATENÇÃO: deixa de garantir "mesma empresa" no vínculo de responsável.
ALTER TABLE public.metodo_tarefas
  DROP CONSTRAINT IF EXISTS metodo_tarefas_responsavel_mesma_empresa;
ALTER TABLE public.metodo_tarefas
  ADD CONSTRAINT metodo_tarefas_responsavel_id_fkey
  FOREIGN KEY (responsavel_id)
  REFERENCES public.cliente_colaboradores(id)
  ON DELETE SET NULL;

ALTER TABLE public.metodo_dia_fechamentos
  DROP CONSTRAINT IF EXISTS metodo_dia_fech_colaborador_mesma_empresa;
ALTER TABLE public.metodo_dia_fechamentos
  ADD CONSTRAINT metodo_dia_fechamentos_colaborador_id_fkey
  FOREIGN KEY (colaborador_id)
  REFERENCES public.cliente_colaboradores(id)
  ON DELETE SET NULL;

ALTER TABLE public.cliente_colaboradores
  DROP CONSTRAINT IF EXISTS cliente_colaboradores_id_cliente_uk;
