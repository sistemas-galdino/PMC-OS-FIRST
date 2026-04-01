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
const TOKEN_FILE = join(__dirname, '.blackcrm-token.json')
const OUTPUT_FILE = join(__dirname, 'blackcrm-events.json')
const CALENDAR_ID = 'especialistablackcrm@rafaelgaldino.com.br'
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
async function fetchAllEvents(accessToken) {
  const allEvents = []
  let pageToken = null
  let page = 1

  do {
    const params = new URLSearchParams({
      timeMin: '2025-01-01T00:00:00Z',
      timeMax: '2026-12-31T23:59:59Z',
      maxResults: '2500',
      singleEvents: 'true',
      orderBy: 'startTime'
    })
    if (pageToken) params.set('pageToken', pageToken)

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`

    console.log(`📅 Buscando pagina ${page}...`)

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

    console.log(`   ${events.length} eventos nesta pagina (total: ${allEvents.length})`)

    pageToken = data.nextPageToken
    page++
  } while (pageToken)

  return allEvents
}

// --- Main ---
async function main() {
  console.log('=== Fetch BlackCRM Calendar Events ===\n')

  const accessToken = await getAccessToken()
  console.log('✅ Autenticado com sucesso!\n')

  const events = await fetchAllEvents(accessToken)
  console.log(`\n✅ Total de eventos: ${events.length}`)

  // Salva eventos brutos
  writeFileSync(OUTPUT_FILE, JSON.stringify(events, null, 2))
  console.log(`💾 Eventos salvos em: ${OUTPUT_FILE}`)

  // Mostra amostra dos primeiros 10 titulos para analise
  console.log('\n--- Amostra dos primeiros 10 eventos ---')
  events.slice(0, 10).forEach((e, i) => {
    const start = e.start?.dateTime || e.start?.date || 'sem data'
    const attendees = (e.attendees || []).map(a => a.email).join(', ')
    console.log(`${i + 1}. [${start}] ${e.summary || '(sem titulo)'}`)
    if (attendees) console.log(`   Participantes: ${attendees}`)
  })
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
