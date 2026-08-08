-- Onda 1 — Agendamento dos digests. 11:00 UTC = 08:00 BRT (mesma convenção dos
-- jobs já existentes: pmc-encontros-do-dia, pmc-acoes-vencendo, pmc-top10-badge).
--
-- Seguro ligar antes de existir provedor: o opt-in tem default FALSE, então
-- enquanto ninguém consentir estas funções enfileiram exatamente 0 mensagens.
-- E mesmo depois, quem envia é o worker — que nasce em MODO SECO.
--
-- O worker (edge function enviar-mensagens) NÃO está agendado aqui: ele precisa
-- de chamada HTTP, e a forma de invocá-lo é decisão em aberto (pg_cron + extensão
-- http, que já está instalada, ou o agendador externo que hoje chama
-- sincronizar-reunioes via CRON_INVOKE_TOKEN).

SELECT cron.schedule('digest-diario-guardiao', '15 11 * * 1-5', 'SELECT public.digest_diario_guardiao()');
SELECT cron.schedule('digest-semanal-dono',    '20 11 * * 1',   'SELECT public.digest_semanal_dono()');
