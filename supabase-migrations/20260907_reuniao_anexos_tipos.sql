-- Aba "Arquivos" das reunioes: aceitar .html/.md + texto/dados + compactados,
-- e travar o bucket de verdade. Ate aqui reunioes-anexos estava com
-- allowed_mime_types e file_size_limit NULL (qualquer tipo, qualquer tamanho);
-- o unico gate era o accept do input, que e so filtro do seletor de arquivos.
--
-- A lista espelha EXT_MIME em web/src/components/reunioes/tab-arquivos.tsx.
-- html/htm/svg novos sobem como text/plain (bucket publico: HTML inline na URL
-- crua do Storage vira pagina hospedada). image/svg+xml continua na lista por
-- causa dos SVGs ja existentes.

-- INSERT ... ON CONFLICT (e nao UPDATE puro) porque o DEV nunca recebeu a
-- 20260619: a tabela reuniao_anexos existia la, mas o bucket nao, entao todo
-- upload em DEV falhava com "Bucket not found".

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reunioes-anexos',
  'reunioes-anexos',
  true,
  26214400,  -- 25 MB
  ARRAY[
    -- imagens
    'image/png','image/jpeg','image/jpg','image/webp','image/gif','image/svg+xml',
    'image/bmp','image/tiff','image/avif','image/heic','image/heif',
    -- documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- texto e dados
    'text/plain','text/markdown','text/csv','text/html','text/xml','text/yaml',
    'application/json','application/xml','application/x-yaml',
    'application/rtf','text/rtf',
    -- compactados
    'application/zip','application/x-zip-compressed',
    'application/vnd.rar','application/x-rar-compressed',
    'application/x-7z-compressed',
    -- rede de seguranca p/ anexos antigos sem tipo definido
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Mesma policy da 20260619 (idempotente): so o dono da pasta (auth.uid()) ou admin.
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
