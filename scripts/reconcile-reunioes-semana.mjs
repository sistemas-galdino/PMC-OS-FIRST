// Reconcilia eventos do Google Calendar (semana 06/04–12/04) ↔ Supabase.
// Classifica cada evento em OK / Incompleta / Faltante e gera relatório markdown.
// Uso: node reconcile-reunioes-semana.mjs [--from 2026-04-06] [--to 2026-04-12]

import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envRaw = readFileSync(join(__dirname, '../web/.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=')).map(l => {
    const idx = l.indexOf('=')
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

function getArg(name, dflt) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return dflt
  return process.argv[idx + 1]
}

const FROM = getArg('from', '2026-04-06')
const TO = getArg('to', '2026-04-12')
const FROM_ISO = `${FROM}T00:00:00-03:00`
const TO_ISO = `${TO}T23:59:59-03:00`

// ---------- Helpers ----------
function normalize(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function loadEvents(file) {
  const p = join(__dirname, file)
  if (!existsSync(p)) return []
  return JSON.parse(readFileSync(p, 'utf8'))
}

function inWeek(event) {
  const start = event.start?.dateTime || event.start?.date
  if (!start) return false
  const d = new Date(start)
  return d >= new Date(FROM_ISO) && d <= new Date(TO_ISO)
}

function extractCodigoCliente(description) {
  if (!description) return null
  const clean = description.replace(/<[^>]+>/g, ' ')
  // Padrão novo (form com campo "Qual o seu ID?"): ID depois do fecha-parênteses do exemplo
  const m1 = clean.match(/Qual o seu ID[^)]*\)\s*(\d{2,5})/i)
  if (m1) return parseInt(m1[1], 10)
  // Padrões antigos (raros)
  const m2 = clean.match(/#\s*(\d{2,5})/)
  if (m2) return parseInt(m2[1], 10)
  return null
}

// ---------- Classificação por agenda ----------

// Dono → reunioes_galdino (mentoria 1:1 do Galdino com cliente)
function classifyDonoEvent(event) {
  if ((event._calendarName || '').includes('AO VIVO COM GALDINO')) return null
  const title = event.summary || ''
  // Padrões específicos de 1:1 do Galdino com cliente
  const patterns = [
    /PMC\s*-\s*Reuni[aã]o Individual\s*-\s*Rafael\s+Galdino/i,
    /PMC\s*-\s*Reuni[aã]o Individual\s+Galdino/i,
  ]
  if (!patterns.some(p => p.test(title))) return null
  return 'reunioes_galdino'
}

// BlackCRM → reunioes_blackcrm (implementação ou tutoria)
function classifyBlackCrmEvent(event) {
  const t = (event.summary || '').toLowerCase()
  if (t.includes('tutoria')) return { table: 'reunioes_blackcrm', tipo: 'tutoria' }
  if (t.includes('implement') || t.includes('implant')) return { table: 'reunioes_blackcrm', tipo: 'implementacao' }
  return null
}

// Mentor/Mentores → reunioes_mentoria_new (só padrões explícitos de agenda de mentor)
function classifyMentorEvent(event) {
  const t = event.summary || ''
  const patterns = [
    /\[PMC\]\s*Acompanhamento com Mentor/i,
    /\[PMC\]\s*Mentor Tr[aá]fego Pago/i,
  ]
  if (!patterns.some(p => p.test(t))) return null
  return 'reunioes_mentoria_new'
}

// ---------- Main ----------
async function main() {
  console.log(`=== Reconciliação Reuniões ${FROM} → ${TO} ===\n`)

  // 1. Carregar eventos de cada arquivo
  const donoEvents = loadEvents('dono-events.json').filter(inWeek)
  const blackcrmEvents = loadEvents('blackcrm-events.json').filter(inWeek)
  const mentorEvents = loadEvents('mentor-events.json').filter(inWeek)
  const mentoresEvents = loadEvents('mentores-events.json').filter(inWeek)

  console.log(`📅 Eventos da semana:`)
  console.log(`   dono@     : ${donoEvents.length}`)
  console.log(`   blackcrm@ : ${blackcrmEvents.length}`)
  console.log(`   mentor@   : ${mentorEvents.length}`)
  console.log(`   mentores@ : ${mentoresEvents.length}\n`)

  // Dedup global por event.id (mesmo evento pode aparecer em múltiplos calendários)
  function dedupById(items) {
    const seen = new Map()
    for (const x of items) {
      if (!seen.has(x.event.id)) seen.set(x.event.id, x)
    }
    return [...seen.values()]
  }

  // 2. Classificar (+ dedup)
  const galdinoList = dedupById(donoEvents.map(e => ({ event: e, table: classifyDonoEvent(e), extra: null })).filter(x => x.table))
  const blackcrmList = dedupById(blackcrmEvents.map(e => { const c = classifyBlackCrmEvent(e); return { event: e, table: c?.table, extra: c } }).filter(x => x.table))
  const mentorList = dedupById([...mentorEvents, ...mentoresEvents].map(e => ({ event: e, table: classifyMentorEvent(e), extra: null })).filter(x => x.table))

  console.log(`🎯 Classificados:`)
  console.log(`   reunioes_galdino     : ${galdinoList.length}`)
  console.log(`   reunioes_blackcrm    : ${blackcrmList.length}`)
  console.log(`   reunioes_mentoria_new: ${mentorList.length}\n`)

  // 3. Buscar registros existentes no Supabase
  const [galdinoRows, blackcrmRows, mentorRows] = await Promise.all([
    supabase.from('reunioes_galdino').select('id_reuniao, data_reuniao, empresa, pessoa, transcricao, resumo, link_gravacao, link_geminidoc, ganho, acoes_cliente, acoes_mentor, cliente_compareceu').gte('data_reuniao', FROM).lte('data_reuniao', TO),
    supabase.from('reunioes_blackcrm').select('id_reuniao, data_reuniao, empresa, transcricao, resumo, link_gravacao, link_geminidoc, ganho, acoes_cliente, acoes_mentor, cliente_compareceu').gte('data_reuniao', FROM).lte('data_reuniao', TO),
    supabase.from('reunioes_mentoria_new').select('id_reuniao, data_reuniao, mentor, empresa, pessoa, transcricao, resumo, link_gravacao, link_geminidoc, ganho, acoes_cliente, acoes_mentor, cliente_compareceu').gte('data_reuniao', FROM).lte('data_reuniao', TO),
  ])

  if (galdinoRows.error) throw galdinoRows.error
  if (blackcrmRows.error) throw blackcrmRows.error
  if (mentorRows.error) throw mentorRows.error

  console.log(`🗄️  No banco (semana):`)
  console.log(`   reunioes_galdino     : ${galdinoRows.data.length}`)
  console.log(`   reunioes_blackcrm    : ${blackcrmRows.data.length}`)
  console.log(`   reunioes_mentoria_new: ${mentorRows.data.length}\n`)

  // 4. Cruzar por id_reuniao (= event.id do Google)
  function bucketize(classified, dbRows) {
    const dbMap = new Map(dbRows.map(r => [r.id_reuniao, r]))
    const ok = [], incompleta = [], faltante = []
    for (const { event, extra } of classified) {
      const row = dbMap.get(event.id)
      const codigo = extractCodigoCliente(event.description)
      const entry = {
        id: event.id,
        titulo: event.summary,
        start: event.start?.dateTime || event.start?.date,
        calendar: event._calendarName,
        account: event._account || null,
        codigo_cliente: codigo,
        tipo: extra?.tipo || null,
      }
      if (!row) { faltante.push(entry); continue }
      const missing = []
      if (!row.transcricao) missing.push('transcricao')
      if (!row.resumo) missing.push('resumo')
      if (!row.link_gravacao) missing.push('link_gravacao')
      if (!row.link_geminidoc) missing.push('link_geminidoc')
      if (!row.ganho) missing.push('ganho')
      if (!row.acoes_cliente) missing.push('acoes_cliente')
      if (!row.acoes_mentor) missing.push('acoes_mentor')
      if (missing.length === 0) ok.push({ ...entry, row })
      else incompleta.push({ ...entry, row, missing })
    }
    // extra: rows no banco cujo id_reuniao não bate com nenhum evento do calendar
    const classifiedIds = new Set(classified.map(c => c.event.id))
    const orfaos = dbRows.filter(r => r.id_reuniao && !classifiedIds.has(r.id_reuniao))
    return { ok, incompleta, faltante, orfaos }
  }

  const buckets = {
    reunioes_galdino: bucketize(galdinoList, galdinoRows.data),
    reunioes_blackcrm: bucketize(blackcrmList, blackcrmRows.data),
    reunioes_mentoria_new: bucketize(mentorList, mentorRows.data),
  }

  // 5. Salvar preview e relatório
  writeFileSync(join(__dirname, 'reconciliacao-preview.json'), JSON.stringify(buckets, null, 2))

  let md = `# Reconciliação Reuniões — ${FROM} a ${TO}\n\n`
  md += `Gerado em ${new Date().toISOString()}\n\n`
  for (const [tabela, b] of Object.entries(buckets)) {
    md += `\n## ${tabela}\n\n`
    md += `- OK: **${b.ok.length}**\n`
    md += `- Incompletas: **${b.incompleta.length}**\n`
    md += `- Faltantes: **${b.faltante.length}**\n`
    md += `- Órfãs no banco (sem evento no calendar): **${b.orfaos.length}**\n`

    if (b.faltante.length) {
      md += `\n### 🚨 Faltantes (precisam ser criadas + enriquecidas)\n\n`
      for (const e of b.faltante) {
        md += `- **${e.titulo}** — ${e.start?.substring(0,16)} — cod:${e.codigo_cliente ?? '?'} — calendar:${e.calendar} — \`${e.id}\`\n`
      }
    }
    if (b.incompleta.length) {
      md += `\n### ⚠️ Incompletas (precisam enrichment)\n\n`
      for (const e of b.incompleta) {
        md += `- **${e.titulo}** — ${e.start?.substring(0,16)} — faltam: ${e.missing.join(', ')} — \`${e.id}\`\n`
      }
    }
    if (b.ok.length) {
      md += `\n### ✅ OK\n\n`
      for (const e of b.ok) {
        md += `- **${e.titulo}** — ${e.start?.substring(0,16)} — \`${e.id}\`\n`
      }
    }
    if (b.orfaos.length) {
      md += `\n### 🔍 Órfãs no banco\n\n`
      for (const r of b.orfaos) {
        md += `- ${r.data_reuniao} — ${r.empresa || r.pessoa} — \`${r.id_reuniao}\`\n`
      }
    }
  }

  writeFileSync(join(__dirname, 'reconciliacao-semana.md'), md)
  console.log(`📋 Relatório → scripts/reconciliacao-semana.md`)
  console.log(`📋 Preview   → scripts/reconciliacao-preview.json\n`)

  // resumo no console
  for (const [tabela, b] of Object.entries(buckets)) {
    console.log(`${tabela}: OK=${b.ok.length} incompletas=${b.incompleta.length} faltantes=${b.faltante.length} órfãs=${b.orfaos.length}`)
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
