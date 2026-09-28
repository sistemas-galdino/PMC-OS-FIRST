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

begin;

alter policy cliente_avatares_owner_or_admin_rw on storage.objects
  using (bucket_id = 'cliente-avatares' and ((storage.foldername(name))[1] = (auth.uid())::text
                                   or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                   or is_admin()))
  with check (bucket_id = 'cliente-avatares' and ((storage.foldername(name))[1] = (auth.uid())::text
                                        or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                        or is_admin()));

alter policy guardiao_fotos_owner_or_admin_rw on storage.objects
  using (bucket_id = 'guardiao-fotos' and ((storage.foldername(name))[1] = (auth.uid())::text
                                   or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                   or is_admin()))
  with check (bucket_id = 'guardiao-fotos' and ((storage.foldername(name))[1] = (auth.uid())::text
                                        or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                        or is_admin()));

alter policy metodo_docs_owner_or_admin_rw on storage.objects
  using (bucket_id = 'metodo-documentos' and ((storage.foldername(name))[1] = (auth.uid())::text
                                   or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                   or is_admin()))
  with check (bucket_id = 'metodo-documentos' and ((storage.foldername(name))[1] = (auth.uid())::text
                                        or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                        or is_admin()));

alter policy reunioes_anexos_owner_or_admin_rw on storage.objects
  using (bucket_id = 'reunioes-anexos' and ((storage.foldername(name))[1] = (auth.uid())::text
                                   or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                   or is_admin()))
  with check (bucket_id = 'reunioes-anexos' and ((storage.foldername(name))[1] = (auth.uid())::text
                                        or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                        or is_admin()));

alter policy sistema_prints_owner_or_admin_rw on storage.objects
  using (bucket_id = 'sistema-prints' and ((storage.foldername(name))[1] = (auth.uid())::text
                                   or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                   or is_admin()))
  with check (bucket_id = 'sistema-prints' and ((storage.foldername(name))[1] = (auth.uid())::text
                                        or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                        or is_admin()));

alter policy trilha_ev_owner_or_admin_rw on storage.objects
  using (bucket_id = 'trilha-evidencias' and ((storage.foldername(name))[1] = (auth.uid())::text
                                   or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                   or is_admin()))
  with check (bucket_id = 'trilha-evidencias' and ((storage.foldername(name))[1] = (auth.uid())::text
                                        or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                        or is_admin()));

alter policy vitorias_owner_or_admin_rw on storage.objects
  using (bucket_id = 'vitorias-evidencias' and ((storage.foldername(name))[1] = (auth.uid())::text
                                   or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                   or is_admin()))
  with check (bucket_id = 'vitorias-evidencias' and ((storage.foldername(name))[1] = (auth.uid())::text
                                        or (storage.foldername(name))[1] = (public.meu_id_cliente())::text
                                        or is_admin()));

commit;
