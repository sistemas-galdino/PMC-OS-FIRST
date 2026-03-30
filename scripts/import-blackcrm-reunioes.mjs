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

// --- Helpers ---
function normalize(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(ltda|eireli|s\/a|sa|me|ss|lda|epp|s\.a\.?)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstAndLastName(fullName) {
  const parts = normalize(fullName).split(' ').filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return parts[0] + ' ' + parts[parts.length - 1]
}

// --- Parsing titulo do evento ---
function parseEventTitle(summary) {
  if (!summary) return null

  // Ignorar eventos internos
  const ignorePatterns = [
    /^Rafael Galdino$/i,
    /^Alinhamento/i,
    /^Fase \d/i,
    /^\[RESERVA/i,
  ]
  for (const p of ignorePatterns) {
    if (p.test(summary)) return null
  }

  let tipo_reuniao = null
  let responsavel = null
  let nome_extraido = null

  // Tipo de reuniao
  if (/tutoria/i.test(summary)) {
    tipo_reuniao = 'tutoria'
  } else if (/implement|implant/i.test(summary)) {
    tipo_reuniao = 'implementacao'
  } else {
    return null // nao e reuniao BlackCRM
  }

  // Responsavel pelo prefixo
  if (/\[(?:pmc\s+)?ayslan\s*\]/i.test(summary)) {
    responsavel = 'Ayslan'
  } else if (/\[pmc.?leo(?:nardo)?\]/i.test(summary) || /\[pmc\s+leonardo\]/i.test(summary)) {
    responsavel = 'Leonardo'
  } else if (/\[pmc\]/i.test(summary)) {
    // [PMC] sem especificar - verificar se ha mais contexto
    // Eventos antigos usavam [PMC] para ambos
    responsavel = null // sera preenchido depois se possivel
  }

  // Nome entre parenteses
  const parenMatch = summary.match(/\(([^)]+)\)/)
  if (parenMatch) {
    nome_extraido = parenMatch[1].trim()
  }

  // Formato alternativo: "IMPLEMENTAÇÃO CRM - Nome" ou "TUTORIA BLACKCRM - Nome"
  if (!nome_extraido) {
    const dashMatch = summary.match(/(?:CRM|BLACKCRM)\s*-\s*(.+)$/i)
    if (dashMatch) {
      nome_extraido = dashMatch[1].trim()
    }
  }

  // Formato: "[texto entre colchetes]" no final (ex: [Instituto de Diagnostico por Imagem])
  if (!nome_extraido) {
    const bracketMatch = summary.match(/\[([^\]]+)\]\s*$/)
    if (bracketMatch && !bracketMatch[1].match(/^PMC|^RESERVA/i)) {
      nome_extraido = bracketMatch[1].trim()
    }
  }

  return { tipo_reuniao, responsavel, nome_extraido }
}

// --- Data helpers ---
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

function getWeekBounds(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (dt) => {
    const dd = String(dt.getDate()).padStart(2, '0')
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const yyyy = dt.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }
  return { inicio: fmt(monday), fim: fmt(sunday) }
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${min}`
}

// --- Main ---
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log(`=== Import BlackCRM Reunioes ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`)

  // 1. Carregar eventos do calendario
  const events = JSON.parse(readFileSync(join(__dirname, 'blackcrm-events.json'), 'utf8'))
  console.log(`📅 ${events.length} eventos carregados do calendario\n`)

  // 2. Carregar clientes do Supabase
  const { data: clientes, error: clientesErr } = await supabase
    .from('clientes_entrada_new')
    .select('id_cliente, codigo_cliente, nome_cliente, nome_empresa, nome_cliente_formatado, nome_empresa_formatado, tem_crm')

  if (clientesErr) throw new Error(`Erro ao buscar clientes: ${clientesErr.message}`)
  console.log(`👥 ${clientes.length} clientes carregados do banco\n`)

  // Pre-processar clientes para matching
  const clientesNorm = clientes.map(c => ({
    ...c,
    norm_empresa: normalize(c.nome_empresa_formatado || c.nome_empresa || ''),
    norm_cliente: normalize(c.nome_cliente_formatado || c.nome_cliente || ''),
    first_last: firstAndLastName(c.nome_cliente_formatado || c.nome_cliente || ''),
  }))

  // Emails internos para ignorar no matching de participantes
  const internalEmails = new Set([
    'especialistablackcrm@rafaelgaldino.com.br',
    'atendimento_01@rafaelgaldino.com.br',
    'atendimento_02@rafaelgaldino.com.br',
    'atendimento_03@rafaelgaldino.com.br',
    'maiaragadelha@rafaelgaldino.com.br',
    'ayslanlp96@gmail.com',
  ])

  // Nomes que sao da equipe interna, nao clientes
  const staffNames = new Set([
    'maiara gadelha', 'jeff duarte', 'ayslan leite', 'leonardo',
  ])

  // Mapeamento manual: nome no calendario (normalizado) → nome_empresa_formatado ou nome_cliente_formatado no banco
  // Usado quando matching automatico falha por spelling/formato diferente
  const manualMap = {
    'jaque luz': c => normalize(c.nome_cliente_formatado || '').includes('jaqueline') && normalize(c.nome_cliente_formatado || '').includes('luz'),
    'mattiazzo terraplanagem': c => normalize(c.nome_empresa_formatado || '').includes('matiazzo'),
    'juliany': c => normalize(c.nome_empresa_formatado || '').includes('jhow motos'),
    'julyany': c => normalize(c.nome_empresa_formatado || '').includes('jhow motos'),
    'larissa lider': c => normalize(c.nome_empresa_formatado || '').includes('the family'),
    'the family family': c => normalize(c.nome_empresa_formatado || '').includes('the family'),
    'dani racca racca': c => normalize(c.nome_cliente_formatado || '').includes('danielle racca'),
    'caiko cordeiro': c => normalize(c.nome_empresa_formatado || '').includes('lagostao'),
    'lagostao pescados': c => normalize(c.nome_empresa_formatado || '').includes('lagostao'),
    'daiane desie': c => normalize(c.nome_empresa_formatado || '').includes('desie'),
    'simara glauco': c => normalize(c.nome_cliente_formatado || '').includes('glauco') && normalize(c.nome_cliente_formatado || '').includes('almeida'),
    'guilhermo giacobo': c => normalize(c.nome_cliente_formatado || '').includes('giacobo'),
    'jaqueline albino': c => normalize(c.nome_empresa_formatado || '').includes('contato seguros'),
    'henrique neitzel': c => normalize(c.nome_cliente_formatado || '').includes('neitzel'),
    'marize angelica vicentini belini dip': c => normalize(c.nome_cliente_formatado || '').includes('luis fernando dip') || normalize(c.nome_empresa_formatado || '').includes('urologia'),
    'marize dip': c => normalize(c.nome_cliente_formatado || '').includes('luis fernando dip') || normalize(c.nome_empresa_formatado || '').includes('urologia'),
    'silvio tavares silvio': c => normalize(c.nome_empresa_formatado || '').includes('clinica laura tavares'),
    'doramy padilha': c => normalize(c.nome_cliente_formatado || '').includes('dener') && normalize(c.nome_cliente_formatado || '').includes('padilha'),
    'liani muniz': c => normalize(c.nome_empresa_formatado || '').includes('la beauty'),
    'clebson velasco de campos campos': c => normalize(c.nome_empresa_formatado || '').includes('campos automoveis'),
    'top indenizacoes': c => normalize(c.nome_empresa_formatado || '').includes('itaquerirovy') || normalize(c.nome_cliente_formatado || '').includes('flavio tadeu'),
  }

  // 3. Processar eventos
  const results = []
  const stats = { matched: 0, unmatched: 0, skipped: 0 }

  for (const event of events) {
    const parsed = parseEventTitle(event.summary)
    if (!parsed) {
      stats.skipped++
      continue
    }

    const startStr = event.start?.dateTime || event.start?.date
    if (!startStr) { stats.skipped++; continue }

    const startDate = new Date(startStr)
    const weekBounds = getWeekBounds(startDate)

    // Extrair emails externos dos participantes
    const externalEmails = (event.attendees || [])
      .map(a => a.email)
      .filter(e => !internalEmails.has(e) && !e.endsWith('@rafaelgaldino.com.br'))

    // --- Client Matching ---
    let match = null
    let metodo = ''

    // Limpar nome extraido (remover pontos, espacos extras, etc.)
    let nomeRaw = (parsed.nome_extraido || '').replace(/[.\s]+$/g, '').replace(/\s+/g, ' ').trim()
    const nomeNorm = normalize(nomeRaw)

    // Pular se e staff interno
    if (staffNames.has(nomeNorm)) {
      stats.skipped++
      continue
    }

    // 0. Mapeamento manual
    const manualFn = manualMap[nomeNorm]
    if (manualFn) {
      const manualMatches = clientesNorm.filter(manualFn)
      if (manualMatches.length === 1) {
        match = manualMatches[0]
        metodo = 'manual'
      }
    }

    // 1. Match exato por nome da empresa (normalizado)
    if (!match && nomeNorm.length >= 4) {
      const exact = clientesNorm.filter(c => c.norm_empresa && c.norm_empresa === nomeNorm)
      if (exact.length === 1) {
        match = exact[0]
        metodo = 'empresa-exato'
      }
    }

    // 2. Match parcial por nome da empresa
    if (!match && nomeNorm.length >= 5) {
      const partial = clientesNorm.filter(c =>
        c.norm_empresa && (c.norm_empresa.includes(nomeNorm) || nomeNorm.includes(c.norm_empresa))
      )
      if (partial.length === 1) {
        match = partial[0]
        metodo = 'empresa-parcial'
      }
    }

    // 3. Match por nome do cliente (first+last name)
    if (!match && nomeNorm.length >= 4) {
      const firstLast = firstAndLastName(nomeRaw)
      if (firstLast.length >= 4) {
        const byName = clientesNorm.filter(c =>
          c.first_last && c.first_last === firstLast
        )
        if (byName.length === 1) {
          match = byName[0]
          metodo = 'cliente-nome-exato'
        }
      }
    }

    // 4. Match parcial por nome do cliente (nome extraido contido no nome completo do banco ou vice-versa)
    if (!match && nomeNorm.length >= 5) {
      const byNamePartial = clientesNorm.filter(c =>
        c.norm_cliente && (c.norm_cliente.includes(nomeNorm) || nomeNorm.includes(c.norm_cliente))
      )
      if (byNamePartial.length === 1) {
        match = byNamePartial[0]
        metodo = 'cliente-nome-parcial'
      }
    }

    // 5. Match por primeiro+ultimo nome do titulo vs primeiro+ultimo nome do banco
    if (!match && nomeNorm.length >= 4) {
      const titleFirstLast = firstAndLastName(nomeRaw)
      if (titleFirstLast.length >= 6) {
        // Tentar match onde o first_last do banco contem o first_last do titulo
        const byFL = clientesNorm.filter(c =>
          c.first_last && titleFirstLast.length >= 6 &&
          (c.first_last.includes(titleFirstLast) || titleFirstLast.includes(c.first_last))
        )
        if (byFL.length === 1) {
          match = byFL[0]
          metodo = 'primeiro-ultimo-parcial'
        }
      }
    }

    // 6. Match por primeiro nome unico (se ha apenas 1 cliente com esse primeiro nome)
    if (!match) {
      const firstName = normalize(nomeRaw).split(' ')[0]
      if (firstName && firstName.length >= 4) {
        const byFirst = clientesNorm.filter(c => {
          const cFirst = c.norm_cliente.split(' ')[0]
          return cFirst === firstName
        })
        if (byFirst.length === 1) {
          match = byFirst[0]
          metodo = 'primeiro-nome-unico'
        }
      }
    }

    // 7. Match por dominio do email do participante vs empresa no banco
    if (!match && externalEmails.length > 0) {
      for (const email of externalEmails) {
        if (match) break
        const domain = email.split('@')[1]
        if (!domain || domain.includes('gmail.com') || domain.includes('hotmail') || domain.includes('yahoo') || domain.includes('outlook') || domain.includes('icloud')) continue
        const domainName = normalize(domain.split('.')[0])
        if (domainName.length >= 4) {
          const byDomain = clientesNorm.filter(c =>
            c.norm_empresa && c.norm_empresa.includes(domainName)
          )
          if (byDomain.length === 1) {
            match = byDomain[0]
            metodo = 'email-dominio'
          }
        }
      }
    }

    // 8. Match por nome normalizado vs nome_empresa (caso nome no titulo seja empresa)
    if (!match && nomeNorm.length >= 4) {
      const byEmpresaName = clientesNorm.filter(c =>
        c.norm_cliente && c.norm_cliente === nomeNorm
      )
      if (byEmpresaName.length === 1) {
        match = byEmpresaName[0]
        metodo = 'nome-como-cliente'
      }
    }

    const record = {
      id_unico: randomUUID(),
      id_reuniao: event.id,
      id_cliente: match?.id_cliente || null,
      codigo_cliente: match?.codigo_cliente || null,
      empresa: nomeRaw || event.summary,
      nome_empresa_formatado: match?.nome_empresa_formatado || null,
      data_reuniao: formatDate(startStr),
      horario: formatTime(startStr),
      mes: startDate.getMonth() + 1,
      semana: getWeekNumber(startDate),
      ano: startDate.getFullYear(),
      inicio_semana: weekBounds.inicio,
      fim_semana: weekBounds.fim,
      tipo_reuniao: parsed.tipo_reuniao,
      responsavel: parsed.responsavel,
      nps: null,
      transcricao: null,
      transcricao_md: null,
      resumo: null,
      resumo_json: null,
      acoes: null,
      link_gravacao: null,
      link_geminidoc: null,
      status_match: match ? 'Identificado' : 'Nao identificado',
      metodo_match: metodo || null,
      observacoes: !match ? `Participantes externos: ${externalEmails.join(', ')}` : null,
    }

    results.push(record)

    if (match) stats.matched++
    else stats.unmatched++
  }

  // 4. Relatorio
  console.log(`\n=== Resultado ===`)
  console.log(`✅ Identificados: ${stats.matched}`)
  console.log(`❌ Nao identificados: ${stats.unmatched}`)
  console.log(`⏭️  Ignorados (internos): ${stats.skipped}`)
  console.log(`📊 Total processados: ${results.length}\n`)

  // Mostrar nao identificados
  const unmatched = results.filter(r => r.status_match === 'Nao identificado')
  if (unmatched.length > 0) {
    console.log('--- Reunioes NAO identificadas ---')
    unmatched.forEach(r => {
      console.log(`  [${r.data_reuniao}] ${r.empresa} (${r.tipo_reuniao})`)
      if (r.observacoes) console.log(`    ${r.observacoes}`)
    })
  }

  // Mostrar matched por metodo
  console.log('\n--- Breakdown por metodo de match ---')
  const byMethod = {}
  results.filter(r => r.metodo_match).forEach(r => {
    byMethod[r.metodo_match] = (byMethod[r.metodo_match] || 0) + 1
  })
  Object.entries(byMethod).forEach(([m, c]) => console.log(`  ${m}: ${c}`))

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN - nenhum dado inserido no banco.')
    // Salvar relatorio para analise
    writeFileSync(join(__dirname, 'blackcrm-import-preview.json'), JSON.stringify(results, null, 2))
    console.log('📋 Preview salvo em scripts/blackcrm-import-preview.json')
    return
  }

  // 5. Inserir no Supabase via SQL direto (PostgREST schema cache nao reconhece a tabela nova)
  console.log('\n💾 Inserindo no Supabase via SQL...')

  const esc = (v) => {
    if (v === null || v === undefined) return 'NULL'
    if (typeof v === 'number') return String(v)
    return "'" + String(v).replace(/'/g, "''") + "'"
  }

  const cols = [
    'id_unico', 'id_reuniao', 'id_cliente', 'codigo_cliente', 'empresa',
    'nome_empresa_formatado', 'data_reuniao', 'horario', 'mes', 'semana',
    'ano', 'inicio_semana', 'fim_semana', 'tipo_reuniao', 'responsavel',
    'nps', 'transcricao', 'transcricao_md', 'resumo', 'resumo_json',
    'acoes', 'link_gravacao', 'link_geminidoc', 'status_match',
    'metodo_match', 'observacoes'
  ]

  const BATCH_SIZE = 30
  let inserted = 0
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE)
    const valueRows = batch.map(r => {
      const vals = cols.map(c => esc(r[c]))
      return `(${vals.join(', ')})`
    }).join(',\n')

    const sql = `INSERT INTO reunioes_blackcrm (${cols.join(', ')}) VALUES\n${valueRows}\nON CONFLICT (id_unico) DO NOTHING;`

    const { error } = await supabase.rpc('', {}).catch(() => ({}))
    // Use direct pg connection via supabase management API not available,
    // so write SQL to file for execution
    const sqlFile = join(__dirname, `blackcrm-batch-${Math.floor(i / BATCH_SIZE) + 1}.sql`)
    writeFileSync(sqlFile, sql)
    inserted += batch.length
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} registros -> ${sqlFile}`)
  }

  console.log(`\n📋 ${inserted} registros em ${Math.ceil(results.length / BATCH_SIZE)} arquivos SQL gerados.`)
  console.log('Execute cada arquivo via mcp__supabase__execute_sql ou psql.')
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
