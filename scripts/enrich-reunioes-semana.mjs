// Enriquece reuniões (semana 06/04–12/04) com dados mecânicos extraídos do Gemini Doc
// e cria registros faltantes. NÃO gera ganho/ações — isso vem depois via LLM pass.
//
// Campos populados: link_gravacao, link_geminidoc, transcricao, resumo, detalhes_reuniao
// + matching de cliente via codigo_cliente no description e mentor via título.
//
// Uso:
//   node enrich-reunioes-semana.mjs --dry-run        # preview
//   node enrich-reunioes-semana.mjs                  # executa
//
// Pré-requisitos:
//   - reconciliacao-preview.json (rodar reconcile-reunioes-semana.mjs primeiro)
//   - .dono-enrich-token.json (ou obtido via fluxo OAuth com escopo documents.readonly)

import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createServer } from 'http'
import { execSync } from 'child_process'
import { randomBytes, randomUUID } from 'crypto'

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

const DRY_RUN = process.argv.includes('--dry-run')
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_PORT = 3333
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`
const tokenFileArgIdx = process.argv.indexOf('--token-file')
const TOKEN_FILE = join(__dirname, tokenFileArgIdx > -1 ? process.argv[tokenFileArgIdx + 1] : '.dono-enrich-token.json')
const SKIP_WITH_TRANSCR = !process.argv.includes('--force')
const SCOPES = 'https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/calendar.readonly'

// ---------- OAuth (docs scope) ----------
async function getAccessToken() {
  if (existsSync(TOKEN_FILE)) {
    const saved = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'))
    if (saved.refresh_token) {
      const r = await refreshToken(saved.refresh_token)
      if (r) return r
    }
    if (saved.access_token && saved.expires_at && Date.now() < saved.expires_at) return saved.access_token
  }
  return new Promise((resolve, reject) => {
    const state = randomBytes(16).toString('hex')
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent&state=${state}`
    const server = createServer(async (req, res) => {
      if (!req.url.startsWith('/callback')) { res.writeHead(404); res.end('Not found'); return }
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`)
      const code = url.searchParams.get('code')
      if (url.searchParams.get('state') !== state) { res.writeHead(400); res.end('State mismatch'); server.close(); reject(new Error('State mismatch')); return }
      try {
        const tr = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' }) })
        const td = await tr.json()
        if (td.error) throw new Error(`Token: ${td.error}`)
        writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: td.access_token, refresh_token: td.refresh_token, expires_at: Date.now() + (td.expires_in * 1000) - 60000 }, null, 2))
        res.writeHead(200); res.end('Autorizado')
        server.close(); resolve(td.access_token)
      } catch (e) { res.writeHead(500); res.end(e.message); server.close(); reject(e) }
    })
    server.listen(REDIRECT_PORT, () => {
      console.log(`🔐 OAuth em http://localhost:${REDIRECT_PORT}`)
      try { execSync(`open "${authUrl}"`) } catch {}
    })
    setTimeout(() => { server.close(); reject(new Error('Timeout OAuth')) }, 120000)
  })
}

async function refreshToken(rt) {
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ refresh_token: rt, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'refresh_token' }) })
    const d = await r.json()
    if (d.error) return null
    writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: d.access_token, refresh_token: rt, expires_at: Date.now() + (d.expires_in * 1000) - 60000 }, null, 2))
    return d.access_token
  } catch { return null }
}

// ---------- Gemini Doc parsing (igual enrich-encontros-ao-vivo.mjs) ----------
async function fetchGeminiDoc(accessToken, fileId) {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${fileId}?includeTabsContent=true`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Docs ${res.status}: ${await res.text()}`)
  return res.json()
}

function parseGeminiDoc(doc) {
  const tabs = doc.tabs || []
  const STOP = /^(Pr[oó]ximas etapas|Pr[oó]ximos passos|A[çc][oõ]es sugeridas|Next steps|Revise as anota[çc][oõ]es|Envie feedback)/i
  const SKIP = /^(Convidados|Anexos|Registros da reuni[aã]o|Participants|Attachments|Meeting notes)$/i
  const SECTION = /^(Resumo|Sum[aá]rio|Detalhes|Discuss[aã]o|T[oó]picos discutidos)$/i
  const DATE = /^\d{1,2} de \w+\.? de \d{4}$/i
  const FOOTER = /^(A transcri[çc][aã]o foi encerrada|Esta transcri[çc][aã]o edit[aá]vel)/i
  const text = (b) => (b.paragraph?.elements || []).map(e => e.textRun?.content || '').join('').replace(/[\n\u000b]+/g, ' ').trim()

  let resumo = '', detalhes = '', transcricao = ''
  const tObs = tabs.find(t => /observa[çc][oõ]es/i.test(t.tabProperties?.title || ''))
  if (tObs) {
    let sec = ''
    for (const b of (tObs.documentTab?.body?.content || [])) {
      if (!b.paragraph) continue
      const t = text(b)
      if (!t) continue
      if (STOP.test(t)) break
      if (DATE.test(t) || SKIP.test(t)) continue
      const st = b.paragraph?.paragraphStyle?.namedStyleType || ''
      if (st === 'HEADING_2') continue
      if (st.startsWith('HEADING') && SECTION.test(t)) { sec = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); continue }
      if (sec.startsWith('resum') || sec.startsWith('sum')) resumo += (resumo ? '\n' : '') + t
      else if (sec.startsWith('detalhe') || sec.startsWith('discuss') || sec.startsWith('topic')) detalhes += (detalhes ? '\n' : '') + t
    }
  }
  const tTr = tabs.find(t => /transcri[çc][aã]o/i.test(t.tabProperties?.title || ''))
  if (tTr) {
    const lines = []
    for (const b of (tTr.documentTab?.body?.content || [])) {
      if (!b.paragraph) continue
      const t = text(b)
      if (!t || DATE.test(t)) continue
      if (FOOTER.test(t)) break
      lines.push(t)
    }
    transcricao = lines.join('\n').trim()
  }
  return { resumo: resumo || null, detalhes: detalhes || null, transcricao: transcricao || null }
}

// ---------- Matching ----------
function extractCodigoCliente(description) {
  if (!description) return null
  const clean = description.replace(/<[^>]+>/g, ' ')
  const m1 = clean.match(/Qual o seu ID[^)]*\)\s*(\d{2,5})/i)
  if (m1) return parseInt(m1[1], 10)
  const m2 = clean.match(/#\s*(\d{2,5})/)
  if (m2) return parseInt(m2[1], 10)
  return null
}

function extractDescFields(description) {
  if (!description) return { nome: null, email: null, empresa: null }
  const clean = description.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ')
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean)
  let nome = null, email = null, empresa = null

  for (let i = 0; i < lines.length; i++) {
    if (/^Reservado por$/i.test(lines[i]) && lines[i + 1]) {
      nome = lines[i + 1]
    }
    if (/Nome.*Empresa|Qual.*nome.*empresa/i.test(lines[i]) && lines[i + 1]) {
      empresa = lines[i + 1]
    }
  }
  const emailMatch = clean.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)
  if (emailMatch) email = emailMatch[0]
  // título extract cliente entre parênteses
  return { nome, email, empresa }
}

function normalize(s) { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() }

function matchCliente(codigo, descFields, titleCliente, clientes, clientesByCodigo) {
  // 1) por codigo
  if (codigo && clientesByCodigo.has(codigo)) return { cliente: clientesByCodigo.get(codigo), metodo: 'codigo' }
  // 2) por empresa (normalizada, exata ou parcial)
  if (descFields.empresa) {
    const n = normalize(descFields.empresa)
    if (n.length >= 4) {
      let m = clientes.find(c => normalize(c.nome_empresa_formatado || c.nome_empresa || '') === n)
      if (m) return { cliente: m, metodo: 'empresa-exato' }
      const partials = clientes.filter(c => {
        const e = normalize(c.nome_empresa_formatado || c.nome_empresa || '')
        return e && (e.includes(n) || n.includes(e))
      })
      if (partials.length === 1) return { cliente: partials[0], metodo: 'empresa-parcial' }
    }
  }
  // 3) por nome do cliente (descFields.nome ou titleCliente)
  const cands = [descFields.nome, titleCliente].filter(Boolean).map(normalize).filter(n => n.length >= 4)
  for (const cand of cands) {
    let m = clientes.find(c => normalize(c.nome_cliente_formatado || c.nome_cliente || '') === cand)
    if (m) return { cliente: m, metodo: 'cliente-exato' }
    const partials = clientes.filter(c => {
      const nc = normalize(c.nome_cliente_formatado || c.nome_cliente || '')
      return nc && (nc.includes(cand) || cand.includes(nc))
    })
    if (partials.length === 1) return { cliente: partials[0], metodo: 'cliente-parcial' }
  }
  // 4) fuzzy por tokens (cliente + empresa do título e description)
  const fuzzyQueries = [titleCliente, descFields.nome, descFields.empresa].filter(Boolean)
  for (const q of fuzzyQueries) {
    const m = fuzzyMatchCliente(q, clientes)
    if (m) return { cliente: m, metodo: 'fuzzy' }
  }
  return { cliente: null, metodo: null }
}

function extractTitleCliente(summary) {
  if (!summary) return null
  const m = summary.match(/\(([^)]+)\)\s*$/)
  return m ? m[1].trim() : null
}

function findMentor(title, mentoresNomes) {
  const t = normalize(title)
  for (const nome of mentoresNomes) {
    const n = normalize(nome)
    if (!n) continue
    if (t.includes(n)) return nome
    const firstName = n.split(' ')[0]
    if (firstName.length >= 4 && t.includes(firstName)) return nome
  }
  return null
}

// Fuzzy match por tokens: conta quantos tokens (>=4 chars) do query aparecem no candidato
function tokenMatchScore(query, candidate) {
  const qTokens = [...new Set(normalize(query).split(' ').filter(t => t.length >= 4))]
  const cTokens = new Set(normalize(candidate).split(' ').filter(t => t.length >= 3))
  if (qTokens.length === 0) return 0
  let hits = 0
  for (const t of qTokens) if (cTokens.has(t)) hits++
  return hits
}

function fuzzyMatchCliente(query, clientes) {
  if (!query || normalize(query).length < 4) return null
  const scored = clientes.map(c => {
    const sE = tokenMatchScore(query, c.nome_empresa_formatado || c.nome_empresa || '')
    const sC = tokenMatchScore(query, c.nome_cliente_formatado || c.nome_cliente || '')
    return { c, score: Math.max(sE, sC) }
  }).filter(x => x.score >= 2).sort((a, b) => b.score - a.score)
  if (scored.length === 0) return null
  // só aceita se top score é estritamente maior que segundo (não ambíguo)
  if (scored.length === 1 || scored[0].score > scored[1].score) return scored[0].c
  return null
}

function getAttachments(events, eventId) {
  const e = events.find(x => x.id === eventId)
  if (!e) return { event: null, gravacao: null, geminiDoc: null }
  const atts = e.attachments || []
  const gravacao = atts.find(a => a.mimeType === 'video/mp4' || /gravação|recording/i.test(a.title || ''))
  const geminiDoc = atts.find(a => /anota[çc][oõ]es do gemini|gemini notes/i.test(a.title || ''))
  return { event: e, gravacao, geminiDoc }
}

// ---------- SQL builders (fallback quando RLS bloqueia JS client) ----------
function sqlEscape(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object') return "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb"
  return "'" + String(v).replace(/'/g, "''") + "'"
}
function buildInsertSql(tabela, payload) {
  const cols = Object.keys(payload)
  const vals = cols.map(c => sqlEscape(payload[c]))
  return `INSERT INTO ${tabela} (${cols.join(', ')}) VALUES (${vals.join(', ')});`
}
function buildUpdateSql(tabela, payload, idReuniao) {
  const cols = Object.keys(payload).filter(k => k !== 'id_reuniao')
  const sets = cols.map(c => `${c} = ${sqlEscape(payload[c])}`)
  return `UPDATE ${tabela} SET ${sets.join(', ')} WHERE id_reuniao = ${sqlEscape(idReuniao)};`
}

const sqlStatements = []

// ---------- Main ----------
async function main() {
  console.log(`=== Enrich Reuniões Semana ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`)

  const preview = JSON.parse(readFileSync(join(__dirname, 'reconciliacao-preview.json'), 'utf8'))
  const allEvents = {
    'dono-events.json': existsSync(join(__dirname, 'dono-events.json')) ? JSON.parse(readFileSync(join(__dirname, 'dono-events.json'), 'utf8')) : [],
    'blackcrm-events.json': existsSync(join(__dirname, 'blackcrm-events.json')) ? JSON.parse(readFileSync(join(__dirname, 'blackcrm-events.json'), 'utf8')) : [],
    'mentor-events.json': existsSync(join(__dirname, 'mentor-events.json')) ? JSON.parse(readFileSync(join(__dirname, 'mentor-events.json'), 'utf8')) : [],
    'mentores-events.json': existsSync(join(__dirname, 'mentores-events.json')) ? JSON.parse(readFileSync(join(__dirname, 'mentores-events.json'), 'utf8')) : [],
  }

  const { data: clientes } = await supabase.from('clientes_entrada_new').select('id_cliente, codigo_cliente, nome_cliente, nome_empresa, nome_cliente_formatado, nome_empresa_formatado')
  if (!clientes) throw new Error('Falha ao carregar clientes')
  const clienteByCodigo = new Map(clientes.map(c => [c.codigo_cliente, c]))
  // Lista de mentores conhecidos (distinct reunioes_mentoria_new.mentor via MCP — RLS bloqueia anon)
  const mentoresNomes = ['David Abner', 'Diego Silva', 'Issao Yokoi', 'Jeff Duarte', 'Mateus Moura', 'Railson Alves', 'Rodrigo Nogueira']
  console.log(`👤 ${mentoresNomes.length} mentores:`, mentoresNomes.join(', '))

  const accessToken = await getAccessToken()
  console.log('✅ Autenticado (Docs)\n')

  const allLookupEvents = Object.values(allEvents).flat()

  // Helper: processa um evento (faltante OU incompleto) numa tabela
  async function processEntry(entry, tabela, mode) {
    if (SKIP_WITH_TRANSCR) {
      const { data: row } = await supabase.from(tabela).select('transcricao').eq('id_reuniao', entry.id).maybeSingle()
      if (row?.transcricao) { console.log(`   ⏭️ ${entry.id} já tem transcrição — pulando (use --force pra sobrescrever)`); return null }
    }
    const { event, gravacao, geminiDoc } = getAttachments(allLookupEvents, entry.id)
    if (!event) { console.log(`   ⚠️ evento ${entry.id} não encontrado nos JSONs`); return null }

    const codigo = extractCodigoCliente(event.description) || entry.codigo_cliente
    const descFields = extractDescFields(event.description)
    const titleCliente = extractTitleCliente(event.summary)
    const { cliente, metodo } = matchCliente(codigo, descFields, titleCliente, clientes, clienteByCodigo)
    const mentor = findMentor(event.summary || '', mentoresNomes)

    let parsed = { resumo: null, detalhes: null, transcricao: null }
    if (geminiDoc?.fileId) {
      try {
        const doc = await fetchGeminiDoc(accessToken, geminiDoc.fileId)
        parsed = parseGeminiDoc(doc)
      } catch (err) {
        console.log(`   ⚠️ ${entry.id} doc: ${err.message}`)
      }
    }

    const startStr = event.start?.dateTime || event.start?.date
    const d = new Date(startStr)
    const dataISO = d.toISOString().slice(0, 10)
    const horario = d.toTimeString().slice(0, 5) + ':00'

    const base = {
      id_reuniao: event.id,
      data_reuniao: dataISO,
      horario,
      empresa: cliente?.nome_empresa || null,
      nome_empresa_formatado: cliente?.nome_empresa_formatado || null,
      codigo_cliente: codigo || null,
      id_cliente: cliente?.id_cliente || null,
      transcricao: parsed.transcricao,
      resumo: parsed.resumo,
      link_gravacao: gravacao?.fileUrl || null,
      link_geminidoc: geminiDoc?.fileUrl || null,
      ano: d.getFullYear(),
      mes: d.getMonth() + 1,
    }

    let payload
    if (tabela === 'reunioes_galdino') {
      payload = {
        ...base,
        pessoa: cliente?.nome_cliente || null,
        nome_cliente_formatado: cliente?.nome_cliente_formatado || null,
        detalhes_reuniao: parsed.detalhes,
        status_match: cliente ? 'Identificado' : 'Nao identificado',
        metodo_match: metodo || null,
      }
    } else if (tabela === 'reunioes_mentoria_new') {
      payload = {
        ...base,
        pessoa: cliente?.nome_cliente || null,
        nome_cliente_formatado: cliente?.nome_cliente_formatado || null,
        mentor: mentor || null,
        gravada: !!base.link_gravacao,
        tem_transcricao: !!base.transcricao,
      }
    } else if (tabela === 'reunioes_blackcrm') {
      // reunioes_blackcrm NÃO tem pessoa nem nome_cliente_formatado
      payload = {
        ...base,
        tipo_reuniao: entry.tipo || null,
        status_match: cliente ? 'Identificado' : 'Nao identificado',
        metodo_match: metodo || null,
      }
    }

    console.log(`   📌 ${event.summary} | cliente:${cliente?.nome_empresa_formatado || '?'} (${metodo || '-'}) | mentor:${mentor || '-'}`)
    console.log(`      gravação:${payload.link_gravacao ? 'sim' : 'não'} | gemini:${payload.link_geminidoc ? 'sim' : 'não'} | transcr:${parsed.transcricao ? parsed.transcricao.length + ' chars' : 'vazia'}`)

    if (DRY_RUN) return { payload, mode }

    if (mode === 'insert') {
      if (tabela === 'reunioes_blackcrm') {
        payload.id_unico = randomUUID()
      }
      const { data: existing } = await supabase.from(tabela).select('id_reuniao').eq('id_reuniao', event.id).maybeSingle()
      if (existing) {
        const { error } = await supabase.from(tabela).update(payload).eq('id_reuniao', event.id)
        if (error) {
          if (/row-level security/i.test(error.message)) { sqlStatements.push(buildUpdateSql(tabela, payload, event.id)); console.log(`   📝 update → SQL (RLS)`); return { payload, mode, sql: true } }
          console.log(`   ❌ update(on-conflict): ${error.message}`); return null
        }
        console.log(`   ✅ atualizado (já existia)`)
      } else {
        const { error } = await supabase.from(tabela).insert(payload)
        if (error) {
          if (/row-level security/i.test(error.message)) { sqlStatements.push(buildInsertSql(tabela, payload)); console.log(`   📝 insert → SQL (RLS)`); return { payload, mode, sql: true } }
          console.log(`   ❌ insert: ${error.message}`); return null
        }
        console.log(`   ✅ inserido`)
      }
    } else {
      const upd = {}
      if (payload.transcricao) upd.transcricao = payload.transcricao
      if (payload.resumo) upd.resumo = payload.resumo
      if (payload.link_gravacao) upd.link_gravacao = payload.link_gravacao
      if (payload.link_geminidoc) upd.link_geminidoc = payload.link_geminidoc
      if (tabela === 'reunioes_galdino' && payload.detalhes_reuniao) upd.detalhes_reuniao = payload.detalhes_reuniao
      if (tabela === 'reunioes_mentoria_new') {
        if (payload.gravada) upd.gravada = true
        if (payload.tem_transcricao) upd.tem_transcricao = true
      }
      if (Object.keys(upd).length === 0) { console.log(`   ⏭️ nada novo pra atualizar`); return null }
      const { error } = await supabase.from(tabela).update(upd).eq('id_reuniao', event.id)
      if (error) {
        if (/row-level security/i.test(error.message)) { sqlStatements.push(buildUpdateSql(tabela, upd, event.id)); console.log(`   📝 update → SQL (RLS)`); return { payload, mode, sql: true } }
        console.log(`   ❌ update: ${error.message}`); return null
      }
      console.log(`   ✅ atualizado`)
    }
    return { payload, mode }
  }

  const stats = {}
  for (const [tabela, b] of Object.entries(preview)) {
    stats[tabela] = { inserted: 0, updated: 0, skipped: 0 }
    console.log(`\n📁 ${tabela}`)

    for (const entry of b.faltante) {
      console.log(` ➕ FALTANTE ${entry.id}`)
      const r = await processEntry(entry, tabela, 'insert')
      if (r) stats[tabela].inserted++
    }
    for (const entry of b.incompleta) {
      console.log(` 🔧 INCOMPLETA ${entry.id}`)
      const r = await processEntry(entry, tabela, 'update')
      if (r) stats[tabela].updated++
    }
  }

  console.log(`\n=== Resumo ===`)
  for (const [t, s] of Object.entries(stats)) {
    console.log(`${t}: inseridos=${s.inserted} atualizados=${s.updated}`)
  }

  if (sqlStatements.length > 0) {
    const sqlPath = join(__dirname, 'enrich-semana-rls.sql')
    writeFileSync(sqlPath, sqlStatements.join('\n') + '\n')
    console.log(`\n📝 ${sqlStatements.length} statements RLS-bloqueados salvos em ${sqlPath}`)
    console.log(`   Execute via MCP: mcp__supabase__execute_sql`)
  }
  console.log(`\n💡 Próximo passo: rodar LLM pass pra gerar ganho/acoes_cliente/acoes_mentor das reuniões com transcrição.`)
}

main().catch(err => { console.error('❌', err.message); console.error(err.stack); process.exit(1) })
