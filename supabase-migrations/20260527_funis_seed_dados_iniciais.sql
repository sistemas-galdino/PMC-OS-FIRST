-- Seed inicial dos Funis: dados portados do sistema antigo (Funnel Tracker Pro).
-- Origem: /tabelas-funis/*.csv exportados em 2026-05-27.
-- Idempotente — preserva IDs originais; ON CONFLICT (id) DO NOTHING evita duplicatas.

-- ============================================================
-- funis_social_selling — 5 registros
-- ============================================================
INSERT INTO public.funis_social_selling
  (id, record_date, approaches, conversations, call_invites, meetings_scheduled, notes, created_at, updated_at)
VALUES
  ('fdedd969-ed30-430f-8553-58c2361ec118', '2026-05-20', 42, 15, 0, 0, NULL, '2026-05-20 20:50:12.53905+00',  '2026-05-20 20:50:12.53905+00'),
  ('e88fee1e-1a97-4685-99e4-a33b9c97c686', '2026-05-21', 37, 10, 1, 0, NULL, '2026-05-26 14:43:14.555831+00', '2026-05-26 14:43:14.555831+00'),
  ('9e586c87-a258-4f4c-a590-da61fe327d21', '2026-05-22', 33, 11, 1, 0, NULL, '2026-05-26 14:43:40.813338+00', '2026-05-26 14:43:40.813338+00'),
  ('e683d590-f255-43d2-b52f-33116e5466b9', '2026-05-25', 29,  7, 0, 0, NULL, '2026-05-26 14:44:12.376839+00', '2026-05-26 14:44:12.376839+00'),
  ('23740909-2a1d-4437-ab45-a493c41dbbe5', '2026-05-26', 32, 13, 1, 0, NULL, '2026-05-26 21:16:13.918715+00', '2026-05-26 21:16:13.918715+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- funis_aplicacao — 1 registro
-- ============================================================
INSERT INTO public.funis_aplicacao
  (id, record_date, period_end, applications, form_yes, form_no, calls_made, sales_made, revenue, ad_spend, notes, created_at, updated_at)
VALUES
  ('46a59269-1483-42dd-8715-eaa0d8296aa8', '2026-05-06', NULL, 6, 3, 3, 3, 2, 15000, 0, NULL, '2026-05-07 00:45:16.214301+00', '2026-05-07 00:45:16.214301+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- funis_eventos — 1 registro
-- ============================================================
INSERT INTO public.funis_eventos
  (id, event_date, city, class_name, partner_name, participants, qualified, bought_pitch, followup_7d, notes, created_at, updated_at)
VALUES
  ('4fb0c0dc-7c7d-4a41-8cb6-612ec2da5460', '2026-05-07', 'Boston EUA', 'Boston', 'Boston Celtics', 120, 30, 15, 10, NULL, '2026-05-07 12:41:28.292934+00', '2026-05-07 12:41:28.292934+00')
ON CONFLICT (id) DO NOTHING;
