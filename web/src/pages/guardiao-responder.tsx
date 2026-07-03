import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { getInvitePorToken, submeterRespostas } from "@/lib/guardiao/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import {
  ShieldCheckIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  AlertTriangleIcon,
  ZapIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"

/* ---------------------------------------------------------------------------
 * Formulário público do respondente (SEM login) — Fase 5.
 * Rota (registrada na Fase 6): /guardiao/r/:token  ->  export default abaixo.
 * ------------------------------------------------------------------------- */

type LoadResult = Awaited<ReturnType<typeof getInvitePorToken>>

const KNOWN_AI_TOOLS = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Microsoft Copilot",
  "Manus",
  "Notebook LM",
  "Perplexity",
  "Midjourney",
  "DALL·E",
  "Notion AI",
  "GitHub Copilot",
  "Grok",
  "Meta AI",
  "Leonardo AI",
  "Runway",
  "ElevenLabs",
]

const FAMILIARITY = ["Básico", "Intermediário", "Avançado"] as const
type Familiarity = (typeof FAMILIARITY)[number]

/** Uma pergunta é de texto quando não traz opções (ou é do tipo texto_livre). */
function isTextQuestion(q: any): boolean {
  return q?.type === "texto_livre" || !(q?.guardiao_question_options?.length)
}

export default function GuardiaoResponderPage() {
  const { token } = useParams<{ token?: string }>()

  const [data, setData] = useState<LoadResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Steps: 0 = intro, 1 = identidade, 2 = ferramentas IA, 3..N+2 = perguntas
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({})
  const [selectedTools, setSelectedTools] = useState<Record<string, Familiarity>>({})
  const [otherTools, setOtherTools] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [identity, setIdentity] = useState({ name: "", email: "", whatsapp: "" })

  useEffect(() => {
    if (!token) {
      setLoadError("Link inválido")
      setLoading(false)
      return
    }
    let alive = true
    ;(async () => {
      try {
        const res = await getInvitePorToken(token)
        if (!alive) return
        setData(res)
        setIdentity({
          name: res.invite.candidate_name ?? "",
          email: res.invite.candidate_email ?? "",
          whatsapp: res.invite.candidate_whatsapp ?? "",
        })
      } catch (err: any) {
        if (alive) setLoadError(err?.message ?? "Não foi possível carregar a avaliação")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [token])

  const questions = data?.questions ?? []
  const total = questions.length

  const questionIndex = step - 3 // 0-based
  const currentQ = questionIndex >= 0 && questionIndex < total ? questions[questionIndex] : null
  const isLastQuestion = !!currentQ && questionIndex === total - 1

  // Progresso: identidade + ferramentas + perguntas
  const totalSteps = total + 2
  const progressPct = step === 0 ? 0 : Math.min(100, ((step - 1) / totalSteps) * 100)

  function toggleTool(name: string) {
    setSelectedTools((s) => {
      const next = { ...s }
      if (next[name]) delete next[name]
      else next[name] = "Intermediário"
      return next
    })
  }

  function setToolLevel(name: string, level: Familiarity) {
    setSelectedTools((s) => ({ ...s, [name]: level }))
  }

  function buildAiToolsText(): string {
    const lines: string[] = []
    for (const [name, level] of Object.entries(selectedTools)) lines.push(`${name} (${level})`)
    if (otherTools.trim()) lines.push(`Outras: ${otherTools.trim()}`)
    return lines.join("; ")
  }

  function goTo(next: number) {
    setStep(next)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function saveIdentityAndProceed() {
    if (!identity.name.trim()) {
      toast.error("Informe seu nome completo")
      return
    }
    goTo(2)
  }

  async function finish() {
    const choiceQs = questions.filter((q: any) => !isTextQuestion(q))
    const textQs = questions.filter((q: any) => isTextQuestion(q))
    const choiceMissing = choiceQs.filter((q: any) => !answers[q.id]).length
    const textMissing = textQs.filter((q: any) => !(textAnswers[q.id] ?? "").trim()).length
    if (choiceMissing > 0 || textMissing > 0) {
      toast.error("Responda todas as perguntas antes de enviar")
      return
    }
    setSubmitting(true)
    try {
      await submeterRespostas({
        token: token!,
        identity: {
          name: identity.name.trim(),
          email: identity.email.trim() || undefined,
          whatsapp: identity.whatsapp.trim() || undefined,
        },
        ai_tools_text: buildAiToolsText(),
        answers: choiceQs
          .filter((q: any) => answers[q.id])
          .map((q: any) => ({ question_id: q.id, option_id: answers[q.id] })),
        text_answers: textQs
          .filter((q: any) => (textAnswers[q.id] ?? "").trim())
          .map((q: any) => ({ question_id: q.id, text: textAnswers[q.id].trim() })),
      })
      setDone(true)
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err: any) {
      const msg = err?.message ?? ""
      if (msg.includes("já concluída") || msg.includes("ja concluida") || msg.includes("concluído")) {
        setDone(true)
        return
      }
      toast.error("Erro ao enviar", { description: msg || "Tente novamente" })
    } finally {
      setSubmitting(false)
    }
  }

  function nextQuestion() {
    if (currentQ) {
      if (isTextQuestion(currentQ)) {
        if (!(textAnswers[currentQ.id] ?? "").trim()) {
          toast.error("Escreva uma resposta para continuar")
          return
        }
      } else if (!answers[currentQ.id]) {
        toast.error("Selecione uma opção para continuar")
        return
      }
    }
    if (isLastQuestion) {
      finish()
      return
    }
    goTo(step + 1)
  }

  /* ---------------------------- Estados de borda --------------------------- */

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Spinner className="text-primary" />
          <span className="text-sm">Carregando avaliação…</span>
        </div>
      </Shell>
    )
  }

  if (loadError || !data) {
    return (
      <Shell>
        <NoticeCard
          icon={<AlertTriangleIcon className="text-destructive" />}
          title="Não foi possível abrir o convite"
          message={loadError ?? "Link inválido ou expirado."}
        />
      </Shell>
    )
  }

  if (data.invite.expired) {
    return (
      <Shell>
        <NoticeCard
          icon={<AlertTriangleIcon className="text-primary" />}
          title="Este convite expirou"
          message="Solicite um novo link ao responsável pela avaliação."
        />
      </Shell>
    )
  }

  if (done || data.invite.status === "concluido") {
    return (
      <Shell>
        <NoticeCard
          icon={<CheckIcon className="text-primary" />}
          title={done ? "Avaliação enviada!" : "Você já concluiu esta avaliação"}
          message="Obrigado por participar. Entraremos em contato caso você seja selecionado(a)."
        />
      </Shell>
    )
  }

  if (total === 0) {
    return (
      <Shell>
        <NoticeCard
          icon={<AlertTriangleIcon className="text-primary" />}
          title="Avaliação indisponível"
          message="Esta avaliação ainda não possui perguntas. Fale com o responsável."
        />
      </Shell>
    )
  }

  /* -------------------------------- Wizard --------------------------------- */

  const displayName = identity.name || data.invite.candidate_name || ""

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheckIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight leading-none">Perfil do Guardião</p>
            {displayName && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{displayName}</p>
            )}
          </div>
          {step > 0 && (
            <Badge variant="outline">
              {step === 1
                ? "Identificação"
                : step === 2
                  ? "Ferramentas"
                  : `${questionIndex + 1} / ${total}`}
            </Badge>
          )}
        </div>
        {step > 0 && <Progress value={progressPct} className="h-1 rounded-none" />}
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8 md:py-12">
        {step === 0 && <Intro assessment={data.assessment} onStart={() => goTo(1)} />}

        {step === 1 && (
          <IdentityStep
            identity={identity}
            onChange={setIdentity}
            onNext={saveIdentityAndProceed}
            onPrev={() => goTo(0)}
          />
        )}

        {step === 2 && (
          <ToolsStep
            selected={selectedTools}
            onToggle={toggleTool}
            onSetLevel={setToolLevel}
            otherTools={otherTools}
            setOtherTools={setOtherTools}
            onNext={() => goTo(3)}
            onPrev={() => goTo(1)}
          />
        )}

        {currentQ && (
          <QuestionCard
            index={questionIndex + 1}
            total={total}
            question={currentQ}
            value={answers[currentQ.id]}
            textValue={textAnswers[currentQ.id] ?? ""}
            onSelect={(oid) => setAnswers((a) => ({ ...a, [currentQ.id]: oid }))}
            onText={(t) => setTextAnswers((m) => ({ ...m, [currentQ.id]: t }))}
            onNext={nextQuestion}
            onPrev={() => goTo(step - 1)}
            isLast={isLastQuestion}
            submitting={submitting}
          />
        )}
      </main>
    </div>
  )
}

/* ------------------------------- Sub-views ------------------------------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      {children}
    </div>
  )
}

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-6 md:p-8", className)}>
      {children}
    </section>
  )
}

function NoticeCard({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode
  title: string
  message: string
}) {
  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted/30 text-2xl [&_svg]:h-6 [&_svg]:w-6">
        {icon}
      </div>
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function Intro({ assessment, onStart }: { assessment: any; onStart: () => void }) {
  return (
    <Section>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Bem-vindo(a)</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Olá! 👋</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
        {assessment?.description ??
          "Você está participando do processo seletivo para a vaga de Guardião da IA. Responda as perguntas com calma e clique em Finalizar ao terminar."}
      </p>
      <Button className="mt-8" size="lg" onClick={onStart}>
        Começar <ChevronRightIcon />
      </Button>
    </Section>
  )
}

function IdentityStep({
  identity,
  onChange,
  onNext,
  onPrev,
}: {
  identity: { name: string; email: string; whatsapp: string }
  onChange: (v: { name: string; email: string; whatsapp: string }) => void
  onNext: () => void
  onPrev: () => void
}) {
  return (
    <Section>
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="h-4 w-4 text-primary" />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Identificação</p>
      </div>
      <h2 className="mt-2 text-lg font-bold tracking-tight md:text-xl">
        Antes de começar, precisamos conhecer você
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Preencha seus dados abaixo. Eles serão usados apenas para identificação durante o processo.
      </p>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">
            Nome completo <span className="text-destructive">*</span>
          </Label>
          <Input
            value={identity.name}
            onChange={(e) => onChange({ ...identity, name: e.target.value })}
            placeholder="Digite aqui seu nome completo"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Melhor e-mail</Label>
          <Input
            type="email"
            value={identity.email}
            onChange={(e) => onChange({ ...identity, email: e.target.value })}
            placeholder="Digite aqui seu melhor e-mail"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">WhatsApp</Label>
          <Input
            type="tel"
            value={identity.whatsapp}
            onChange={(e) => onChange({ ...identity, whatsapp: e.target.value })}
            placeholder="Digite aqui seu melhor WhatsApp"
          />
        </div>
      </div>

      <NavRow
        onPrev={onPrev}
        onNext={onNext}
        nextDisabled={!identity.name.trim()}
        nextLabel="Continuar"
      />
    </Section>
  )
}

function ToolsStep({
  selected,
  onToggle,
  onSetLevel,
  otherTools,
  setOtherTools,
  onNext,
  onPrev,
}: {
  selected: Record<string, Familiarity>
  onToggle: (name: string) => void
  onSetLevel: (name: string, level: Familiarity) => void
  otherTools: string
  setOtherTools: (v: string) => void
  onNext: () => void
  onPrev: () => void
}) {
  return (
    <Section>
      <div className="flex items-center gap-2">
        <ZapIcon className="h-4 w-4 text-primary" />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Antes de começar</p>
      </div>
      <h2 className="mt-2 text-lg font-bold tracking-tight md:text-xl">
        Quais ferramentas de Inteligência Artificial você já conhece ou utiliza no seu dia a dia?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Selecione as que você usa (profissional ou pessoal) e indique seu nível de familiaridade.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {KNOWN_AI_TOOLS.map((name) => {
          const active = !!selected[name]
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {active && "✓ "}
              {name}
            </button>
          )
        })}
      </div>

      {Object.keys(selected).length > 0 && (
        <div className="mt-6 space-y-2.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Nível de familiaridade
          </p>
          {Object.entries(selected).map(([name, level]) => (
            <div
              key={name}
              className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm font-medium text-foreground">{name}</span>
              <div className="flex gap-1.5">
                {FAMILIARITY.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => onSetLevel(name, lv)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      level === lv
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-2">
        <Label className="text-muted-foreground">Outras ferramentas (opcional)</Label>
        <Input
          value={otherTools}
          onChange={(e) => setOtherTools(e.target.value)}
          placeholder="Ex.: Cursor, v0, Lovable…"
        />
      </div>

      <NavRow onPrev={onPrev} onNext={onNext} nextLabel="Continuar" />
    </Section>
  )
}

function QuestionCard({
  index,
  total,
  question,
  value,
  textValue,
  onSelect,
  onText,
  onNext,
  onPrev,
  isLast,
  submitting,
}: {
  index: number
  total: number
  question: any
  value?: string
  textValue: string
  onSelect: (oid: string) => void
  onText: (t: string) => void
  onNext: () => void
  onPrev: () => void
  isLast: boolean
  submitting: boolean
}) {
  const isText = isTextQuestion(question)
  const options: any[] = question.guardiao_question_options ?? []
  const nextDisabled = (isText ? !textValue.trim() : !value) || submitting

  return (
    <Section>
      {question.scenario_label && (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          {question.scenario_label}
        </p>
      )}
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Pergunta {index} de {total}
      </p>
      <h2 className="mt-2 text-lg font-bold tracking-tight md:text-xl">{question.prompt}</h2>

      {isText ? (
        <div className="mt-6">
          <Textarea
            value={textValue}
            onChange={(e) => onText(e.target.value)}
            placeholder="Escreva sua resposta…"
            rows={6}
            maxLength={4000}
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">{textValue.length}/4000 caracteres</p>
        </div>
      ) : (
        <RadioGroup
          value={value ?? ""}
          onValueChange={onSelect}
          className="mt-6 gap-2.5"
        >
          {options.map((opt) => {
            const active = value === opt.id
            return (
              <Label
                key={opt.id}
                htmlFor={`opt-${opt.id}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/20 hover:border-primary/40",
                )}
              >
                <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} className="mt-0.5" />
                <span className="flex-1 text-sm leading-relaxed">
                  {opt.letter && <span className="mr-1.5 font-bold text-primary">{opt.letter})</span>}
                  <span className={active ? "text-foreground" : "text-muted-foreground"}>{opt.label}</span>
                </span>
              </Label>
            )
          })}
        </RadioGroup>
      )}

      <NavRow
        onPrev={onPrev}
        onNext={onNext}
        prevDisabled={submitting}
        nextDisabled={nextDisabled}
        nextLabel={
          submitting ? (
            <>
              <Spinner /> Enviando…
            </>
          ) : isLast ? (
            <>
              <CheckIcon /> Finalizar avaliação
            </>
          ) : (
            <>
              Próxima <ChevronRightIcon />
            </>
          )
        }
      />
    </Section>
  )
}

function NavRow({
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  nextLabel,
}: {
  onPrev: () => void
  onNext: () => void
  prevDisabled?: boolean
  nextDisabled?: boolean
  nextLabel: React.ReactNode
}) {
  return (
    <div className="mt-7 flex items-center justify-between">
      <Button variant="outline" onClick={onPrev} disabled={prevDisabled}>
        <ArrowLeftIcon /> Voltar
      </Button>
      <Button onClick={onNext} disabled={nextDisabled}>
        {nextLabel}
      </Button>
    </div>
  )
}
