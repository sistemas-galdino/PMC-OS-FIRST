-- ============================================================================
-- Vitórias dos Clientes — acesso para CS e consultores
-- ============================================================================
-- A migration do segmento (20260817) não semeou papel_secoes: papéis full já
-- enxergam tudo, e ficou pra decidir quem mais entrava. Decidido: a CS opera o
-- acervo (é quem manda logo e captura print), então recebe as 5 seções; o
-- consultor só apresenta o case na reunião, então recebe apenas 'vitrine' — sem
-- as telas de edição de logo, evidência e oportunidade.
--
-- Lembrete de arquitetura: papel_secoes controla NAVEGAÇÃO (menu + RequireSecao).
-- A RLS das tabelas vitrine_* é is_admin(), e todo mundo em mentores passa nela.
-- ============================================================================

INSERT INTO public.papel_secoes (papel_chave, secao_chave) VALUES
  ('cs', 'vitrine'),
  ('cs', 'vitrine-cases'),
  ('cs', 'vitrine-clientes'),
  ('cs', 'vitrine-evidencias'),
  ('cs', 'vitrine-oportunidades'),
  ('consultor', 'vitrine')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
