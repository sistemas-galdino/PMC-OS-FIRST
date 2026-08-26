-- Vincula cada acesso do time à carteira de CS que ele opera.
--
-- Contexto: `clientes_entrada_new.sc` guarda o nome da CS em texto livre, e até
-- aqui o CRM tentava adivinhar quem era a pessoa logada. Pior: `sessao.ts`
-- resolvia por PAPEL, então qualquer CS recebia a primeira CS em ordem
-- alfabética — a Francielly abriu o Meu Dia dela e viu a carteira da Bruna.
--
-- `carteira_sc` é a chave da carteira (a string exata gravada em `sc`), separada
-- de `nome`, que é como a pessoa aparece na tela. Assim dá pra corrigir o nome
-- de exibição (ganhar sobrenome, arrumar acento) sem esvaziar a carteira dela.
-- Nulo para quem não é CS.

ALTER TABLE public.mentores
  ADD COLUMN IF NOT EXISTS carteira_sc text;

COMMENT ON COLUMN public.mentores.carteira_sc IS
  'Carteira de CS operada por este acesso: a string exata de clientes_entrada_new.sc. Nulo = sem carteira vinculada (o CRM não mostra carteira nenhuma em vez de mostrar a de outra pessoa).';

-- Backfill: hoje os 4 nomes de CS batem 1:1 com os `sc` dos clientes, então o
-- vínculo é dedutível. Só preenche quando existe cliente com aquele `sc` —
-- nome que não casa fica nulo de propósito, para aparecer como pendente na tela
-- em vez de vincular a uma carteira que não existe.
UPDATE public.mentores m
   SET carteira_sc = m.nome
 WHERE m.papel = 'cs'
   AND m.carteira_sc IS NULL
   AND m.nome IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM public.clientes_entrada_new c
      WHERE trim(c.sc) = trim(m.nome)
   );
