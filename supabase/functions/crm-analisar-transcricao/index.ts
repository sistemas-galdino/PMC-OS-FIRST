// crm-analisar-transcricao — lê a transcrição bruta de uma reunião e devolve
// resumo, decisões, pendências e os PRÓXIMOS PASSOS separados por lado
// (CS x cliente).
//
// O que ela deliberadamente NÃO faz: gravar. Nada do que sai daqui vira tarefa
// sozinho. A saída alimenta o TransformarTarefasModal, onde a CS edita título,
// responsável, cliente e prazo antes de salvar. Isso foi pedido explicitamente
// na reunião de 05/08/2026 — "a IA sugere, a gente confere" — e é o motivo de a
// resposta vir em rascunho e não em INSERT.
//
// Segurança: verify_jwt=true (default) + o chamador precisa existir em `mentores`.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { chamarLLM, erroHttp, exigirMembroDoTime, extrairJson } from "../_shared/llm-chat.ts"

interface Corpo {
  transcricao?: string
  titulo?: string
  cliente?: string
  csNome?: string
}

interface PassoCS {
  texto: string
  prazo?: string
}
interface PassoCliente extends PassoCS {
  responsavel?: string
}
interface Saida {
  reuniao_realizada: boolean
  motivo_nao_realizada?: string
  resumo: string
  decisoes: string[]
  pendencias: string[]
  passos: { cs: PassoCS[]; cliente: PassoCliente[] }
}

// Transcrição de uma hora dá ~50k caracteres; o corte é folgado e explícito.
const MAX_TRANSCRICAO = 120_000

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

function listaDeTextos(v: unknown): string[] {
  return Array.isArray(v) ? v.map(texto).filter(Boolean) : []
}

function passosCS(v: unknown): PassoCS[] {
  if (!Array.isArray(v)) return []
  return v
    .map((p) => {
      const o = (p ?? {}) as Record<string, unknown>
      return { texto: texto(o.texto) || texto(o.acao), prazo: texto(o.prazo) || undefined }
    })
    .filter((p) => !!p.texto)
}

function passosCliente(v: unknown): PassoCliente[] {
  if (!Array.isArray(v)) return []
  return v
    .map((p) => {
      const o = (p ?? {}) as Record<string, unknown>
      return {
        texto: texto(o.texto) || texto(o.acao),
        responsavel: texto(o.responsavel) || undefined,
        prazo: texto(o.prazo) || undefined,
      }
    })
    .filter((p) => !!p.texto)
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const quem = await exigirMembroDoTime(req)
    if (!quem) return jsonResponse({ error: "não autorizado" }, 403)

    const b = (await req.json().catch(() => ({}))) as Corpo
    const transcricao = texto(b.transcricao)
    if (transcricao.length < 40) {
      return jsonResponse({ error: "cole a transcrição da reunião (texto muito curto)" }, 400)
    }
    const cortada =
      transcricao.length > MAX_TRANSCRICAO
        ? transcricao.slice(0, MAX_TRANSCRICAO) + "\n[...transcrição truncada]"
        : transcricao

    const csNome = texto(b.csNome) || quem.nome || "CS"
    const clienteNome = texto(b.cliente) || "Cliente"

    const system =
      `Você é assistente de CS (Customer Success) do PMC. Recebe a transcrição bruta de uma reunião entre a CS "${csNome}" (nossa equipe) e o cliente "${clienteNome}" ` +
      `(e possíveis pessoas do time do cliente, como um Guardião de IA). Responda em português do Brasil.\n\n` +
      `Atribuição de responsabilidade:\n` +
      `- Fala ou compromisso de "${csNome}" ou de alguém do PMC → lado "cs".\n` +
      `- Qualquer outro nome citado (dono da empresa, guardião, sócio, colaborador) → lado "cliente", e o nome vai em "responsavel".\n` +
      `- Sem responsável claro, use o lado mais provável pelo contexto (padrão: cs).\n\n` +
      `Regras duras:\n` +
      `- NÃO invente nomes, datas, números ou compromissos que não estejam na transcrição.\n` +
      `- "prazo" só quando a data/prazo for citado; senão, string vazia.\n` +
      `- Se não houve reunião de fato (só alguém aguardando, sem interação nem decisão), devolva reuniao_realizada=false, explique em motivo_nao_realizada e deixe as listas vazias.\n\n` +
      `Responda SOMENTE com um JSON válido, sem markdown ao redor, neste formato:\n` +
      `{"reuniao_realizada": boolean, "motivo_nao_realizada": string, "resumo": string, "decisoes": [string], "pendencias": [string], ` +
      `"passos": {"cs": [{"texto": string, "prazo": string}], "cliente": [{"texto": string, "responsavel": string, "prazo": string}]}}\n\n` +
      `"resumo": 2 a 4 linhas do que foi discutido. "texto" dos passos: ação clara, curta, começando por verbo.`

    const user =
      `Reunião: ${texto(b.titulo) || "(sem título)"} · CS: ${csNome} · Cliente: ${clienteNome}\n\n` +
      `Transcrição:\n"""\n${cortada}\n"""`

    const bruto = await chamarLLM({
      system,
      user,
      json: true,
      maxTokens: 2500,
      temperatura: 0.2,
      timeoutMs: 110_000,
    })

    const cru = extrairJson<Record<string, unknown>>(bruto)
    const p = (cru.passos ?? {}) as Record<string, unknown>
    const saida: Saida = {
      reuniao_realizada: cru.reuniao_realizada !== false,
      motivo_nao_realizada: texto(cru.motivo_nao_realizada) || undefined,
      resumo: texto(cru.resumo),
      decisoes: listaDeTextos(cru.decisoes),
      pendencias: listaDeTextos(cru.pendencias),
      passos: { cs: passosCS(p.cs), cliente: passosCliente(p.cliente) },
    }
    return jsonResponse(saida)
  } catch (err) {
    const { status, message } = erroHttp(err)
    return jsonResponse({ error: message }, status)
  }
})
