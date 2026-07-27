import { getAccessTokenAs, SCOPES } from "./google-auth-sa.ts"

export interface AttendeePayload {
  email: string
  displayName?: string
  responseStatus?: "needsAction" | "accepted" | "tentative" | "declined"
}

export interface NovoEvento {
  summary: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees?: AttendeePayload[]
  colorId?: string // colorId de evento do Google Calendar (1..11)
  conferenceData?: {
    createRequest: {
      requestId: string
      conferenceSolutionKey: { type: "hangoutsMeet" }
    }
  }
}

export interface EventoCriado {
  id: string
  hangoutLink?: string
  htmlLink?: string
  conferenceData?: {
    entryPoints?: Array<{ entryPointType: string; uri: string }>
  }
}

export async function criarEvento(
  emailCalendar: string,
  payload: NovoEvento,
): Promise<EventoCriado> {
  const token = await getAccessTokenAs(emailCalendar, [SCOPES.CALENDAR_EVENTS])
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(emailCalendar)}/events?conferenceDataVersion=1&sendUpdates=all`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Calendar criarEvento (${res.status}): ${text}`)
  }
  return await res.json() as EventoCriado
}

export interface WatchChannelCriado {
  id: string
  resourceId: string
  expiration: string // ms epoch como string (formato do Google)
}

export async function criarWatchChannel(opts: {
  emailCalendar: string
  channelId: string
  address: string
  token: string
}): Promise<WatchChannelCriado> {
  const access = await getAccessTokenAs(opts.emailCalendar, [SCOPES.CALENDAR_EVENTS])
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(opts.emailCalendar)}/events/watch`
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: opts.channelId,
      type: "web_hook",
      address: opts.address,
      token: opts.token,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Calendar events.watch (${res.status}): ${text}`)
  }
  const data = await res.json() as { id: string; resourceId: string; expiration: string }
  return { id: data.id, resourceId: data.resourceId, expiration: data.expiration }
}

export async function pararWatchChannel(opts: {
  emailCalendar: string
  channelId: string
  resourceId: string
}): Promise<void> {
  const access = await getAccessTokenAs(opts.emailCalendar, [SCOPES.CALENDAR_EVENTS])
  const res = await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
    method: "POST",
    headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: opts.channelId, resourceId: opts.resourceId }),
  })
  // 404/410 = canal já tinha sido encerrado; idempotente
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const text = await res.text()
    throw new Error(`Calendar channels.stop (${res.status}): ${text}`)
  }
}

export interface EventoIncremental {
  id: string
  status?: string
}

export interface ListaIncremental {
  items: EventoIncremental[]
  nextSyncToken?: string
  expirado: boolean // true se 410 Gone — syncToken inválido
}

export async function listarEventosIncremental(
  emailCalendar: string,
  syncToken: string | null,
): Promise<ListaIncremental> {
  const access = await getAccessTokenAs(emailCalendar, [SCOPES.CALENDAR_EVENTS])
  const items: EventoIncremental[] = []
  let pageToken: string | undefined
  let nextSyncToken: string | undefined

  do {
    const params = new URLSearchParams()
    params.set("showDeleted", "true")
    params.set("maxResults", "250")
    if (pageToken) {
      params.set("pageToken", pageToken)
    } else if (syncToken) {
      params.set("syncToken", syncToken)
    } else {
      // bootstrap: pega só os próximos 60 dias pra gerar um syncToken inicial enxuto
      const agora = new Date()
      const fim = new Date(agora.getTime() + 60 * 24 * 60 * 60 * 1000)
      params.set("timeMin", agora.toISOString())
      params.set("timeMax", fim.toISOString())
      params.set("singleEvents", "true")
    }
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(emailCalendar)}/events?${params.toString()}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${access}` } })
    if (res.status === 410) {
      return { items: [], expirado: true }
    }
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Calendar events.list (${res.status}): ${text}`)
    }
    const data = await res.json() as {
      items?: EventoIncremental[]
      nextPageToken?: string
      nextSyncToken?: string
    }
    if (data.items) items.push(...data.items)
    pageToken = data.nextPageToken
    if (data.nextSyncToken) nextSyncToken = data.nextSyncToken
  } while (pageToken)

  return { items, nextSyncToken, expirado: false }
}

// Retorna true se de fato deletou (2xx) e false se evento não existia (404/410).
// Erros reais lançam exception.
export async function deletarEvento(emailCalendar: string, eventId: string): Promise<boolean> {
  const token = await getAccessTokenAs(emailCalendar, [SCOPES.CALENDAR_EVENTS])
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(emailCalendar)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404 || res.status === 410) return false
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Calendar deletarEvento (${res.status}): ${text}`)
  }
  return true
}

// Variantes que separam o SUBJECT (quem impersona via DWD) do CALENDAR ID
// (calendário destino). Necessário pra calendários secundários
// (c_xxx@group.calendar.google.com) cujo dono é uma caixa Workspace
// (ex.: dono@rafaelgaldino.com.br).

export async function criarEventoEm(opts: {
  subject: string
  calendarId: string
  payload: NovoEvento
}): Promise<EventoCriado> {
  const token = await getAccessTokenAs(opts.subject, [SCOPES.CALENDAR_EVENTS])
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(opts.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(opts.payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Calendar criarEventoEm (${res.status}): ${text}`)
  }
  return await res.json() as EventoCriado
}

export async function atualizarEventoEm(opts: {
  subject: string
  calendarId: string
  eventId: string
  payload: Partial<NovoEvento>
}): Promise<EventoCriado> {
  const token = await getAccessTokenAs(opts.subject, [SCOPES.CALENDAR_EVENTS])
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(opts.calendarId)}/events/${encodeURIComponent(opts.eventId)}?conferenceDataVersion=1&sendUpdates=all`
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(opts.payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Calendar atualizarEventoEm (${res.status}): ${text}`)
  }
  return await res.json() as EventoCriado
}

export async function deletarEventoEm(opts: {
  subject: string
  calendarId: string
  eventId: string
}): Promise<boolean> {
  const token = await getAccessTokenAs(opts.subject, [SCOPES.CALENDAR_EVENTS])
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(opts.calendarId)}/events/${encodeURIComponent(opts.eventId)}?sendUpdates=all`
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404 || res.status === 410) return false
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Calendar deletarEventoEm (${res.status}): ${text}`)
  }
  return true
}

export async function buscarEventoEm(opts: {
  subject: string
  calendarId: string
  eventId: string
}) {
  const token = await getAccessTokenAs(opts.subject, [SCOPES.CALENDAR_EVENTS])
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(opts.calendarId)}/events/${encodeURIComponent(opts.eventId)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Calendar buscarEventoEm (${res.status}): ${text}`)
  }
  return await res.json()
}

export async function buscarEvento(emailCalendar: string, eventId: string) {
  const token = await getAccessTokenAs(emailCalendar, [SCOPES.CALENDAR_EVENTS])
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(emailCalendar)}/events/${encodeURIComponent(eventId)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Calendar buscarEvento (${res.status}): ${text}`)
  }
  return await res.json()
}

export async function freebusyQuery(emailCalendar: string, timeMin: string, timeMax: string) {
  const token = await getAccessTokenAs(emailCalendar, [SCOPES.CALENDAR_EVENTS])
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: emailCalendar }],
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Calendar freebusy (${res.status}): ${text}`)
  }
  return await res.json()
}

export interface AttachmentsExtraidos {
  gravacao_url: string | null
  gemini_doc_url: string | null
  gemini_doc_id: string | null
}

export function extrairAttachments(event: { attachments?: Array<{ title?: string; fileUrl?: string; fileId?: string; mimeType?: string }> }): AttachmentsExtraidos {
  const atts = event.attachments ?? []
  const gravacao = atts.find(a => a.mimeType === "video/mp4" || /grava[çc][aã]o|recording/i.test(a.title ?? ""))
  const geminiDoc = atts.find(a => /anota[çc][oõ]es do gemini|gemini notes/i.test(a.title ?? ""))
  return {
    gravacao_url: gravacao?.fileUrl ?? null,
    gemini_doc_url: geminiDoc?.fileUrl ?? null,
    gemini_doc_id: geminiDoc?.fileId ?? null,
  }
}
