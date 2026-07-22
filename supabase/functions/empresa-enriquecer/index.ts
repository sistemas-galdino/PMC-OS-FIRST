import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Enriquecimento do negócio (Informações da Empresa): visita o SITE da empresa,
// extrai o conteúdo e pede à IA um resumo de negócio relevante. Sem site, não roda.
// verify_jwt = true. Provider: OpenAI-compatible (default Lovable AI Gateway),
// chave via secret OPENAI_API_KEY/LOVABLE_API_KEY (overrides LLM_BASE_URL/LLM_MODEL).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Detecta o provedor de IA a partir de qualquer chave já configurada no projeto.
function resolveLLM(): { key: string; base: string; model: string; lovable: boolean } | null {
  const lovable = Deno.env.get("LOVABLE_API_KEY");
  if (lovable) {
    return {
      key: lovable,
      base: Deno.env.get("LLM_BASE_URL") ?? "https://ai.gateway.lovable.dev/v1",
      model: Deno.env.get("LLM_MODEL") ?? "google/gemini-3-flash-preview",
      lovable: true,
    };
  }
  const openai = Deno.env.get("OPENAI_API_KEY");
  if (openai) {
    return {
      key: openai,
      base: Deno.env.get("LLM_BASE_URL") ?? "https://api.openai.com/v1",
      model: Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini",
      lovable: false,
    };
  }
  const generic = Deno.env.get("LLM_API_KEY");
  if (generic) {
    return {
      key: generic,
      base: Deno.env.get("LLM_BASE_URL") ?? "https://api.openai.com/v1",
      model: Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini",
      lovable: false,
    };
  }
  return null;
}

const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function mapError(err: unknown): { status: number; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  if (/429|rate.?limit/i.test(message)) return { status: 429, message: "RATE_LIMIT: A IA está ocupada. Tente novamente em alguns segundos." };
  if (/402|credit|payment/i.test(message)) return { status: 402, message: "CREDITS_EXHAUSTED: Créditos de IA esgotados. Adicione créditos no provedor de IA." };
  return { status: 400, message: `AI_ERROR: ${message}` };
}

async function fetchTexto(url: string, timeoutMs = 12000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

function metaConteudo(html: string, prop: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  const m = html.match(re) || html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, "i")
  );
  return m ? m[1] : "";
}

function htmlParaTexto(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarSite(site: string): string {
  const s = site.trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

// Anti-SSRF: só hosts públicos com nome de domínio. Bloqueia IPs literais,
// localhost e domínios internos — o fetch roda no servidor e não pode ser
// usado para alcançar serviços privados/metadata.
function hostPermitido(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!host || host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false; // IPv4 literal
  if (host.includes(":") || host.startsWith("[")) return false; // IPv6 literal
  return true;
}

async function coletarSite(site: string): Promise<{ ok: boolean; texto: string }> {
  const url = normalizarSite(site);
  if (!url || !hostPermitido(url)) return { ok: false, texto: "" };
  const html = await fetchTexto(url);
  if (!html) return { ok: false, texto: "" };
  const desc = metaConteudo(html, "description") || metaConteudo(html, "og:description");
  const titulo = metaConteudo(html, "og:title") || (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "");
  const corpo = htmlParaTexto(html).slice(0, 9000);
  const partes = [titulo && `Título: ${titulo}`, desc && `Descrição: ${desc}`, corpo && `Conteúdo: ${corpo}`]
    .filter(Boolean)
    .join("\n");
  return { ok: partes.length > 40, texto: partes };
}

function extractJsonObject(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
    throw new Error("A IA não retornou um JSON válido.");
  }
}

async function callLLM(prompt: string): Promise<string> {
  const p = resolveLLM();
  if (!p) throw new Error("Nenhuma chave de IA configurada. Defina OPENAI_API_KEY (ou LOVABLE_API_KEY) nos secrets do Supabase.");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${p.key}`,
  };
  if (p.lovable) {
    headers["Lovable-API-Key"] = p.key;
    headers["X-Lovable-AIG-SDK"] = "pmc-edge";
  }
  const res = await fetch(`${p.base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: p.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const d = await req.json().catch(() => ({}));
    const site = String(d.site || "").trim();
    const nome = String(d.nome_negocio || "").trim();

    if (!site) {
      return jsonRes({ error: "Informe o site da empresa para a IA analisar." }, 400);
    }

    const siteRes = await coletarSite(site);

    if (!siteRes.ok) {
      return jsonRes({
        error:
          "Não consegui acessar o site (pode estar fora do ar, com endereço errado ou bloqueando robôs). Confira o endereço e tente de novo.",
      }, 422);
    }

    const contexto = [
      nome && `Nome informado: ${nome}`,
      `URL do site: ${normalizarSite(site)}`,
      `--- CONTEÚDO DO SITE ---\n${siteRes.texto}`,
    ].filter(Boolean).join("\n\n");

    const prompt = `Você é o consultor sênior do Método MC (Multiplicador de Crescimento) da PMC, especialista em negócios e implementação de IA. Analisou o site de uma empresa cliente. Extraia APENAS informações fundamentadas no conteúdo abaixo — NÃO invente dados. Se algo não estiver claro no material, escreva "não identificado".

${contexto.slice(0, 16000)}

Responda em português do Brasil, SOMENTE com um JSON válido (sem markdown ao redor), neste formato exato:
{
  "resumo": "2-3 frases sobre o que é o negócio",
  "nicho": "nicho/segmento de atuação",
  "o_que_vende": "principais produtos ou serviços",
  "proposta_valor": "a promessa central / diferencial percebido",
  "publico_alvo": "para quem a empresa vende",
  "diferenciais": ["3-5 diferenciais ou pontos fortes observados"],
  "presenca_digital": "leitura da presença online a partir do site: o que existe, o que chama atenção",
  "oportunidades_ia": ["3-5 oportunidades concretas de IA/automação/sistemas para este negócio no Método MC"],
  "markdown": "análise executiva completa e organizada em markdown (títulos e bullets), pronta para o consultor ler"
}`;

    const raw = extractJsonObject(await callLLM(prompt));
    const arr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);
    const out = {
      resumo: String(raw.resumo ?? "").trim(),
      nicho: String(raw.nicho ?? "").trim(),
      o_que_vende: String(raw.o_que_vende ?? "").trim(),
      proposta_valor: String(raw.proposta_valor ?? "").trim(),
      publico_alvo: String(raw.publico_alvo ?? "").trim(),
      diferenciais: arr(raw.diferenciais),
      presenca_digital: String(raw.presenca_digital ?? "").trim(),
      oportunidades_ia: arr(raw.oportunidades_ia),
      markdown: String(raw.markdown ?? "").trim(),
      fontes: ["site"],
    };
    return jsonRes(out);
  } catch (err) {
    const m = mapError(err);
    return jsonRes({ error: m.message }, m.status);
  }
});
