import { createServer } from 'http'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { execSync } from 'child_process'
import { randomBytes } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env file
const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env')
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=')
    if (key && val.length) process.env[key.trim()] = val.join('=').trim()
  })
}

// --- Config ---
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_PORT = 3333
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`
const TOKEN_FILE = join(__dirname, '.dono-token.json')
const OUTPUT_FILE = join(__dirname, 'dono-events.json')
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

// --- OAuth2 ---
async function getAccessToken() {
  // Tenta reutilizar token salvo
  if (existsSync(TOKEN_FILE)) {
    const saved = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'))
    // Se tem refresh_token e o access_token expirou, faz refresh
    if (saved.refresh_token) {
      const refreshed = await refreshToken(saved.refresh_token)
      if (refreshed) return refreshed
    }
    // Se access_token ainda valido (menos de 50min)
    if (saved.access_token && saved.expires_at && Date.now() < saved.expires_at) {
      return saved.access_token
    }
  }

  // Fluxo OAuth2 completo
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
      if (!req.url.startsWith('/callback')) {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`)
      const code = url.searchParams.get('code')
      const returnedState = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      if (error) {
        res.writeHead(400)
        res.end(`Erro: ${error}`)
        server.close()
        reject(new Error(error))
        return
      }

      if (returnedState !== state) {
        res.writeHead(400)
        res.end('State mismatch')
        server.close()
        reject(new Error('State mismatch'))
        return
      }

      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
          })
        })

        const tokenData = await tokenRes.json()

        if (tokenData.error) {
          throw new Error(`Token error: ${tokenData.error} - ${tokenData.error_description}`)
        }

        // Salva token para reuso
        const toSave = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: Date.now() + (tokenData.expires_in * 1000) - 60000
        }
        writeFileSync(TOKEN_FILE, JSON.stringify(toSave, null, 2))

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<h1>Autorizado com sucesso!</h1><p>Pode fechar esta aba.</p>')
        server.close()
        resolve(tokenData.access_token)
      } catch (err) {
        res.writeHead(500)
        res.end(`Erro: ${err.message}`)
        server.close()
        reject(err)
      }
    })

    server.listen(REDIRECT_PORT, () => {
      console.log(`\n🔐 Servidor OAuth rodando em http://localhost:${REDIRECT_PORT}`)
      console.log(`\n📋 Abrindo navegador para autorizacao...\n`)
      console.log(`Se nao abrir automaticamente, acesse:\n${authUrl}\n`)

      // Abre o navegador (macOS)
      try {
        execSync(`open "${authUrl}"`)
      } catch {
        console.log('Nao foi possivel abrir o navegador automaticamente.')
      }
    })

    // Timeout de 2 minutos
    setTimeout(() => {
      server.close()
      reject(new Error('Timeout: autorizacao nao completada em 2 minutos'))
    }, 120000)
  })
}

async function refreshToken(refreshTk) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshTk,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token'
      })
    })
    const data = await res.json()
    if (data.error) return null

    const toSave = {
      access_token: data.access_token,
      refresh_token: refreshTk,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000
    }
    writeFileSync(TOKEN_FILE, JSON.stringify(toSave, null, 2))
    return data.access_token
  } catch {
    return null
  }
}

// --- Google Calendar API ---
async function listCalendars(accessToken) {
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`CalendarList API error ${res.status}: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  return data.items || []
}

async function fetchEventsForCalendar(accessToken, calendarId) {
  const allEvents = []
  let pageToken = null
  let page = 1

  do {
    const params = new URLSearchParams({
      timeMin: '2025-01-01T00:00:00Z',
      timeMax: '2026-12-31T23:59:59Z',
      maxResults: '2500',
      singleEvents: 'true',
      orderBy: 'startTime',
      conferenceDataVersion: '1'
    })
    if (pageToken) params.set('pageToken', pageToken)

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(`API error ${res.status}: ${JSON.stringify(err)}`)
    }

    const data = await res.json()
    const events = data.items || []
    allEvents.push(...events)

    console.log(`   Pagina ${page}: ${events.length} eventos (total: ${allEvents.length})`)

    pageToken = data.nextPageToken
    page++
  } while (pageToken)

  return allEvents
}

// --- Main ---
async function main() {
  console.log('=== Fetch Dono Calendar Events (TODOS OS CALENDARIOS) ===\n')

  const accessToken = await getAccessToken()
  console.log('✅ Autenticado com sucesso!\n')

  // 1. Listar todos os calendarios
  const calendars = await listCalendars(accessToken)
  console.log(`📋 Calendarios encontrados: ${calendars.length}\n`)
  calendars.forEach((cal, i) => {
    console.log(`  ${i + 1}. [${cal.id}] ${cal.summary || '(sem nome)'}`)
  })

  // 2. Buscar eventos de TODOS os calendarios
  const allEvents = []
  for (const cal of calendars) {
    console.log(`\n📅 Buscando eventos de: ${cal.summary || cal.id}`)
    try {
      const events = await fetchEventsForCalendar(accessToken, cal.id)
      // Adiciona info do calendario de origem em cada evento
      events.forEach(e => {
        e._calendarId = cal.id
        e._calendarName = cal.summary || cal.id
      })
      allEvents.push(...events)
      console.log(`   ✅ ${events.length} eventos`)
    } catch (err) {
      console.log(`   ⚠️ Erro: ${err.message}`)
    }
  }

  console.log(`\n✅ Total de eventos (todos calendarios): ${allEvents.length}`)

  // 3. Salvar todos os eventos
  writeFileSync(OUTPUT_FILE, JSON.stringify(allEvents, null, 2))
  console.log(`💾 Eventos salvos em: ${OUTPUT_FILE}`)

  // 4. Mostrar todos os titulos unicos por calendario
  const byCalendar = {}
  allEvents.forEach(e => {
    const cal = e._calendarName || 'desconhecido'
    if (!byCalendar[cal]) byCalendar[cal] = new Set()
    byCalendar[cal].add(e.summary || '(sem titulo)')
  })

  console.log('\n\n=== TITULOS POR CALENDARIO ===')
  for (const [cal, titles] of Object.entries(byCalendar)) {
    console.log(`\n--- ${cal} (${titles.size} titulos unicos) ---`)
    ;[...titles].sort().forEach(t => console.log(`  - ${t}`))
  }
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
