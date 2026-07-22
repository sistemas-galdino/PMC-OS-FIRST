import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { streamObject } from "npm:ai@4";
import { createOpenAI } from "npm:@ai-sdk/openai@1";
import { z } from "npm:zod@3";

// Método MC — gerações de IA da tela /metodo (verify_jwt = true).
// Mesmo provider das funções guardiao-*: OpenAI-compatible (default Lovable AI Gateway),
// chave via secret LOVABLE_API_KEY (fallback LLM_API_KEY; overrides LLM_BASE_URL/LLM_MODEL).
//
// Tipos suportados (body.tipo):
//  - inteligencia_fluxos  {area, mes, ano, documento} -> {dados, informacao, estrategia, receita}
//  - gargalo_plano        {area, processo, descricao, quem_executa, ferramentas, horas_mes, frequencia}
//                         -> {analise, causa_raiz, tipo_solucao, prioridade, tarefas[], skills[], rotina}
//  - copiloto_sugestoes   {colaboradores:[{nome,cargo,setor}]} -> {sugestoes:[{colaborador_nome,copiloto_nome,funcao,justificativa}]}
//  - copiloto_skill       {copiloto_nome, funcao, colaborador_nome, cargo} -> {skill_documento}
//  - economia_analise     {sistemas:[], copilotos:[], gargalos_resolvidos:[], perfis_custo:[]} ->
//                         {itens:[{referencia,tipo,natureza,recorrencia,metodo_valoracao,horas_mes,valor_mes,observacao}], resumo}  (modelo IAVS)
//
// GERAÇÃO: os 4 tipos "leves" respondem bloqueante (callLLM, JSON completo, com max_tokens+timeout+retry).
// O gargalo_plano tem TAMBÉM um caminho STREAMING (body.stream===true) via AI SDK streamObject — mesmo
// padrão do agente-chat — que transmite o JSON conforme é gerado (o cliente mostra a análise "digitando").
// Structured outputs (json_schema) garantem JSON sempre válido no caminho streaming.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Teto de segurança da geração. O tamanho real é limitado pelo PROMPT (ser conciso); este cap só evita
// runaway. Fica com folga sob o teto de wall-clock (~150s) da edge function.
const MAX_TOKENS = 3000;
// Corta a chamada ao provedor com folga abaixo do teto da plataforma (deixa a Response voltar como erro tratável).
const LLM_TIMEOUT_MS = 110_000;

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

function mapError(err: unknown): { status: number; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  if ((err instanceof Error && err.name === "AbortError") || /abort/i.test(message)) {
    return { status: 504, message: "TIMEOUT: A IA demorou demais para responder. Tente de novo com uma descrição mais enxuta." };
  }
  if (/429|rate.?limit/i.test(message)) return { status: 429, message: "RATE_LIMIT: A IA está ocupada. Tente novamente em alguns segundos." };
  if (/402|credit|payment/i.test(message)) return { status: 402, message: "CREDITS_EXHAUSTED: Créditos de IA esgotados. Adicione créditos no provedor de IA." };
  return { status: 400, message: `AI_ERROR: ${message}` };
}

function llmHeaders(p: { key: string; lovable: boolean }): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${p.key}`,
  };
  if (p.lovable) {
    headers["Lovable-API-Key"] = p.key;
    headers["X-Lovable-AIG-SDK"] = "pmc-edge";
  }
  return headers;
}

// Chamada bloqueante ao provedor. Timeout via AbortController (falha limpa em vez de estourar o wall-clock).
async function callLLM(prompt: string): Promise<string> {
  const p = resolveLLM();
  if (!p) throw new Error("Nenhuma chave de IA configurada. Defina OPENAI_API_KEY (ou LOVABLE_API_KEY) nos secrets do Supabase.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${p.base}/chat/completions`, {
      method: "POST",
      headers: llmHeaders(p),
      body: JSON.stringify({
        model: p.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

function extractJsonObject(text: string): Record<string, unknown> {
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  // Isola do primeiro { ao último } (descarta texto solto antes/depois).
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s >= 0 && e > s) cleaned = cleaned.slice(s, e + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    // Reparo leve: remove vírgulas finais antes de } ou ] (erro comum de LLM).
    const noTrailing = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    return JSON.parse(noTrailing); // se ainda falhar, o retry no handler tenta uma nova geração
  }
}

// Gera e faz o parse do JSON, com retry: o gpt-4o-mini às vezes devolve JSON inválido
// (ex.: vírgula faltando entre itens de array). Cada tentativa é uma nova geração (~8-15s).
async function generateJson(prompt: string, tentativas = 3): Promise<Record<string, unknown>> {
  let parseErr: unknown;
  for (let i = 0; i < tentativas; i++) {
    const raw = await callLLM(prompt); // erros de rede/timeout/provedor propagam (não faz retry aqui)
    try {
      return extractJsonObject(raw);
    } catch (e) {
      parseErr = e;
    }
  }
  throw parseErr ?? new Error("A IA não retornou um JSON válido.");
}

const PERSONA = `Você é o consultor sênior do Método MC (Multiplicador de Crescimento) da PMC, especialista em implementação de IA em empresas: eficiência operacional, redução de custos e crescimento de receita. Tom executivo, direto e prático — nada de genéricos como "implementar melhorias". Responda SEMPRE em português do Brasil e SOMENTE com um JSON válido, sem markdown ao redor, sem texto antes/depois. Garanta JSON ESTRITAMENTE válido: vírgula entre TODOS os itens de arrays e objetos; aspas e quebras de linha corretamente escapadas dentro das strings; não use blocos de código (crase tripla) dentro dos valores.`;

function promptInteligenciaFluxos(d: Record<string, unknown>): string {
  // Aceita múltiplos documentos ({documentos:[{nome,texto}]}) e/ou o texto
  // avulso legado ({documento}). Divide o orçamento de contexto entre eles.
  const docs = Array.isArray(d.documentos) ? (d.documentos as { nome?: string; texto?: string }[]) : [];
  const avulso = String(d.documento || "").trim();
  const fontes: { nome: string; texto: string }[] = [
    ...docs
      .filter((x) => (x?.texto || "").trim())
      .map((x, i) => ({ nome: String(x.nome || `Documento ${i + 1}`), texto: String(x.texto) })),
    ...(avulso ? [{ nome: "Texto colado", texto: avulso }] : []),
  ];
  const orcamento = Math.max(3000, Math.floor(16000 / Math.max(fontes.length, 1)));
  const blocoDocs = fontes.length
    ? fontes.map((f) => `--- DOCUMENTO: ${f.nome} ---\n${f.texto.slice(0, orcamento)}`).join("\n\n")
    : "—";

  return `${PERSONA}

FASE 2 do Método MC — Inteligência Empresarial. O cliente enviou ${fontes.length || "nenhum"} documento(s) de uma área da empresa para o ciclo mensal. Analise TODOS em conjunto (cruze os dados entre eles quando fizer sentido) e gere o framework Dados → Informação → Estratégia → Receita em formato ESTRUTURADO.

Área: ${d.area || "—"}
Competência: ${d.mes || "—"}/${d.ano || "—"}

${blocoDocs}

Regras:
- Extraia números REAIS dos documentos; nunca invente valores. Se um indicador não estiver nos documentos, não o inclua.
- "variacao" só quando o documento permitir comparar (ex.: mês anterior presente); senão use null.
- Prazos das ações em dias corridos a partir de hoje (número).
- A "unica_coisa" é UMA alavanca só — a de maior impacto, específica e mensurável.

Formato exato (JSON):
{
  "kpis": [{ "nome": "string", "valor": "string formatado (ex.: R$ 412 mil, 14,2%)", "variacao": "string curta (ex.: +8% vs mês ant.) ou null", "tendencia": "alta" | "queda" | "estavel", "comentario": "string curta ou null" }],
  "insights": [{ "tipo": "critico" | "atencao" | "positivo", "texto": "1-2 frases com a evidência numérica" }],
  "acoes": [{ "texto": "ação prática e específica", "prazo_dias": 15, "responsavel": "sugestão de papel (ex.: Financeiro, Guardião da IA) ou null" }],
  "unica_coisa": {
    "frase": "a alavanca do mês em uma frase direta",
    "por_que": "por que essa é a alavanca (1-2 frases)",
    "meta": "meta numérica do mês (ex.: margem de volta a 16%)",
    "rotina": { "cadencia": "ex.: semanal, toda segunda, 30 min", "passos": ["passo 1", "passo 2"] }
  }
}
Limites: 4-8 kpis, 3-6 insights, 4-8 acoes.`;
}

function promptGargaloPlano(d: Record<string, unknown>): string {
  return `${PERSONA}

FASE 3 do Método MC — Mapeamento de Gargalos. O guardião mapeou um processo que consome muitas horas. Proponha o plano para substituí-lo usando IA.

Gargalo na área "${d.area || "—"}":
- Processo: ${d.processo || "—"}
- Descrição: ${d.descricao || "—"}
- Quem executa: ${d.quem_executa || "—"}
- Ferramentas atuais: ${d.ferramentas || "—"}
- Horas gastas por mês: ${d.horas_mes || "—"}
- Frequência: ${d.frequencia || "—"}

Seja CONCISO e direto — o plano inteiro deve ser objetivo, sem enrolação. As tarefas devem ser acionáveis em até 30 dias. Além do plano, você deve:
1) Criar EXATAMENTE 1 skill de IA — a mais importante para resolver o gargalo — com documento completo porém ENXUTO (no máximo ~350 palavras, pronto para colar no Claude).
2) Criar uma estrutura de ROTINA apenas se o processo precisar de cadência recorrente para não voltar a acumular; se não precisar, retorne "rotina" com "necessaria": false.

Formato exato:
{
  "analise": "análise executiva do gargalo e de como a IA substitui o processo, em 2-3 parágrafos curtos (markdown leve com bullets)",
  "causa_raiz": "frase única identificando a causa raiz",
  "tipo_solucao": "um de: Sistema | Automação | Copiloto de IA | Reorganização de processo | Treinamento",
  "prioridade": "um de: Alta | Média | Baixa",
  "tarefas": ["3 a 6 próximos passos práticos, verbo no infinitivo"],
  "skills": [
    {
      "nome": "nome curto da skill (ex.: Skill de Montagem de Propostas)",
      "objetivo": "o que a skill resolve, em 1 frase",
      "documento": "documento de skill ENXUTO em markdown (máx ~350 palavras): papel da skill, contexto do negócio a preencher, passo a passo da tarefa, formato de entrada, formato de saída, regras e limites, e 1 exemplo curto"
    }
  ],
  "rotina": {
    "necessaria": true,
    "nome": "nome da rotina (ex.: Rotina semanal de propostas)",
    "cadencia": "um de: diária | semanal | quinzenal | mensal | por demanda",
    "passos": ["passos objetivos da rotina, verbo no infinitivo; vazio se necessaria=false"]
  }
}`;
}

function promptCopilotoSugestoes(d: Record<string, unknown>): string {
  const colabs = Array.isArray(d.colaboradores) ? d.colaboradores : [];
  const lista = colabs
    .map((c: Record<string, unknown>) => `- ${c.nome || "?"} | cargo: ${c.cargo || "?"} | setor: ${c.setor || "?"}`)
    .join("\n");
  return `${PERSONA}

FASE 4 do Método MC — Organograma Híbrido. Para cada colaborador abaixo, sugira co-pilotos de IA para funções REPETITIVAS feitas na frente do computador (digitação, análise, resposta, relatório, agendamento etc.). Sugira apenas onde faz sentido real; um colaborador pode ter mais de um copiloto ou nenhum.

Colaboradores:
${lista || "—"}

Formato exato:
{
  "sugestoes": [
    {
      "colaborador_nome": "nome exato da lista",
      "copiloto_nome": "nome curto do copiloto (ex.: Copiloto de Propostas)",
      "funcao": "a função repetitiva que ele executa, em 1 frase",
      "justificativa": "por que vale a pena, em 1 frase"
    }
  ]
}`;
}

function promptCopilotoSkill(d: Record<string, unknown>): string {
  return `${PERSONA}

FASE 4 do Método MC — documento de SKILL de um co-piloto de IA (instruções que serão coladas no Claude/assistente para ele executar a função).

Co-piloto: ${d.copiloto_nome || "—"}
Função: ${d.funcao || "—"}
Colaborador que o usa: ${d.colaborador_nome || "—"} (${d.cargo || "—"})

O documento deve conter: papel do copiloto, contexto do negócio a preencher, passo a passo da tarefa, formato de entrada esperado, formato de saída, regras e limites, e 1 exemplo de uso. Markdown completo, pronto para colar.

Formato exato:
{
  "skill_documento": "o documento de skill completo em markdown"
}`;
}

function promptEconomiaAnalise(d: Record<string, unknown>): string {
  const perfis = Array.isArray(d.perfis_custo) ? d.perfis_custo : [];
  const perfisTxt = perfis.length
    ? perfis.map((p: Record<string, unknown>) => `- ${p.nome}: R$ ${p.custo_hora}/h`).join("\n")
    : "— (nenhum perfil cadastrado; use R$ 56/h para trabalho operacional — salário R$ 5.000 × 1,8 ÷ 160h)";
  return `${PERSONA}

FASE 6 do Método MC — Engenharia Operacional, modelo IA Value Score (IAVS). Estime o VALOR gerado pelos sistemas, co-pilotos e gargalos resolvidos abaixo, classificando cada item nas 3 naturezas do IAVS:
- "tempo_liberado": horas que voltam ao time (co-pilotos, workflows, processos) — valor = horas/mês × custo-hora carregado do perfil que faria o trabalho.
- "custo_evitado": dinheiro que não saiu do caixa (sistema criado = horas-dev × R$ 150/h, valor ÚNICO; dashboard/análise = preço de reposição de mercado).
- "valor_decisao": use APENAS se houver evidência concreta de decisão apoiada — nunca estime por suposição.

Recorrência: "mensal" para o que rende todo mês (co-pilotos, processos); "unico" para entregas pontuais (sistema criado, análise). NUNCA registre sistema criado como valor mensal — isso infla o número e destrói credibilidade.

Perfis de custo-hora carregado da empresa:
${perfisTxt}

REGRAS DE HONESTIDADE (número conservador ganha de número inflado):
1. Só conte como custo_evitado o que a empresa realmente gastaria de qualquer jeito.
2. Prefira subestimar horas a superestimar.
3. Em "observacao" mostre a CONTA (ex.: "2h/dia × 22 dias × R$ 56/h").

Sistemas criados: ${JSON.stringify(d.sistemas ?? []).slice(0, 4000)}
Co-pilotos ativos: ${JSON.stringify(d.copilotos ?? []).slice(0, 4000)}
Gargalos resolvidos: ${JSON.stringify(d.gargalos_resolvidos ?? []).slice(0, 4000)}

Formato exato:
{
  "itens": [
    {
      "referencia": "nome do sistema/copiloto/processo",
      "tipo": "um de: sistema | copiloto | processo | workflow | dashboard | documento | analise | plano_acao | agente | prompt | decisao",
      "natureza": "um de: custo_evitado | tempo_liberado | valor_decisao",
      "recorrencia": "um de: mensal | unico",
      "metodo_valoracao": "um de: custo_hora | preco_mercado | horas_dev | decisao",
      "horas_mes": 0,
      "valor_mes": 0,
      "observacao": "a conta de como chegou no número, em 1 frase"
    }
  ],
  "resumo": "leitura executiva: quanto o IAVS acumula por ano, o que mais move o ponteiro e onde o número é conservador, em 2-3 frases"
}`;
}

// Schema do plano de gargalo — usado pelo streamObject (structured outputs => JSON sempre válido).
const planoGargaloSchema = z.object({
  analise: z.string(),
  causa_raiz: z.string(),
  tipo_solucao: z.string(),
  prioridade: z.string(),
  tarefas: z.array(z.string()),
  skills: z.array(z.object({
    nome: z.string(),
    objetivo: z.string(),
    documento: z.string(),
  })),
  rotina: z.object({
    necessaria: z.boolean(),
    nome: z.string(),
    cadencia: z.string(),
    passos: z.array(z.string()),
  }),
});

// Caminho STREAMING do gargalo: streamObject devolve a Response na hora e vai transmitindo o JSON
// conforme a IA gera (mesmo padrão do agente-chat, que flusha corretamente pelo gateway do Supabase).
// O cliente lê o texto e mostra a análise "digitando"; no fim faz o parse do JSON completo.
function streamGargaloPlano(prompt: string): Response {
  const p = resolveLLM();
  if (!p) throw new Error("Nenhuma chave de IA configurada. Defina OPENAI_API_KEY (ou LOVABLE_API_KEY) nos secrets do Supabase.");
  const openai = createOpenAI({ apiKey: p.key, baseURL: p.base });
  const result = streamObject({
    model: openai(p.model),
    schema: planoGargaloSchema,
    prompt,
    temperature: 0.4,
  });
  return result.toTextStreamResponse({ headers: cors });
}

const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const tipo = String(body.tipo || "");
    let prompt: string;
    switch (tipo) {
      case "inteligencia_fluxos": prompt = promptInteligenciaFluxos(body); break;
      case "gargalo_plano": prompt = promptGargaloPlano(body); break;
      case "copiloto_sugestoes": prompt = promptCopilotoSugestoes(body); break;
      case "copiloto_skill": prompt = promptCopilotoSkill(body); break;
      case "economia_analise": prompt = promptEconomiaAnalise(body); break;
      default: return jsonRes({ error: `tipo inválido: "${tipo}"` }, 400);
    }
    // Opt-in: só o gargalo tem streaming (a IA "digitando"). Os outros tipos seguem bloqueantes.
    if (body.stream === true && tipo === "gargalo_plano") return streamGargaloPlano(prompt);
    const out = await generateJson(prompt);
    return jsonRes(out);
  } catch (err) {
    const m = mapError(err);
    return jsonRes({ error: m.message }, m.status);
  }
});
