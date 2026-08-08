-- Capturada do estado já aplicado (DEV+PROD) para alinhar o repositório ao banco.
-- CORRECAO: em FK COMPOSTA, "ON DELETE SET NULL" sem lista tenta anular TODAS as
-- colunas da chave — inclusive id_cliente, que e NOT NULL. Resultado: excluir um
-- colaborador falhava com violacao de not-null. PG15+ permite dizer QUAL coluna
-- zerar; aqui so o vinculo cai, a tarefa e o dono dela permanecem intactos.
ALTER TABLE public.metodo_tarefas
  DROP CONSTRAINT IF EXISTS metodo_tarefas_responsavel_mesma_empresa;
ALTER TABLE public.metodo_tarefas
  ADD CONSTRAINT metodo_tarefas_responsavel_mesma_empresa
  FOREIGN KEY (responsavel_id, id_cliente)
  REFERENCES public.cliente_colaboradores(id, id_cliente)
  ON DELETE SET NULL (responsavel_id);

ALTER TABLE public.metodo_dia_fechamentos
  DROP CONSTRAINT IF EXISTS metodo_dia_fech_colaborador_mesma_empresa;
ALTER TABLE public.metodo_dia_fechamentos
  ADD CONSTRAINT metodo_dia_fech_colaborador_mesma_empresa
  FOREIGN KEY (colaborador_id, id_cliente)
  REFERENCES public.cliente_colaboradores(id, id_cliente)
  ON DELETE SET NULL (colaborador_id);
