-- Semeia conversas de WhatsApp no DEV para validar a aba de Atendimento.
--
-- NÃO RODAR EM PRODUÇÃO. Complementa scripts/seed-crm-dev.sql (rode aquele
-- antes: as conversas se penduram nos clientes que ele preenche).
--
-- Textos e nomes de contato são GERADOS. Nenhuma mensagem real de cliente
-- atravessa para o ambiente de teste — o que se replica é a FORMA: conversas
-- terminando na CS (respondidas) e terminando no cliente (sem resposta), com
-- silêncios de 3 a 30 horas, que é o que exercita a régua de horas úteis e as
-- bordas amarela (>12h) e vermelha (>18h).
--
-- Para desfazer: scripts/seed-crm-dev-limpar.sql

BEGIN;

WITH alvo AS (
  SELECT
    c.id_cliente AS id,
    coalesce(c.nome_empresa_formatado, c.nome_empresa, 'Cliente') AS empresa,
    c.sc,
    -- Semente determinística: rodar duas vezes gera a mesma conversa.
    abs(hashtext(c.id_cliente::text)) AS h
  FROM clientes_entrada_new c
  WHERE c.sc IS NOT NULL
    AND coalesce(c.situacao, '') <> 'cancelado'
    AND c.data IS NOT NULL
  ORDER BY c.id_cliente
  LIMIT 22
),
nova AS (
  INSERT INTO crm_conversas (grupo_id, grupo_nome, id_cliente, cs_responsavel)
  SELECT 'dev-g-' || a.id, 'PMC · ' || a.empresa, a.id, a.sc
  FROM alvo a
  ON CONFLICT (grupo_id) DO NOTHING
  RETURNING id, id_cliente
),
conv AS (
  SELECT n.id AS conversa_id, a.h, a.sc, a.empresa,
         8 + (a.h % 7)                                   AS total,
         (a.h % 3) <> 0                                  AS sem_resposta,
         -- Silêncios em horas CORRIDAS. Os dois maiores (76 e 100) existem para
         -- que alguma conversa passe de 18 horas ÚTEIS mesmo com um fim de
         -- semana no meio — sem eles a borda vermelha nunca aparece no DEV.
         (ARRAY[1,5,9,14,22,30,76,100])[1 + (a.h % 8)]   AS horas_silencio,
         (ARRAY['Carlos','Renata','Paulo','Juliana','Marcos','Beatriz','Rodrigo','Camila'])[1 + (a.h % 8)] AS contato
  FROM nova n JOIN alvo a ON a.id = n.id_cliente
),
msg AS (
  SELECT
    c.conversa_id,
    i,
    -- A última mensagem define se o grupo está "sem resposta".
    CASE WHEN i = c.total - 1 THEN NOT c.sem_resposta
         ELSE ((i + c.h) % 2) = 1 END AS da_cs,
    c.contato,
    c.sc,
    c.h,
    now()
      - (c.horas_silencio || ' hours')::interval
      - ((c.total - 1 - i) * (2 + ((c.h + i) % 9)) || ' hours')::interval AS em
  FROM conv c, generate_series(0, 20) AS i
  WHERE i < c.total
)
INSERT INTO crm_mensagens (conversa_id, autor, da_cs, texto, em, anexo_nome, anexo_tipo, status_envio)
SELECT
  m.conversa_id,
  CASE WHEN m.da_cs THEN m.sc ELSE m.contato END,
  m.da_cs,
  CASE WHEN m.da_cs
    THEN (ARRAY[
      'Bom dia! Já verifiquei aqui, te retorno ainda hoje 😊',
      'Enviei o material no e-mail cadastrado, pode conferir?',
      'Perfeito! Vou registrar no acompanhamento de vocês',
      'Reunião remarcada, mandei o novo convite',
      'Segue o passo a passo em anexo',
      'Parabéns pelo resultado! Vamos registrar como vitória 🎉',
      'Consigo liberar os acessos hoje ainda',
      'Qualquer coisa é só chamar por aqui',
      'Vou acionar o time de implementação',
      'Combinado, aguardo o retorno de vocês'
    ])[1 + ((m.h + m.i) % 10)]
    ELSE (ARRAY[
      'Bom dia! Consegui rodar o fluxo aqui, deu certo 👏',
      'Ainda não recebi o material do treinamento, consegue verificar?',
      'A equipe está com dúvida sobre o preenchimento do CRM',
      'Podemos remarcar a reunião de quinta?',
      'Segue o print do erro que apareceu',
      'Fechamos o mês com 18% a mais em vendas 🚀',
      'Quem seria o responsável por liberar os acessos?',
      'Obrigado pelo suporte, ajudou demais!',
      'Vou alinhar internamente e te retorno',
      'Consegue mandar o passo a passo por escrito?'
    ])[1 + ((m.h + m.i * 3) % 10)]
  END,
  m.em,
  -- Um anexo a cada cinco mensagens, para a coluna "Arquivos" do painel.
  CASE WHEN ((m.h + m.i * 7) % 5) = 0 THEN
    CASE WHEN ((m.h + m.i * 7) % 10) = 0
      THEN (ARRAY['Plano de acao.pdf','Checklist implementacao.pdf','Relatorio mensal.xlsx','Passo a passo.pdf'])[1 + ((m.h + m.i) % 4)]
      ELSE (ARRAY['print-erro.png','dashboard-vendas.jpg','fluxo-crm.png','resultado-mes.jpg'])[1 + ((m.h + m.i) % 4)]
    END
  END,
  CASE WHEN ((m.h + m.i * 7) % 5) = 0 THEN
    CASE WHEN ((m.h + m.i * 7) % 10) = 0 THEN 'documento' ELSE 'imagem' END
  END,
  CASE WHEN m.da_cs THEN 'enviada' ELSE 'recebida' END
FROM msg m;

-- Espelha o grupo na ficha do cliente, como o provedor faria.
UPDATE clientes_entrada_new c
   SET whatsapp_grupo_id = v.grupo_id,
       whatsapp_grupo_nome = v.grupo_nome
  FROM crm_conversas v
 WHERE v.id_cliente = c.id_cliente AND v.grupo_id LIKE 'dev-g-%';

COMMIT;

-- ───────── Transcrição de exemplo ─────────
-- Uma reunião com transcrição, para exercitar o caminho
-- "Transformar em tarefas" → crm-analisar-transcricao. Texto gerado; nenhuma
-- transcrição real de cliente entra no DEV.
UPDATE reunioes_mentoria_new
   SET transcricao = 'Consultor: Oi Marcos, tudo bem? Vamos revisar o trimestre. '
     || 'Marcos: Oi! A gente conseguiu subir o catálogo no CRM, mas travamos na integração com o financeiro. '
     || 'Consultor: Entendi. Eu vou levantar com o time técnico e te retorno até quinta com o passo a passo. '
     || 'Marcos: Perfeito. E eu preciso liberar o acesso do João no sistema, faço isso ainda hoje. '
     || 'Consultor: Ótimo. Também vou agendar a reunião com o Galdino pra fechar o trimestre, mando o convite amanhã. '
     || 'Marcos: Combinado. A Renata do meu time ficou de organizar os dados de vendas de julho até sexta. '
     || 'Consultor: Anotado. Decidimos manter o foco na integração antes de abrir novos canais. '
     || 'Marcos: Isso. O risco é a equipe ficar sobrecarregada no fechamento do mês.'
 WHERE id_reuniao LIKE 'dev-ment-%'
   AND transcricao IS NULL
   AND data_reuniao = (SELECT max(data_reuniao) FROM reunioes_mentoria_new WHERE id_reuniao LIKE 'dev-ment-%');
