import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { criarEvento, type NovoEvento } from "../_shared/google-calendar.ts"

interface Body {
  slug: string
  data: string
  horario: string
  cliente_nome: string
  cliente_email: string
  codigo_cliente: number
  cliente_telefone?: string | null
  observacoes?: string | null
}

interface Consultor {
  id: string
  nome: string
  slug: string
  email: string | null
  email_calendar: string
  tabela_destino: "reunioes_galdino" | "reunioes_mentoria_new" | "reunioes_blackcrm"
  tipo_reuniao: "implementacao" | "tutoria" | null
  duracao_padrao_minutos: number
  ativo: boolean
}

const TZ = "America/Fortaleza"
const TZ_OFFSET = "-03:00"

// Whitelist de caixas Workspace válidas (DWD configurada). Espelho de
// EMAILS_CALENDAR_VALIDOS em web/src/lib/atendimentos.ts.
const EMAILS_CALENDAR_VALIDOS = new Set([
  "dono@rafaelgaldino.com.br",
  "consultor@rafaelgaldino.com.br",
  "consultores@rafaelgaldino.com.br",
  "especialistablackcrm@rafaelgaldino.com.br",
  "mentor@rafaelgaldino.com.br",
])

function addMinutos(h5: string, mins: number): string {
  const [hh, mm] = h5.split(":").map(Number)
  const total = hh * 60 + mm + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`
}

function tituloEvento(consultor: Consultor, cliente_nome: string, empresa: string | null): string {
  const empresaTxt = empresa ? ` — ${empresa}` : ""
  if (consultor.tabela_destino === "reunioes_galdino") {
    return `PMC - Reunião Individual - Rafael Galdino (${cliente_nome})${empresaTxt}`
  }
  if (consultor.tabela_destino === "reunioes_blackcrm") {
    const t = consultor.tipo_reuniao === "implementacao" ? "Implementação" : "Tutoria"
    return `[PMC - ${consultor.nome}] ${t}${empresaTxt}`
  }
  return `[PMC] Acompanhamento com Consultor ${consultor.nome} (${cliente_nome})${empresaTxt}`
}

function descricaoEvento(opts: {
  cliente_nome: string
  cliente_email: string
  cliente_telefone: string | null
  empresa: string | null
  observacoes: string | null
  codigo_cliente: number | null
}): string {
  const linhas = [
    `Cliente: ${opts.cliente_nome}`,
    `Email: ${opts.cliente_email}`,
  ]
  if (opts.cliente_telefone) linhas.push(`Telefone: ${opts.cliente_telefone}`)
  if (opts.empresa) linhas.push(`Empresa: ${opts.empresa}`)
  if (opts.observacoes) linhas.push("", `Observações: ${opts.observacoes}`)
  if (opts.codigo_cliente) linhas.push("", `Código do cliente: ${opts.codigo_cliente}`)
  return linhas.join("\n")
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
    const {
      slug,
      data,
      horario,
      cliente_nome,
      cliente_email,
      cliente_telefone,
      observacoes,
    } = body

    if (!slug || !data || !horario || !cliente_nome || !cliente_email) {
      return jsonResponse({ error: "Campos obrigatórios faltando" }, 400)
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente_email)) {
      return jsonResponse({ error: "Email inválido" }, 400)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return jsonResponse({ error: "Data inválida (use YYYY-MM-DD)" }, 400)
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(horario)) {
      return jsonResponse({ error: "Horário inválido (use HH:MM)" }, 400)
    }
    const codigo_cliente = Number(body.codigo_cliente)
    if (!Number.isInteger(codigo_cliente) || codigo_cliente <= 0) {
      return jsonResponse({ error: "Código da empresa obrigatório" }, 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    const { data: consultor, error: cErr } = await supabase
      .from("consultores_atendimento")
      .select("*")
      .eq("slug", slug)
      .eq("ativo", true)
      .maybeSingle<Consultor>()

    if (cErr || !consultor) {
      return jsonResponse({ error: "Consultor não encontrado ou inativo" }, 404)
    }

    const dataDate = new Date(data + "T00:00:00")
    const diaSemana = dataDate.getDay()
    const { data: janelas } = await supabase
      .from("consultores_disponibilidade")
      .select("hora_inicio, hora_fim")
      .eq("consultor_id", consultor.id)
      .eq("dia_semana", diaSemana)

    const h5 = horario.slice(0, 5)
    const dentroJanela = ((janelas as { hora_inicio: string; hora_fim: string }[] | null) ?? []).some(j => {
      const ini = j.hora_inicio.slice(0, 5)
      const fim = j.hora_fim.slice(0, 5)
      return h5 >= ini && h5 < fim
    })
    if (!dentroJanela) {
      return jsonResponse({ error: "Horário fora da janela de disponibilidade do consultor" }, 400)
    }

    const { data: existentes } = await supabase
      .from("agendamentos_central")
      .select("horario, status_agendamento")
      .eq("consultor_nome", consultor.nome)
      .eq("data_reuniao", data)
    const conflito = ((existentes as { horario: string | null; status_agendamento: string | null }[] | null) ?? []).some(e => {
      if (e.status_agendamento === "cancelado") return false
      return (e.horario ?? "").slice(0, 5) === h5
    })
    if (conflito) {
      return jsonResponse({ error: "Esse horário já foi reservado por outra pessoa. Escolha outro." }, 409)
    }

    const { data: matchCli, error: cliErr } = await supabase
      .from("clientes_formulario")
      .select("id_cliente, empresa_nome, codigo_cliente")
      .eq("codigo_cliente", codigo_cliente)
      .maybeSingle<{ id_cliente: string; empresa_nome: string | null; codigo_cliente: number }>()

    if (cliErr) {
      return jsonResponse({ error: "Erro ao consultar cadastro: " + cliErr.message }, 500)
    }
    if (!matchCli) {
      return jsonResponse({ error: "Código não encontrado" }, 404)
    }

    const id_unico = crypto.randomUUID()
    const horarioStr = h5 + ":00"
    const ano = dataDate.getFullYear()
    const mes = dataDate.getMonth() + 1
    const empresaFinal = matchCli.empresa_nome

    const base: Record<string, unknown> = {
      id_unico,
      data_reuniao: data,
      horario: horarioStr,
      ano,
      mes,
      pessoa: cliente_nome,
      empresa: empresaFinal,
      cliente_email: cliente_email.toLowerCase(),
      cliente_telefone: cliente_telefone ?? null,
      duracao_minutos: consultor.duracao_padrao_minutos,
      status_agendamento: "pendente_sync",
      criado_via: "agendamento_publico",
      observacoes: observacoes ?? null,
    }

    base.id_cliente = matchCli.id_cliente
    base.codigo_cliente = matchCli.codigo_cliente

    if (consultor.tabela_destino === "reunioes_mentoria_new") {
      base.mentor = consultor.nome
    } else if (consultor.tabela_destino === "reunioes_blackcrm") {
      base.responsavel = consultor.nome
      base.tipo_reuniao = consultor.tipo_reuniao ?? "tutoria"
    }

    const { error: insErr } = await supabase
      .from(consultor.tabela_destino)
      .insert(base)

    if (insErr) {
      return jsonResponse({ error: "Erro ao salvar agendamento: " + insErr.message }, 500)
    }

    const origem =
      consultor.tabela_destino === "reunioes_galdino"
        ? "galdino"
        : consultor.tabela_destino === "reunioes_blackcrm"
        ? "blackcrm"
        : "mentoria"

    // 6. Cria evento no Google Calendar (sincronamente).
    //    Falha aqui mantém pendente_sync — cliente sempre vê sucesso.
    let evento_id: string | null = null
    let link_meet: string | null = null
    let sync_erro: string | null = null

    const emailOrganizador = consultor.email_calendar
    if (!EMAILS_CALENDAR_VALIDOS.has(emailOrganizador)) {
      return jsonResponse({
        error: `Email do calendar inválido pro consultor (${emailOrganizador}). Configure no admin com uma das caixas autorizadas.`,
      }, 400)
    }

    try {
      const startISO = `${data}T${horarioStr}${TZ_OFFSET}`
      const endHorario = addMinutos(h5, consultor.duracao_padrao_minutos) + ":00"
      const endISO = `${data}T${endHorario}${TZ_OFFSET}`

      const payload: NovoEvento = {
        summary: tituloEvento(consultor, cliente_nome, empresaFinal),
        description: descricaoEvento({
          cliente_nome,
          cliente_email: cliente_email.toLowerCase(),
          cliente_telefone: cliente_telefone ?? null,
          empresa: empresaFinal,
          observacoes: observacoes ?? null,
          codigo_cliente: matchCli.codigo_cliente,
        }),
        start: { dateTime: startISO, timeZone: TZ },
        end: { dateTime: endISO, timeZone: TZ },
        attendees: [
          { email: cliente_email.toLowerCase(), displayName: cliente_nome, responseStatus: "accepted" },
          { email: consultor.email_calendar, displayName: consultor.nome, responseStatus: "accepted" },
          ...(consultor.email && consultor.email !== consultor.email_calendar
            ? [{ email: consultor.email, displayName: consultor.nome, responseStatus: "accepted" as const }]
            : []),
        ],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }

      const evento = await criarEvento(emailOrganizador, payload)
      evento_id = evento.id
      link_meet =
        evento.hangoutLink ??
        evento.conferenceData?.entryPoints?.find(p => p.entryPointType === "video")?.uri ??
        null

      await supabase
        .from(consultor.tabela_destino)
        .update({
          id_reuniao: evento_id,
          link_meet,
          status_agendamento: "confirmado",
        })
        .eq("id_unico", id_unico)
    } catch (e) {
      sync_erro = e instanceof Error ? e.message : String(e)
      console.error("[criar-agendamento] Falha ao criar evento Google Calendar:", sync_erro)
    }

    return jsonResponse({
      ok: true,
      id_unico,
      origem,
      slug: consultor.slug,
      data,
      horario: h5,
      status: evento_id ? "confirmado" : "pendente_sync",
      evento_id,
      link_meet,
      sync_erro,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
