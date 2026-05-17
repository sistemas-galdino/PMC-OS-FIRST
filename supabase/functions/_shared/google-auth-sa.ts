// Google Service Account JWT bearer flow com Domain-wide Delegation.
// Impersona qualquer usuário do workspace que tenha os scopes habilitados no Admin Console.

interface ServiceAccountJSON {
  client_email: string
  private_key: string
  token_uri?: string
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>()
let saCache: ServiceAccountJSON | null = null

function getServiceAccount(): ServiceAccountJSON {
  if (saCache) return saCache
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não configurado nos secrets da edge function")
  let parsed: ServiceAccountJSON
  try {
    parsed = JSON.parse(raw)
  } catch {
    try {
      parsed = JSON.parse(atob(raw))
    } catch (e) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON inválido (não é JSON nem base64): " + (e instanceof Error ? e.message : String(e)))
    }
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON sem client_email ou private_key")
  }
  saCache = parsed
  return parsed
}

function base64UrlEncode(input: string | Uint8Array): string {
  let b64: string
  if (typeof input === "string") {
    b64 = btoa(unescape(encodeURIComponent(input)))
  } else {
    let binary = ""
    for (let i = 0; i < input.length; i++) binary += String.fromCharCode(input[i])
    b64 = btoa(binary)
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "")
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export async function getAccessTokenAs(
  emailToImpersonate: string,
  scopes: string[],
): Promise<string> {
  const scopeStr = scopes.join(" ")
  const cacheKey = `${emailToImpersonate}|${scopeStr}`
  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token

  const sa = getServiceAccount()
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: "RS256", typ: "JWT" }
  const payload = {
    iss: sa.client_email,
    sub: emailToImpersonate,
    scope: scopeStr,
    aud: sa.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }

  const headerEnc = base64UrlEncode(JSON.stringify(header))
  const payloadEnc = base64UrlEncode(JSON.stringify(payload))
  const signingInput = `${headerEnc}.${payloadEnc}`

  const keyBuf = pemToArrayBuffer(sa.private_key)
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBuf,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  )
  const sigEnc = base64UrlEncode(new Uint8Array(sigBuf))
  const jwt = `${signingInput}.${sigEnc}`

  const res = await fetch(sa.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token exchange falhou (${res.status}): ${text}`)
  }

  const data = await res.json()
  const token: string = data.access_token
  const expiresIn: number = data.expires_in ?? 3600
  tokenCache.set(cacheKey, { token, expiresAt: Date.now() + expiresIn * 1000 })
  return token
}

export const SCOPES = {
  CALENDAR_EVENTS: "https://www.googleapis.com/auth/calendar.events",
  DOCUMENTS_READONLY: "https://www.googleapis.com/auth/documents.readonly",
}
