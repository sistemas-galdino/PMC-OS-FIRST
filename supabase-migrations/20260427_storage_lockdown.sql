-- Migration: RLS em storage.objects pros buckets de evidência
-- Data: 2026-04-27
-- Buckets seguem públicos (URLs de getPublicUrl funcionam pra exibir inline);
-- mas LIST/UPLOAD/UPDATE/DELETE ficam restritos ao dono do path-prefix
-- (clientId/...) ou mentor.

DO $$
DECLARE
  b text;
  buckets text[] := ARRAY['trilha-evidencias', 'vitorias-evidencias'];
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    -- SELECT (list/download metadata)
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects',
      b || '_read_self_or_mentor'
    );
    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects
        FOR SELECT TO authenticated
        USING (
          bucket_id = %L
          AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_mentor()
          )
        )
    $f$, b || '_read_self_or_mentor', b);

    -- INSERT
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects',
      b || '_insert_self_or_mentor'
    );
    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = %L
          AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_mentor()
          )
        )
    $f$, b || '_insert_self_or_mentor', b);

    -- UPDATE
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects',
      b || '_update_self_or_mentor'
    );
    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects
        FOR UPDATE TO authenticated
        USING (
          bucket_id = %L
          AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_mentor()
          )
        )
        WITH CHECK (
          bucket_id = %L
          AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_mentor()
          )
        )
    $f$, b || '_update_self_or_mentor', b, b);

    -- DELETE
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects',
      b || '_delete_self_or_mentor'
    );
    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects
        FOR DELETE TO authenticated
        USING (
          bucket_id = %L
          AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_mentor()
          )
        )
    $f$, b || '_delete_self_or_mentor', b);
  END LOOP;
END $$;
