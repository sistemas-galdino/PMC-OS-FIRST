import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { atualizarEventoEm } from "../_shared/google-calendar.ts"
import { tituloEvento, descricaoEvento, type TabelaDestino } from "../_shared/agendamento-evento.ts"

type Origem = "galdino" | "mentoria" | "blackcrm"

interface Body {
  origem: Origem
  id_unico: string
  codigo_cliente: number
}

const TABELA_ORIGEM: Record<Origem, TabelaDestino> = {
  galdino: "reunioes_galdino",
  mentoria: "reunioes_mentoria_new",
  blackcrm: "reunioes_blackcrm",
}

const EMAILS_CALENDAR_VALIDOS = [
  "dono@rafaelgaldino.com.br",
  "consultor@rafaelgaldino.com.br",
  "consultores@rafaelgaldino.com.br",
  "especialistablackcrm@rafaelgaldino.com.br",
  "mentor@rafaelgaldino.com.br",
] as const

interface Linha {
  id_reuniao: string | null
  pessoa: string | null
  cliente_email: string | null
  cliente_telefone: string | null
  observacoes: string | null
  tipo_reuniao?: "implementacao" | "tutoria" | null
  assunto?: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405)
  }

  try {
    const body = (await req.json()) as Body
    const { origem, id_unico } = body

    if (!origem || !TABELA_ORIGEM[origem] || !id_unico) {
      return jsonResponse({ error: "origem e id_unico obrigatórios" }, 400)
    }
    const codigo_cliente = Number(body.codigo_cliente)
    if (!Number.isInteger(codigo_cliente) || codigo_cliente <= 0) {
      return jsonResponse({ error: "Código do cliente inválido" }, 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    const tabela = TABELA_ORIGEM[origem]

    // 1. Valida o novo código no cadastro (fonte de id_cliente + empresa).
    const { data: matchCli, error: cliErr } = await supabase
      .from("clientes_formulario")
      .select("id_cliente, empresa_nome, codigo_cliente")
      .eq("codigo_cliente", codigo_cliente)
      .maybeSingle<{ id_cliente: string; empresa_nome: string | null; codigo_cliente: number }>()

    if (cliErr) {
      return jsonResponse({ error: "Erro ao consultar cadastro: " + cliErr.message }, 500)
    }
    if (!matchCli) {
      // Falha de validação esperada (admin digitou código que não existe):
      // 200 ok:false pra o front ler a mensagem sem precisar parsear o erro HTTP.
      return jsonResponse({ ok: false, error: "Código não encontrado no cadastro" }, 200)
    }

    // 2. Lê a linha atual (campos pro evento). tipo_reuniao/assunto só existem no blackcrm.
    const colunas = "id_reuniao, pessoa, cliente_email, cliente_telefone, observacoes" +
      (origem === "blackcrm" ? ", tipo_reuniao, assunto" : "")
    const { data: row, error: selErr } = await supabase
      .from(tabela)
      .select(colunas)
      .eq("id_unico", id_unico)
      .maybeSingle<Linha>()

    if (selErr) {
      return jsonResponse({ error: "Erro ao consultar agendamento: " + selErr.message }, 500)
    }
    if (!row) {
      return jsonResponse({ error: "Agendamento não encontrado" }, 404)
    }

    const empresaFinal = matchCli.empresa_nome

    // 3. Reatribui no banco: id_cliente (RLS/painel) + código (exibição) + empresa.
    const { error: updErr } = await supabase
      .from(tabela)
      .update({
        id_cliente: matchCli.id_cliente,
        codigo_cliente: matchCli.codigo_cliente,
        empresa: empresaFinal,
      })
      .eq("id_unico", id_unico)

    if (updErr) {
      return jsonResponse({ error: "Erro ao reatribuir no banco: " + updErr.message }, 500)
    }

    // 4. Atualiza título/descrição do evento no Google Calendar com a nova empresa/código.
    let atualizado_gcal = false
    let gcal_erro: string | null = null
    if (row.id_reuniao) {
      // Descobre consultor (nome pro título) e caixa do organizador.
      let consultorNome = ""
      let emailOrganizador: string | null = null
      const { data: agView } = await supabase
        .from("agendamentos_central")
        .select("consultor_nome")
        .eq("id_unico", id_unico)
        .maybeSingle<{ consultor_nome: string | null }>()
      if (agView?.consultor_nome) {
        consultorNome = agView.consultor_nome
        const { data: cons } = await supabase
          .from("consultores_atendimento")
          .select("email_calendar")
          .eq("nome", agView.consultor_nome)
          .maybeSingle<{ email_calendar: string | null }>()
        emailOrganizador = cons?.email_calendar ?? null
      }

      const summary = tituloEvento({
        tabela_destino: tabela,
        nome: consultorNome,
        tipo_reuniao: row.tipo_reuniao ?? null,
        cliente_nome: row.pessoa ?? "Cliente",
        empresa: empresaFinal,
        assunto: row.assunto ?? null,
      })
      const description = descricaoEvento({
        cliente_nome: row.pessoa ?? "Cliente",
        cliente_email: row.cliente_email ?? "",
        cliente_telefone: row.cliente_telefone ?? null,
        empresa: empresaFinal,
        observacoes: row.observacoes ?? null,
        codigo_cliente: matchCli.codigo_cliente,
        assunto: row.assunto ?? null,
      })

      const candidatos: string[] = []
      if (emailOrganizador) candidatos.push(emailOrganizador)
      for (const e of EMAILS_CALENDAR_VALIDOS) {
        if (!candidatos.includes(e)) candidatos.push(e)
      }
      const erros: string[] = []
      for (const email of candidatos) {
        try {
          await atualizarEventoEm({
            subject: email,
            calendarId: email,
            eventId: row.id_reuniao,
            payload: { summary, description },
          })
          atualizado_gcal = true
          break
        } catch (err) {
          erros.push(`${email}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      if (!atualizado_gcal && erros.length > 0) {
        gcal_erro = erros.join(" | ")
        console.error("[reatribuir-cliente-agendamento] Falha em todas as caixas:", gcal_erro)
      }
    }

    return jsonResponse({ ok: true, empresa: empresaFinal, atualizado_gcal, gcal_erro })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
