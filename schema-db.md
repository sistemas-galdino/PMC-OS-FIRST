# Black Eagle — Estrutura Oficial do Banco (Supabase)

Banco oficial: **Supabase**
Fonte da verdade: Supabase
Automações: n8n

---

# 1. Tabela: clientes_formulario

## Descrição

Armazena dados brutos provenientes do Google Forms preenchido após pagamento.

Origem:
Google Forms → Google Sheets → n8n → Supabase

## Chave principal

* `id_cliente` (text) — identificador do cliente

## Colunas

### Identificação e contrato

* id_cliente (text)
* contrato_emitido_para (text)
* created_at (timestamp como string)

### Dados comerciais

* canal_venda (numeric)
* produto (numeric)
* tempo_contrato_meses (numeric)
* mes_treinamento (numeric)
* ano_treinamento (numeric)
* unidade (numeric)

### Empresa

* empresa_nome (text)
* nicho (text)
* estado (text)
* site (text)
* instagram (text)
* descricao (text)
* numero_funcionarios (text)
* cargos_gestao (text)
* faturamento_atual (text)
* meta_faturamento_12_meses (numeric)

### Marca e posicionamento

* referencia_posicionamento (text)

### Documentos

* cpf (text)
* cnpj (text)
* razao_social (text)

### Dados pessoais

* nome (text)
* genero (text)
* email (text)
* telefone (text)
* data_nascimento (text)
* estado_civil (text)
* faixa_etaria (text)
* formacao_academica (text)
* nacionalidade (numeric)
* profissao (numeric)
* endereco (text)

### Diagnóstico estratégico

* desafios (text)
* motivo_impedimento (text)
* como_conheceu (text)
* motivo_entrada (text)
* entregas_determinantes (text)
* resultado_desejado (text)
* ajuda_3_meses (text)

### Campos derivados

* nome_empresa_formatado (text)
* nome_cliente_formatado (text)

---

# 2. Tabela: clientes_entrada

## Descrição

Tabela estruturada e limpa para operação interna.

Origem:
Automação a partir de clientes_formulario.

## Chaves

* id_entrada (integer, incremental)
* id_cliente (text) — referência lógica ao clientes_formulario

## Colunas

* id_cliente (text)
* data (text)
* canal_de_venda (text)
* tempo_contrato (numeric)
* estado_uf (text)
* unidade_treinamento (text)
* produto (text)
* nome_cliente (text)
* nome_empresa (text)
* status_atual (text)
* telefone (text)
* sc (text) — responsável sucesso do cliente
* nicho (text)
* subnicho (text)
* motivo_cancelamento (numeric)
* cnpj (numeric)
* nome_cliente_formatado (text)
* nome_empresa_formatado (text)

---

# 3. Tabela: reunioes_mentoria

## Descrição

Armazena registros de todas as reuniões agendadas com mentores.

Origem:
Google Agenda → n8n → Supabase

## Chaves

* id_unico (text)
* id_reuniao (text)
* id_cliente (text) — relacionamento lógico com clientes_formulario

## Colunas Automáticas (no agendamento)

* mes (numeric)
* semana (numeric)
* ano (numeric)
* mentor (text)
* empresa (text)
* pessoa (text)
* data_reuniao (text)
* horario (text)
* inicio_semana (text)
* fim_semana (text)
* created_at (text)
* nome_empresa_formatado (text)

## Colunas Pós-Reunião (enriquecimento)

* cliente_compareceu (text)
* nps (numeric)
* transcricao (text)
* resumo (text)
* acoes_cliente (text)
* acoes_mentor (text)
* ganho (numeric)
* cnpj (numeric)

---

# 4. Tabela: reunioes_blackcrm

## Descrição

Armazena registros de reuniões de implementação e tutoria do Black CRM, conduzidas por Ayslan e Leonardo.

Origem:
Google Agenda (especialistablackcrm@rafaelgaldino.com.br) → Script → Supabase

## Chave principal

* id_unico (text) — identificador único da reunião

## Colunas

### Identificação

* id_unico (text) — PK
* id_reuniao (text) — ID do evento no Google Calendar
* id_cliente (text) — referência lógica ao clientes_formulario
* codigo_cliente (numeric) — código do cliente

### Empresa

* empresa (text) — nome extraído do evento do calendário
* nome_empresa_formatado (text) — nome da empresa no banco

### Temporal

* data_reuniao (text) — data da reunião (DD/MM/YYYY)
* horario (text) — horário (HH:MM)
* mes (numeric) — mês
* semana (numeric) — número da semana
* ano (numeric) — ano
* inicio_semana (text) — início da semana
* fim_semana (text) — fim da semana

### Classificação

* tipo_reuniao (text) — 'implementacao' ou 'tutoria'
* responsavel (text) — quem conduziu (Ayslan ou Leonardo)

### Pós-Reunião (enriquecimento)

* nps (numeric) — nota NPS (1-10)
* transcricao (text)
* transcricao_md (text)
* resumo (text)
* resumo_json (text)
* acoes (text)
* link_gravacao (text)
* link_geminidoc (text)

### Matching

* status_match (text) — 'Identificado' ou 'Nao identificado'
* metodo_match (text) — método usado para match
* observacoes (text)
* created_at (text)

---

# Relações Lógicas

clientes_formulario.id_cliente
→ clientes_entrada.id_cliente
→ reunioes_mentoria.id_cliente
→ reunioes_blackcrm.id_cliente

Não há foreign key explícita, mas existe dependência lógica.

