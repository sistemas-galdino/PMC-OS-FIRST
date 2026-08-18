// crm-saudacao — a frase de abertura do "Meu Dia" do CS Manager.
//
// No sistema original isto era uma server function do TanStack Start chamada a
// cada render do cabeçalho, batendo no gateway do Lovable. Aqui é edge function
// e o cliente só chama uma vez por pessoa/dia/período (ver lib/crm/saudacao-ia.ts):
// a frase é enfeite, não pode custar uma chamada de IA a cada troca de aba.
//
// A tela NUNCA espera por esta função: ela abre com a frase determinística de
// `saudacoes.ts` e troca se a IA responder. Falha aqui não deixa cabeçalho vazio.
//
// Segurança: verify_jwt=true (default) + o chamador precisa existir em `mentores`.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { chamarLLM, erroHttp, exigirMembroDoTime } from "../_shared/llm-chat.ts"

interface Corpo {
  primeiro?: string
  diaSemana?: string
  dataExtenso?: string
  periodo?: "manha" | "tarde" | "noite"
  atrasadas?: number
  hoje?: number
  andamento?: number
  impedidas?: number
  concluidasHoje?: number
  reunioes?: number
  proximaReuniao?: string
}

function n(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const quem = await exigirMembroDoTime(req)
    if (!quem) return jsonResponse({ error: "não autorizado" }, 403)

    const b = (await req.json().catch(() => ({}))) as Corpo
    // Sem nome não dá para saudar ninguém — e inventar um seria pior.
    const primeiro = (b.primeiro ?? quem.nome ?? "").trim().split(/\s+/)[0]
    if (!primeiro) return jsonResponse({ error: "primeiro nome é obrigatório" }, 400)

    const periodo = b.periodo === "tarde" || b.periodo === "noite" ? b.periodo : "manha"
    const cumprimento = periodo === "manha" ? "Bom dia" : periodo === "tarde" ? "Boa tarde" : "Boa noite"

    const system =
      `Você escreve UMA saudação curta, divertida e acolhedora para a CS "${primeiro}" do PMC (Customer Success). ` +
      `Português do Brasil, tom leve, brincalhão e motivador — pode usar interjeições ("Eita", "Bora", "Opa") e gírias brandas, sem forçar. ` +
      `NADA de clichê motivacional genérico ("hoje é seu dia", "você é capaz"). ` +
      `Mencione, quando fizer sentido, algum número da rotina do dia de forma natural — sem listar tudo, e sem citar número que veio zerado. ` +
      `Uma única frase, no máximo 14 palavras. Comece com "${cumprimento}, ${primeiro}" ou uma variação criativa que inclua o nome. ` +
      `Termine sem ponto final. Devolva APENAS a frase, sem aspas, sem markdown, sem emoji.`

    const contexto = [
      `Dia: ${b.diaSemana ?? "—"}, ${b.dataExtenso ?? "—"}`,
      `Reuniões hoje: ${n(b.reunioes)}${b.proximaReuniao ? ` (próxima: ${b.proximaReuniao})` : ""}`,
      `Tarefas para hoje: ${n(b.hoje)}`,
      `Atrasadas: ${n(b.atrasadas)}`,
      `Em andamento: ${n(b.andamento)}`,
      `Impedidas/aguardando: ${n(b.impedidas)}`,
      `Já concluídas hoje: ${n(b.concluidasHoje)}`,
    ].join("\n")

    const bruto = await chamarLLM({
      system,
      user: contexto,
      maxTokens: 120,
      temperatura: 0.9,
      timeoutMs: 20_000,
    })

    const texto = bruto
      .trim()
      .split("\n")[0]
      .replace(/^["'`]|["'`]$/g, "")
      .replace(/\.$/, "")
      .trim()

    if (!texto) return jsonResponse({ error: "a IA não devolveu frase" }, 502)
    return jsonResponse({ texto })
  } catch (err) {
    const { status, message } = erroHttp(err)
    return jsonResponse({ error: message }, status)
  }
})
