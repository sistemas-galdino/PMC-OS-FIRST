-- Aba "Arquivos" nas 3 paginas de detalhe de reuniao.
-- Anexos (arquivos + links) que o consultor (admin) E o cliente podem adicionar/ver.
-- id_reuniao/id_cliente sao TEXT: id_unico/id_cliente sao uuid em reunioes_mentoria_new
-- e reunioes_galdino, mas TEXT em reunioes_blackcrm. TEXT unifica as 3 origens; RLS usa
-- auth.uid()::text. Bucket publico (igual vitorias-evidencias/trilha-evidencias):
-- getPublicUrl abre inline; a RLS de storage governa quem escreve/lista.

CREATE TABLE IF NOT EXISTS public.reuniao_anexos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_origem    text NOT NULL
    CHECK (tabela_origem IN ('reunioes_mentoria_new','reunioes_blackcrm','reunioes_galdino')),
  id_reuniao       text NOT NULL,            -- = id_unico (string)
  id_cliente       text NOT NULL,            -- = id_cliente da reuniao (string)
  criado_por       uuid NOT NULL,            -- auth.uid() de quem subiu
  criado_por_admin boolean NOT NULL DEFAULT false,
  tipo             text NOT NULL CHECK (tipo IN ('arquivo','link')),
  url              text NOT NULL,
  nome             text NOT NULL,
  mime             text,
  tamanho          bigint,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reuniao_anexos_lookup_idx  ON public.reuniao_anexos (tabela_origem, id_reuniao);
CREATE INDEX IF NOT EXISTS reuniao_anexos_cliente_idx ON public.reuniao_anexos (id_cliente);

ALTER TABLE public.reuniao_anexos ENABLE ROW LEVEL SECURITY;

-- SELECT: dono da reuniao (cliente) ou admin
DROP POLICY IF EXISTS reuniao_anexos_select ON public.reuniao_anexos;
CREATE POLICY reuniao_anexos_select ON public.reuniao_anexos
  FOR SELECT TO authenticated
  USING (auth.uid()::text = id_cliente OR is_admin());

-- INSERT: cliente so insere para a propria reuniao; admin qualquer.
-- criado_por travado em auth.uid() para impedir spoof.
DROP POLICY IF EXISTS reuniao_anexos_insert ON public.reuniao_anexos;
CREATE POLICY reuniao_anexos_insert ON public.reuniao_anexos
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid()::text = id_cliente OR is_admin()) AND criado_por = auth.uid());

-- DELETE: so quem criou ou admin
DROP POLICY IF EXISTS reuniao_anexos_delete ON public.reuniao_anexos;
CREATE POLICY reuniao_anexos_delete ON public.reuniao_anexos
  FOR DELETE TO authenticated
  USING (criado_por = auth.uid() OR is_admin());

REVOKE ALL ON public.reuniao_anexos FROM anon;
GRANT SELECT, INSERT, DELETE ON public.reuniao_anexos TO authenticated;

-- ----- Storage bucket (publico p/ getPublicUrl inline; RLS governa escrita/lista) -----
INSERT INTO storage.buckets (id, name, public)
VALUES ('reunioes-anexos', 'reunioes-anexos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "reunioes_anexos_owner_or_admin_rw" ON storage.objects;
CREATE POLICY "reunioes_anexos_owner_or_admin_rw" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'reunioes-anexos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  )
  WITH CHECK (
    bucket_id = 'reunioes-anexos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  );
