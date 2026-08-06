-- E-mail do colaborador passa a ser obrigatório.
--
-- NÃO dá pra usar NOT NULL: as linhas já existentes (111 em produção) foram
-- cadastradas antes do campo existir e estão todas com email NULL — não há
-- de onde backfillar. Usamos um CHECK NOT VALID, que:
--   * NÃO valida as linhas antigas (elas continuam no banco, intactas);
--   * VALIDA todo INSERT e todo UPDATE daqui pra frente.
-- Ou seja: cadastro novo exige e-mail, e editar um colaborador antigo só
-- salva depois de preencher o e-mail — igual ao formulário de Meu Time.
ALTER TABLE cliente_colaboradores
  ADD CONSTRAINT cliente_colaboradores_email_obrigatorio
  CHECK (email IS NOT NULL AND btrim(email) <> '') NOT VALID;
