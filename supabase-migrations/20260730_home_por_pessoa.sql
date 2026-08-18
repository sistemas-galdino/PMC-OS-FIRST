-- Onda 2 · Home por pessoa — o login do Guardião abre no cockpit diário, o do
-- dono continua na Minha Jornada. Mesma empresa, mesmas permissões de dado
-- (a decisão "todos veem tudo" segue valendo); muda só a porta de entrada.
--
-- Por quê: recompensa de horizonte longo (nível, ROI) e de ciclo curto (dia
-- fechado) usam circuitos de motivação diferentes. Na mesma tela, a urgência do
-- dia atropela a narrativa do progresso.
--
-- empresa_usuarios.papel já existia com default 'colaborador' e sem uso.
-- Passa a ter significado: 'dono' | 'guardiao' | 'colaborador'.

ALTER TABLE public.empresa_usuarios DROP CONSTRAINT IF EXISTS empresa_usuarios_papel_valido;
ALTER TABLE public.empresa_usuarios ADD CONSTRAINT empresa_usuarios_papel_valido
  CHECK (papel IN ('dono','guardiao','colaborador'));

COMMENT ON COLUMN public.empresa_usuarios.papel IS
  'Define a HOME do usuário: guardiao -> /meu-dia, demais -> /inicio. Não restringe acesso a dado.';

-- Papel do próprio usuário logado. Nunca aceita id de terceiro.
-- NULL para admin do PMC (não está em empresa_usuarios) e para cliente legado.
CREATE OR REPLACE FUNCTION public.meu_papel_empresa()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT papel FROM empresa_usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;
COMMENT ON FUNCTION public.meu_papel_empresa() IS
  'Papel do usuário logado dentro da empresa. NULL para admin do PMC ou cliente legado.';
