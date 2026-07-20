-- 20260720_fase2_rls_multiusuario.sql
-- FASE 2 (reescrita da RLS) — troca o isolamento por-empresa de auth.uid()=id_cliente
-- para meu_id_cliente()=id_cliente, habilitando N logins por empresa.
--
-- SEGURA POR CONSTRUÇÃO: meu_id_cliente() tem fallback para o modelo legado
-- (auth.uid()=id_cliente quando não há vínculo), então:
--   - cliente de login único atual: comportamento IDÊNTICO (nada muda);
--   - 2º+ usuário da empresa: passa a enxergar os dados da empresa;
--   - usuário sem vínculo/desconhecido: sem acesso.
-- Cada login pertence a UMA empresa (empresa_usuarios.auth_user_id é PK), então
-- não há cruzamento entre empresas.
--
-- Aplicada como bloco dinâmico que só toca a comparação com id_cliente — preserva
-- auth.jwt() (checks de mentor), is_admin(), aliases (i.id_cliente) e, importante,
-- criado_por = auth.uid() (o autor real do registro). Idempotente.

do $$
declare r record; nq text; nc text; stmt text;
begin
  for r in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and ( (qual is not null       and qual ~ 'auth\.uid\(\)'       and qual ~ 'id_cliente')
         or (with_check is not null and with_check ~ 'auth\.uid\(\)' and with_check ~ 'id_cliente') )
  loop
    nq := r.qual;
    nc := r.with_check;
    if nq is not null then
      nq := regexp_replace(nq, '\(auth\.uid\(\)\)::text(\s*=\s*\yid_cliente\y)', '(meu_id_cliente())::text\1', 'g');
      nq := regexp_replace(nq, '(\yid_cliente\s*=\s*)\(auth\.uid\(\)\)::text', '\1(meu_id_cliente())::text', 'g');
      nq := regexp_replace(nq, 'auth\.uid\(\)(\s*=\s*\yid_cliente\y)', 'meu_id_cliente()\1', 'g');
      nq := regexp_replace(nq, '(\yid_cliente\s*=\s*)auth\.uid\(\)', '\1meu_id_cliente()', 'g');
    end if;
    if nc is not null then
      nc := regexp_replace(nc, '\(auth\.uid\(\)\)::text(\s*=\s*\yid_cliente\y)', '(meu_id_cliente())::text\1', 'g');
      nc := regexp_replace(nc, '(\yid_cliente\s*=\s*)\(auth\.uid\(\)\)::text', '\1(meu_id_cliente())::text', 'g');
      nc := regexp_replace(nc, 'auth\.uid\(\)(\s*=\s*\yid_cliente\y)', 'meu_id_cliente()\1', 'g');
      nc := regexp_replace(nc, '(\yid_cliente\s*=\s*)auth\.uid\(\)', '\1meu_id_cliente()', 'g');
    end if;
    stmt := format('alter policy %I on public.%I', r.policyname, r.tablename);
    if r.qual is not null       then stmt := stmt || format(' using (%s)', nq); end if;
    if r.with_check is not null then stmt := stmt || format(' with check (%s)', nc); end if;
    execute stmt;
  end loop;
end $$;
