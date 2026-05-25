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
