// Fetch parametrizado de calendários Google (para contas mentor@ e mentores@)
// Uso: node fetch-mentor-calendar.mjs --account mentor@rafaelgaldino.com.br --token-file .mentor-token.json --output mentor-events.json
// Token NÃO é usado pra autenticar como essa conta — você loga com a conta correspondente no navegador.

import { createServer } from 'http'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { execSync } from 'child_process'
import { randomBytes } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = join(__dirname, '.env')
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=')
    if (key && val.length) process.env[key.trim()] = val.join('=').trim()
  })
}

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return null
  return process.argv[idx + 1]
}

const ACCOUNT_HINT = getArg('account')
const TOKEN_FILENAME = getArg('token-file')
const OUTPUT_FILENAME = getArg('output')

if (!ACCOUNT_HINT || !TOKEN_FILENAME || !OUTPUT_FILENAME) {
  console.error('Uso: --account <email> --token-file <file> --output <file>')
  process.exit(1)
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_PORT = 3333
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`
const TOKEN_FILE = join(__dirname, TOKEN_FILENAME)
const OUTPUT_FILE = join(__dirname, OUTPUT_FILENAME)
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

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
      `&login_hint=${encodeURIComponent(ACCOUNT_HINT)}` +
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
        res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(`<h1>Autorizado (${ACCOUNT_HINT})</h1><p>Pode fechar esta aba.</p>`)
        server.close(); resolve(tokenData.access_token)
      } catch (err) { res.writeHead(500); res.end(`Erro: ${err.message}`); server.close(); reject(err) }
    })

    server.listen(REDIRECT_PORT, () => {
      console.log(`\n🔐 OAuth em http://localhost:${REDIRECT_PORT}`)
      console.log(`\n⚠️ Logue com a conta: ${ACCOUNT_HINT}\n`)
      console.log(`Se não abrir, acesse:\n${authUrl}\n`)
      try { execSync(`open "${authUrl}"`) } catch { console.log('Nao foi possivel abrir o navegador automaticamente.') }
    })
    setTimeout(() => { server.close(); reject(new Error('Timeout: autorizacao em 2 minutos')) }, 120000)
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

async function listCalendars(accessToken) {
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) throw new Error(`CalendarList error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.items || []
}

async function fetchEventsForCalendar(accessToken, calendarId) {
  const allEvents = []
  let pageToken = null
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
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    allEvents.push(...(data.items || []))
    pageToken = data.nextPageToken
  } while (pageToken)
  return allEvents
}

async function main() {
  console.log(`=== Fetch Calendar: ${ACCOUNT_HINT} ===\n`)
  const accessToken = await getAccessToken()
  console.log('✅ Autenticado\n')

  const calendars = await listCalendars(accessToken)
  console.log(`📋 ${calendars.length} calendários:`)
  calendars.forEach((cal, i) => console.log(`  ${i + 1}. ${cal.summary || cal.id}`))

  const allEvents = []
  for (const cal of calendars) {
    console.log(`\n📅 ${cal.summary || cal.id}`)
    try {
      const events = await fetchEventsForCalendar(accessToken, cal.id)
      events.forEach(e => { e._calendarId = cal.id; e._calendarName = cal.summary || cal.id; e._account = ACCOUNT_HINT })
      allEvents.push(...events)
      console.log(`   ✅ ${events.length} eventos`)
    } catch (err) {
      console.log(`   ⚠️ ${err.message}`)
    }
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(allEvents, null, 2))
  console.log(`\n💾 ${allEvents.length} eventos → ${OUTPUT_FILE}`)
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
