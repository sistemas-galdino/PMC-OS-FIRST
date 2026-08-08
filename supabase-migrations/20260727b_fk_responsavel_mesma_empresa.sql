-- Capturada do estado já aplicado (DEV+PROD) para alinhar o repositório ao banco.
-- CORRECAO: a FK simples garante que o colaborador EXISTE, nao que ele e da
-- MESMA empresa. Sem isso, uma tarefa da empresa B podia apontar para uma
-- pessoa da empresa A — e um futuro join no "Meu Dia" vazaria o nome dela.
-- FK COMPOSTA resolve no banco: o par (responsavel_id, id_cliente) tem de existir.

-- Pre-requisito da FK composta (id ja e PK; o unique par e o que a FK exige).
ALTER TABLE public.cliente_colaboradores
  DROP CONSTRAINT IF EXISTS cliente_colaboradores_id_cliente_uk;
ALTER TABLE public.cliente_colaboradores
  ADD CONSTRAINT cliente_colaboradores_id_cliente_uk UNIQUE (id, id_cliente);

-- Troca a FK simples pela composta.
ALTER TABLE public.metodo_tarefas
  DROP CONSTRAINT IF EXISTS metodo_tarefas_responsavel_id_fkey;
ALTER TABLE public.metodo_tarefas
  ADD CONSTRAINT metodo_tarefas_responsavel_mesma_empresa
  FOREIGN KEY (responsavel_id, id_cliente)
  REFERENCES public.cliente_colaboradores(id, id_cliente)
  ON DELETE SET NULL;

-- Mesmo cuidado em quem fecha o dia.
ALTER TABLE public.metodo_dia_fechamentos
  DROP CONSTRAINT IF EXISTS metodo_dia_fechamentos_colaborador_id_fkey;
ALTER TABLE public.metodo_dia_fechamentos
  ADD CONSTRAINT metodo_dia_fech_colaborador_mesma_empresa
  FOREIGN KEY (colaborador_id, id_cliente)
  REFERENCES public.cliente_colaboradores(id, id_cliente)
  ON DELETE SET NULL;
