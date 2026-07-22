-- SEGURANÇA: as tabelas funis_* estavam com políticas USING (true) sem
-- restrição de papel — abertas para leitura E escrita com a chave anon
-- pública. Funis é área exclusiva do admin: trava tudo em is_admin().
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['funis_social_selling', 'funis_aplicacao', 'funis_eventos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Anyone select %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone insert %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone update %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone delete %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_admin_all ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_admin_all ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())',
      t, t
    );
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;
