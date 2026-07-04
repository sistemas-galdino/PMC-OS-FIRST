import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Guardião OS — diagnóstico de gargalo (IA). Porta de IA-Guardian-Hub/src/lib/ai.functions.ts.
// Provider: OpenAI-compatible (default = Lovable AI Gateway). Chave via secret LOVABLE_API_KEY.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BASE = Deno.env.get("LLM_BASE_URL") ?? "https://ai.gateway.lovable.dev/v1";
const MODEL = Deno.env.get("LLM_MODEL") ?? "google/gemini-3-flash-preview";

function getKey(): string {
  return Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("LLM_API_KEY") ?? "";
}

function mapError(err: unknown): { status: number; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  if (/429|rate.?limit/i.test(message)) return { status: 429, message: "RATE_LIMIT: A IA está ocupada. Tente novamente em alguns segundos." };
  if (/402|credit|payment/i.test(message)) return { status: 402, message: "CREDITS_EXHAUSTED: Créditos de IA esgotados. Adicione créditos no provedor de IA." };
  return { status: 400, message: `AI_ERROR: ${message}` };
}

async function callLLM(prompt: string, opts: { json?: boolean } = {}): Promise<string> {
  const key = getKey();
  if (!key) throw new Error("LLM key not configured (defina o secret LOVABLE_API_KEY no Supabase).");
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "Authorization": `Bearer ${key}`,
      "X-Lovable-AIG-SDK": "pmc-edge",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
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

const pad2 = (n: number) => String(n).padStart(2, "0");
const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const d = await req.json().catch(() => ({}));
    const impactos: string[] = Array.isArray(d.impactos) ? d.impactos : [];
    const faseAtual = Number(d.faseAtual ?? 1) || 1;

    const prompt = `Você é o Guardião de IA da PMC (Multiplicador de Crescimento), especialista em diagnosticar gargalos operacionais e propor soluções com IA, automação e sistemas.

Empresa está na Fase ${pad2(faseAtual)} da jornada de transformação.

Gargalo no setor "${d.setorNome || "—"}":
- Processo: ${d.processo || "—"}
- Descrição: ${d.descricao || "—"}
- Onde trava: ${d.ondeTrava || "—"}
- Quem executa: ${d.quemExecuta || "—"}
- Tempo gasto: ${d.tempo || "—"}
- Ferramentas atuais: ${d.ferramentas || "—"}
- Impactos: ${impactos.join(", ") || "—"}
- Frequência: ${d.frequencia || "—"}

Diagnostique este gargalo com tom executivo, direto e prático. A análise será apresentada ao CEO da empresa. Seja específico (sem genéricos como "implementar melhorias"). As tarefas devem ser acionáveis em até 30 dias.

Responda SOMENTE com um JSON válido, sem markdown, sem texto antes/depois, neste formato exato:
{
  "analiseIA": "análise executiva do gargalo em 3-5 parágrafos curtos (markdown leve com bullets)",
  "causaRaiz": "frase única identificando a causa raiz",
  "tipoSolucao": "um de: Sistema | Automação | Copiloto de IA | Reorganização de processo | Treinamento",
  "prioridade": "um de: Alta | Média | Baixa",
  "tarefasSugeridas": ["3 a 8 próximos passos práticos, verbo no infinitivo"]
}`;

    const raw = extractJsonObject(await callLLM(prompt, { json: true }));
    const tiposOk = ["Sistema", "Automação", "Copiloto de IA", "Reorganização de processo", "Treinamento"];
    const prioOk = ["Alta", "Média", "Baixa"];
    const out = {
      analiseIA: String(raw.analiseIA ?? "").trim(),
      causaRaiz: String(raw.causaRaiz ?? "").trim(),
      tipoSolucao: tiposOk.includes(raw.tipoSolucao as string) ? raw.tipoSolucao : "Sistema",
      prioridade: prioOk.includes(raw.prioridade as string) ? raw.prioridade : "Média",
      tarefasSugeridas: (Array.isArray(raw.tarefasSugeridas) ? raw.tarefasSugeridas : []).map((x: unknown) => String(x).trim()).filter(Boolean),
    };
    return jsonRes(out);
  } catch (err) {
    const m = mapError(err);
    return jsonRes({ error: m.message }, m.status);
  }
});
