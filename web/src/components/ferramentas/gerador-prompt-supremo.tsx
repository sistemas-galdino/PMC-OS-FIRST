// Gerador de Prompt Supremo (método Gauntlet-Loop).
// O mentorado responde 3 perguntas (Tarefa / Método / Padrão de Parada) e o componente
// monta, por engenharia reversa do prompt de elite, a estrutura pronta para colar no Claude Code.
import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Sparkles2Icon as Sparkles,
  CopyIcon as Copy,
  CheckIcon as Check,
  ChevronRightIcon as ChevronRight,
  RefreshCwIcon as RefreshCw,
} from "@/components/ui/icons"

const PERGUNTAS = [
  {
    key: "tarefa" as const,
    n: 1,
    titulo: "A Tarefa (o quê)",
    ajuda: "O que você quer construir e qual é a referência de elite a ser igualada?",
    placeholder: "Ex.: Um first-person shooter em ThreeJS no nível dos jogos Call of Duty mais recentes.",
    fallback: "o que você descreveu, no nível da referência de elite do mercado",
  },
  {
    key: "metodo" as const,
    n: 2,
    titulo: "O Método de Construção (como)",
    ajuda: "Quais micro-tarefas os subagentes devem atacar em paralelo?",
    placeholder: "Ex.: Separe subagentes para texturas, física, iluminação, HUD e performance.",
    fallback: "cada frente do projeto (visual, lógica, performance e microinterações)",
  },
  {
    key: "parada" as const,
    n: 3,
    titulo: "O Padrão de Parada (quando)",
    ajuda: "Contra qual referência real o crítico deve comparar às cegas antes de aprovar?",
    placeholder: "Ex.: Comparar lado a lado com o Call of Duty real até empatar ou superar.",
    fallback: "a referência real do mercado, até empatar ou superar",
  },
] as const

type Campo = (typeof PERGUNTAS)[number]["key"]

function montarPrompt(r: Record<Campo, string>): string {
  const tarefa = r.tarefa.trim() || PERGUNTAS[0].fallback
  const metodo = r.metodo.trim() || PERGUNTAS[1].fallback
  const parada = r.parada.trim() || PERGUNTAS[2].fallback
  return `Quero que você construa para mim ${tarefa}. Deve ficar absolutamente perfeito, visualmente impecável, com cada detalhe feito em qualidade AAA — de texturas a física, tipografia e microinterações. Nada de placeholders, nada de "bom o suficiente": a referência é o padrão de elite da indústria.

Não trabalhe sozinho: aja como agente líder, quebre o objetivo em dezenas de micro-tarefas e faça fan out de subagentes para que cada um ataque uma parte individualmente — ${metodo}. Use /loop em cada item e coloque um subagente separado, sem contexto de como o código foi feito, para verificar visualmente se o resultado é triplo A. Esse crítico deve ser implacável e, se não estiver no nível, o item volta ao início do ciclo com feedback destrutivo e concreto até passar.

Não pare até que cada subagente esteja completamente maravilhado com a qualidade quando comparada com a referência real: ${parada}. A comparação deve ser literal e lado a lado, às cegas, respondendo apenas qual dos dois parece melhor — sem notas, só a escolha binária. Se a referência ganhar, rejeite e recomece o ciclo; /loop até ficar absolutamente perfeito, com fan out de subagentes e ultracode, pelo tempo que for necessário.`
}

const VAZIO: Record<Campo, string> = { tarefa: "", metodo: "", parada: "" }

export function GeradorPromptSupremo() {
  const [aberto, setAberto] = useState(true)
  const [resp, setResp] = useState<Record<Campo, string>>(VAZIO)
  const [copiado, setCopiado] = useState(false)
  const [gerado, setGerado] = useState(false)

  const prompt = useMemo(() => montarPrompt(resp), [resp])
  const algumPreenchido = PERGUNTAS.some((p) => resp[p.key].trim())

  function copiar() {
    navigator.clipboard.writeText(prompt)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function limpar() {
    setResp(VAZIO)
    setGerado(false)
  }

  return (
    <Card className="border-primary/30 bg-primary/5 overflow-hidden">
      <CardContent className="p-0">
        {/* Cabeçalho / trigger */}
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="w-full flex items-center gap-4 p-5 text-left hover:bg-primary/5 transition-colors"
        >
          <div className="bg-primary/15 p-2.5 rounded-xl shrink-0">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold tracking-tight text-foreground">Gerador de Prompt Supremo</p>
              <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-2 py-0 text-[10px] font-bold uppercase">
                Método Gauntlet-Loop
              </Badge>
            </div>
            <p className="text-[12px] font-medium text-muted-foreground mt-0.5">
              Responda 3 perguntas e gere o prompt de elite (fan out de subagentes + /loop + crítico implacável) pronto para colar no Claude Code.
            </p>
          </div>
          <ChevronRight className={`size-5 text-muted-foreground shrink-0 transition-transform duration-200 ${aberto ? "rotate-90" : ""}`} />
        </button>

        {aberto && (
          <div className="border-t border-primary/20 p-5 space-y-5">
            {/* 3 perguntas */}
            <div className="grid gap-4 lg:grid-cols-3">
              {PERGUNTAS.map((p) => (
                <div key={p.key} className="rounded-xl border border-border bg-background/40 p-4 space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="grid size-5 place-items-center rounded-md bg-primary/15 text-[10px] font-mono font-bold text-primary">{p.n}</span>
                      <p className="text-[13px] font-bold tracking-tight text-foreground">{p.titulo}</p>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">{p.ajuda}</p>
                  </div>
                  <Textarea
                    className="rounded-lg min-h-24 text-[13px]"
                    placeholder={p.placeholder}
                    value={resp[p.key]}
                    onChange={(e) => setResp((prev) => ({ ...prev, [p.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* Botão criar prompt */}
            {!gerado && (
              <div className="flex flex-col items-center gap-2 pt-1">
                <Button
                  size="lg"
                  className="h-12 gap-2 rounded-xl px-8 shadow-xl shadow-primary/10"
                  onClick={() => setGerado(true)}
                >
                  <Sparkles className="size-5" />
                  <span className="font-bold uppercase tracking-wider text-[12px]">Criar prompt</span>
                </Button>
                {!algumPreenchido && (
                  <p className="text-[11px] font-medium text-muted-foreground/70">
                    Dica: preencha as 3 perguntas acima para um prompt sob medida (ou gere com os exemplos).
                  </p>
                )}
              </div>
            )}

            {/* Prompt gerado */}
            {gerado && (
              <>
                <div className="rounded-xl border border-border bg-background/60 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Seu prompt</p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 gap-1.5 rounded-lg text-[11px] font-bold text-muted-foreground"
                        onClick={limpar}
                      >
                        <RefreshCw className="size-3.5" />
                        Recomeçar
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider"
                        onClick={copiar}
                      >
                        {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        {copiado ? "Copiado!" : "Copiar"}
                      </Button>
                    </div>
                  </div>
                  <pre className="p-4 text-[12.5px] leading-relaxed text-foreground/90 font-mono whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                    {prompt}
                  </pre>
                </div>

                {/* Como usar — passo a passo */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                  <p className="text-[12px] font-bold uppercase tracking-widest text-primary">Como usar</p>
                  <ol className="space-y-2.5">
                    {[
                      <>Clique em <strong className="text-foreground">Copiar</strong> para levar o prompt acima para a área de transferência.</>,
                      <>Abra o seu <strong className="text-foreground">Claude Code</strong> (ou <strong className="text-foreground">Codex</strong>) em um projeto novo.</>,
                      <><strong className="text-foreground">Cole o prompt</strong> no chat e envie — ele já vem com o método Gauntlet-Loop completo.</>,
                      <>Deixe rodar: o <code className="text-primary">/loop</code> repete cada etapa e o <code className="text-primary">ultracode</code> dispara os subagentes em paralelo.</>,
                      <>O <strong className="text-foreground">crítico às cegas</strong> compara com a referência real e só aprova quando o resultado empata ou supera o padrão de elite.</>,
                    ].map((passo, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="grid size-5 shrink-0 place-items-center rounded-md bg-primary/15 text-[10px] font-mono font-bold text-primary mt-0.5">{i + 1}</span>
                        <span className="text-[13px] font-medium text-muted-foreground leading-relaxed">{passo}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
