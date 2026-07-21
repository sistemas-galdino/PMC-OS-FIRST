import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { criarEvento, type NovoEvento } from "../_shared/google-calendar.ts"
import { tituloEvento, descricaoEvento } from "../_shared/agendamento-evento.ts"

interface Body {
  slug: string
  data: string
  horario: string
  cliente_nome: string
  cliente_email: string
  codigo_cliente: number
  cliente_telefone?: string | null
  observacoes?: string | null
  assunto?: string | null // slug do tipo de reunião escolhido (quando o consultor tem 2+)
}

interface TipoReuniao {
  slug: string
  label: string
  descricao?: string
}

interface Consultor {
  id: string
  nome: string
  slug: string
  email: string | null
  email_calendar: string
  tabela_destino: "reunioes_galdino" | "reunioes_mentoria_new" | "reunioes_blackcrm"
  tipo_reuniao: "implementacao" | "tutoria" | null
  tipos_reuniao: TipoReuniao[] | null
  duracao_padrao_minutos: number
  ativo: boolean
  cor_agenda: number | null
}

const TZ = "America/Fortaleza"
const TZ_OFFSET = "-03:00"

// Anti-spam por IP: cada agendamento cria um evento real no Google Calendar, então
// limitamos o flood. Ajuste fino aqui. (Tabela: public.agendamento_rate_limit)
const RL_JANELA_MIN = 10 // janela curta, em minutos
const RL_MAX_JANELA = 5 // máx. de tentativas na janela curta
const RL_MAX_DIA = 30 // máx. de tentativas por IP em 24h

// Whitelist de caixas Workspace válidas (DWD configurada). Espelho de
// EMAILS_CALENDAR_VALIDOS em web/src/lib/atendimentos.ts.
const EMAILS_CALENDAR_VALIDOS = new Set([
  "dono@rafaelgaldino.com.br",
  "consultor@rafaelgaldino.com.br",
  "consultores@rafaelgaldino.com.br",
  "especialistablackcrm@rafaelgaldino.com.br",
  "mentor@rafaelgaldino.com.br",
])

// Sucesso do Cliente (coluna clientes_entrada_new.sc) → caixa Workspace.
// Espelha CS_OPTIONS do front (tab-perfil.tsx). Atualizar aqui se a equipe mudar.
const CS_EMAILS: Record<string, string> = {
  fernanda: "atendimento_01@rafaelgaldino.com.br",
  gabriela: "atendimento_02@rafaelgaldino.com.br",
  geovana: "atendimento_03@rafaelgaldino.com.br",
  francielly: "atendimento_04@rafaelgaldino.com.br",
}

function addMinutos(h5: string, mins: number): string {
  const [hh, mm] = h5.split(":").map(Number)
  const total = hh * 60 + mm + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`
}

// Minutos entre dois horários "HH:MM" (b - a).
function minutosEntre(h5a: string, h5b: string): number {
  const [ha, ma] = h5a.split(":").map(Number)
  const [hb, mb] = h5b.split(":").map(Number)
  return (hb * 60 + mb) - (ha * 60 + ma)
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
      assunto,
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

    // Anti-spam por IP (cabeçalho do proxy do Supabase). Conta tentativas recentes
    // e bloqueia flood antes de criar evento/linha. Registra toda tentativa válida.
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconhecido"
    {
      const desdeJanela = new Date(Date.now() - RL_JANELA_MIN * 60_000).toISOString()
      const desdeDia = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
      const [{ count: nJanela }, { count: nDia }] = await Promise.all([
        supabase
          .from("agendamento_rate_limit")
          .select("id", { count: "exact", head: true })
          .eq("ip", ip)
          .gte("criado_em", desdeJanela),
        supabase
          .from("agendamento_rate_limit")
          .select("id", { count: "exact", head: true })
          .eq("ip", ip)
          .gte("criado_em", desdeDia),
      ])
      if ((nJanela ?? 0) >= RL_MAX_JANELA || (nDia ?? 0) >= RL_MAX_DIA) {
        return jsonResponse({ error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." }, 429)
      }
      await supabase.from("agendamento_rate_limit").insert({ ip })
    }

    const { data: consultor, error: cErr } = await supabase
      .from("consultores_atendimento")
      .select("*")
      .eq("slug", slug)
      .eq("ativo", true)
      .maybeSingle<Consultor>()

    if (cErr || !consultor) {
      return jsonResponse({ error: "Consultor não encontrado ou inativo" }, 404)
    }

    // Assunto (tipo de reunião escolhido pelo cliente). Nunca confiar no texto
    // do cliente: o front manda o SLUG e resolvemos o label a partir da lista
    // configurada no consultor. Com 2+ tipos, escolher é obrigatório; com 1,
    // aplica o único; com 0, fica null (fluxo antigo).
    const tiposReuniao = Array.isArray(consultor.tipos_reuniao) ? consultor.tipos_reuniao : []
    let assuntoLabel: string | null = null
    if (tiposReuniao.length >= 2) {
      const escolhido = tiposReuniao.find(t => t.slug === (assunto ?? "").trim())
      if (!escolhido) {
        return jsonResponse({ error: "Escolha um tipo de reunião válido para este consultor" }, 400)
      }
      assuntoLabel = escolhido.label
    } else if (tiposReuniao.length === 1) {
      assuntoLabel = tiposReuniao[0].label
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

    // Feriado global bloqueia tudo.
    const { data: feriado } = await supabase
      .from("feriados")
      .select("nome")
      .eq("data", data)
      .maybeSingle<{ nome: string }>()
    if (feriado) {
      return jsonResponse({ error: `Feriado: ${feriado.nome}` }, 400)
    }

    // Exceções do consultor pra essa data.
    const { data: excecoes } = await supabase
      .from("consultores_excecoes")
      .select("tipo, hora_inicio, hora_fim")
      .eq("consultor_id", consultor.id)
      .eq("data", data)

    type Excecao = { tipo: "bloqueio" | "extra"; hora_inicio: string | null; hora_fim: string | null }
    const excs = (excecoes ?? []) as Excecao[]

    if (excs.some(e => e.tipo === "bloqueio" && !e.hora_inicio)) {
      return jsonResponse({ error: "Consultor bloqueado nessa data" }, 400)
    }
    const colideBloqueio = excs.some(e => {
      if (e.tipo !== "bloqueio" || !e.hora_inicio || !e.hora_fim) return false
      return h5 >= e.hora_inicio.slice(0, 5) && h5 < e.hora_fim.slice(0, 5)
    })
    if (colideBloqueio) {
      return jsonResponse({ error: "Horário bloqueado pelo consultor" }, 400)
    }
    // Avulso (extra) = UM horário que começa no hora_inicio e dura a janela
    // inteira. O agendamento tem que bater o início exato de uma janela extra.
    const extraMatch = excs.find(
      e => e.tipo === "extra" && e.hora_inicio && e.hora_fim && e.hora_inicio.slice(0, 5) === h5,
    )
    const dentroExtra = !!extraMatch

    if (!dentroJanela && !dentroExtra) {
      return jsonResponse({ error: "Horário fora da janela de disponibilidade do consultor" }, 400)
    }

    // Avulso usa a duração da janela; janela semanal usa a duração padrão.
    const duracaoMin = extraMatch
      ? minutosEntre(extraMatch.hora_inicio!.slice(0, 5), extraMatch.hora_fim!.slice(0, 5))
      : consultor.duracao_padrao_minutos

    // Fonte única de verdade pros horários ocupados (nome + aliases, exclui cancelados).
    const { data: ocupados } = await supabase.rpc("horarios_ocupados_consultor", {
      p_slug: slug,
      p_data: data,
    })
    const conflito = ((ocupados as { horario: string | null }[] | null) ?? []).some(
      o => (o.horario ?? "").slice(0, 5) === h5,
    )
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

    // Sucesso do Cliente responsável (clientes_entrada_new.sc, ligada por id_cliente).
    // Vira convidado confirmado no evento. Lookup tolerante a falha: nunca bloqueia o agendamento.
    let csEmail: string | null = null
    let csNome: string | null = null
    {
      const { data: entradaCli } = await supabase
        .from("clientes_entrada_new")
        .select("sc")
        .eq("id_cliente", matchCli.id_cliente)
        .maybeSingle<{ sc: string | null }>()
      const scNorm = entradaCli?.sc?.trim().toLowerCase()
      if (scNorm && CS_EMAILS[scNorm]) {
        csEmail = CS_EMAILS[scNorm]
        csNome = entradaCli!.sc!.trim()
      }
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
      duracao_minutos: duracaoMin,
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
      base.assunto = assuntoLabel
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
      const endHorario = addMinutos(h5, duracaoMin) + ":00"
      const endISO = `${data}T${endHorario}${TZ_OFFSET}`

      const payload: NovoEvento = {
        summary: tituloEvento({
          tabela_destino: consultor.tabela_destino,
          nome: consultor.nome,
          tipo_reuniao: consultor.tipo_reuniao,
          cliente_nome,
          empresa: empresaFinal,
          assunto: assuntoLabel,
        }),
        description: descricaoEvento({
          cliente_nome,
          cliente_email: cliente_email.toLowerCase(),
          cliente_telefone: cliente_telefone ?? null,
          empresa: empresaFinal,
          observacoes: observacoes ?? null,
          codigo_cliente: matchCli.codigo_cliente,
          assunto: assuntoLabel,
        }),
        start: { dateTime: startISO, timeZone: TZ },
        end: { dateTime: endISO, timeZone: TZ },
        attendees: [
          { email: cliente_email.toLowerCase(), displayName: cliente_nome, responseStatus: "accepted" },
          { email: consultor.email_calendar, displayName: consultor.nome, responseStatus: "accepted" },
          ...(consultor.email && consultor.email !== consultor.email_calendar
            ? [{ email: consultor.email, displayName: consultor.nome, responseStatus: "accepted" as const }]
            : []),
          ...(csEmail
            ? [{ email: csEmail, displayName: csNome ? `${csNome} (Sucesso do Cliente)` : "Sucesso do Cliente", responseStatus: "accepted" as const }]
            : []),
        ],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        ...(consultor.cor_agenda ? { colorId: String(consultor.cor_agenda) } : {}),
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
