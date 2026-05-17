// Porta direta de scripts/llm-enrich-acoes.mjs:58-123.
// OpenAI gpt-4o-mini com prompt + schema JSON estruturado pra extrair
// ganho, acoes_cliente, acoes_mentor de uma transcrição de reunião.

const PROMPT_SISTEMA = `Você é um consultor estratégico especialista em marketing, crescimento empresarial e implementação de inteligência artificial.

Analise a transcrição da reunião de mentoria abaixo e gere três resultados:
1) Os ganhos da reunião para o cliente
2) As ações que o cliente deve executar
3) As ações que o mentor deve executar

REGRAS IMPORTANTES
- As ações devem ser tarefas práticas e executáveis.
- O status das tarefas deve iniciar sempre como "A fazer".
- Caso o responsável não esteja explícito, considere "Cliente".
- O ganho_reuniao deve explicar o principal avanço ou benefício conquistado pelo cliente nesta reunião.

Antes de gerar qualquer resultado, analise se a reunião realmente aconteceu.
Considere que NÃO houve reunião se:
- Não houver interação entre duas partes.
- A transcrição mostrar apenas o mentor aguardando.
- Não houver discussão estratégica real.
- Não houver troca de informações ou decisões.

Se a reunião NÃO aconteceu:
- Defina "reuniao_realizada": false
- Explique o motivo em "motivo_nao_realizada"
- Deixe ganho_reuniao vazio
- Retorne arrays vazios em acoes_cliente e acoes_mentor

Se a reunião aconteceu normalmente:
- Defina "reuniao_realizada": true
- Deixe "motivo_nao_realizada" vazio
- Gere ganho e ações normalmente

Se não houver prazo explícito mencionado na transcrição, deixe o campo prazo como string vazia "".

Responda SEMPRE em JSON no formato:
{
  "reuniao_realizada": boolean,
  "motivo_nao_realizada": string,
  "ganho_reuniao": string,
  "acoes_cliente": [{"acao": string, "prazo": string, "status": "A fazer"}],
  "acoes_mentor": [{"acao": string, "prazo": string, "status": "A fazer"}]
}`

export interface AcaoLLM {
  acao: string
  prazo: string
  status: string
}

export interface ResultadoLLM {
  reuniao_realizada: boolean
  motivo_nao_realizada: string
  ganho_reuniao: string
  acoes_cliente: AcaoLLM[]
  acoes_mentor: AcaoLLM[]
}

const MAX_TRANSCR = 120_000

export async function extrairGanhoAcoes(
  transcricao: string,
  empresa: string | null,
  model: string = "gpt-4o-mini",
): Promise<ResultadoLLM> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada")

  const transcrTruncada = transcricao.length > MAX_TRANSCR
    ? transcricao.slice(0, MAX_TRANSCR) + "\n[...truncada]"
    : transcricao
  const contexto = `Empresa do cliente: ${empresa ?? "N/A"}.`
  const userMsg = `Contexto: ${contexto}\n\n--- TRANSCRIÇÃO ---\n${transcrTruncada}`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT_SISTEMA },
        { role: "user", content: userMsg },
      ],
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI (${res.status}): ${text}`)
  }

  const data = await res.json()
  const content: string | undefined = data.choices?.[0]?.message?.content
  if (!content) throw new Error("OpenAI sem content")
  return JSON.parse(content) as ResultadoLLM
}
