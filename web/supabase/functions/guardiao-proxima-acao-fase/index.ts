import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Guardião OS — próximas ações para destravar uma fase (IA, markdown). Porta de ai.functions.ts.

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

async function callLLM(prompt: string): Promise<string> {
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
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const d = await req.json().catch(() => ({}));
    const faseNum = Number(d.faseNum ?? 1) || 1;
    const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
    const checklistPendente = arr(d.checklistPendente);
    const evidenciasFaltantes = arr(d.evidenciasFaltantes);
    const tarefasPendentes = arr(d.tarefasPendentes);
    const setoresEnvolvidos = arr(d.setoresEnvolvidos);

    const prompt = `Você é o Guardião de IA da PMC, ajudando o time a destravar a Fase ${pad2(faseNum)} — ${d.titulo || ""}.

Objetivo da fase: ${d.objetivo || ""}

Estado atual:
- Status: ${d.status || ""}
- Progresso: ${Number(d.progresso ?? 0)}%
- Setores envolvidos: ${setoresEnvolvidos.join(", ") || "nenhum ainda"}
- Resultado já alcançado: ${d.resultadoAlcancado || "—"}

Pendências:
- Checklist pendente: ${checklistPendente.join("; ") || "—"}
- Evidências faltantes: ${evidenciasFaltantes.join("; ") || "—"}
- Tarefas pendentes: ${tarefasPendentes.slice(0, 10).join("; ") || "—"}

Recomende **3 próximas ações concretas e priorizadas** para destravar esta fase nos próximos 7 dias. Para cada ação informe: o que fazer, quem deve fazer (papel) e qual evidência ela gera.

Formato em markdown com 3 itens numerados. Seja específico, sem genéricos.`;

    const text = await callLLM(prompt);
    return jsonRes({ text });
  } catch (err) {
    const m = mapError(err);
    return jsonRes({ error: m.message }, m.status);
  }
});
