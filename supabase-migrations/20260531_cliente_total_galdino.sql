-- Ciclo Galdino configurável por cliente (4, 6 ou 12 reuniões). Default 4.
-- Admin (mentor) altera pela aba "Ciclo Galdino"; a RLS self_or_admin_write de
-- cliente_informacoes_empresa já permite mentores escreverem qualquer linha,
-- então nenhuma policy/RPC nova é necessária (feature só de admin).

ALTER TABLE public.cliente_informacoes_empresa
  ADD COLUMN IF NOT EXISTS total_galdino integer NOT NULL DEFAULT 4
    CHECK (total_galdino IN (4, 6, 12));
