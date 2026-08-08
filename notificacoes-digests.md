# Notificações & Digests — como funciona (outbox de mensagens)

> Documento de entendimento, escrito em 2026-08-08. Descreve o estado real observado
> nos bancos **DEV** (`jkwpxttxkksqiffodonb`) e **PROD** (`hqczwextifessaztyyyk`).
> Nada foi ligado/alterado — é só explicação do que já existe.

## Resumo em uma frase

O "cron dos digests" é o **relógio** que, toda manhã, tenta montar um resumo **diário**
(para o Guardião) e **semanal** (para o dono) e mandar por WhatsApp — mas hoje é um
**motor girando em ponto morto**: enfileira 0 mensagens porque ninguém optou por receber,
não há quem esvazie a fila automaticamente, e o envio ainda está em "modo seco".
Está tudo construído e seguro, só **não ligado**.

---

## 1. O que é o cron dos digests

São **2 jobs agendados no banco** via `pg_cron`, **ativos** tanto no DEV quanto no PROD:

| Job | Agenda (cron) | Quando (BRT) | Função que roda |
|---|---|---|---|
| `digest-diario-guardiao` | `15 11 * * 1-5` | **08:15, seg–sex** | `digest_diario_guardiao()` |
| `digest-semanal-dono` | `20 11 * * 1` | **08:20, segundas** | `digest_semanal_dono()` |

`11:xx UTC = 08:xx` no horário de Brasília (UTC−3). Mesma convenção dos outros jobs
já existentes (`pmc-encontros-do-dia`, `pmc-acoes-vencendo`, `pmc-top10-badge`).

Para inspecionar os jobs:

```sql
select jobid, schedule, jobname, active, command from cron.job order by jobname;
-- histórico de execução:
select j.jobname, d.start_time, d.status, d.return_message
from cron.job_run_details d join cron.job j using (jobid)
where j.jobname like 'digest-%' order by d.start_time desc limit 20;
```

---

## 2. O que eles fazem — e o que NÃO fazem

**Ponto central: os crons só ENFILEIRAM mensagens. Eles não enviam nada.**
É o padrão **outbox** (caixa de saída), em camadas desacopladas:

```
[cron digest]  →  enfileirar_mensagem()  →  tabela mensagens_saida  →  [worker: enviar-mensagens]  →  WhatsApp
  (agenda)          (grava na fila)             (a fila)                  (edge function)              (Meta Cloud API)
```

1. **Digest diário** (`digest_diario_guardiao`) — varre os clientes ativos
   (`data_cancelamento IS NULL` e `status_atual` em *Ativo no Programa* / *Ativo - 2º Ciclo*),
   conta **tarefas de hoje / atrasadas / travadas / rotina diária não aberta**, monta um
   resumo em texto e chama `enfileirar_mensagem(...)`. Só enfileira quando há algo que
   valha a pena dizer (número ou decisão pendente).
2. **Digest semanal** (`digest_semanal_dono`) — nas segundas, monta o balanço da semana
   por cliente (**tarefas concluídas, sistemas novos, co-pilotos, economia registrada,
   decisões esperando**) e enfileira uma mensagem para a persona **"dono"**.
3. `enfileirar_mensagem()` **apenas grava** na fila `mensagens_saida`. Não envia.
4. Quem enviaria de verdade é o **worker** — a edge function `enviar-mensagens`
   (`supabase/functions/enviar-mensagens/index.ts`) — que drena a fila e chama a
   **Meta Cloud API** (WhatsApp).

---

## 3. Por que, na prática, nada sai daqui — as 3 travas

O pipeline está **dormente de propósito**. Há três "offs" **independentes**:

### Trava 1 — Opt-in com default FALSE
`enfileirar_mensagem` só enfileira se existir uma linha em `preferencias_notificacao`
para aquele cliente/persona, canal `whatsapp`, sem `optout_em`, com a flag do tipo
(`digest_diario` / `digest_semanal` / `eventos`) ligada. Como **ninguém consentiu**,
a função retorna `NULL` e grava zero. Também exige um telefone válido
(`contato_persona(...)` não nulo).

```
enfileirar_mensagem(cliente, persona, template, chave, variaveis, previa, tipo)
  → sem telefone?            retorna NULL
  → sem opt-in daquele tipo? retorna NULL
  → senão: INSERT em mensagens_saida (idempotente via chave_idem)
```

### Trava 2 — O worker não está agendado
**Não existe cron para `enviar-mensagens`** (só os dois de digest). A própria migration
de agendamento diz que como invocar o worker é "decisão em aberto" (poderia ser
`pg_cron` + extensão `http`, ou o agendador externo que já chama `sincronizar-reunioes`).
Ou seja: **a fila não é drenada automaticamente**.

### Trava 3 — O worker nasce em MODO SECO
Mesmo se alguém chamar o worker, sem `ENVIO_REAL=true` **e** as credenciais
`WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID`, ele **não chama provedor nenhum**: só marca
como enviado com `provedor='seco'` e devolve a **prévia** do que *teria* mandado.

---

## 4. Estado real observado (PROD, 2026-08-08)

- `digest-diario-guardiao` **rodou** nos últimos dias (05, 06 e 07/08 às 11:15 UTC),
  cada execução retornando normalmente.
- A tabela `mensagens_saida` tem **0 linhas**.
- Conclusão: roda todo dia de manhã e enfileira **nada** — exatamente o esperado
  enquanto o opt-in está desligado.

---

## 5. Peças do sistema (referência rápida)

| Peça | Onde | Papel |
|---|---|---|
| `digest_diario_guardiao(date)` | função no banco | monta e enfileira o resumo diário |
| `digest_semanal_dono(date)` | função no banco | monta e enfileira o balanço semanal |
| `enfileirar_mensagem(...)` | função no banco | gate de opt-in + INSERT na fila |
| `preferencias_notificacao` | tabela | consentimento por cliente/persona/canal/tipo |
| `mensagens_saida` | tabela | a fila (outbox) |
| `reservar_mensagens` / `concluir_mensagem` | funções | reserva atômica e baixa da fila |
| `enviar-mensagens` | edge function | worker que drena a fila e envia (ou modo seco) |
| `cron.job` (`digest-*`) | pg_cron | o relógio que dispara os digests |

---

## 6. O que faltaria para "ligar" de verdade (NÃO feito — só mapeamento)

> Cada passo abaixo é uma decisão consciente; hoje **nada disso está ativo**.

1. **Consentimento**: popular `preferencias_notificacao` (opt-in) para os clientes que
   toparem receber — senão os digests seguem enfileirando 0.
2. **Agendar o worker**: criar um job (pg_cron + `net.http_post`, como o
   `sincronizar-reunioes-hourly` já faz no PROD) para chamar `enviar-mensagens`
   periodicamente com o `CRON_INVOKE_TOKEN`.
3. **Sair do modo seco**: definir `ENVIO_REAL=true` + `WHATSAPP_TOKEN` +
   `WHATSAPP_PHONE_ID` nos secrets da edge function — e ter os **templates** aprovados
   na Meta (mensagem fora da janela de 24h exige template aprovado).

Recomendação de ordem segura: validar tudo em **modo seco** (conferindo as prévias em
`mensagens_saida`) antes de tocar em qualquer credencial de envio real.

---

## Nota sobre "drift" de migrations

O agendamento dos digests **existe e está ativo** no banco, mas a migration que o cria
(`20260725e_agendar_digests`) **não está registrada** no ledger `supabase_migrations`
de nenhum ambiente — foi aplicada sem registrar. É o mesmo padrão de drift observado em
outras migrations: **comparar por nome no ledger engana; confie no estado real dos
objetos** (aqui, `cron.job`).
