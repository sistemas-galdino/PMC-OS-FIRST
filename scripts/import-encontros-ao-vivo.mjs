import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Supabase ---
const envRaw = readFileSync(join(__dirname, '../web/.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=')).map(l => {
    const idx = l.indexOf('=')
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

// --- Config ---
const INPUT_FILE = join(__dirname, 'dono-events.json')
const CALENDAR_NAME = '[PMC] AO VIVO COM GALDINO'
const DRY_RUN = process.argv.includes('--dry-run')

// --- Classificar tipo do encontro ---
function classifyEvent(summary) {
  if (!summary) return null
  const s = summary.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

  if (s.includes('case')) return 'multiplica_case'
  if (s.includes('dono')) return 'multiplica_dono'
  if (s.includes('nivel 02') || s.includes('nivel 2') || s.includes('n2')) return 'multiplica_time_nivel_2'
  if (s.includes('nivel 01') || s.includes('nivel 1') || s.includes('n1')) return 'multiplica_time_nivel_1'
  // "Multiplica Time" sem nivel especifico => nivel 1 (padrao antigo antes da divisao)
  if (s.includes('multiplica') && s.includes('time')) return 'multiplica_time_nivel_1'
  // Eventos antigos: "PMC - Mentoria em Grupo" => time nivel 1
  if (s.includes('mentoria em grupo')) return 'multiplica_time_nivel_1'
  // "PMC - Dono pra Dono" => dono
  if (s.includes('dono pra dono') || s.includes('dono para dono')) return 'multiplica_dono'
  // Treinamentos e eventos especiais => time nivel 1 (encontro geral)
  if (s.includes('treinamento') || s.includes('ofertas')) return 'multiplica_time_nivel_1'

  // Se nao conseguiu classificar, retorna null
  return null
}

// --- Formatar titulo ---
function formatTitle(summary, tipo) {
  const labels = {
    multiplica_time_nivel_1: 'Multiplica Time - Nível 1',
    multiplica_time_nivel_2: 'Multiplica Time - Nível 2',
    multiplica_dono: 'Multiplica Dono',
    multiplica_case: 'Multiplica Case',
  }
  return labels[tipo] || summary.trim()
}

// --- Extrair dados temporais ---
function parseDateInfo(dateTimeStr, tzStr) {
  const dt = new Date(dateTimeStr)

  const pad = n => String(n).padStart(2, '0')

  // Formatar em timezone BR
  const brDate = dt.toLocaleDateString('pt-BR', { timeZone: tzStr || 'America/Fortaleza' })
  const brTime = dt.toLocaleTimeString('pt-BR', { timeZone: tzStr || 'America/Fortaleza', hour: '2-digit', minute: '2-digit', hour12: false })

  const year = dt.getFullYear()
  const month = dt.getMonth() + 1

  // ISO week number
  const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)

  // Inicio e fim da semana (segunda a domingo)
  const monday = new Date(dt)
  const day = monday.getDay()
  const diff = day === 0 ? -6 : 1 - day
  monday.setDate(monday.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)

  const fmtDate = d2 => `${pad(d2.getDate())}/${pad(d2.getMonth() + 1)}/${d2.getFullYear()}`

  return {
    data_encontro: brDate,
    horario: brTime,
    mes: month,
    semana: weekNo,
    ano: year,
    inicio_semana: fmtDate(monday),
    fim_semana: fmtDate(sunday),
  }
}

// --- Main ---
async function main() {
  console.log('=== Import Encontros ao Vivo ===\n')
  if (DRY_RUN) console.log('🔍 MODO DRY RUN - nenhum dado sera inserido\n')

  // 1. Ler eventos
  const allEvents = JSON.parse(readFileSync(INPUT_FILE, 'utf8'))
  console.log(`📂 Total eventos no JSON: ${allEvents.length}`)

  // 2. Filtrar eventos do calendario correto
  const calEvents = allEvents.filter(e => e._calendarName === CALENDAR_NAME)
  console.log(`📅 Eventos do calendario "${CALENDAR_NAME}": ${calEvents.length}`)

  // 3. Processar cada evento
  const rows = []
  const skipped = []

  for (const e of calEvents) {
    const tipo = classifyEvent(e.summary)
    if (!tipo) {
      skipped.push(e.summary || '(sem titulo)')
      continue
    }

    const startDt = e.start?.dateTime
    const endDt = e.end?.dateTime
    if (!startDt || !endDt) {
      skipped.push(`${e.summary} (sem dateTime)`)
      continue
    }

    const tz = e.start?.timeZone || 'America/Fortaleza'
    const startInfo = parseDateInfo(startDt, tz)
    const endInfo = parseDateInfo(endDt, tz)

    const durationMs = new Date(endDt) - new Date(startDt)
    const durationMin = Math.round(durationMs / 60000)

    const now = new Date()
    const eventDate = new Date(startDt)
    const status = eventDate < now ? 'realizado' : 'agendado'

    const meetLink = e.hangoutLink ||
      e.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri ||
      null

    const row = {
      id_unico: randomUUID(),
      id_evento_google: e.id,
      tipo_encontro: tipo,
      titulo_original: (e.summary || '').trim(),
      titulo_formatado: formatTitle(e.summary, tipo),
      descricao: e.description || null,
      data_encontro: startInfo.data_encontro,
      horario_inicio: startInfo.horario,
      horario_fim: endInfo.horario,
      duracao_minutos: durationMin,
      mes: startInfo.mes,
      semana: startInfo.semana,
      ano: startInfo.ano,
      inicio_semana: startInfo.inicio_semana,
      fim_semana: startInfo.fim_semana,
      timezone: tz,
      data_hora_inicio_iso: startDt,
      data_hora_fim_iso: endDt,
      link_google_meet: meetLink,
      link_gravacao: null,
      link_geminidoc: null,
      transcricao: null,
      transcricao_md: null,
      resumo: null,
      resumo_json: null,
      detalhes_encontro: null,
      status: status,
      qtd_participantes: (e.attendees || []).length,
      observacoes: null,
    }

    rows.push(row)
  }

  console.log(`\n✅ Eventos classificados: ${rows.length}`)
  if (skipped.length > 0) {
    console.log(`⚠️ Eventos ignorados (${skipped.length}):`)
    skipped.forEach(s => console.log(`   - ${s}`))
  }

  // 4. Mostrar preview
  console.log('\n--- Preview ---')
  rows.forEach((r, i) => {
    console.log(`${i + 1}. [${r.tipo_encontro}] ${r.data_encontro} ${r.horario_inicio}-${r.horario_fim} | ${r.titulo_original} | ${r.status}`)
    console.log(`   Meet: ${r.link_google_meet || '(sem link)'}`)
  })

  // Resumo por tipo
  const byType = {}
  rows.forEach(r => {
    if (!byType[r.tipo_encontro]) byType[r.tipo_encontro] = 0
    byType[r.tipo_encontro]++
  })
  console.log('\n--- Resumo por tipo ---')
  Object.entries(byType).forEach(([t, c]) => console.log(`  ${t}: ${c}`))

  if (DRY_RUN) {
    writeFileSync(join(__dirname, 'encontros-preview.json'), JSON.stringify(rows, null, 2))
    console.log('\n💾 Preview salvo em encontros-preview.json')
    console.log('\n🔍 Dry run finalizado. Rode sem --dry-run para inserir.')
    return
  }

  // 5. Inserir no Supabase
  console.log('\n📤 Inserindo no Supabase...')
  let inserted = 0
  let updated = 0
  let errors = 0

  for (const row of rows) {
    // Verificar se ja existe
    const { data: existing } = await supabase
      .from('encontros_ao_vivo')
      .select('id_unico')
      .eq('id_evento_google', row.id_evento_google)
      .maybeSingle()

    if (existing) {
      // Update
      const { id_unico, ...updateData } = row
      const { error } = await supabase
        .from('encontros_ao_vivo')
        .update(updateData)
        .eq('id_evento_google', row.id_evento_google)

      if (error) {
        console.error(`   ❌ Erro update ${row.titulo_original}: ${error.message}`)
        errors++
      } else {
        updated++
      }
    } else {
      // Insert
      const { error } = await supabase
        .from('encontros_ao_vivo')
        .insert(row)

      if (error) {
        console.error(`   ❌ Erro insert ${row.titulo_original}: ${error.message}`)
        errors++
      } else {
        inserted++
      }
    }
  }

  console.log(`\n✅ Inseridos: ${inserted} | Atualizados: ${updated} | Erros: ${errors}`)
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
