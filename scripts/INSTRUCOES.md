# Scripts - Instrucoes de Uso

## Pre-requisitos

- Node.js instalado
- Credenciais Google OAuth no arquivo `scripts/.env`:
  ```
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  ```
- Supabase configurado no `web/.env.local`:
  ```
  VITE_SUPABASE_URL=...
  VITE_SUPABASE_ANON_KEY=...
  ```

Todos os comandos devem ser executados a partir da pasta `scripts/`:
```
cd scripts
```

---

## Encontros ao Vivo (Multiplica)

Pipeline completo para importar e enriquecer os encontros ao vivo do programa PMC.

### 1. fetch-dono-calendar.mjs

**O que faz:** Busca TODOS os eventos de TODOS os calendarios da conta `dono@rafaelgaldino.com.br` via Google Calendar API e salva em `dono-events.json`.

**Quando usar:** Antes de importar ou atualizar encontros. Sempre que novos encontros forem agendados ou realizados no Google Calendar.

**Como rodar:**
```
node fetch-dono-calendar.mjs
```

**Na primeira execucao:** Abre o navegador para autorizar acesso ao Google Calendar. Fazer login com a conta `dono@rafaelgaldino.com.br`. O token e salvo em `.dono-token.json` para reuso automatico.

**Se o token expirar:** Apagar `.dono-token.json` e rodar novamente para re-autorizar.
```
rm .dono-token.json
node fetch-dono-calendar.mjs
```

**Saida:** `dono-events.json` com todos os eventos (incluindo o calendario "[PMC] AO VIVO COM GALDINO").

---

### 2. import-encontros-ao-vivo.mjs

**O que faz:** Le o `dono-events.json`, filtra os eventos do calendario "[PMC] AO VIVO COM GALDINO", classifica o tipo de cada encontro e insere/atualiza na tabela `encontros_ao_vivo` do Supabase.

**Classificacao automatica dos tipos:**
- Titulo contem "case" -> `multiplica_case`
- Titulo contem "dono" -> `multiplica_dono`
- Titulo contem "nivel 02" ou "nivel 2" -> `multiplica_time_nivel_2`
- Titulo contem "time" ou "nivel 01" -> `multiplica_time_nivel_1`
- Eventos antigos ("Mentoria em Grupo", "Treinamento") -> `multiplica_time_nivel_1`

**Status automatico:**
- Evento no passado -> `realizado`
- Evento no futuro -> `agendado`

**Modo preview (dry-run):**
```
node import-encontros-ao-vivo.mjs --dry-run
```
Mostra o que seria importado sem alterar o banco. Salva preview em `encontros-preview.json`.

**Modo real:**
```
node import-encontros-ao-vivo.mjs
```
Insere novos registros ou atualiza existentes (pelo `id_evento_google`). Pode ser executado varias vezes sem duplicar dados.

---

### 3. enrich-encontros-ao-vivo.mjs

**O que faz:** Para cada encontro ja realizado que tenha anexos no Google Calendar (gravacao MP4 e Anotacoes do Gemini), busca o conteudo do Google Doc via Google Docs API e atualiza a tabela com:
- `link_gravacao` - link do Drive para a gravacao
- `link_geminidoc` - link do Google Doc com anotacoes do Gemini
- `transcricao` - texto completo da transcricao (aba "Transcricao" do Gemini Doc)
- `resumo` - resumo extraido (aba "Observacoes" do Gemini Doc)
- `detalhes_encontro` - detalhes/topicos discutidos

**Quando usar:** Apos rodar o fetch + import, para preencher os campos de pos-encontro.

**Na primeira execucao:** Abre o navegador para autorizar com escopo adicional (Google Docs). Token salvo em `.dono-enrich-token.json`.

**Modo preview:**
```
node enrich-encontros-ao-vivo.mjs --dry-run
```

**Modo real:**
```
node enrich-encontros-ao-vivo.mjs
```

**Se o token expirar:**
```
rm .dono-enrich-token.json
node enrich-encontros-ao-vivo.mjs
```

---

### Pipeline completo (usar quando houver novos encontros)

```bash
# 1. Baixar eventos atualizados do Google Calendar
node fetch-dono-calendar.mjs

# 2. Importar/atualizar na tabela do Supabase
node import-encontros-ao-vivo.mjs

# 3. Enriquecer com gravacao, transcricao e resumo
node enrich-encontros-ao-vivo.mjs
```

---

## Reunioes Black CRM

### 4. fetch-blackcrm-calendar.mjs

**O que faz:** Busca eventos do calendario `especialistablackcrm@rafaelgaldino.com.br` e salva em `blackcrm-events.json`.

**Como rodar:**
```
node fetch-blackcrm-calendar.mjs
```

Token salvo em `.blackcrm-token.json`.

---

### 5. import-blackcrm-reunioes.mjs

**O que faz:** Le `blackcrm-events.json`, classifica tipo (implementacao/tutoria), identifica o responsavel (Ayslan/Leonardo), faz matching com clientes no Supabase e insere na tabela `reunioes_blackcrm`.

**Modo preview:**
```
node import-blackcrm-reunioes.mjs --dry-run
```

**Modo real:**
```
node import-blackcrm-reunioes.mjs
```

---

## Outros Scripts

### 6. fix-canal-de-venda.mjs

Script pontual para correcao de dados do campo `canal_de_venda` na tabela de clientes.

---

## Arquivos gerados (nao comitar)

| Arquivo | Descricao |
|---------|-----------|
| `.dono-token.json` | Token OAuth do calendario dono@ |
| `.dono-enrich-token.json` | Token OAuth com scope Google Docs |
| `.blackcrm-token.json` | Token OAuth do calendario blackcrm@ |
| `dono-events.json` | Eventos brutos do Google Calendar (dono@) |
| `blackcrm-events.json` | Eventos brutos do Google Calendar (blackcrm@) |
| `encontros-preview.json` | Preview do dry-run dos encontros |
| `blackcrm-import-preview.json` | Preview do dry-run do blackcrm |

Esses arquivos estao no `.gitignore` e nao devem ser comitados.
