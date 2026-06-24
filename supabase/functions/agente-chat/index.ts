// Agente de IA (admin) — chat em streaming com acesso READ-ONLY ao banco.
// Vercel AI SDK rodando no Deno via specifiers npm:. Modelo: OpenAI gpt-4o.
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
    horario, consultor_nome, cliente_nome, cliente_email, empresa, status_agendamento
- reunioes_mentoria_new (reunioes com consultores; tem transcricao/resumo):
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
- Empresa do cliente = nome_empresa_formatado (clientes_entrada_new) ou empresa (nas reunioes).
- reunioes_blackcrm.data_reuniao e TEXT no formato 'AAAA-MM-DD' (compare como texto ou ::date).
- Para reuniao/agenda em geral prefira agendamentos_central; para transcricao/resumo use as
  tabelas de detalhe (reunioes_*).
`.trim()

function systemPrompt(hoje: string): string {
  return [
    "Voce e o assistente interno do PMC OS, usado pela equipe (admins) para apurar reunioes,",
    "clientes, agendamentos e tudo do programa. Responda SEMPRE em portugues do Brasil, de forma",
    "objetiva e citando numeros concretos. Quando fizer sentido, formate em tabela markdown.",
    "",
    `Hoje e ${hoje}.`,
    "",
    "Voce tem acesso SOMENTE LEITURA ao banco via a tool `consultar_banco` (uma unica query SELECT",
    "em Postgres). Use `descrever_schema` quando estiver em duvida sobre o nome exato de uma tabela",
    "ou coluna. Nao invente dados: se a query nao retornar linhas, diga que nao ha registros.",
    "Voce NAO pode alterar nada — se pedirem para criar/editar/apagar, explique que e somente leitura.",
    "",
    "Se uma tool retornar um objeto com `erro`, informe brevemente que houve um problema tecnico",
    "ao consultar o banco e NAO invente dados.",
    "Ao perguntarem sobre reunioes, NAO filtre por status a menos que peçam explicitamente um",
    "status; conte/lista todas as reunioes do periodo. Para datas, use a coluna `data_reuniao`",
    "(tipo date) em agendamentos_central.",
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
        tabelas: z.array(z.string()).optional().describe("Opcional: lista de tabelas a descrever; vazio = todas."),
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

    const hoje = new Date().toISOString().slice(0, 10)

    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt(hoje),
      messages: convertToCoreMessages(messages),
      tools: { consultar_banco: consultarBanco, descrever_schema: descreverSchema },
      maxSteps: 6,
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

    return result.toDataStreamResponse({ headers: corsHeaders })
  } catch (e) {
    return jsonResponse({ error: String(e instanceof Error ? e.message : e) }, 500)
  }
})
