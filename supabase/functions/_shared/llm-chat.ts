// Chamada de chat a um provedor OpenAI-compatible, com a mesma resolução de
// chave que a metodo-ia já usa (LOVABLE_API_KEY → OPENAI_API_KEY → LLM_API_KEY).
//
// Existe para as funções do CRM não repetirem esse bloco. Não mexe na
// metodo-ia, que tem a própria cópia e um caminho de streaming próprio.

export interface ProvedorLLM {
  key: string
  base: string
  model: string
  lovable: boolean
}

export function resolveLLM(): ProvedorLLM | null {
  const lovable = Deno.env.get("LOVABLE_API_KEY")
  if (lovable) {
    return {
      key: lovable,
      base: Deno.env.get("LLM_BASE_URL") ?? "https://ai.gateway.lovable.dev/v1",
      model: Deno.env.get("LLM_MODEL") ?? "google/gemini-3-flash-preview",
      lovable: true,
    }
  }
  const openai = Deno.env.get("OPENAI_API_KEY")
  if (openai) {
    return {
      key: openai,
      base: Deno.env.get("LLM_BASE_URL") ?? "https://api.openai.com/v1",
      model: Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini",
      lovable: false,
    }
  }
  const generic = Deno.env.get("LLM_API_KEY")
  if (generic) {
    return {
      key: generic,
      base: Deno.env.get("LLM_BASE_URL") ?? "https://api.openai.com/v1",
      model: Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini",
      lovable: false,
    }
  }
  return null
}

function headers(p: ProvedorLLM): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${p.key}`,
  }
  if (p.lovable) {
    h["Lovable-API-Key"] = p.key
    h["X-Lovable-AIG-SDK"] = "pmc-edge"
  }
  return h
}

export interface OpcoesLLM {
  system: string
  user: string
  /** Pede JSON ao provedor (response_format json_object). */
  json?: boolean
  maxTokens?: number
  temperatura?: number
  timeoutMs?: number
}

/**
 * Chamada bloqueante. O timeout é por AbortController para falhar limpo em vez
 * de estourar o wall-clock da edge function (~150s) e virar 546 sem mensagem.
 */
export async function chamarLLM(o: OpcoesLLM): Promise<string> {
  const p = resolveLLM()
  if (!p) {
    throw new Error(
      "Nenhuma chave de IA configurada. Defina LOVABLE_API_KEY (ou OPENAI_API_KEY) nos secrets do projeto.",
    )
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), o.timeoutMs ?? 60_000)
  try {
    const res = await fetch(`${p.base}/chat/completions`, {
      method: "POST",
      headers: headers(p),
      body: JSON.stringify({
        model: p.model,
        messages: [
          { role: "system", content: o.system },
          { role: "user", content: o.user },
        ],
        temperature: o.temperatura ?? 0.4,
        max_tokens: o.maxTokens ?? 1500,
        ...(o.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`)
    const data = await res.json()
    return data?.choices?.[0]?.message?.content ?? ""
  } finally {
    clearTimeout(timer)
  }
}

/** Isola o primeiro objeto JSON do texto e tolera vírgula sobrando. */
export function extrairJson<T>(texto: string): T {
  let limpo = texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim()
  const i = limpo.indexOf("{")
  const f = limpo.lastIndexOf("}")
  if (i >= 0 && f > i) limpo = limpo.slice(i, f + 1)
  try {
    return JSON.parse(limpo) as T
  } catch {
    return JSON.parse(limpo.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")) as T
  }
}

export function erroHttp(err: unknown): { status: number; message: string } {
  const m = err instanceof Error ? err.message : String(err)
  if ((err instanceof Error && err.name === "AbortError") || /abort/i.test(m)) {
    return { status: 504, message: "A IA demorou demais para responder." }
  }
  if (/429|rate.?limit/i.test(m)) return { status: 429, message: "A IA está ocupada. Tente de novo em alguns segundos." }
  if (/402|credit|payment/i.test(m)) return { status: 402, message: "Créditos de IA esgotados no provedor." }
  return { status: 400, message: m }
}

/**
 * Quem chamou é do time (existe em `mentores`)? As telas do CRM são do painel
 * admin; verify_jwt só garante que há alguém logado, e cliente logado também
 * tem JWT válido.
 */
export async function exigirMembroDoTime(
  req: Request,
): Promise<{ email: string; nome: string | null } | null> {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2")
  const url = Deno.env.get("SUPABASE_URL")!
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const authHeader = req.headers.get("Authorization") ?? ""

  const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
  const { data, error } = await caller.auth.getUser()
  const email = data?.user?.email
  if (error || !email) return null

  const admin = createClient(url, service)
  const { data: mentor } = await admin
    .from("mentores")
    .select("nome")
    .eq("email", email)
    .maybeSingle()
  if (!mentor) return null
  return { email, nome: (mentor as { nome: string | null }).nome }
}
