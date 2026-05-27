-- Aba "Funis" no admin: 3 tabelas (Social Selling, Aplicação, Eventos)
-- RLS aberta — todos os admins compartilham os mesmos registros.

-- Reusa set_updated_at se já existe; senão cria.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============================================================
-- 1) funis_social_selling
-- ============================================================
CREATE TABLE IF NOT EXISTS public.funis_social_selling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL,
  approaches INTEGER NOT NULL DEFAULT 0,
  conversations INTEGER NOT NULL DEFAULT 0,
  call_invites INTEGER NOT NULL DEFAULT 0,
  meetings_scheduled INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funis_social_selling_date
  ON public.funis_social_selling(record_date DESC);

ALTER TABLE public.funis_social_selling ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone select funis_social_selling" ON public.funis_social_selling;
DROP POLICY IF EXISTS "Anyone insert funis_social_selling" ON public.funis_social_selling;
DROP POLICY IF EXISTS "Anyone update funis_social_selling" ON public.funis_social_selling;
DROP POLICY IF EXISTS "Anyone delete funis_social_selling" ON public.funis_social_selling;

CREATE POLICY "Anyone select funis_social_selling" ON public.funis_social_selling FOR SELECT USING (true);
CREATE POLICY "Anyone insert funis_social_selling" ON public.funis_social_selling FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone update funis_social_selling" ON public.funis_social_selling FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone delete funis_social_selling" ON public.funis_social_selling FOR DELETE USING (true);

DROP TRIGGER IF EXISTS trg_funis_social_selling_updated ON public.funis_social_selling;
CREATE TRIGGER trg_funis_social_selling_updated
  BEFORE UPDATE ON public.funis_social_selling
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.funis_social_selling REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.funis_social_selling;

-- ============================================================
-- 2) funis_aplicacao
-- ============================================================
CREATE TABLE IF NOT EXISTS public.funis_aplicacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL,
  period_end DATE,
  applications INTEGER NOT NULL DEFAULT 0,
  form_yes INTEGER NOT NULL DEFAULT 0,
  form_no INTEGER NOT NULL DEFAULT 0,
  calls_made INTEGER NOT NULL DEFAULT 0,
  sales_made INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  ad_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funis_aplicacao_date
  ON public.funis_aplicacao(record_date DESC);

ALTER TABLE public.funis_aplicacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone select funis_aplicacao" ON public.funis_aplicacao;
DROP POLICY IF EXISTS "Anyone insert funis_aplicacao" ON public.funis_aplicacao;
DROP POLICY IF EXISTS "Anyone update funis_aplicacao" ON public.funis_aplicacao;
DROP POLICY IF EXISTS "Anyone delete funis_aplicacao" ON public.funis_aplicacao;

CREATE POLICY "Anyone select funis_aplicacao" ON public.funis_aplicacao FOR SELECT USING (true);
CREATE POLICY "Anyone insert funis_aplicacao" ON public.funis_aplicacao FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone update funis_aplicacao" ON public.funis_aplicacao FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone delete funis_aplicacao" ON public.funis_aplicacao FOR DELETE USING (true);

DROP TRIGGER IF EXISTS trg_funis_aplicacao_updated ON public.funis_aplicacao;
CREATE TRIGGER trg_funis_aplicacao_updated
  BEFORE UPDATE ON public.funis_aplicacao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.funis_aplicacao REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.funis_aplicacao;

-- ============================================================
-- 3) funis_eventos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.funis_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  city TEXT NOT NULL,
  class_name TEXT NOT NULL,
  partner_name TEXT,
  participants INTEGER NOT NULL DEFAULT 0,
  qualified INTEGER NOT NULL DEFAULT 0,
  bought_pitch INTEGER NOT NULL DEFAULT 0,
  followup_7d INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funis_eventos_date
  ON public.funis_eventos(event_date DESC);

ALTER TABLE public.funis_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone select funis_eventos" ON public.funis_eventos;
DROP POLICY IF EXISTS "Anyone insert funis_eventos" ON public.funis_eventos;
DROP POLICY IF EXISTS "Anyone update funis_eventos" ON public.funis_eventos;
DROP POLICY IF EXISTS "Anyone delete funis_eventos" ON public.funis_eventos;

CREATE POLICY "Anyone select funis_eventos" ON public.funis_eventos FOR SELECT USING (true);
CREATE POLICY "Anyone insert funis_eventos" ON public.funis_eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone update funis_eventos" ON public.funis_eventos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone delete funis_eventos" ON public.funis_eventos FOR DELETE USING (true);

DROP TRIGGER IF EXISTS trg_funis_eventos_updated ON public.funis_eventos;
CREATE TRIGGER trg_funis_eventos_updated
  BEFORE UPDATE ON public.funis_eventos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.funis_eventos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.funis_eventos;
