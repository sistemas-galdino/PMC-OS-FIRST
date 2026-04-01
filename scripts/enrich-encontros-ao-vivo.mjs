import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createServer } from 'http'
import { execSync } from 'child_process'
import { randomBytes } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env
const envPath = join(__dirname, '.env')
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=')
    if (key && val.length) process.env[key.trim()] = val.join('=').trim()
  })
}

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
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_PORT = 3333
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`
const TOKEN_FILE = join(__dirname, '.dono-enrich-token.json')
const INPUT_FILE = join(__dirname, 'dono-events.json')
const CALENDAR_NAME = '[PMC] AO VIVO COM GALDINO'
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/documents.readonly'
const DRY_RUN = process.argv.includes('--dry-run')

// --- OAuth2 ---
async function getAccessToken() {
  if (existsSync(TOKEN_FILE)) {
    const saved = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'))
    if (saved.refresh_token) {
      const refreshed = await refreshToken(saved.refresh_token)
      if (refreshed) return refreshed
    }
    if (saved.access_token && saved.expires_at && Date.now() < saved.expires_at) {
      return saved.access_token
    }
  }

  return new Promise((resolve, reject) => {
    const state = randomBytes(16).toString('hex')
    const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`

    const server = createServer(async (req, res) => {
      if (!req.url.startsWith('/callback')) { res.writeHead(404); res.end('Not found'); return }
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`)
      const code = url.searchParams.get('code')
      const returnedState = url.searchParams.get('state')
      const error = url.searchParams.get('error')
      if (error) { res.writeHead(400); res.end(`Erro: ${error}`); server.close(); reject(new Error(error)); return }
      if (returnedState !== state) { res.writeHead(400); res.end('State mismatch'); server.close(); reject(new Error('State mismatch')); return }
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' })
        })
        const tokenData = await tokenRes.json()
        if (tokenData.error) throw new Error(`Token error: ${tokenData.error} - ${tokenData.error_description}`)
        const toSave = { access_token: tokenData.access_token, refresh_token: tokenData.refresh_token, expires_at: Date.now() + (tokenData.expires_in * 1000) - 60000 }
        writeFileSync(TOKEN_FILE, JSON.stringify(toSave, null, 2))
        res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<h1>Autorizado com sucesso!</h1><p>Pode fechar esta aba.</p>')
        server.close(); resolve(tokenData.access_token)
      } catch (err) { res.writeHead(500); res.end(`Erro: ${err.message}`); server.close(); reject(err) }
    })

    server.listen(REDIRECT_PORT, () => {
      console.log(`\n🔐 Servidor OAuth rodando em http://localhost:${REDIRECT_PORT}`)
      console.log(`\n📋 Abrindo navegador para autorizacao...\n`)
      console.log(`Se nao abrir automaticamente, acesse:\n${authUrl}\n`)
      try { execSync(`open "${authUrl}"`) } catch { console.log('Nao foi possivel abrir o navegador automaticamente.') }
    })
    setTimeout(() => { server.close(); reject(new Error('Timeout: autorizacao nao completada em 2 minutos')) }, 120000)
  })
}

async function refreshToken(refreshTk) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token: refreshTk, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'refresh_token' })
    })
    const data = await res.json()
    if (data.error) return null
    const toSave = { access_token: data.access_token, refresh_token: refreshTk, expires_at: Date.now() + (data.expires_in * 1000) - 60000 }
    writeFileSync(TOKEN_FILE, JSON.stringify(toSave, null, 2))
    return data.access_token
  } catch { return null }
}

// --- Google Docs API ---
async function fetchGeminiDoc(accessToken, fileId) {
  const url = `https://docs.googleapis.com/v1/documents/${fileId}?includeTabsContent=true`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Docs API error ${res.status}: ${JSON.stringify(err)}`)
  }
  return res.json()
}

// --- Parse Gemini Doc (mesma logica do n8n pega-transcricao-mentores) ---
function parseGeminiDoc(doc) {
  const tabs = doc.tabs || []

  const STOP_SECTIONS = /^(Pr[oó]ximas etapas|Pr[oó]ximos passos|A[çc][oõ]es sugeridas|Next steps|Revise as anota[çc][oõ]es|Envie feedback)/i
  const SKIP_HEADINGS = /^(Convidados|Anexos|Registros da reuni[aã]o|Participants|Attachments|Meeting notes)$/i
  const SECTION_HEADINGS = /^(Resumo|Sum[aá]rio|Detalhes|Discuss[aã]o|T[oó]picos discutidos)$/i
  const DATE_PATTERN = /^\d{1,2} de \w+\.? de \d{4}$/i
  const TRANSCRIPTION_FOOTER = /^(A transcri[çc][aã]o foi encerrada|Esta transcri[çc][aã]o edit[aá]vel)/i

  function extractText(block) {
    return (block.paragraph?.elements || [])
      .map(el => el.textRun?.content || '')
      .join('')
      .replace(/[\n\u000b]+/g, ' ')
      .trim()
  }

  // Aba Observações
  const abaObservacoes = tabs.find(t => /observa[çc][oõ]es/i.test(t.tabProperties?.title || ''))
  let resumo = '', detalhes = ''

  if (abaObservacoes) {
    const bodyContent = abaObservacoes.documentTab?.body?.content || []
    let currentSection = ''

    for (const block of bodyContent) {
      if (!block.paragraph) continue
      const text = extractText(block)
      if (!text) continue
      if (STOP_SECTIONS.test(text)) break
      if (DATE_PATTERN.test(text)) continue
      if (SKIP_HEADINGS.test(text)) continue

      const styleType = block.paragraph?.paragraphStyle?.namedStyleType || ''
      const isHeading = styleType.startsWith('HEADING')
      if (styleType === 'HEADING_2') continue

      if (isHeading && SECTION_HEADINGS.test(text)) {
        currentSection = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        continue
      }

      if (currentSection.startsWith('resum') || currentSection.startsWith('sum')) {
        resumo += (resumo ? '\n' : '') + text
      } else if (currentSection.startsWith('detalhe') || currentSection.startsWith('discuss') || currentSection.startsWith('topic')) {
        detalhes += (detalhes ? '\n' : '') + text
      }
    }
  }

  // Aba Transcrição
  const abaTranscricao = tabs.find(t => /transcri[çc][aã]o/i.test(t.tabProperties?.title || ''))
  let transcricao = ''

  if (abaTranscricao) {
    const bodyContent = abaTranscricao.documentTab?.body?.content || []
    const lines = []

    for (const block of bodyContent) {
      if (!block.paragraph) continue
      const text = extractText(block)
      if (!text) continue
      if (TRANSCRIPTION_FOOTER.test(text)) break
      if (DATE_PATTERN.test(text)) continue
      lines.push(text)
    }
    transcricao = lines.join('\n').trim()
  }

  return { resumo: resumo || null, detalhes: detalhes || null, transcricao: transcricao || null }
}

// --- Main ---
async function main() {
  console.log('=== Enriquecer Encontros ao Vivo ===\n')
  if (DRY_RUN) console.log('🔍 MODO DRY RUN\n')

  // 1. Ler eventos do JSON (ja baixados)
  const allEvents = JSON.parse(readFileSync(INPUT_FILE, 'utf8'))
  const calEvents = allEvents.filter(e => e._calendarName === CALENDAR_NAME)
  const pastEvents = calEvents.filter(e => new Date(e.start?.dateTime) < new Date())

  console.log(`📅 Eventos realizados: ${pastEvents.length}`)

  // 2. Autenticar (precisa de scope docs.readonly)
  const accessToken = await getAccessToken()
  console.log('✅ Autenticado com sucesso!\n')

  // 3. Processar cada evento passado
  let enriched = 0
  let skipped = 0
  let errors = 0

  for (const event of pastEvents) {
    const attachments = event.attachments || []
    const gravacao = attachments.find(a => a.mimeType === 'video/mp4')
    const geminiDoc = attachments.find(a =>
      (a.title || '').toLowerCase().includes('anotações do gemini') ||
      (a.title || '').toLowerCase().includes('anotacoes do gemini')
    )

    console.log(`\n📌 ${event.summary} (${event.start?.dateTime?.substring(0, 10)})`)

    if (!gravacao && !geminiDoc) {
      console.log('   ⏭️ Sem anexos - pulando')
      skipped++
      continue
    }

    const linkGravacao = gravacao?.fileUrl || null
    const linkGeminiDoc = geminiDoc?.fileUrl || null
    let resumo = null, detalhes = null, transcricao = null

    // Buscar conteudo do Gemini Doc
    if (geminiDoc?.fileId) {
      try {
        console.log(`   📄 Buscando Gemini Doc: ${geminiDoc.fileId}`)
        const doc = await fetchGeminiDoc(accessToken, geminiDoc.fileId)
        const parsed = parseGeminiDoc(doc)
        resumo = parsed.resumo
        detalhes = parsed.detalhes
        transcricao = parsed.transcricao
        console.log(`   ✅ Resumo: ${resumo ? resumo.substring(0, 80) + '...' : '(vazio)'}`)
        console.log(`   ✅ Transcrição: ${transcricao ? transcricao.length + ' chars' : '(vazio)'}`)
      } catch (err) {
        console.log(`   ⚠️ Erro ao buscar doc: ${err.message}`)
      }
    }

    if (DRY_RUN) {
      console.log(`   🔍 [DRY RUN] Gravação: ${linkGravacao ? 'SIM' : 'NAO'}`)
      console.log(`   🔍 [DRY RUN] Gemini: ${linkGeminiDoc ? 'SIM' : 'NAO'}`)
      enriched++
      continue
    }

    // Atualizar no Supabase
    const updateData = {}
    if (linkGravacao) updateData.link_gravacao = linkGravacao
    if (linkGeminiDoc) updateData.link_geminidoc = linkGeminiDoc
    if (transcricao) updateData.transcricao = transcricao
    if (resumo) updateData.resumo = resumo
    if (detalhes) updateData.detalhes_encontro = detalhes

    if (Object.keys(updateData).length === 0) {
      skipped++
      continue
    }

    const { error } = await supabase
      .from('encontros_ao_vivo')
      .update(updateData)
      .eq('id_evento_google', event.id)

    if (error) {
      console.log(`   ❌ Erro update: ${error.message}`)
      errors++
    } else {
      console.log(`   ✅ Atualizado no Supabase`)
      enriched++
    }
  }

  console.log(`\n=== Resultado ===`)
  console.log(`✅ Enriquecidos: ${enriched} | ⏭️ Sem anexos: ${skipped} | ❌ Erros: ${errors}`)
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
