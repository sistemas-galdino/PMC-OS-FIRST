import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"

// =========================================================
// guardiao-submit
// Recebe as respostas do formulario publico do "Perfil do Guardiao" e:
//  - carrega o convite por token (rejeita concluido / expirado);
//  - carrega perguntas + opcoes do assessment;
//  - calcula score / DISC / pilares (porte fiel de src/lib/responder.functions.ts
//    do sistema fonte);
//  - grava guardiao_candidate_responses (limpando anteriores);
//  - grava guardiao_assessment_results;
//  - marca o convite como 'concluido'.
// Roda com service role (bypassa RLS). CORS igual as demais functions do PMC.
// =========================================================

interface AnswerIn {
  question_id: string
  option_id: string
}
interface TextAnswerIn {
  question_id: string
  text: string
}
interface IdentityIn {
  name?: string
  email?: string
  whatsapp?: string
}
interface Body {
  token: string
  identity?: IdentityIn
  answers?: AnswerIn[]
  text_answers?: TextAnswerIn[]
  ai_tools_text?: string
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
    const token = (body.token ?? "").trim()
    const answers: AnswerIn[] = Array.isArray(body.answers) ? body.answers : []
    const textAnswers: TextAnswerIn[] = Array.isArray(body.text_answers) ? body.text_answers : []
    const aiToolsText = (body.ai_tools_text ?? "").toString()
    const identity: IdentityIn = body.identity && typeof body.identity === "object" ? body.identity : {}

    if (!token || token.length < 8) {
      return jsonResponse({ error: "Token inválido" }, 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // 1) Carrega convite
    const { data: invite, error: iErr } = await supabase
      .from("guardiao_invites")
      .select("id, status, assessment_id, expires_at")
      .eq("token", token)
      .maybeSingle()
    if (iErr) return jsonResponse({ error: iErr.message }, 500)
    if (!invite) return jsonResponse({ error: "Convite não encontrado" }, 404)
    if (invite.status === "concluido") {
      return jsonResponse({ error: "Avaliação já concluída" }, 409)
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return jsonResponse({ error: "Convite expirado" }, 410)
    }

    // 2) Carrega perguntas + opcoes do assessment
    const { data: questions, error: qErr } = await supabase
      .from("guardiao_questions")
      .select("id, pillar, guardiao_question_options(id, points, disc_tags)")
      .eq("assessment_id", invite.assessment_id)
    if (qErr) return jsonResponse({ error: qErr.message }, 500)

    const qMap = new Map<string, any>()
    for (const q of questions ?? []) qMap.set(q.id, q)

    // 3) Monta linhas + agrega metricas (max por pergunta = maior points entre opcoes)
    const rows: any[] = []
    let total = 0
    let max = 0
    const pillar: Record<string, { sum: number; max: number }> = {}
    const disc: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 }

    for (const q of questions ?? []) {
      const opts = (q as any).guardiao_question_options ?? []
      const optMax = Math.max(0, ...(opts.map((o: any) => o.points ?? 0) as number[]))
      max += optMax
      pillar[q.pillar] = pillar[q.pillar] ?? { sum: 0, max: 0 }
      pillar[q.pillar].max += optMax
    }

    for (const a of answers) {
      const q = qMap.get(a.question_id)
      if (!q) continue
      const opt = ((q as any).guardiao_question_options ?? []).find(
        (o: any) => o.id === a.option_id,
      )
      if (!opt) continue

      total += opt.points ?? 0
      pillar[q.pillar].sum += opt.points ?? 0
      for (const tag of opt.disc_tags ?? []) {
        if (disc[tag] !== undefined) disc[tag] += 1
      }

      rows.push({
        invite_id: invite.id,
        question_id: q.id,
        option_id: opt.id,
        points: opt.points ?? 0,
        disc_tags: opt.disc_tags ?? [],
      })
    }

    // 3.5) Linhas de texto livre
    for (const t of textAnswers) {
      if (!t || !t.text) continue
      rows.push({
        invite_id: invite.id,
        question_id: t.question_id,
        option_id: null,
        text_answer: t.text,
        points: 0,
        disc_tags: [],
      })
    }

    // 4) Persiste respostas (limpa anteriores para ser idempotente)
    await supabase.from("guardiao_candidate_responses").delete().eq("invite_id", invite.id)
    if (rows.length > 0) {
      const { error: rErr } = await supabase
        .from("guardiao_candidate_responses")
        .insert(rows)
      if (rErr) return jsonResponse({ error: rErr.message }, 500)
    }

    // 5) Calcula resultado
    const scorePct = max > 0 ? Math.round((total / max) * 1000) / 10 : 0
    const classification =
      scorePct >= 80 ? "Guardião pronto"
      : scorePct >= 65 ? "Guardião em desenvolvimento"
      : scorePct >= 50 ? "Potencial multiplicador"
      : scorePct >= 35 ? "Apoio operacional de IA"
      : "Ainda não recomendado"

    const discDominant =
      Object.entries(disc).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "C"

    const pillarScores: Record<string, { sum: number; max: number; pct: number }> = {}
    for (const [k, v] of Object.entries(pillar)) {
      pillarScores[k] = {
        sum: v.sum,
        max: v.max,
        pct: v.max > 0 ? Math.round((v.sum / v.max) * 1000) / 10 : 0,
      }
    }

    // 6) Grava resultado (upsert logico: deleta anterior se houver)
    await supabase.from("guardiao_assessment_results").delete().eq("invite_id", invite.id)
    const { error: resErr } = await supabase
      .from("guardiao_assessment_results")
      .insert({
        invite_id: invite.id,
        total_points: total,
        max_points: max,
        score_pct: scorePct,
        classification,
        disc_dominant: discDominant,
        disc_breakdown: disc,
        pillar_scores: pillarScores,
        ai_tools_text: aiToolsText || null,
      })
    if (resErr) return jsonResponse({ error: resErr.message }, 500)

    // 7) Atualiza convite (marca concluido + grava identidade do candidato quando vier)
    const updatePayload: Record<string, unknown> = {
      status: "concluido",
      completed_at: new Date().toISOString(),
    }
    const idName = (identity.name ?? "").toString().trim()
    const idEmail = (identity.email ?? "").toString().trim()
    const idWhatsapp = (identity.whatsapp ?? "").toString().trim()
    if (idName) updatePayload.candidate_name = idName
    if (idEmail) updatePayload.candidate_email = idEmail
    if (idWhatsapp) updatePayload.candidate_whatsapp = idWhatsapp

    const { error: uErr } = await supabase
      .from("guardiao_invites")
      .update(updatePayload)
      .eq("id", invite.id)
    if (uErr) return jsonResponse({ error: uErr.message }, 500)

    return jsonResponse({ ok: true, scorePct, classification, discDominant })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
