# Port do "PMC · CS Manager" — estado e handoff

Documento de continuidade do port do CRM da Mayara para o painel admin do PMC OS.
Complementa `docs/crm-port-guia.md` (regras de adaptação) e a transcrição da
reunião em `docs/reuniao-crm.md`.

## Onde estamos

| Fase | Status | Commit |
| --- | --- | --- |
| 0 · Fundação (tokens, sidebar, 10 rotas) | ✅ | `ecdc2a4` |
| 1 · Schema no DEV (15 tabelas `crm_*`, view, RBAC) | ✅ | `fcb6e5f` |
| 2 · Camada de dados (localStorage → Supabase) | ✅ | `51397ca`, `b2d8188` |
| 3 · Abas núcleo (Meu Dia, Atividades, Clientes, Alertas) | ✅ | `69b16f8` + fixes |
| 4 · Abas de gestão (Visão Geral, Torre, Acompanhamento, Projetos, Manual) | ✅ | `6e7c6c7` |
| 5 · Atendimento (WhatsApp) | ✅ | `aef41a9` |
| 6 · Edge functions de IA (saudação, transcrição) | ✅ | `HEAD` |
| 7 · Backfill de datas + promoção DEV→PROD | ⬜ pendente | |

Tudo está **só no DEV** (`jkwpxttxkksqiffodonb`). O PROD (`hqczwextifessaztyyyk`)
não recebeu nenhuma migration deste trabalho. A rota `/crm` antiga
(`web/src/pages/crm.tsx`) segue no ar e só sai na Fase 7.

## Decisões tomadas (não reabrir sem falar com o David)

1. **Escopo**: port completo das 10 abas, incluindo Atendimento (UI + backend de
   conversas, sem provedor até os chips chegarem).
2. **Navegação**: grupo "CRM" na sidebar, uma rota por aba (`/crm/meu-dia`…).
   As chaves RBAC são a URL sem a barra (`crm/meu-dia`), então `secaoDaUrl` não
   precisou mudar.
3. **Backend**: reaproveitar `clientes_entrada_new`, `cliente_atividades` e as
   tabelas `reunioes_*`; criar `crm_*` só onde faltava.
4. **Início do ciclo** = data de entrada/onboarding (`clientes_entrada_new.data`).
   O David escolheu isso; a reunião apontava para a data da 1ª reunião com o
   Galdino, e a Mayara ia validar com ele. Se mudar, muda o cálculo de toda a
   carteira.

## Arquitetura em uma tela

```
web/src/lib/crm/
  storage.ts      barril — é o que os 23 componentes importam
  store.ts        dados e mutações (Supabase + React Query) + snapshot síncrono
  mappers.ts      tradução banco <-> domínio  ← onde mais deu problema
  derivados.ts    regras puras (ciclos, entregas, checkpoints)
  sessao.ts       quem é a pessoa e o que pode ver (auth + RBAC do PMC OS)
  equipe.ts       o time, vindo de `mentores`; useCsList() reativo
  jornada.ts, alertas-catalogo.ts, ciclo-entregas.ts, fechamento-ciclo.ts,
  preparacao.ts, format.ts, frases.ts, saudacoes.ts, rotinas.ts, preparacoes.ts
```

O truque central do port: `storage.ts` manteve a **mesma superfície de API** do
arquivo de 1.624 linhas do original, então a UI dela entrou quase sem edição.

## Gotchas que custaram caro (não repetir)

1. **CHECK constraints em `clientes_entrada_new`.** Oito colunas têm vocabulário
   próprio em snake_case (`nao_iniciado`, `em_negociacao`, `grupo_individual`),
   diferente dos rótulos da UI. Escrever o rótulo direto é rejeitado pelo banco.
   Os mapas bidirecionais estão em `mappers.ts`; o inverso é derivado do direto
   por `inverter()` para não saírem de sincronia.
2. **Regras de negócio leem de dentro do `Cliente`.** O motor de alertas usa
   `cliente.consultor_reunioes` / `ciclo_galdino_reunioes`, e a Visão Estratégica
   usa `historico_temperatura`. Como a fonte real são outras tabelas, `fetchClientes`
   anexa tudo (`anexarReunioes`, `anexarHistoricoTemperatura`). Esquecer isso não
   dá erro: dá número errado em silêncio (o alerta de Galdino disparava para 27 de
   27 clientes).
3. **`CS_LIST`/`PROFILE_LIST` são live bindings de módulo.** O React não sabe que
   mudaram. Em componente, use `useCsList()` de `equipe.ts`, e **ponha a lista nas
   dependências do `useMemo`**.
4. **`useProfile()` devolve `null` para a coordenação sem CS escolhida, e isso
   significa "todas as CSs"**. Nunca cair no nome de quem está logado: a Mayara e
   o Galdino não aparecem em `clientes_entrada_new.sc` e a tela zera.
   Para saudação/cabeçalho existe `useNomeExibicao()`.
5. **Nada de inventar dado para tapar buraco.** Sem data de entrada, o cliente é
   "Sem data de entrada" — não se usa `created_at` como substituto.
6. **Trava de duplicidade tem que ser do banco.** Verificar-e-depois-criar em
   código não sobrevive a duas execuções concorrentes.
7. **Data pura vira o dia anterior.** `new Date("2026-08-10")` é meia-noite
   UTC, ou seja, 21h do dia 9 no Brasil. As reuniões vêm de `crm_reunioes_v`
   como data pura, e isso zerava "Suas reuniões", "Reuniões hoje" da Torre e
   errava toda data exibida. Use `dataLocal()` de `format.ts` — nunca
   `new Date(reuniao.data)`.
8. **`execute_sql` roda tudo numa transação**: se a última instrução falha, as
   anteriores revertem. Conferir o efeito depois, não confiar no "sucesso".

## Ambiente

- DEV `jkwpxttxkksqiffodonb`; `npm run dev` em `web/` já aponta para lá.
- Login de teste: `dono@rafaelgaldino.com.br` / `dev123456` (super_admin).
- Seed: `scripts/seed-crm-dev.sql` (+ `-limpar.sql`). 41 clientes cobrindo os 4
  trimestres, pós-programa, pré-jornada e casos sem data; ~200 atividades em
  todos os status; reuniões com e sem os limiares dos alertas; gargalos, projetos
  e manual. Dados **gerados**, nunca copiados do PROD.
  `scripts/seed-crm-dev-conversas.sql` (rodar depois do anterior) acrescenta 22
  grupos de WhatsApp com ~235 mensagens. O silêncio de cada grupo é contado em
  horas ÚTEIS, então as bordas amarela/vermelha da lista dependem do dia da
  semana em que o seed roda — rodando na segunda, os silêncios curtos somem no
  fim de semana. Por isso há dois grupos com silêncio de 76h e 100h.
- As 4 CSs de teste (Danielly, Geovana, Gabriela, Francielly) existem em
  `mentores` com e-mails `@dev.local` e papel `cs`. O trigger `tg_mentores_guard`
  impede criar papel privilegiado fora de sessão de super admin.
- Verificação no navegador: use o **menu**, não URL direta — ver limitação 1 abaixo.
- **IA**: as duas edge functions usam o mesmo resolvedor da `metodo-ia`
  (`_shared/llm-chat.ts`): `LOVABLE_API_KEY` → `OPENAI_API_KEY` → `LLM_API_KEY`,
  com `LLM_BASE_URL`/`LLM_MODEL` opcionais. O plano antigo dizia "usar o modelo
  Claude padrão do repo", mas o repo não tem esse padrão: fora o agente-chat,
  tudo passa por provedor OpenAI-compatible. Sem chave configurada, a saudação
  cai na frase local e a análise de transcrição devolve erro explicando.

## Pendências que dependem do David / da Mayara

1. **Redistribuir os 52 clientes ativos que ainda estão com a Fernanda**, que saiu
   do time. Sem isso eles não aparecem no "Meu Dia" de ninguém.
2. **Danielly entra em `mentores` no PROD?** Existe no mock da Mayara, não no banco.
3. **"Novo Cliente" dentro do CRM** ou aponta para o cadastro que já existe no
   PMC OS? O botão foi removido no port (não há `createCliente`, e
   `clientes_entrada_new` é a tabela mestre).
4. **Projeto sem tela para definir responsável e prazo** — o modal diz "o time
   define depois", mas essa tela não existe. Vem do original.
5. **Gargalo tem `pessoas_atribuidas` no banco sem UI para preencher.**
6. **Regra "não sugerir consultor antes do Galdino"** não é explícita no catálogo
   de alertas. Funciona por acidente para cliente novo. Depende da definição de
   início de ciclo.
7. **Envio de mensagem pelo Atendimento está desligado** (`ENVIO_HABILITADO`
   em `lib/crm/conversas.ts`), e não há webhook de entrada: as conversas só
   aparecem se alguém escrever em `crm_conversas`/`crm_mensagens`. Falta
   decidir o provedor (chips estavam sendo comprados em 05/08) e quem vincula
   `crm_conversas.id_cliente` ao cliente certo — a lista mostra no rodapé
   quantos grupos ficaram sem vínculo.
8. **Mudança de temperatura e pausa de cliente não têm UI** (`updateClienteTemperatura`
   e `setClientePausado` existem e ninguém chama). Enquanto isso, o histórico de
   temperatura fica vazio e a Visão Estratégica não tem o que mostrar.

## Limitações conhecidas do ambiente (anteriores a este trabalho)

1. **Entrar por URL direta numa rota admin redireciona para a home.** O
   `RequireSecao` avalia `isAdmin` antes do papel resolver. Afeta o painel
   inteiro, não só o CRM. Pelo menu funciona.
2. **`mentores.papel` não tem FK para `papeis`**, então o embed
   `papeis(is_full)` do PostgREST não resolve.
3. **`clientes_entrada_new.sc` é texto livre**: cliente com `sc` vazio ou grafado
   diferente de `mentores.nome` conta nos totais mas some das tabelas por CS.

## O que falta nas próximas fases

**Fase 7 — Backfill e promoção**
- Backfill de `clientes_entrada_new.data`: **141 de 301 clientes sem data no
  PROD, 103 deles ativos**. Derivar da 1ª reunião registrada (Galdino →
  consultor → BlackCRM), marcando `data_backfilled = true`. Script revisável em
  `scripts/`, não migration. Rodar no DEV e conferir a distribuição de
  trimestres antes do PROD.
- Promover as 10 migrations `20260810_crm_*` e as duas edge functions
  (`crm-saudacao`, `crm-analisar-transcricao`) para o PROD. As funções precisam
  de uma chave de IA nos secrets — ver "IA" abaixo.
- Remover `web/src/pages/crm.tsx` e a rota `/crm` antiga.
