-- ROLLBACK de 20260823_seed_emails_multi_empresa.sql
delete from public.emails_multi_empresa
 where email in (
   'brmoitinho@yahoo.com.br',
   'adm@xrmpremoldados.com.br',
   'financeiro@xrmpremoldados.com.br',
   'joaovitor20062006@gmail.com'
 );
