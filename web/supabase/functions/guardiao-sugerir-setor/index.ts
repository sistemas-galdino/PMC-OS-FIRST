import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Guardião OS — sugestões estratégicas por setor (IA, JSON estruturado). Porta de ai.functions.ts.

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

type Item = { nome: string; descricao: string; faseSugerida: number; prioridade: string };

function normalizeOutput(value: unknown) {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const str = (v: unknown, fallback = "") => (typeof v === "string" ? v.trim() : fallback);
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const strArr = (v: unknown) => arr(v).map((item) => str(item)).filter(Boolean);
  const itemArr = (v: unknown): Item[] =>
    arr(v)
      .map((item) => {
        const obj = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        const nome = str(obj.nome || obj.titulo || obj.name, "Sugestão para o setor");
        return {
          nome,
          descricao: str(obj.descricao || obj.texto || obj.description, nome),
          faseSugerida: Math.min(7, Math.max(1, Number(obj.faseSugerida || obj.fase || 4) || 4)),
          prioridade: str(obj.prioridade, "Planejar"),
        };
      })
      .filter((item) => item.nome);

  return {
    diagnostico: str(raw.diagnostico, "Diagnóstico gerado com base nas informações cadastradas do setor."),
    principaisGargalos: strArr(raw.principaisGargalos),
    tarefasMaiorImpacto: strArr(raw.tarefasMaiorImpacto),
    melhorias: itemArr(raw.melhorias),
    sistemasSugeridos: itemArr(raw.sistemasSugeridos),
    agentesSugeridos: itemArr(raw.agentesSugeridos),
    automacoesSugeridas: itemArr(raw.automacoesSugeridas),
    proximaAcao: str(raw.proximaAcao, "Validar o diagnóstico com o líder e escolher o primeiro piloto."),
    resumoCEO: str(raw.resumoCEO, "O setor foi analisado e possui oportunidades de melhoria com IA, automação e organização dos processos."),
  };
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

interface Pessoa { nome?: string; cargo?: string; funcao?: string }
interface Processo { nome?: string; descricao?: string; quemExecuta?: string; ferramentas?: string; temPlanilha?: boolean; impacto?: string }
interface TarefaRep { nome?: string; frequencia?: string; tempoSemana?: number; tempoMes?: number; impactos?: string[] }
interface Gargalo { processo?: string; prioridade?: string; tempo?: string; impactos?: string[] }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const d = await req.json().catch(() => ({}));
    const faseAtual = Number(d.faseAtual ?? 1) || 1;
    const time: Pessoa[] = Array.isArray(d.time) ? d.time : [];
    const processos: Processo[] = Array.isArray(d.processos) ? d.processos : [];
    const tarefasRepetitivas: TarefaRep[] = Array.isArray(d.tarefasRepetitivas) ? d.tarefasRepetitivas : [];
    const gargalos: Gargalo[] = Array.isArray(d.gargalos) ? d.gargalos : [];

    const ctx = `Setor: ${d.setorNome || "—"}
Líder: ${d.liderNome || "—"} · Guardião: ${d.guardiaoNome || "—"}
Pessoas no time: ${Number(d.quantidadePessoas ?? 0)}
Fase atual da jornada: ${pad2(faseAtual)}

Time:
${time.map((p) => `- ${p.nome} (${p.cargo}) — ${p.funcao}`).join("\n") || "- —"}

Processos:
${processos.map((p) => `- ${p.nome}: ${p.descricao} | executa: ${p.quemExecuta} | ferramentas: ${p.ferramentas}${p.temPlanilha ? " | usa planilha" : ""}${p.impacto ? ` | impacto: ${p.impacto}` : ""}`).join("\n") || "- —"}

Tarefas repetitivas:
${tarefasRepetitivas.map((t) => `- ${t.nome} (${t.frequencia}) — ${t.tempoSemana ?? 0}h/sem · ${t.tempoMes ?? 0}h/mês — impactos: ${(t.impactos ?? []).join(", ") || "—"}`).join("\n") || "- —"}

Gargalos:
${gargalos.map((g) => `- [${g.prioridade || "Média"}] ${g.processo} (${g.tempo || ""}) — ${(g.impactos ?? []).join(", ") || "—"}`).join("\n") || "- —"}`;

    const prompt = `Você é o Guardião de IA da PMC analisando estrategicamente o setor "${d.setorNome || "—"}" para identificar onde a IA pode reduzir tempo, custo, retrabalho e melhorar decisões.

${ctx}

Gere recomendações específicas (sem genéricos). Classifique cada solução numa fase:
- Fase 02: indicador/dashboard/dado
- Fase 03: mapeamento de gargalo
- Fase 04: protótipo/teste/automação simples
- Fase 05: copiloto/agente/rotina
- Fase 06: sistema/MVP interno
- Fase 07: marketing/comercial/crescimento

Sistemas devem ter nomes do tipo "Sistema de Indicadores Semanais do Marketing". Agentes do tipo "Copiloto de Relatório Semanal". Automações do tipo "Geração automática do resumo de fechamento".

Responda somente com um JSON válido, sem markdown, sem comentários e sem texto antes/depois, neste formato:
{
  "diagnostico": "texto executivo do diagnóstico",
  "principaisGargalos": ["gargalo 1", "gargalo 2"],
  "tarefasMaiorImpacto": ["tarefa 1", "tarefa 2"],
  "melhorias": [{"nome":"...","descricao":"...","faseSugerida":4,"prioridade":"Fazer agora"}],
  "sistemasSugeridos": [{"nome":"...","descricao":"...","faseSugerida":6,"prioridade":"Planejar"}],
  "agentesSugeridos": [{"nome":"...","descricao":"...","faseSugerida":5,"prioridade":"Planejar"}],
  "automacoesSugeridas": [{"nome":"...","descricao":"...","faseSugerida":4,"prioridade":"Fazer agora"}],
  "proximaAcao": "ação imediata recomendada",
  "resumoCEO": "parágrafo pronto para o CEO"
}`;

    const out = normalizeOutput(extractJsonObject(await callLLM(prompt, { json: true })));
    return jsonRes(out);
  } catch (err) {
    const m = mapError(err);
    return jsonRes({ error: m.message }, m.status);
  }
});
