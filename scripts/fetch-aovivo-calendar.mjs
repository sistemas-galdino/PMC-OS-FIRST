import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env
const envPath = join(__dirname, '.env')
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=')
    if (key && val.length) process.env[key.trim()] = val.join('=').trim()
  })
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const TOKEN_FILE = join(__dirname, '.dono-token.json')
const OUTPUT_FILE = join(__dirname, 'aovivo-events.json')

// Calendario "[PMC] AO VIVO COM GALDINO" (descoberto na versao git do dono-events.json)
const CALENDAR_ID = 'c_8189029e08d4e78a70d2760416fc6807322701143e6f132d0b3ba5c82b76f55c@group.calendar.google.com'
const CALENDAR_NAME = '[PMC] AO VIVO COM GALDINO'

async function getAccessToken() {
  const saved = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'))
  if (!saved.refresh_token) throw new Error('Token salvo sem refresh_token')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: saved.refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token'
    })
  })
  const data = await res.json()
  if (data.error) throw new Error(`Refresh falhou: ${data.error} - ${data.error_description || ''}`)
  const toSave = {
    access_token: data.access_token,
    refresh_token: saved.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000) - 60000
  }
  writeFileSync(TOKEN_FILE, JSON.stringify(toSave, null, 2))
  return data.access_token
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
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
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

async function main() {
  console.log('=== Fetch [PMC] AO VIVO COM GALDINO (por ID de calendario) ===\n')
  const accessToken = await getAccessToken()
  console.log('✅ Token OK\n')

  console.log(`📅 Buscando eventos do calendario ${CALENDAR_ID}`)
  const events = await fetchEventsForCalendar(accessToken, CALENDAR_ID)
  events.forEach(e => {
    e._calendarId = CALENDAR_ID
    e._calendarName = CALENDAR_NAME
  })
  console.log(`\n✅ Total: ${events.length} eventos`)

  writeFileSync(OUTPUT_FILE, JSON.stringify(events, null, 2))
  console.log(`💾 Salvo em: ${OUTPUT_FILE}`)

  console.log('\n=== TITULOS UNICOS ===')
  const titles = {}
  events.forEach(e => { const t = (e.summary || '(sem titulo)').trim(); titles[t] = (titles[t] || 0) + 1 })
  Object.entries(titles).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${c}x  ${t}`))
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
