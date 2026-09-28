-- Rollback de 20260928_storage_pasta_empresa.sql: volta a pasta = auth.uid().

begin;

alter policy cliente_avatares_owner_or_admin_rw on storage.objects
  using (bucket_id = 'cliente-avatares' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()))
  with check (bucket_id = 'cliente-avatares' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()));

alter policy guardiao_fotos_owner_or_admin_rw on storage.objects
  using (bucket_id = 'guardiao-fotos' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()))
  with check (bucket_id = 'guardiao-fotos' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()));

alter policy metodo_docs_owner_or_admin_rw on storage.objects
  using (bucket_id = 'metodo-documentos' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()))
  with check (bucket_id = 'metodo-documentos' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()));

alter policy reunioes_anexos_owner_or_admin_rw on storage.objects
  using (bucket_id = 'reunioes-anexos' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()))
  with check (bucket_id = 'reunioes-anexos' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()));

alter policy sistema_prints_owner_or_admin_rw on storage.objects
  using (bucket_id = 'sistema-prints' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()))
  with check (bucket_id = 'sistema-prints' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()));

alter policy trilha_ev_owner_or_admin_rw on storage.objects
  using (bucket_id = 'trilha-evidencias' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()))
  with check (bucket_id = 'trilha-evidencias' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()));

alter policy vitorias_owner_or_admin_rw on storage.objects
  using (bucket_id = 'vitorias-evidencias' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()))
  with check (bucket_id = 'vitorias-evidencias' and ((storage.foldername(name))[1] = (auth.uid())::text or is_admin()));

commit;
