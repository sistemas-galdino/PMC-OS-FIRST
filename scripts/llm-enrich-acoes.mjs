// Fase B: aplica o prompt padrão de análise de reuniões (ver memória em
// reference_meeting_analysis_prompt.md) em cada transcrição da semana e grava
// ganho / acoes_cliente / acoes_mentor / cliente_compareceu no banco.
//
// Requer OPENAI_API_KEY em scripts/.env (ou variável de ambiente).
// Uso:
//   node llm-enrich-acoes.mjs --dry-run              # só imprime
//   node llm-enrich-acoes.mjs                        # grava no banco
//   node llm-enrich-acoes.mjs --from 2026-04-06 --to 2026-04-12
//   node llm-enrich-acoes.mjs --model gpt-4o         # override modelo
//   node llm-enrich-acoes.mjs --limit 3              # só N reuniões (teste)
//   node llm-enrich-acoes.mjs --force                # re-processa quem já tem ganho

import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = join(__dirname, '.env')
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=')
    if (key && val.length) process.env[key.trim()] = val.join('=').trim()
  })
}
const envRaw = readFileSync(join(__dirname, '../web/.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=')).map(l => {
    const idx = l.indexOf('=')
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const OPENAI_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_KEY) {
  console.error('❌ Defina OPENAI_API_KEY em scripts/.env ou exporte na shell.')
  process.exit(1)
}

function getArg(name, dflt) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return dflt
  return process.argv[idx + 1]
}
const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')
const FROM = getArg('from', '2026-04-06')
const TO = getArg('to', '2026-04-12')
const MODEL = getArg('model', 'gpt-4o-mini')
const LIMIT = parseInt(getArg('limit', '9999'), 10)

const PROMPT_SISTEMA = `Você é um consultor estratégico especialista em marketing, crescimento empresarial e implementação de inteligência artificial.

Analise a transcrição da reunião de mentoria abaixo e gere três resultados:
1) Os ganhos da reunião para o cliente
2) As ações que o cliente deve executar
3) As ações que o mentor deve executar

REGRAS IMPORTANTES
- As ações devem ser tarefas práticas e executáveis.
- O status das tarefas deve iniciar sempre como "A fazer".
- Caso o responsável não esteja explícito, considere "Cliente".
- O ganho_reuniao deve explicar o principal avanço ou benefício conquistado pelo cliente nesta reunião.

Antes de gerar qualquer resultado, analise se a reunião realmente aconteceu.
Considere que NÃO houve reunião se:
- Não houver interação entre duas partes.
- A transcrição mostrar apenas o mentor aguardando.
- Não houver discussão estratégica real.
- Não houver troca de informações ou decisões.

Se a reunião NÃO aconteceu:
- Defina "reuniao_realizada": false
- Explique o motivo em "motivo_nao_realizada"
- Deixe ganho_reuniao vazio
- Retorne arrays vazios em acoes_cliente e acoes_mentor

Se a reunião aconteceu normalmente:
- Defina "reuniao_realizada": true
- Deixe "motivo_nao_realizada" vazio
- Gere ganho e ações normalmente

Se não houver prazo explícito mencionado na transcrição, deixe o campo prazo como string vazia "".

Responda SEMPRE em JSON no formato:
{
  "reuniao_realizada": boolean,
  "motivo_nao_realizada": string,
  "ganho_reuniao": string,
  "acoes_cliente": [{"acao": string, "prazo": string, "status": "A fazer"}],
  "acoes_mentor": [{"acao": string, "prazo": string, "status": "A fazer"}]
}`

async function callOpenAI(transcricao, contexto) {
  const userMsg = `Contexto: ${contexto}\n\n--- TRANSCRIÇÃO ---\n${transcricao}`
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PROMPT_SISTEMA },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.2,
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`OpenAI ${res.status}: ${t}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Resposta OpenAI sem content')
  return JSON.parse(content)
}

async function processaTabela(tabela) {
  console.log(`\n📁 ${tabela}`)
  let query = supabase
    .from(tabela)
    .select('id_reuniao, empresa, transcricao')
    .gte('data_reuniao', FROM)
    .lte('data_reuniao', TO)
    .not('transcricao', 'is', null)

  if (!FORCE) query = query.is('ganho', null)

  const { data: rows, error } = await query
  if (error) { console.log(`   ❌ ${error.message}`); return { ok: 0, fail: 0 } }
  console.log(`   📊 ${rows.length} reuniões a processar`)

  let ok = 0, fail = 0
  for (const row of rows.slice(0, LIMIT)) {
    const contexto = `Empresa do cliente: ${row.empresa || 'N/A'}.`
    const transcr = row.transcricao.length > 120000 ? row.transcricao.slice(0, 120000) + '\n[...truncada]' : row.transcricao
    process.stdout.write(`   ▶ ${row.id_reuniao} (${row.empresa || 'sem empresa'}, ${row.transcricao.length} chars) ... `)
    try {
      const result = await callOpenAI(transcr, contexto)
      const update = {
        cliente_compareceu: !!result.reuniao_realizada,
        ganho: result.ganho_reuniao || '',
        acoes_cliente: result.acoes_cliente || [],
        acoes_mentor: result.acoes_mentor || [],
      }
      if (DRY_RUN) {
        console.log('🔍 DRY')
        console.log('      →', JSON.stringify(update).slice(0, 200))
      } else {
        const { error } = await supabase.from(tabela).update(update).eq('id_reuniao', row.id_reuniao)
        if (error) { console.log(`❌ update: ${error.message}`); fail++; continue }
        console.log(`✅ (${result.reuniao_realizada ? 'ok' : 'não realizada'})`)
      }
      ok++
    } catch (err) {
      console.log(`❌ ${err.message}`)
      fail++
    }
  }
  return { ok, fail }
}

async function main() {
  console.log(`=== LLM enrich ações ${DRY_RUN ? '(DRY RUN)' : ''} ===`)
  console.log(`Modelo: ${MODEL} | Janela: ${FROM} → ${TO} | Force: ${FORCE}\n`)

  const totals = { ok: 0, fail: 0 }
  for (const tabela of ['reunioes_galdino', 'reunioes_blackcrm', 'reunioes_mentoria_new']) {
    const r = await processaTabela(tabela)
    totals.ok += r.ok
    totals.fail += r.fail
  }
  console.log(`\n=== Resumo ===`)
  console.log(`✅ OK: ${totals.ok} | ❌ Falhas: ${totals.fail}`)
}

main().catch(err => { console.error('❌', err.stack || err.message); process.exit(1) })
