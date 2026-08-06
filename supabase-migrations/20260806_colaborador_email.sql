-- E-mail de contato do colaborador. Nullable — campo opcional no formulário
-- de Meu Time (painel do cliente e Visão Operacional do admin).
ALTER TABLE cliente_colaboradores ADD COLUMN IF NOT EXISTS email text;
