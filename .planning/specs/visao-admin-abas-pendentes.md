# Visão Admin do cliente — Handoff das abas pendentes

> Documento criado em **2026-05-08** pra ser retomado depois de `/compact`.
> Caminho da feature: `/cliente/:id?aba=...` (Visão Admin) coexistindo com Visão Operacional via toggle persistido em localStorage.

---

## Estado atual (já entregue)

### Estrutura
- `web/src/pages/client-profile.tsx` — shell com toggle Admin/Operacional.
- `web/src/pages/client-profile-admin.tsx` — container da Visão Admin: header executivo + 11 tabs (Tabs do shadcn, query param `?aba=`, default `programa`).
- `web/src/pages/client-profile-operational.tsx` — extração 1:1 das 14 abas antigas (Dashboard, Mapeamento, Indicadores, etc).
- `web/src/components/client-profile/executive-summary-header.tsx` — header com 6 KPIs + card "Próxima Ação" (placeholder).
- `web/src/components/client-profile/admin-tabs/_placeholder.tsx` — `<EmptyTabPlaceholder>` reusável.
- `web/src/components/client-profile/admin-tabs/tab-*.tsx` — 11 arquivos (1 por aba).

### Header executivo (já plugado)
| KPI | Fonte |
|---|---|
| Reuniões Galdino X/12 | count em `reunioes_galdino` (`cliente_compareceu=true`); total = constante 12 (TODO dinâmico) |
| Próx. Galdino | min(`data_reuniao`) > now em `reunioes_galdino` |
| Reuniões Consultor | count em `reunioes_mentoria_new` (`cliente_compareceu=true`) |
| Última Consultor | max(`data_reuniao`) ≤ now em `reunioes_mentoria_new` (`cliente_compareceu=true`) |
| Black CRM Ativa | `clientes_entrada_new.tem_conta_blackcrm == 'sim'` (com fallback `tem_crm`) |
| Contas Black CRM | `clientes_entrada_new.quantas_contas_blackcrm` |
| Próxima Ação | placeholder `—` |

**Bug do timezone resolvido**: datas DATE-only (`YYYY-MM-DD`) parseadas manualmente pra evitar regressão de -1 dia no fuso BR.

### Abas implementadas (4 de 11)
1. **Perfil** — `tab-perfil.tsx`. Cadastro (codigo_cliente readonly, empresa, contato, nicho, subnicho, sc dropdown, data_entrada) + Estado (status_atual, saude_cliente, temperatura_cliente, em_risco_cancelamento, observacoes_cs).
2. **Programa** — `tab-programa.tsx`. 5 dropdowns (tem_guardiao_ia, presenca_treinamentos, reuniao_consultores_status, reuniao_galdino_status, frequencia_grupo_whatsapp) + dados Guardião IA (nome, telefone com botão WhatsApp wa.me, cargo).
3. **Black CRM** — `tab-black-crm.tsx`. 11 campos completos (5 dropdowns + 6 textos/contadores).
4. **Vitórias** — `tab-vitorias.tsx`. Reaproveita `<VitoriasPage clientId={id} />` existente.

### Padrões usados nas abas
- Form pattern: `snapshot` + `form` state, `dirty` via comparação shallow, botões `Salvar` (`!dirty || saving`) e `Descartar`.
- Mensagens: `error` (border-destructive) + `success` (some em 3s).
- Dropdowns shadcn `<Select>` com sentinel `__none__` pra valor vazio.
- Layout: `Card` com `CardHeader` + `CardTitle` (ícone + texto), `CardContent` com `grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4`.
- Linhas full-width: `<div className="lg:col-span-2"><Field>...</Field></div>`.
- Migrations: nullable + DEFAULT seguros, em `clientes_entrada_new` com CHECK enum.
- `tem_crm` legado é sincronizado quando `tem_conta_blackcrm` muda (compatibilidade com listagem em `/clientes`).

### Memória / decisões persistidas
- Login admin = `dono@rafaelgaldino.com.br` (senha `1234`).
- Cliente demo = uuid `3557444d-8deb-4b34-a02d-4c10f6a3986e` (DemoStore Brasil, código 316, `tem_crm=true`).
- Project ID Supabase = `hqczwextifessaztyyyk` (PMC-OS-V2).
- Sempre commit após cada mudança de código.
- Aba **Histórico** ainda não foi especificada (segue placeholder).
- Aba **Cancelamento** será especificada agora junto com as outras 5.

---

## Pendentes (6 abas + 1 sem spec)

### 1. Aba **Ciclo Galdino**

Mockup mostra 5 KPIs em linha + texto explicativo. Conceitualmente é uma "barra de progresso" do ciclo do cliente.

**Layout**: 1 Card com 5 valores grandes lado a lado:
| Métrica | Cor | Cálculo |
|---|---|---|
| Total | branco | `12` (constante, ou puxar de campo configurável) |
| Realizadas | verde | `count(reunioes_galdino) where id_cliente=:id and cliente_compareceu=true` |
| Pendentes | amarelo | `Total - Realizadas` |
| Próxima agendada | branco | `min(data_reuniao) > now()` formato `dd/MM` |
| Data ideal próxima (+3m) | verde | Calculado a partir de `cliente_informacoes_empresa.data_entrada` + `realizadas * 3 meses` |

**Texto inferior**: "Cadência ideal: 1 reunião a cada 3 meses. Defina a data de entrada do cliente para sugerir a próxima reunião."

Não tem formulário aqui — só leitura. Apenas reaproveita queries que já existem no header executivo.

### 2. Aba **Consultores**

**Sem o botão "Registrar nova reunião"** — só leitura.

**Layout**:
- Header com 5 KPIs em linha:
  - Total de reuniões = `count(reunioes_mentoria_new) where id_cliente=:id`
  - Última reunião = `max(data_reuniao)` formato `dd/MM/yy`
  - Consultor + acionado = mentor que aparece mais vezes (mode da coluna `mentor`)
  - Frequência média = média de dias entre reuniões (ou "—" se ≤1)
  - Próxima agendada = `min(data_reuniao) > now()` formato `dd/MM/yy`
- Lista vertical das reuniões já realizadas (descendente por data):
  - Avatar circular com ordinal (1ª, 2ª, 3ª) à esquerda
  - Nome do mentor + badge "Realizada" (verde) ou "Faltou" (vermelho)
  - Ícone calendário + data formatada `dd/MM/yyyy`
  - Ícone trash vermelho à direita (admin-only) — abre confirm dialog antes de DELETE em `reunioes_mentoria_new` por `id_unico`

**Tabela usada**: `reunioes_mentoria_new` (já existe, PK = `id_unico`).

### 3. Aba **Atividades**

Tabela nova: `cliente_atividades`.

**Migration**:
```sql
CREATE TABLE cliente_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL REFERENCES clientes_entrada_new(id_cliente) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  tipo text,                      -- 'multiplica_time','enviar_passos','outro',...
  tipo_outro text,                -- usado quando tipo='outro'
  entrega_relacionada text,
  entrega_outro text,
  prioridade text CHECK (prioridade IN ('baixa','media','alta')) DEFAULT 'media',
  prazo date,
  status text CHECK (status IN ('pendente','em_andamento','impedido','concluido')) DEFAULT 'pendente',
  responsavel_cs text,            -- 'Geovana','Francielly','Gabriela','Fernanda'
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cliente_atividades_id_cliente_idx ON cliente_atividades(id_cliente);
-- RLS: admin-only (mentor)
ALTER TABLE cliente_atividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "atividades_admin" ON cliente_atividades FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
```

> **Atualizar contador** da aba header (`Atividades (1)`) lendo count de pendentes de `cliente_atividades`. Hoje vem hardcoded `(1)` no `client-profile-admin.tsx`.

**Layout** (lista):
- Header: "Atividades do cliente" + botão "Nova atividade" (amarelo).
- Cada card de atividade:
  - Título grande + descrição em cinza
  - Linha com ícones inline:
    - 📋 + texto do tipo (ex.: "Enviar próximos passos")
    - Badge do tipo (ex.: "Multiplica Time")
    - 📅 + data prazo, **vermelho se atrasada** (`prazo < hoje && status != concluido`)
    - 👤 + responsavel_cs
  - Observações em itálico cinza
  - Direita: badge prioridade ("Média") em cima, dropdown status ("Impedido") inline no card pra editar rápido, botão "Excluir" vermelho embaixo.

**Modal "Nova atividade — <empresa>"**:
- Título * (input)
- Descrição (textarea)
- Tipo (dropdown) + se "Outro", input "Especifique o tipo"
  - Opções a confirmar com user. Sugestão: `Multiplica Time`, `Enviar próximos passos`, `Reunião externa`, `Follow-up`, `Documento`, `Outro`.
- Entrega relacionada (dropdown) + se "Outro", input "Especifique a entrega"
  - Opções a confirmar com user. Sugestão: `Mapeamento`, `Indicadores`, `Trilha`, `Reunião Galdino`, `Outro`.
- Prioridade (dropdown): Baixa / Média / Alta
- Prazo (date)
- Status (dropdown): Pendente / Em andamento / Impedido / Concluído
- Responsável CS (dropdown): Geovana / Francielly / Gabriela / Fernanda
- Observações (textarea)
- Botão "Criar atividade" (amarelo)

> **Decisões pendentes do user**:
> - Confirmar opções de **Tipo** e **Entrega relacionada** (atualmente só temos "Outro" no mockup).

### 4. Aba **Renovação**

Migration: adicionar 4 colunas em `clientes_entrada_new` (ou tabela nova `cliente_renovacao` se preferir histórico — provavelmente uma renovação por vez é OK em coluna).

**Sugerido**: colunas em `clientes_entrada_new`:
```sql
ALTER TABLE clientes_entrada_new
  ADD COLUMN renovacao_data date,
  ADD COLUMN renovacao_valor numeric(12,2),
  ADD COLUMN renovacao_status text CHECK (renovacao_status IN ('ainda_distante','em_negociacao','confirmada','recusada','em_risco')),
  ADD COLUMN renovacao_observacoes text;
```

**Layout** (1 card "Renovação"):
- Data de renovação (date) | Valor (R$) (input number)
- Status da renovação (dropdown — full width? Ou meia)
- Observações sobre renovação (textarea full width)

> **Decisão pendente do user**: confirmar opções do dropdown "Status da renovação". Sugestão: `Ainda distante`, `Em negociação`, `Confirmada`, `Recusada`, `Em risco`. (No mockup só vimos "Ainda distante".)

### 5. Aba **Comunicação**

Migration: adicionar 4 colunas em `clientes_entrada_new`:
```sql
ALTER TABLE clientes_entrada_new
  ADD COLUMN comunicacao_preferencia text CHECK (comunicacao_preferencia IN ('nao_definido','privado','grupo_individual','grupo_geral','misto')),
  ADD COLUMN comunicacao_canal text CHECK (comunicacao_canal IN ('whatsapp','ligacao','audio_whatsapp','mensagem_texto','outro')),
  ADD COLUMN comunicacao_restricoes text,
  ADD COLUMN comunicacao_resumo text;
```

**Layout** (1 card "Comunicação ideal com o cliente" + descrição):
- Preferência de comunicação (dropdown):
  - Não definido / Privado (WhatsApp pessoal) / Grupo individual do cliente / Grupo geral com o time / Misto (privado + grupo)
- Canal preferido (dropdown):
  - WhatsApp / Ligação / Áudio (WhatsApp) / Mensagem de texto / Outro
- Restrições / o que NÃO falar no grupo geral (textarea full-width)
- Resumo da comunicação ideal (escreva aqui o contexto) (textarea full-width)

### 6. Aba **Cancelamento**

Tabela nova: `cliente_cancelamento`.

**Migration**:
```sql
CREATE TABLE cliente_cancelamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid UNIQUE NOT NULL REFERENCES clientes_entrada_new(id_cliente) ON DELETE CASCADE,
  motivos text[] NOT NULL DEFAULT '{}',  -- {financeiro,falta_tempo,nao_viu_valor,problemas_internos,nao_se_adaptou,falta_implementacao,problema_equipe,expectativa_desalinhada,outro}
  responsabilidade text,                 -- a confirmar opções com user
  tentativa_reversao boolean NOT NULL DEFAULT false,
  resumo_ocorrido text,
  data_cancelamento date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cliente_cancelamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cancelamento_admin" ON cliente_cancelamento FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
```

**Layout** (card "Estrutura de cancelamento" com ícone X vermelho):
- **Motivos (multi-seleção)** — checkboxes (não radio):
  - Financeiro / Falta de tempo / Não viu valor / Problemas internos / Não se adaptou à mentoria / Falta de implementação / Problema com equipe / Expectativa desalinhada / Outro
- **Responsabilidade do cancelamento** (dropdown) → opções a confirmar com user. Sugestão: `Cliente`, `PMC`, `Compartilhada`, `Externo`.
- **Tentativa de reversão** (dropdown Sim/Não, default Não)
- **Resumo do ocorrido / contexto** (textarea full-width)
- **Data do cancelamento** (date, default hoje)
- Botão **"Registrar cancelamento"** (vermelho, full-width). Ao clicar:
  - Faz upsert em `cliente_cancelamento`
  - Atualiza `clientes_entrada_new.status_atual = 'Cliente Cancelado'`

> **Decisões pendentes do user**:
> - Confirmar opções do dropdown "Responsabilidade do cancelamento".

### 7. Aba **Histórico** (sem spec)

Continua placeholder. Conteúdo a ser definido pelo user em iteração futura (provavelmente timeline cronológica de entradas, mudanças de status, atividades, vitórias, reuniões).

---

## Decisões pendentes pra próxima sessão (perguntar antes do plano final)

1. **Atividades** — opções de **Tipo** e **Entrega relacionada** (mockup só mostra "Outro").
2. **Renovação** — opções do dropdown "Status da renovação" (mockup só mostra "Ainda distante" como default).
3. **Cancelamento** — opções de "Responsabilidade do cancelamento" (mockup mostra "Selecionar..." vazio).
4. **Cancelamento** — quando registrar, devo só atualizar `status_atual`, ou também `nivel_engajamento='cancelado'` + `temperatura_cliente='frio'`?
5. **Atividades** — o contador `(1)` na label da aba deve refletir todas, só pendentes, ou só atrasadas?
6. **Histórico** — quando o user vai querer especificar?

---

## Padrões a seguir (heads-up pra próxima sessão)

- Memória `feedback_commit_after_changes.md` exige commit a cada mudança.
- Ao adicionar novas migrations, aplicar via `mcp__supabase__apply_migration` E criar arquivo em `supabase-migrations/<YYYYMMDD>_<nome>.sql` com mesmo conteúdo.
- Usar `Tabs` shadcn (não buttons), `Select` com sentinel `__none__`, `Card` com hover-translate-y-0.
- Smoke test sempre via Playwright MCP no porto 5174 (5173 fica preso entre runs).
- TypeScript build via `cd web && npx tsc -b`.
- **Hoje**: 2026-05-08.
