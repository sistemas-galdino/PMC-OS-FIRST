-- Rollback de 20260928_storage_pasta_empresa.sql: volta a pasta = auth.uid().

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
        'alter policy %I on storage.objects using (bucket_id = %L and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin())) with check (bucket_id = %L and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()))',
        r.pol, r.bucket, r.bucket);
    end if;
  end loop;
end $$;
