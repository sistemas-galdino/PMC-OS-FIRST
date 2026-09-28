-- Uploads do painel do cliente falhavam para quem não é o login legado da empresa.
--
-- Todo upload do painel grava em "<id da empresa>/<arquivo>" (trilha, vitórias,
-- guardião, documentos e prints do Método, anexos de reunião, avatar), mas as
-- policies dos 7 buckets só aceitavam a pasta = auth.uid(). Isso só bate para o
-- dono legado (auth.uid() = id_cliente). Colaborador, guardião e login
-- multi-empresa tomavam "new row violates row-level security policy" — caso que
-- apareceu na Potencial Distribuidora (395), colaborador subindo a foto do
-- Guardião da IA na trilha.
--
-- Agora a pasta pode ser também a empresa ATIVA do login (meu_id_cliente()),
-- a mesma regra das tabelas. auth.uid() continua valendo para os arquivos que
-- já existem.
--
-- Rollback: rollback/20260928_storage_pasta_empresa.down.sql

do $$
declare r record;
begin
  for r in select * from (values
    ('cliente_avatares_owner_or_admin_rw','cliente-avatares'),
    ('guardiao_fotos_owner_or_admin_rw','guardiao-fotos'),
    ('metodo_docs_owner_or_admin_rw','metodo-documentos'),
    ('reunioes_anexos_owner_or_admin_rw','reunioes-anexos'),
    ('sistema_prints_owner_or_admin_rw','sistema-prints'),
    ('trilha_ev_owner_or_admin_rw','trilha-evidencias'),
    ('vitorias_owner_or_admin_rw','vitorias-evidencias')
  ) as t(pol, bucket)
  loop
    -- O DEV não tem todos os buckets; altera só as policies que existem.
    if exists (select 1 from pg_policies where schemaname = 'storage'
                 and tablename = 'objects' and policyname = r.pol) then
      execute format(
        'alter policy %I on storage.objects using (bucket_id = %L and ((storage.foldername(name))[1] = (auth.uid())::text or (storage.foldername(name))[1] = (public.meu_id_cliente())::text or is_admin())) with check (bucket_id = %L and ((storage.foldername(name))[1] = (auth.uid())::text or (storage.foldername(name))[1] = (public.meu_id_cliente())::text or is_admin()))',
        r.pol, r.bucket, r.bucket);
    end if;
  end loop;
end $$;
