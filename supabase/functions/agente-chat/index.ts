// Agente de IA (admin) — chat em streaming com acesso READ-ONLY ao banco.
// Vercel AI SDK rodando no Deno via specifiers npm:. Modelo: OpenAI gpt-5.5 (raciocinio).
//
// Seguranca:
//  - verify_jwt = true (padrao) -> so chamadas autenticadas chegam aqui.
//  - checagem is_admin (email em `mentores`) -> 403 se nao for admin.
//  - tools chamam RPCs (agent_run_sql / agent_describe_schema) que sao read-only,
//    re-checam admin e rodam como role agent_ro (RLS aplicada, sem privilegio de escrita).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { streamText, tool, convertToCoreMessages } from "npm:ai@4"
import { createOpenAI } from "npm:@ai-sdk/openai@1"
import { z } from "npm:zod@3"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"

const SCHEMA_DOC = `
Banco Postgres (Supabase) do programa PMC. Tabelas/views principais (somente leitura):

- agendamentos_central (VIEW — visao UNIFICADA de TODAS as reunioes; use para perguntas gerais de reuniao/agenda):
    origem ('galdino'|'mentoria'|'blackcrm'), id_unico, id_reuniao, data_reuniao (date),
    horario, consultor_nome, cliente_nome, cliente_email, empresa, status_agendamento,
    codigo_cliente (NUMERO do cliente), id_cliente, link_meet, link_gravacao
- reunioes_mentoria_new (reunioes com consultores; tem transcricao/resumo). ATENCAO: esta tabela tambem guarda os atendimentos do time de Sucesso do Cliente — ao contar/analisar CONSULTORIA, filtre equipe = 'consultor' (equipe = 'sucesso_cliente' é onboarding/alinhamento do CS):
    id_unico (uuid), id_cliente (uuid), id_reuniao, data_reuniao (date), horario, mentor,
    pessoa, empresa, cliente_email, status_agendamento, link_meet, link_gravacao,
    link_geminidoc, transcricao, resumo
- reunioes_galdino (reunioes 1:1 do Galdino): colunas semelhantes + duracao_minutos
- reunioes_blackcrm: id_unico (text), id_cliente (text), data_reuniao (TEXT 'AAAA-MM-DD'),
    horario (text), responsavel, pessoa, empresa, status_agendamento, link_meet,
    link_gravacao, transcricao, resumo, codigo_cliente, nps
- clientes_entrada_new (clientes do programa):
    id_entrada, id_cliente (uuid), nome_cliente_formatado, nome_empresa_formatado,
    codigo_cliente, email, sc (CS responsavel), status_atual, nivel_engajamento
- consultores_atendimento: nome, slug, email, tipo_reuniao, duracao_padrao_minutos, ativo
- consultores_disponibilidade / consultores_excecoes: agenda dos consultores
- recursos_programa: titulo, url, categoria, ativo
- cliente_atividades, cliente_cancelamento, cliente_metas, cliente_objetivos_programa,
  cliente_produtos, cliente_canais: detalhes por cliente
- mentores: equipe/admins (email, ...)

Convencoes importantes:
- IDENTIFICACAO DO CLIENTE: cada cliente tem um numero (codigo_cliente). "cliente 234" =>
  filtre por codigo_cliente = 234 (numerico), nao trate como nome. Alternativa: achar por nome
  (pessoa / nome_cliente_formatado / nome_empresa_formatado com ILIKE).
- Empresa do cliente = nome_empresa_formatado (clientes_entrada_new) ou empresa (nas reunioes).
- reunioes_blackcrm.data_reuniao e TEXT no formato 'AAAA-MM-DD' (compare como texto ou ::date).
- Para reuniao/agenda em geral prefira agendamentos_central; para transcricao/resumo use as
  tabelas de detalhe (reunioes_*).
`.trim()

function systemPrompt(hoje: string, diaSemana: string): string {
  return [
    "Voce e um analista de dados interno do PMC OS, usado pela equipe (admins) para apurar reunioes,",
    "clientes, agendamentos e tudo do programa. Responda SEMPRE em portugues do Brasil, de forma",
    "objetiva e citando numeros concretos. Quando fizer sentido, formate em tabela markdown.",
    "",
    `Hoje e ${hoje} (${diaSemana}), no fuso de Sao Paulo. 'amanha' = hoje+1; 'esta semana' = seg a dom.`,
    "",
    "FERRAMENTAS (somente leitura): `consultar_banco` roda UMA query SELECT em Postgres e devolve as",
    "linhas; `descrever_schema` lista colunas/tipos das tabelas. Voce NAO pode alterar nada — se",
    "pedirem criar/editar/apagar, explique que e somente leitura. Se uma tool retornar `erro`, diga",
    "brevemente que houve um problema tecnico e NAO invente dados.",
    "",
    "POSTURA: voce EXPLORA o banco antes de concluir, como um analista — nao faz um match exato e",
    "desiste. Encadeie quantas queries precisar (ate o limite de passos): consulte, leia o resultado,",
    "ajuste e consulte de novo. So afirme que 'nao existe' DEPOIS de ter tentado a versao ampla.",
    "",
    "REGRAS DE BUSCA:",
    "- BUSCA APROXIMADA para qualquer texto (consultor, pessoa, empresa, cliente, CS): use sempre",
    "  `ILIKE '%termo%'`, NUNCA `=` exato. Os nomes no banco podem estar completos ou diferentes do",
    "  que o usuario digitou (ex.: 'David' esta como 'David Abner'; 'Maxsuell' como 'Maxsuell Lopes').",
    "- DESCOBRIR VALORES REAIS: se um filtro vier vazio ou voce nao souber como um valor e escrito,",
    "  rode `SELECT DISTINCT <coluna> FROM <tabela> WHERE <coluna> ILIKE '%termo%'` (ou liste os",
    "  DISTINCT mais comuns) para ver o que realmente existe, e refine a partir dai. Use",
    "  `descrever_schema` se estiver em duvida sobre nomes de tabela/coluna.",
    "- AFROUXAR UM FILTRO POR VEZ: se vier vazio, remova o filtro mais provavel de estar errado",
    "  (consultor, status, data) e tente de novo — ate sobrar so o essencial — antes de dizer que",
    "  nao ha. Reduza a query ao minimo (ex.: so por codigo_cliente) na duvida.",
    "- NAVEGAR ENTRE TABELAS: cruze tabelas relacionadas para montar a resposta completa",
    "  (reunioes <-> clientes_entrada_new por codigo_cliente; cliente_atividades, cliente_metas,",
    "  cliente_cancelamento por id_cliente/codigo_cliente). Faca JOIN ou queries sucessivas.",
    "",
    "REGRAS DO DOMINIO (mantém precisao):",
    "- Cliente e identificado pelo NUMERO `codigo_cliente`. 'cliente 234' => filtre por",
    "  codigo_cliente = 234 (numerico); nao trate 234 como nome.",
    "- Ao buscar a reuniao de um cliente, NAO adicione filtro por consultor por conta propria — o",
    "  codigo do cliente ja identifica. So filtre por consultor se o usuario pedir explicitamente as",
    "  reunioes de um consultor; e mesmo assim use ILIKE no nome.",
    "- NAO filtre por status a menos que peçam explicitamente um status.",
    `- Proxima reuniao de um cliente: data_reuniao >= '${hoje}' (INCLUI hoje), ordenado por data.`,
    "",
    "BRIEFING ('o que preciso saber pra reuniao com o cliente X'): reuna e resuma (1) dados do",
    "cliente em clientes_entrada_new pelo codigo_cliente (empresa=nome_empresa_formatado, CS=sc,",
    "status_atual, nivel_engajamento); (2) a reuniao em agendamentos_central (data, horario,",
    "consultor, status, link_meet); (3) historico: ultimas reunioes com resumo/transcricao",
    "(reunioes_*) e atividades pendentes em cliente_atividades.",
    "",
    "Esquema do banco:",
    SCHEMA_DOC,
  ].join("\n")
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) return jsonResponse({ error: "OPENAI_API_KEY nao configurada" }, 500)

    // Client com o JWT do chamador -> RLS e is_admin valem como o usuario logado.
    const authHeader = req.headers.get("Authorization") ?? ""
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    // Gate: so admin (email em `mentores`).
    const { data: userData } = await supabase.auth.getUser()
    const email = userData?.user?.email
    if (!email) return jsonResponse({ error: "nao autenticado" }, 401)
    const { data: mentor } = await supabase
      .from("mentores").select("id").eq("email", email).maybeSingle()
    if (!mentor) return jsonResponse({ error: "acesso restrito a administradores" }, 403)

    const body = await req.json()
    const messages = body?.messages ?? []
    const conversationId: string | null = body?.conversationId ?? null

    // Persiste a pergunta do usuario (ultima msg) antes de gerar.
    if (conversationId && messages.length > 0) {
      const last = messages[messages.length - 1]
      if (last?.role === "user" && typeof last?.content === "string" && last.content.trim()) {
        await supabase.from("agent_messages").insert({
          conversation_id: conversationId, role: "user", content: last.content,
        })
      }
    }

    const openai = createOpenAI({ apiKey: openaiKey })

    const consultarBanco = tool({
      description:
        "Executa UMA query SELECT (Postgres) somente-leitura no banco do programa e retorna ate 200 linhas em JSON. Use para responder qualquer pergunta sobre reunioes, clientes, agendamentos etc.",
      parameters: z.object({
        sql: z.string().describe("Uma unica instrucao SELECT/WITH valida em Postgres, sem ponto-e-virgula."),
      }),
      execute: async ({ sql }) => {
        const { data, error } = await supabase.rpc("agent_run_sql", { p_sql: sql })
        if (error) {
          console.error("agent_run_sql error:", JSON.stringify(error))
          return { erro: error.message }
        }
        return { linhas: data }
      },
    })

    const descreverSchema = tool({
      description:
        "Retorna as colunas (nome e tipo) das tabelas do programa. Use quando estiver em duvida sobre nomes de tabelas/colunas antes de escrever um SELECT.",
      parameters: z.object({
        // .nullable (e nao .optional) por causa do strict schema da Responses API do gpt-5.5:
        // todo campo precisa estar em `required`. null = descrever todas as tabelas.
        tabelas: z.array(z.string()).nullable().describe("Lista de tabelas a descrever; use null para descrever todas."),
      }),
      execute: async ({ tabelas }) => {
        const { data, error } = await supabase.rpc("agent_describe_schema", {
          p_tabelas: tabelas && tabelas.length ? tabelas : null,
        })
        if (error) {
          console.error("agent_describe_schema error:", JSON.stringify(error))
          return { erro: error.message }
        }
        return { schema: data }
      },
    })

    const agora = new Date()
    const hoje = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(agora)
    const diaSemana = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo", weekday: "long",
    }).format(agora)

    const result = streamText({
      // gpt-5.5 com tools + reasoning EXIGE a Responses API (/v1/responses); o openai()
      // default vai pro /v1/chat/completions e quebra. .responses() roteia certo.
      model: openai.responses("gpt-5.5"),
      providerOptions: { openai: { reasoningEffort: "medium" } },
      system: systemPrompt(hoje, diaSemana),
      messages: convertToCoreMessages(messages),
      tools: { consultar_banco: consultarBanco, descrever_schema: descreverSchema },
      maxSteps: 15,
      onError: (e) => {
        const m = e instanceof Error ? `${e.name}: ${e.message}` : JSON.stringify(e)
        console.error("streamText error:", m)
      },
      onFinish: async ({ text }) => {
        if (conversationId && text && text.trim()) {
          await supabase.from("agent_messages").insert({
            conversation_id: conversationId, role: "assistant", content: text,
          })
          await supabase.from("agent_conversations")
            .update({ updated_at: new Date().toISOString() }).eq("id", conversationId)
        }
      },
    })

    return result.toDataStreamResponse({
      headers: corsHeaders,
      // Propaga a mensagem real do erro pro cliente (em vez do generico "An error occurred").
      getErrorMessage: (error) => {
        const m = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        console.error("toDataStreamResponse error:", m)
        return m
      },
    })
  } catch (e) {
    return jsonResponse({ error: String(e instanceof Error ? e.message : e) }, 500)
  }
})
