import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Método MC — gerações de IA da tela /metodo (verify_jwt = true).
// Mesmo provider das funções guardiao-*: OpenAI-compatible (default Lovable AI Gateway),
// chave via secret LOVABLE_API_KEY (fallback LLM_API_KEY; overrides LLM_BASE_URL/LLM_MODEL).
//
// Tipos suportados (body.tipo):
//  - inteligencia_fluxos  {area, mes, ano, documento} -> {dados, informacao, estrategia, receita}
//  - gargalo_plano        {area, processo, descricao, quem_executa, ferramentas, horas_mes, frequencia}
//                         -> {analise, causa_raiz, tipo_solucao, prioridade, tarefas[]}
//  - copiloto_sugestoes   {colaboradores:[{nome,cargo,setor}]} -> {sugestoes:[{colaborador_nome,copiloto_nome,funcao,justificativa}]}
//  - copiloto_skill       {copiloto_nome, funcao, colaborador_nome, cargo} -> {skill_documento}
//  - economia_analise     {sistemas:[], copilotos:[], gargalos_resolvidos:[], perfis_custo:[]} ->
//                         {itens:[{referencia,tipo,natureza,recorrencia,metodo_valoracao,horas_mes,valor_mes,observacao}], resumo}  (modelo IAVS)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  if (/429|rate.?limit/i.test(message)) return { status: 429, message: "RATE_LIMIT: A IA está ocupada. Tente novamente em alguns segundos." };
  if (/402|credit|payment/i.test(message)) return { status: 402, message: "CREDITS_EXHAUSTED: Créditos de IA esgotados. Adicione créditos no provedor de IA." };
  return { status: 400, message: `AI_ERROR: ${message}` };
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
      temperature: 0.7,
      response_format: { type: "json_object" },
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

const PERSONA = `Você é o consultor sênior do Método MC (Multiplicador de Crescimento) da PMC, especialista em implementação de IA em empresas: eficiência operacional, redução de custos e crescimento de receita. Tom executivo, direto e prático — nada de genéricos como "implementar melhorias". Responda SEMPRE em português do Brasil e SOMENTE com um JSON válido, sem markdown ao redor, sem texto antes/depois.`;

function promptInteligenciaFluxos(d: Record<string, unknown>): string {
  return `${PERSONA}

FASE 2 do Método MC — Inteligência Empresarial. O cliente enviou o documento de uma área da empresa para o ciclo mensal. Gere os 4 fluxos do framework Dados → Informação → Estratégia → Receita.

Área: ${d.area || "—"}
Competência: ${d.mes || "—"}/${d.ano || "—"}
Documento da área:
"""
${String(d.documento || "—").slice(0, 12000)}
"""

Formato exato:
{
  "dados": "entregável DASHBOARD: especifique as métricas/KPIs que a área deve acompanhar, como organizá-los visualmente e a fonte de cada dado (markdown leve com bullets)",
  "informacao": "entregável ANÁLISE: analise os dados do documento — padrões, anomalias, comparativos e o que os números estão dizendo (markdown leve)",
  "estrategia": "entregável PLANO DE AÇÃO: 5-8 ações práticas priorizadas com responsável sugerido e prazo em dias (markdown leve com bullets)",
  "receita": "entregável ÚNICA COISA: a alavanca de maior impacto desta área neste mês e a ROTINA semanal para executá-la (markdown leve)"
}`;
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

As tarefas devem ser acionáveis em até 30 dias. Além do plano, você deve:
1) Criar UMA OU MAIS skills de IA que resolvam o gargalo (cada skill com documento completo pronto para colar no Claude).
2) Criar uma estrutura de ROTINA apenas se o processo precisar de cadência recorrente para não voltar a acumular; se não precisar, retorne "rotina" com "necessaria": false.

Formato exato:
{
  "analise": "análise executiva do gargalo e de como a IA substitui o processo, em 3-5 parágrafos curtos (markdown leve com bullets)",
  "causa_raiz": "frase única identificando a causa raiz",
  "tipo_solucao": "um de: Sistema | Automação | Copiloto de IA | Reorganização de processo | Treinamento",
  "prioridade": "um de: Alta | Média | Baixa",
  "tarefas": ["3 a 8 próximos passos práticos, verbo no infinitivo"],
  "skills": [
    {
      "nome": "nome curto da skill (ex.: Skill de Montagem de Propostas)",
      "objetivo": "o que a skill resolve, em 1 frase",
      "documento": "documento de skill COMPLETO em markdown, pronto para colar no Claude: papel da skill, contexto do negócio a preencher, passo a passo da tarefa, formato de entrada esperado, formato de saída, regras e limites, e 1 exemplo de uso"
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
    const out = extractJsonObject(await callLLM(prompt));
    return jsonRes(out);
  } catch (err) {
    const m = mapError(err);
    return jsonRes({ error: m.message }, m.status);
  }
});
