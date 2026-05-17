import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

interface Body {
  slug: string
  data: string
  horario: string
  cliente_nome: string
  cliente_email: string
  cliente_empresa?: string | null
  cliente_telefone?: string | null
  observacoes?: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405)
  }

  try {
    const body = (await req.json()) as Body
    const {
      slug,
      data,
      horario,
      cliente_nome,
      cliente_email,
      cliente_empresa,
      cliente_telefone,
      observacoes,
    } = body

    if (!slug || !data || !horario || !cliente_nome || !cliente_email) {
      return json({ error: "Campos obrigatórios faltando" }, 400)
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente_email)) {
      return json({ error: "Email inválido" }, 400)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return json({ error: "Data inválida (use YYYY-MM-DD)" }, 400)
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(horario)) {
      return json({ error: "Horário inválido (use HH:MM)" }, 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // 1. Resolve consultor
    const { data: consultor, error: cErr } = await supabase
      .from("consultores_atendimento")
      .select("*")
      .eq("slug", slug)
      .eq("ativo", true)
      .maybeSingle()

    if (cErr || !consultor) {
      return json({ error: "Consultor não encontrado ou inativo" }, 404)
    }

    // 2. Validar disponibilidade
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
      return json({ error: "Horário fora da janela de disponibilidade do consultor" }, 400)
    }

    // 3. Double-booking via view
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
      return json({ error: "Esse horário já foi reservado por outra pessoa. Escolha outro." }, 409)
    }

    // 4. Match cliente opcional via clientes_formulario (silencioso se falhar)
    let matchCli: { id_cliente?: string; nome_empresa?: string } | null = null
    try {
      const { data: form } = await supabase
        .from("clientes_formulario")
        .select("id_cliente, nome_empresa")
        .eq("email", cliente_email.toLowerCase())
        .maybeSingle()
      if (form) matchCli = form as typeof matchCli
    } catch {
      // ignora
    }

    // 5. INSERT na tabela_destino
    const id_unico = crypto.randomUUID()
    const horarioStr = h5 + ":00"
    const ano = dataDate.getFullYear()
    const mes = dataDate.getMonth() + 1

    const base: Record<string, unknown> = {
      id_unico,
      data_reuniao: data,
      horario: horarioStr,
      ano,
      mes,
      pessoa: cliente_nome,
      empresa: cliente_empresa ?? matchCli?.nome_empresa ?? null,
      cliente_email: cliente_email.toLowerCase(),
      cliente_telefone: cliente_telefone ?? null,
      duracao_minutos: consultor.duracao_padrao_minutos,
      status_agendamento: "pendente_sync",
      criado_via: "agendamento_publico",
      observacoes: observacoes ?? null,
    }

    if (matchCli?.id_cliente) {
      base.id_cliente = matchCli.id_cliente
    }

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
      return json({ error: "Erro ao salvar agendamento: " + insErr.message }, 500)
    }

    const origem =
      consultor.tabela_destino === "reunioes_galdino"
        ? "galdino"
        : consultor.tabela_destino === "reunioes_blackcrm"
        ? "blackcrm"
        : "mentoria"

    return json({
      ok: true,
      id_unico,
      origem,
      slug: consultor.slug,
      data,
      horario: h5,
      status: "pendente_sync",
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return json({ error: msg }, 500)
  }
})
