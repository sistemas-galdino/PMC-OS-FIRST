/**
 * Camada de API do "Perfil do Guardião" no PMC OS.
 *
 * Reimplementa, como chamadas do client Supabase (anon key, RLS-aware),
 * o que os server functions do sistema fonte faziam
 * (invites.functions.ts + responder.functions.ts).
 *
 * Diferenças de escopo em relação à fonte:
 *  - NÃO filtramos por owner_id (aquilo era o modo demo). O escopo agora é
 *    100% via RLS: `id_cliente = auth.uid() OR is_admin()`.
 *  - As listagens/detalhes aceitam um `clientId?` opcional para o oversight
 *    admin filtrar um cliente específico (`.eq('id_cliente', clientId)`).
 *    Quando omitido, a RLS já escopa ao próprio cliente (ou, para admin,
 *    devolve todos).
 *  - Escrita em responses/results acontece SÓ via Edge Function `guardiao-submit`
 *    (service role). Criação de convite via RPC `guardiao_criar_convite`.
 */
import { supabase } from "@/lib/supabase";

/* ---------------------------------------------------------------------------
 * Tipos auxiliares
 * ------------------------------------------------------------------------- */

export const CANDIDATE_STAGES = [
  "reprovado_teste",
  "aprovado_teste",
  "envio_case",
  "entrevista",
  "negociacao",
  "contratado_guardiao",
] as const;
export type CandidateStage = (typeof CANDIDATE_STAGES)[number];

export type AssessmentType = "interno" | "externo";

/** Linha do convite (shape do PostgREST; alguns campos dependem do select). */
export type GuardiaoInvite = {
  id: string;
  token?: string;
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_whatsapp: string | null;
  status?: string;
  stage?: CandidateStage | null;
  created_at?: string;
  expires_at?: string | null;
  completed_at?: string | null;
  assessment_id: string;
  guardiao_assessments?: { type: string; title: string } | null;
};

/** Linha do resultado (shape do PostgREST; campos dependem do select). */
export type GuardiaoResult = {
  id?: string;
  invite_id?: string;
  total_points?: number;
  max_points?: number;
  score_pct: number;
  classification?: string;
  disc_dominant?: string;
  disc_breakdown?: any;
  pillar_scores?: any;
  ai_tools_text?: string | null;
  computed_at?: string;
};

export type InviteWithResult = GuardiaoInvite & { result: GuardiaoResult | null };

export type SubmitPayload = {
  /** Token do share link fixo (padrão Typeform). Preferencial. */
  share_token?: string;
  /** Token legado (1 convite por candidato). Mantido para compat. */
  token?: string;
  identity?: { name?: string; email?: string; whatsapp?: string };
  answers: Array<{ question_id: string; option_id: string }>;
  text_answers?: Array<{ question_id: string; text: string }>;
  ai_tools_text?: string;
};

/** Dados resolvidos de um share link a partir do token público. */
export type ResolvedShare = {
  id_cliente: string;
  type: AssessmentType;
  assessment_id: string;
  title: string;
  description: string | null;
};

/* ---------------------------------------------------------------------------
 * Selects reutilizados
 * ------------------------------------------------------------------------- */

const INVITE_LIST_SELECT =
  "id, token, candidate_name, candidate_email, candidate_whatsapp, status, stage, created_at, expires_at, completed_at, assessment_id, guardiao_assessments(type, title)";

/* ---------------------------------------------------------------------------
 * Admin / cliente — convites e resultados
 * ------------------------------------------------------------------------- */

/** Cria um convite para o cliente logado (id_cliente = auth.uid()). LEGADO. */
export async function criarConvite(type: AssessmentType): Promise<{ token: string }> {
  const { data, error } = await supabase.rpc("guardiao_criar_convite", { p_type: type });
  if (error) throw new Error(error.message);
  const token =
    typeof data === "string"
      ? data
      : Array.isArray(data)
        ? ((data[0] as any)?.token ?? (data[0] as any))
        : ((data as any)?.token ?? String(data ?? ""));
  return { token: token as string };
}

/** Monta a URL pública do respondente a partir do token. */
function shareUrl(token: string): string {
  return `${window.location.origin}/guardiao/r/${token}`;
}

/** Pega (ou cria) o token do share link fixo do cliente logado para um tipo. */
async function getOrCreateShareToken(type: AssessmentType): Promise<string> {
  const { data, error } = await supabase.rpc("guardiao_get_or_create_share_link", {
    p_type: type,
  });
  if (error) throw new Error(error.message);
  const token =
    typeof data === "string"
      ? data
      : Array.isArray(data)
        ? ((data[0] as any)?.token ?? (data[0] as any))
        : ((data as any)?.token ?? String(data ?? ""));
  return token as string;
}

/**
 * Devolve os DOIS links fixos e reutilizáveis do cliente logado (padrão Typeform):
 * um `interno` e um `externo`, já como URLs prontas para copiar.
 */
export async function getShareLinks(): Promise<{ interno: string; externo: string }> {
  const [interno, externo] = await Promise.all([
    getOrCreateShareToken("interno"),
    getOrCreateShareToken("externo"),
  ]);
  return { interno: shareUrl(interno), externo: shareUrl(externo) };
}

/** Resolve um share token público -> cliente + assessment daquele tipo. */
export async function resolveShare(token: string): Promise<ResolvedShare | null> {
  const { data, error } = await supabase.rpc("guardiao_resolve_share", { p_token: token });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id_cliente: row.id_cliente,
    type: row.type,
    assessment_id: row.assessment_id,
    title: row.title,
    description: row.description ?? null,
  };
}

/** Carrega perguntas + opções de um assessment (leitura pública anon). */
export async function getQuestionsByAssessment(assessmentId: string): Promise<any[]> {
  const { data: questions, error } = await supabase
    .from("guardiao_questions")
    .select(
      "id, code, type, pillar, prompt, scenario_label, order_index, guardiao_question_options(id, letter, label, points, disc_tags, order_index)",
    )
    .eq("assessment_id", assessmentId)
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);

  return (questions ?? []).map((q: any) => ({
    ...q,
    guardiao_question_options: [...(q.guardiao_question_options ?? [])].sort(
      (a: any, b: any) => a.order_index - b.order_index,
    ),
  }));
}

/** Lista convites (RLS escopa ao cliente; admin passa clientId para filtrar). */
export async function listarConvites(clientId?: string): Promise<GuardiaoInvite[]> {
  let q = supabase
    .from("guardiao_invites")
    .select(INVITE_LIST_SELECT)
    .order("created_at", { ascending: false });
  if (clientId) q = q.eq("id_cliente", clientId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as GuardiaoInvite[];
}

/** Lista convites juntando o resultado de cada um (espelha listResults). */
export async function listarResultados(clientId?: string): Promise<InviteWithResult[]> {
  let q = supabase
    .from("guardiao_invites")
    .select(INVITE_LIST_SELECT)
    .order("created_at", { ascending: false });
  if (clientId) q = q.eq("id_cliente", clientId);
  const { data: invites, error } = await q;
  if (error) throw new Error(error.message);

  const inviteRows = (invites ?? []) as unknown as GuardiaoInvite[];
  const inviteIds = inviteRows.map((i) => i.id);

  let results: GuardiaoResult[] = [];
  if (inviteIds.length) {
    const { data: r, error: rErr } = await supabase
      .from("guardiao_assessment_results")
      .select(
        "id, invite_id, total_points, max_points, score_pct, classification, disc_dominant, disc_breakdown, pillar_scores, ai_tools_text, computed_at",
      )
      .in("invite_id", inviteIds);
    if (rErr) throw new Error(rErr.message);
    results = (r ?? []) as GuardiaoResult[];
  }

  const byInvite = new Map(results.map((r) => [r.invite_id, r]));
  return inviteRows.map((i) => ({ ...i, result: byInvite.get(i.id) ?? null }));
}

/** Ranking de candidatos concluídos, ordenado por score desc (espelha listRanking). */
export async function listarRanking(clientId?: string): Promise<InviteWithResult[]> {
  let q = supabase
    .from("guardiao_invites")
    .select(
      "id, candidate_name, candidate_email, candidate_whatsapp, stage, completed_at, created_at, assessment_id, guardiao_assessments(type, title)",
    )
    .eq("status", "concluido")
    .order("created_at", { ascending: false });
  if (clientId) q = q.eq("id_cliente", clientId);
  const { data: invites, error } = await q;
  if (error) throw new Error(error.message);

  const ids = (invites ?? []).map((i: any) => i.id);
  if (!ids.length) return [];

  const { data: results, error: rErr } = await supabase
    .from("guardiao_assessment_results")
    .select("invite_id, score_pct, pillar_scores")
    .in("invite_id", ids);
  if (rErr) throw new Error(rErr.message);

  const byId = new Map((results ?? []).map((r: any) => [r.invite_id, r]));
  return (invites ?? [])
    .filter((i: any) => byId.has(i.id))
    .map((i: any) => ({ ...i, result: byId.get(i.id)! }))
    .sort((a: any, b: any) => Number(b.result.score_pct) - Number(a.result.score_pct));
}

/** Detalhe de um resultado + respostas de texto livre (espelha getResultDetail). */
export async function getResultadoDetalhe(inviteId: string): Promise<{
  invite: any;
  result: any;
  openAnswers: Array<{ prompt: string; code: string; text: string }>;
}> {
  const { data: invite, error } = await supabase
    .from("guardiao_invites")
    .select(
      "id, candidate_name, candidate_email, candidate_whatsapp, status, completed_at, created_at, assessment_id, guardiao_assessments(type, title)",
    )
    .eq("id", inviteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!invite) throw new Error("Convite não encontrado");

  const { data: result, error: rErr } = await supabase
    .from("guardiao_assessment_results")
    .select("total_points, max_points, score_pct, classification, pillar_scores, ai_tools_text, computed_at")
    .eq("invite_id", invite.id)
    .maybeSingle();
  if (rErr) throw new Error(rErr.message);

  // Respostas de texto livre (pergunta aberta)
  const { data: textRows } = await supabase
    .from("guardiao_candidate_responses")
    .select("text_answer, guardiao_questions(prompt, code)")
    .eq("invite_id", invite.id)
    .not("text_answer", "is", null);

  const openAnswers = (textRows ?? [])
    .filter((r: any) => !!r.text_answer)
    .map((r: any) => ({
      prompt: r.guardiao_questions?.prompt ?? "",
      code: r.guardiao_questions?.code ?? "",
      text: r.text_answer as string,
    }));

  return { invite, result, openAnswers };
}

/** Candidato completo: invite + result + todas as respostas ordenadas (espelha getCandidateFull). */
export async function getCandidatoCompleto(inviteId: string): Promise<{
  invite: any;
  result: any;
  responses: Array<{ prompt: string; order: number; answer: string }>;
}> {
  const { data: invite, error } = await supabase
    .from("guardiao_invites")
    .select(
      "id, candidate_name, candidate_email, candidate_whatsapp, stage, completed_at, assessment_id, guardiao_assessments(type, title)",
    )
    .eq("id", inviteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!invite) throw new Error("Convite não encontrado");

  const { data: result } = await supabase
    .from("guardiao_assessment_results")
    .select("score_pct, pillar_scores")
    .eq("invite_id", invite.id)
    .maybeSingle();

  const { data: responses, error: respErr } = await supabase
    .from("guardiao_candidate_responses")
    .select(
      "question_id, option_id, text_answer, guardiao_questions(prompt, order_index), guardiao_question_options(label)",
    )
    .eq("invite_id", invite.id);
  if (respErr) throw new Error(respErr.message);

  const sorted = (responses ?? [])
    .map((r: any) => ({
      prompt: r.guardiao_questions?.prompt ?? "",
      order: r.guardiao_questions?.order_index ?? 0,
      answer: r.guardiao_question_options?.label ?? r.text_answer ?? "—",
    }))
    .sort((a, b) => a.order - b.order);

  return { invite, result, responses: sorted };
}

/** Atualiza o estágio (kanban) de um candidato. */
export async function atualizarStage(inviteId: string, stage: CandidateStage): Promise<{ ok: true }> {
  const { error } = await supabase.from("guardiao_invites").update({ stage }).eq("id", inviteId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Deleta um convite (cascade nas respostas/resultados). */
export async function deletarConvite(id: string): Promise<{ ok: true }> {
  const { error } = await supabase.from("guardiao_invites").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/* ---------------------------------------------------------------------------
 * Formulário público (anônimo) — token
 * ------------------------------------------------------------------------- */

/** Pega convite + assessment + perguntas + opções a partir do token público. */
export async function getInvitePorToken(token: string): Promise<{
  invite: {
    id: string;
    token: string;
    candidate_name: string | null;
    candidate_email: string | null;
    candidate_whatsapp: string | null;
    status: string;
    completed_at: string | null;
    expired: boolean;
  };
  assessment: any;
  questions: any[];
}> {
  const { data: inviteData, error } = await supabase.rpc("guardiao_get_invite_by_token", {
    _token: token,
  });
  if (error) throw new Error(error.message);
  const invite = Array.isArray(inviteData) ? inviteData[0] : inviteData;
  if (!invite) throw new Error("Convite não encontrado");

  const expired = !!invite.expires_at && new Date(invite.expires_at) < new Date();

  // Assessment (guardiao_assessments tem leitura pública anon).
  const { data: assessment } = await supabase
    .from("guardiao_assessments")
    .select("id, type, title, description")
    .eq("id", invite.assessment_id)
    .maybeSingle();

  // Perguntas + opções (leitura pública anon).
  const { data: questions, error: qErr } = await supabase
    .from("guardiao_questions")
    .select(
      "id, code, type, pillar, prompt, scenario_label, order_index, guardiao_question_options(id, letter, label, points, disc_tags, order_index)",
    )
    .eq("assessment_id", invite.assessment_id)
    .order("order_index", { ascending: true });
  if (qErr) throw new Error(qErr.message);

  // Ordena options por order_index
  const normalized = (questions ?? []).map((q: any) => ({
    ...q,
    guardiao_question_options: [...(q.guardiao_question_options ?? [])].sort(
      (a: any, b: any) => a.order_index - b.order_index,
    ),
  }));

  return {
    invite: {
      id: invite.id,
      token,
      candidate_name: invite.candidate_name ?? null,
      candidate_email: invite.candidate_email ?? null,
      candidate_whatsapp: invite.candidate_whatsapp ?? null,
      status: invite.status,
      completed_at: invite.completed_at ?? null,
      expired,
    },
    assessment: assessment ?? { id: invite.assessment_id, type: invite.assessment_type },
    questions: normalized,
  };
}

/**
 * Submete respostas via Edge Function (service role): grava responses+results,
 * persiste a identidade do candidato e marca o convite como concluído.
 */
export async function submeterRespostas(
  payload: SubmitPayload,
): Promise<{ ok: boolean; scorePct: number; classification: string; discDominant: string }> {
  const { data, error } = await supabase.functions.invoke("guardiao-submit", { body: payload });
  if (error) throw new Error(error.message);
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as { ok: boolean; scorePct: number; classification: string; discDominant: string };
}
