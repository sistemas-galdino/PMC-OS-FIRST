import { useMemo, useState, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader, Badge, StatCard } from "@/components/guardiao/ui-kit"
import {
  actions, useStore, FASES, CHECKLIST_FASE, EVIDENCIAS_OBRIGATORIAS,
  TIPOS_EVIDENCIA, TIPOS_APOIO, CATEGORIAS_ARSENAL, SETORES_DISPONIVEIS,
  PROCESSO_FASE, SETORES_SUGERIDOS_FASE,
  RESULTADO_ESPERADO_FASE, APRESENTAR_CEO_FASE,
  INSTRUCAO_FASE, PROXIMA_ACAO_FASE,
  progressoFase, evidenciasFaltantes,
  sugerirProximaAcaoFase,
  type Fase, type StatusFase,
} from "@/lib/guardiao"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowRight, CheckCircle2, FileCheck2, HandHeart, Sparkles, Plus, FileText,
  ListChecks, Building2, Target, Presentation, Wand2, Trash2, Loader2,
} from "lucide-react"

const STATUS_OPCOES: StatusFase[] = ["Não iniciada", "Em andamento", "Aguardando validação", "Validada", "Concluída"]

// Radix Select proíbe SelectItem com value "". Sentinel interno p/ a opção "todos / nenhum".
const EMPTY = "__empty__"
type Opt = { value: string; label: string }
function GSelect({
  value, onChange, options, placeholder, className, disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: Opt[]
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <Select value={value === "" ? EMPTY : value} onValueChange={(v) => onChange(v === EMPTY ? "" : v)} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const v = o.value === "" ? EMPTY : o.value
          return <SelectItem key={v} value={v}>{o.label}</SelectItem>
        })}
      </SelectContent>
    </Select>
  )
}

export default function FaseDetalhe() {
  const { num } = useParams()
  const faseNum = Math.min(7, Math.max(1, Number(num) || 1)) as Fase
  const st = useStore((s) => s)
  const meta = FASES.find((f) => f.num === faseNum)!
  const estado = st.jornada.fases[faseNum]
  const checklist = CHECKLIST_FASE[faseNum]
  const evidObrig = EVIDENCIAS_OBRIGATORIAS[faseNum]
  const prog = progressoFase(st, faseNum)
  const faltantes = evidenciasFaltantes(st, faseNum)
  const podeConcluir = faltantes.length === 0 && checklist.every((c) => estado.checklist[c])
  const bloqueada = estado.status === "Bloqueada"

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Fase 0${faseNum} — ${meta.titulo}`}
        subtitle={meta.objetivo}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={estado.status === "Concluída" ? "ok" : bloqueada ? "default" : "neon"}>
              {estado.status}
            </Badge>
            <Link to="/guardiao/jornada" className="text-xs px-3 py-1.5 rounded-md bg-muted">← Jornada</Link>
            {faseNum > 1 && (
              <Link to={`/guardiao/fases/${faseNum - 1}`} className="text-xs px-3 py-1.5 rounded-md bg-muted">← Fase {faseNum - 1}</Link>
            )}
            {faseNum < 7 && (
              <Link to={`/guardiao/fases/${faseNum + 1}`} className="text-xs px-3 py-1.5 rounded-md bg-muted">Fase {faseNum + 1} →</Link>
            )}
          </div>
        }
      />

      {bloqueada && (
        <div className="rounded-lg border border-amber-500/40 card-glass p-4">
          <div className="text-sm">
            Esta fase está bloqueada. Conclua a Fase 0{faseNum - 1} para desbloquear.
          </div>
        </div>
      )}

      {/* Como usar esta fase */}
      <div className="rounded-lg border border-primary/30 card-glass p-5">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Como usar esta fase
          </h3>
          <Badge tone="neon">Fase 0{faseNum}</Badge>
        </div>
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-md bg-muted">
            <div className="text-primary font-medium mb-1">O que fazer</div>
            <p className="text-muted-foreground">{INSTRUCAO_FASE[faseNum].fazer}</p>
          </div>
          <div className="p-3 rounded-md bg-muted">
            <div className="text-primary font-medium mb-1">O que entregar</div>
            <p className="text-muted-foreground">{INSTRUCAO_FASE[faseNum].entregar}</p>
          </div>
          <div className="p-3 rounded-md bg-muted">
            <div className="text-primary font-medium mb-1">O que apresentar ao CEO</div>
            <p className="text-muted-foreground">{INSTRUCAO_FASE[faseNum].apresentar}</p>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-md bg-primary/10 border border-primary/30 flex items-start justify-between gap-3 flex-wrap">
          <div className="text-xs">
            <div className="text-primary font-semibold mb-0.5">Próxima ação recomendada</div>
            <div>{PROXIMA_ACAO_FASE[faseNum]}</div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const proximaAcao = PROXIMA_ACAO_FASE[faseNum]
              actions.addTarefa({
                titulo: proximaAcao,
                descricao: `Tarefa criada a partir da ação recomendada da Fase 0${faseNum} — ${meta.titulo}.`,
                responsavel: st.guardiao.nomePrincipal || "",
                setorId: estado.setoresEnvolvidos[0],
                fase: faseNum,
                prazo: "",
                prioridade: "Alta",
                status: "A fazer",
                origem: "Recomendação da fase",
                tipo: "Tarefa",
                observacoes: "",
              } as Parameters<typeof actions.addTarefa>[0])
              toast.success("Tarefa criada a partir da próxima ação.")
            }}
          >
            <Plus className="h-3 w-3" /> Criar tarefa a partir da próxima ação
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard label="Progresso" value={`${prog}%`} />
        <StatCard label="Checklist" value={`${checklist.filter((c) => estado.checklist[c]).length}/${checklist.length}`} />
        <StatCard label="Evidências obrigatórias" value={`${evidObrig.length - faltantes.length}/${evidObrig.length}`} />
        <StatCard label="Tarefas da fase" value={st.tarefas.filter((t) => t.fase === faseNum).length} />
      </div>

      <div className="rounded-lg border card-glass p-5">
        <h3 className="text-sm font-semibold mb-1">Sobre esta fase</h3>
        <p className="text-sm text-muted-foreground">{meta.resumo}</p>
        <div className="grid md:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="p-3 rounded-md bg-muted">
            <div className="text-muted-foreground mb-0.5">Responsável</div>
            <div className="text-sm">{st.guardiao.nomePrincipal || "—"}</div>
          </div>
          <div className="p-3 rounded-md bg-muted">
            <div className="text-muted-foreground mb-0.5">Setores envolvidos</div>
            <div className="text-sm">{estado.setoresEnvolvidos.length || 0} vinculado(s)</div>
          </div>
          <div className="p-3 rounded-md bg-muted">
            <div className="text-muted-foreground mb-0.5">Próxima ação</div>
            <Input
              className="h-8 mt-1"
              value={estado.proximaAcao}
              onChange={(e) => actions.setProximaAcaoFase(faseNum, e.target.value)}
              placeholder="Descreva o próximo passo"
            />
          </div>
        </div>
      </div>

      {/* Processo da fase */}
      <div className="rounded-lg border card-glass p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" /> Processo desta fase
        </h3>
        <ol className="space-y-2">
          {PROCESSO_FASE[faseNum].map((passo, i) => (
            <li key={passo} className="flex gap-3 items-start text-sm p-2 rounded-md bg-muted">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-semibold">{i + 1}</span>
              <span>{passo}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Setores envolvidos */}
      <SetoresEnvolvidos faseNum={faseNum} />

      {/* Formulário específico da fase */}
      {faseNum === 1 && <FormFase1 />}
      {faseNum === 2 && <FormFase2 />}
      {faseNum === 3 && <FormFase3 />}
      {faseNum === 4 && <FormFase4 />}
      {faseNum === 5 && <FormFase5 />}
      {faseNum === 6 && <FormFase6 />}
      {faseNum === 7 && <FormFase7 />}

      {/* Checklist */}
      <div className="rounded-lg border card-glass p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Checklist da fase</h3>
        <div className="grid md:grid-cols-2 gap-2">
          {checklist.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted cursor-pointer">
              <Checkbox
                checked={!!estado.checklist[c]}
                onCheckedChange={(v) => actions.setChecklist(faseNum, c, v === true)}
                disabled={bloqueada}
              />
              <span className={estado.checklist[c] ? "line-through text-muted-foreground" : ""}>{c}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Evidências obrigatórias */}
      {evidObrig.length > 0 && (
        <div className="rounded-lg border card-glass p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-primary" /> Evidências obrigatórias</h3>
            <Link to="/guardiao/evidencias" className="text-xs text-primary">Abrir Evidências →</Link>
          </div>
          <div className="grid md:grid-cols-2 gap-2 mb-4">
            {evidObrig.map((tipo) => {
              const aprovada = st.evidencias.some((e) => e.fase === faseNum && e.tipo === tipo && e.status === "Aprovada")
              return (
                <div key={tipo} className="flex items-center justify-between p-2 rounded-md bg-muted text-sm">
                  <span>{tipo}</span>
                  <Badge tone={aprovada ? "ok" : "warn"}>{aprovada ? "Aprovada" : "Pendente"}</Badge>
                </div>
              )
            })}
          </div>
          <EnviarEvidencia faseNum={faseNum} />
        </div>
      )}

      {/* Tarefas da fase */}
      <TarefasDaFase faseNum={faseNum} />

      {/* Resultado esperado / alcançado */}
      <ResultadoFase faseNum={faseNum} />

      {/* O que apresentar para o CEO */}
      <ApresentarCEO faseNum={faseNum} />

      {/* Vitórias vinculadas a esta fase */}
      <VitoriasDaFase faseNum={faseNum} />

      {/* Sugestão de próximo passo pela IA */}
      <SugestaoIA faseNum={faseNum} />

      {/* Observações do Guardião */}
      <div className="rounded-lg border card-glass p-5">
        <h3 className="text-sm font-semibold mb-2">Observações do Guardião</h3>
        <Textarea
          className="min-h-[120px]"
          value={estado.observacoes}
          onChange={(e) => actions.setObservacoesFase(faseNum, e.target.value)}
          placeholder="Notas, decisões e aprendizados da fase."
        />
      </div>

      {/* Ações finais */}
      <div className="rounded-lg border card-glass p-5 flex flex-wrap items-center gap-3">
        <GSelect
          className="h-8 w-56"
          value={estado.status}
          onChange={(v) => actions.setFaseStatus(faseNum, v as StatusFase)}
          options={STATUS_OPCOES.map((s) => ({ value: s, label: s }))}
          disabled={bloqueada}
        />
        <Button
          onClick={() => actions.setFaseStatus(faseNum, "Concluída")}
          disabled={!podeConcluir || bloqueada}
          title={podeConcluir ? "Concluir fase" : "Conclua o checklist e envie as evidências obrigatórias."}
        >
          <CheckCircle2 className="h-4 w-4" /> Marcar fase como concluída
        </Button>
        <PedirApoio faseNum={faseNum} />
        <Link to="/guardiao/relatorio" className="px-3 py-2 rounded-lg bg-muted text-sm inline-flex items-center gap-2">
          <FileText className="h-4 w-4" /> Gerar relatório da fase
        </Link>
        <Link to="/guardiao/prompts-metodologia" className="px-3 py-2 rounded-lg bg-muted text-sm inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Prompt desta fase
        </Link>
        {faseNum < 6 && (
          <Button
            variant="outline"
            onClick={() => { actions.setFaseStatus(faseNum, "Concluída") }}
            disabled={!podeConcluir}
          >
            Avançar para Fase 0{faseNum + 1} <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ----------- Componentes auxiliares -----------

function EnviarEvidencia({ faseNum }: { faseNum: Fase }) {
  const st = useStore((s) => s)
  const obrig = EVIDENCIAS_OBRIGATORIAS[faseNum]
  const opcoes = obrig.length > 0 ? obrig : TIPOS_EVIDENCIA
  const [tipo, setTipo] = useState(opcoes[0])
  const [titulo, setTitulo] = useState("")
  const [link, setLink] = useState("")
  const [setorId, setSetorId] = useState("")
  const [responsavel, setResponsavel] = useState(st.guardiao.nomePrincipal || "")

  return (
    <div className="grid md:grid-cols-6 gap-2">
      <GSelect
        className="h-8 md:col-span-2" value={tipo} onChange={setTipo}
        options={opcoes.map((o) => ({ value: o, label: o }))}
      />
      <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className="h-8 md:col-span-2" />
      <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (opcional)" className="h-8" />
      <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Responsável" className="h-8" />
      <GSelect
        className="h-8 md:col-span-2" value={setorId} onChange={setSetorId}
        options={[{ value: "", label: "Setor (opcional)" }, ...st.setores.map((s) => ({ value: s.id, label: s.nome }))]}
      />
      <Button
        className="md:col-span-2"
        onClick={() => {
          if (!titulo) return
          actions.addEvidencia({ fase: faseNum, tipo, titulo, link, setorId: setorId || undefined, responsavel, observacaoCS: "" })
          setTitulo(""); setLink("")
        }}
      >
        <Plus className="h-4 w-4" /> Enviar evidência
      </Button>
    </div>
  )
}

function PedirApoio({ faseNum }: { faseNum: Fase }) {
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState(TIPOS_APOIO[0])
  const [descricao, setDescricao] = useState("")
  const [prioridade, setPrioridade] = useState<"Alta" | "Média" | "Baixa">("Média")

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <HandHeart className="h-4 w-4" /> Preciso de apoio PMC
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar apoio — Fase 0{faseNum}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <GSelect
              className="w-full" value={tipo} onChange={setTipo}
              options={TIPOS_APOIO.map((t) => ({ value: t, label: t }))}
            />
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição da dúvida ou demanda" className="min-h-[100px]" />
            <GSelect
              className="w-full" value={prioridade} onChange={(v) => setPrioridade(v as "Alta" | "Média" | "Baixa")}
              options={["Alta", "Média", "Baixa"].map((p) => ({ value: p, label: p }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!descricao) return
                actions.addApoio({ fase: faseNum, tipo, descricao, prioridade, consultorSugerido: "" })
                setOpen(false); setDescricao("")
              }}
            >
              Solicitar apoio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ----------- Setores envolvidos -----------

function SetoresEnvolvidos({ faseNum }: { faseNum: Fase }) {
  const st = useStore((s) => s)
  const estado = st.jornada.fases[faseNum]
  const sugeridos = SETORES_SUGERIDOS_FASE[faseNum]

  return (
    <div className="rounded-lg border card-glass p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> Setores envolvidos
        </h3>
        <div className="text-xs text-muted-foreground">Sugeridos para esta fase: {sugeridos.join(" · ")}</div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {st.setores.map((s) => {
          const ativo = estado.setoresEnvolvidos.includes(s.id)
          return (
            <button
              key={s.id}
              onClick={() => actions.toggleSetorFase(faseNum, s.id)}
              className={
                "px-3 py-1.5 rounded-full text-xs border transition " +
                (ativo
                  ? "bg-primary text-primary-foreground border-primary font-medium"
                  : "bg-muted border-border text-muted-foreground hover:text-foreground")
              }
            >
              {s.nome}
            </button>
          )
        })}
        {st.setores.length === 0 && (
          <Link to="/guardiao/setores" className="text-xs text-primary">Cadastrar setores →</Link>
        )}
      </div>

      {estado.setoresEnvolvidos.length > 0 && (
        <div className="grid md:grid-cols-2 gap-2">
          {estado.setoresEnvolvidos.map((sid) => {
            const setor = st.setores.find((x) => x.id === sid)
            if (!setor) return null
            const tarefas = st.tarefas.filter((t) => t.fase === faseNum && t.setorId === sid)
            const abertas = tarefas.filter((t) => t.status !== "Concluído" && t.status !== "Concluída").length
            const evid = st.evidencias.filter((e) => e.fase === faseNum && e.setorId === sid)
            const enviadas = evid.length
            return (
              <Link
                key={sid}
                to={`/guardiao/setores/${sid}`}
                className="p-3 rounded-md bg-muted hover:ring-1 hover:ring-primary/40 transition block"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{setor.nome}</div>
                  <div className="text-[10px] text-muted-foreground">{setor.lider || "sem líder"}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {abertas} tarefa(s) aberta(s) · {enviadas} evidência(s)
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ----------- Tarefas da fase -----------

function TarefasDaFase({ faseNum }: { faseNum: Fase }) {
  const st = useStore((s) => s)
  const tarefas = st.tarefas.filter((t) => t.fase === faseNum)
  const abertas = tarefas.filter((t) => t.status !== "Concluído" && t.status !== "Concluída")
  const concluidas = tarefas.filter((t) => t.status === "Concluído" || t.status === "Concluída")
  const checklist = CHECKLIST_FASE[faseNum]
  const [titulo, setTitulo] = useState("")
  const [setorId, setSetorId] = useState("")
  const [responsavel, setResponsavel] = useState(st.guardiao.nomePrincipal || "")
  const [prazo, setPrazo] = useState("")

  const criarTodasDoChecklist = () => {
    checklist.forEach((item) => actions.criarTarefaDoChecklist(faseNum, item))
  }

  return (
    <div className="rounded-lg border card-glass p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" /> Tarefas da fase
          <Badge tone="default">{abertas.length} abertas</Badge>
          <Badge tone="ok">{concluidas.length} concluídas</Badge>
        </h3>
        <div className="flex gap-2 flex-wrap items-center">
          <Button variant="outline" size="sm" onClick={criarTodasDoChecklist} title="Cria tarefas a partir do checklist da fase">
            <Wand2 className="h-3 w-3" /> Gerar do checklist
          </Button>
          <Button variant="outline" size="sm" onClick={() => actions.criarTarefasSugeridas(faseNum)}>
            <Sparkles className="h-3 w-3" /> Gerar sugeridas
          </Button>
          <Link to="/guardiao/tarefas" className="text-xs text-primary self-center">Abrir Tarefas →</Link>
        </div>
      </div>

      {/* Criação rápida */}
      <div className="grid md:grid-cols-6 gap-2 mb-4">
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nova tarefa" className="h-8 md:col-span-2" />
        <GSelect
          className="h-8" value={setorId} onChange={setSetorId}
          options={[{ value: "", label: "Setor" }, ...st.setores.map((s) => ({ value: s.id, label: s.nome }))]}
        />
        <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Responsável" className="h-8" />
        <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="h-8" />
        <Button
          onClick={() => {
            if (!titulo) return
            actions.addTarefa({
              titulo, setorId: setorId || undefined, responsavel,
              prazo, prioridade: "Média", status: "A fazer", tipo: "Acompanhamento",
              origem: "Criada manualmente", tipoRotina: "Não se aplica",
              recorrencia: "Sem recorrência", observacoes: "", fase: faseNum,
            })
            setTitulo("")
          }}
        >
          <Plus className="h-4 w-4" /> Criar
        </Button>
      </div>

      {tarefas.length === 0 ? (
        <div className="text-sm text-muted-foreground p-3 rounded-md bg-muted">
          Nenhuma tarefa cadastrada. Use os botões acima para gerar.
        </div>
      ) : (
        <div className="space-y-1">
          {tarefas.map((t) => {
            const setor = st.setores.find((s) => s.id === t.setorId)
            const done = t.status === "Concluído" || t.status === "Concluída"
            return (
              <div key={t.id} className="flex items-center gap-2 p-2 rounded-md bg-muted text-sm">
                <Checkbox
                  checked={done}
                  onCheckedChange={(v) => actions.updateTarefa(t.id, { status: v === true ? "Concluído" : "A fazer" })}
                />
                <span className={"flex-1 " + (done ? "line-through text-muted-foreground" : "")}>{t.titulo}</span>
                {setor && <Badge tone="default">{setor.nome}</Badge>}
                {t.responsavel && <span className="text-xs text-muted-foreground">{t.responsavel}</span>}
                {t.prazo && <span className="text-xs text-muted-foreground">{t.prazo}</span>}
                <Button
                  variant="ghost" size="icon-sm"
                  className="hover:bg-destructive/20 hover:text-destructive"
                  onClick={() => actions.removeTarefa(t.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ----------- Resultado esperado / alcançado -----------

function ResultadoFase({ faseNum }: { faseNum: Fase }) {
  const st = useStore((s) => s)
  const estado = st.jornada.fases[faseNum]
  return (
    <div className="rounded-lg border card-glass p-5">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" /> Resultado da fase
      </h3>
      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Resultado esperado</div>
          <div className="p-3 rounded-md bg-muted text-sm">{RESULTADO_ESPERADO_FASE[faseNum]}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Resultado alcançado</div>
          <Textarea
            value={estado.resultadoAlcancado}
            onChange={(e) => actions.setResultadoFase(faseNum, e.target.value)}
            placeholder="Descreva o resultado real alcançado nesta fase."
            className="min-h-[100px]"
          />
        </div>
      </div>
    </div>
  )
}

// ----------- Apresentar para o CEO -----------

function ApresentarCEO({ faseNum }: { faseNum: Fase }) {
  const st = useStore((s) => s)
  const estado = st.jornada.fases[faseNum]
  const meta = FASES.find((f) => f.num === faseNum)!
  const itens = APRESENTAR_CEO_FASE[faseNum]

  const gerar = () => {
    const setoresNomes = estado.setoresEnvolvidos
      .map((id) => st.setores.find((s) => s.id === id)?.nome)
      .filter(Boolean)
      .join(", ") || "—"
    const tarefasFase = st.tarefas.filter((t) => t.fase === faseNum)
    const concl = tarefasFase.filter((t) => t.status === "Concluído" || t.status === "Concluída")
    const evidAprov = st.evidencias.filter((e) => e.fase === faseNum && e.status === "Aprovada")
    const evidPend = st.evidencias.filter((e) => e.fase === faseNum && e.status !== "Aprovada")
    const apoios = st.apoios.filter((a) => a.fase === faseNum)

    const linhas = [
      `Resumo executivo — Fase 0${faseNum}: ${meta.titulo}`,
      `Objetivo: ${meta.objetivo}`,
      `Status: ${estado.status} · Progresso: ${progressoFase(st, faseNum)}%`,
      ``,
      `Setores trabalhados: ${setoresNomes}`,
      `Tarefas: ${concl.length} concluídas de ${tarefasFase.length}`,
      `Evidências: ${evidAprov.length} aprovadas · ${evidPend.length} pendentes`,
      ``,
      `Resultado alcançado:`,
      estado.resultadoAlcancado || "(preencher)",
      ``,
      `Pontos a apresentar:`,
      ...itens.map((i) => `• ${i}`),
      ``,
      `Próxima ação: ${estado.proximaAcao || "(definir)"}`,
      apoios.length ? `Decisões / apoios solicitados ao CEO: ${apoios.length}` : "",
    ].filter(Boolean).join("\n")

    actions.setResumoCEOFase(faseNum, linhas)
  }

  return (
    <div className="rounded-lg border border-primary/30 card-glass p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Presentation className="h-4 w-4 text-primary" /> O que apresentar para o CEO
        </h3>
        <div className="flex gap-2 items-center">
          <Button size="sm" onClick={gerar}>
            <Sparkles className="h-3 w-3" /> Gerar resumo para CEO
          </Button>
          <Link to="/guardiao/relatorio" className="text-xs px-3 py-1.5 rounded-md bg-muted inline-flex items-center gap-1">
            <FileText className="h-3 w-3" /> Abrir relatório
          </Link>
        </div>
      </div>

      <ul className="grid md:grid-cols-2 gap-2 text-sm mb-4">
        {itens.map((i) => (
          <li key={i} className="p-2 rounded-md bg-muted flex gap-2">
            <span className="text-primary">→</span><span>{i}</span>
          </li>
        ))}
      </ul>

      <div className="text-xs text-muted-foreground mb-1">Resumo gerado (alimenta o Relatório para CEO)</div>
      <Textarea
        value={estado.resumoCEO}
        onChange={(e) => actions.setResumoCEOFase(faseNum, e.target.value)}
        placeholder="Clique em 'Gerar resumo para CEO' ou escreva manualmente."
        className="min-h-[160px] font-mono"
      />
    </div>
  )
}

function VitoriasDaFase({ faseNum }: { faseNum: Fase }) {
  const st = useStore((s) => s)
  const vitorias = (st.vitorias ?? []).filter((v) => v.fase === faseNum)
  return (
    <div className="rounded-lg border card-glass p-5">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" /> Vitórias vinculadas a esta fase
      </h3>
      {vitorias.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhuma vitória registrada nesta fase ainda.{" "}
          <Link to="/guardiao/vitorias" className="text-primary">Registrar vitória</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {vitorias.map((v) => {
            const setorNome = st.setores.find((s) => s.id === v.setorId)?.nome ?? v.setorNome
            return (
              <Link key={v.id} to="/guardiao/vitorias" className="block rounded-md bg-muted p-3 hover:ring-1 hover:ring-primary/40">
                <div className="text-sm font-medium">{v.titulo}</div>
                <div className="text-xs text-muted-foreground">{setorNome ?? "—"} · {v.status}</div>
                <div className="text-xs mt-1">{v.horasSemana || 0}h/semana · {v.percentualEficiencia || 0}% eficiência</div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ----------- Formulários por fase -----------

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-sm block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  )
}

function FormFase1() {
  const g = useStore((s) => s.guardiao)
  const upd = (k: keyof typeof g, v: string) => actions.updateGuardiao({ [k]: v } as Partial<typeof g>)

  const orient = useMemo(() => {
    switch (g.modeloEmpresa) {
      case "Até 10 colaboradores": return "Dono ou 1 colaborador assume o papel de Guardião."
      case "De 10 a 100 colaboradores": return "1 Guardião dedicado."
      case "Acima de 100 colaboradores": return "Célula de IA por departamento."
      case "Acima de 200 colaboradores": return "Cada setor deve ter seu próprio Guardião."
      default: return "Selecione o porte para receber a recomendação automática."
    }
  }, [g.modeloEmpresa])

  return (
    <div className="rounded-lg border card-glass p-5">
      <h3 className="text-sm font-semibold mb-4">Perfil do Guardião</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Nome do Guardião principal"><Input className="h-8" value={g.nomePrincipal} onChange={(e) => upd("nomePrincipal", e.target.value)} /></Field>
        <Field label="Cargo"><Input className="h-8" value={g.cargo} onChange={(e) => upd("cargo", e.target.value)} /></Field>
        <Field label="Setor"><Input className="h-8" value={g.setor} onChange={(e) => upd("setor", e.target.value)} /></Field>
        <Field label="E-mail"><Input className="h-8" value={g.email} onChange={(e) => upd("email", e.target.value)} /></Field>
        <Field label="Telefone"><Input className="h-8" value={g.telefone} onChange={(e) => upd("telefone", e.target.value)} /></Field>
        <Field label="Líder direto"><Input className="h-8" value={g.lider} onChange={(e) => upd("lider", e.target.value)} /></Field>
        <Field label="Dono / CEO responsável"><Input className="h-8" value={g.ceo} onChange={(e) => upd("ceo", e.target.value)} /></Field>
        <Field label="Guardião reserva"><Input className="h-8" value={g.reserva} onChange={(e) => upd("reserva", e.target.value)} /></Field>
        <Field label="Quantidade de colaboradores"><Input className="h-8" value={g.colaboradores} onChange={(e) => upd("colaboradores", e.target.value)} /></Field>
        <Field label="Modelo da empresa">
          <GSelect
            className="h-8 w-full" value={g.modeloEmpresa} onChange={(v) => upd("modeloEmpresa", v)}
            placeholder="Selecione..."
            options={[
              { value: "", label: "Selecione..." },
              { value: "Até 10 colaboradores", label: "Até 10 colaboradores" },
              { value: "De 10 a 100 colaboradores", label: "De 10 a 100 colaboradores" },
              { value: "Acima de 100 colaboradores", label: "Acima de 100 colaboradores" },
              { value: "Acima de 200 colaboradores", label: "Acima de 200 colaboradores" },
            ]}
          />
        </Field>
        <Field label="Setores existentes na empresa"><Input className="h-8" value={g.setor} placeholder="Marketing, Financeiro..." onChange={(e) => upd("setor", e.target.value)} /></Field>
        <Field label="Nível atual de maturidade com IA"><Input className="h-8" value={g.maturidade} onChange={(e) => upd("maturidade", e.target.value)} /></Field>
        <Field label="Ferramentas que já usa"><Input className="h-8" value={g.ferramentas} onChange={(e) => upd("ferramentas", e.target.value)} /></Field>
        <Field label="Principais dificuldades atuais"><Input className="h-8" value={g.dificuldades} onChange={(e) => upd("dificuldades", e.target.value)} /></Field>
      </div>

      <div className="mt-3 p-3 rounded-md bg-primary/10 border border-primary/30 text-sm">
        <span className="text-primary font-medium">Orientação automática: </span>{orient}
      </div>

      <h3 className="text-sm font-semibold mt-6 mb-3">Avaliação de habilidades (1 a 5)</h3>
      <div className="grid md:grid-cols-2 gap-3">
        {([
          ["adocao", "Adoção à tecnologia"],
          ["visao", "Visão de processo e resultado"],
          ["comunicacao", "Comunicação e liderança"],
          ["responsabilidade", "Responsabilidade e governança"],
          ["mudanca", "Gestão de mudança"],
        ] as const).map(([k, label]) => (
          <Field key={k} label={`${label}: ${g.habilidades[k]}`}>
            <input
              type="range" min={1} max={5} value={g.habilidades[k]}
              onChange={(e) => actions.updateGuardiao({ habilidades: { ...g.habilidades, [k]: Number(e.target.value) } })}
              className="w-full accent-primary"
            />
          </Field>
        ))}
      </div>
    </div>
  )
}

function FormFase2() {
  const st = useStore((s) => s)
  const [setorId, setSetorId] = useState(st.setores[0]?.id ?? "")
  const i = st.inteligencia.find((x) => x.setorId === setorId)
  const upd = (p: Partial<NonNullable<typeof i>>) => setorId && actions.upsertInteligencia(setorId, p)

  return (
    <div className="rounded-lg border card-glass p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Inteligência por setor</h3>
        <div className="flex items-center gap-2">
          <Link to="/guardiao/setores" className="text-xs text-primary">+ Novo setor</Link>
          <GSelect
            className="h-8" value={setorId} onChange={setSetorId}
            options={[{ value: "", label: "Selecione um setor" }, ...st.setores.map((s) => ({ value: s.id, label: s.nome }))]}
          />
        </div>
      </div>
      {!setorId ? (
        <div className="text-sm text-muted-foreground">Cadastre setores primeiro para registrar a inteligência empresarial.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Indicadores atuais"><Input className="h-8" value={i?.indicadores ?? ""} onChange={(e) => upd({ indicadores: e.target.value })} /></Field>
          <Field label="Onde os dados estão hoje"><Input className="h-8" value={i?.ondeEstaoDados ?? ""} onChange={(e) => upd({ ondeEstaoDados: e.target.value })} /></Field>
          <Field label="Existe planilha?">
            <GSelect
              className="h-8 w-full" value={String(i?.existePlanilha ?? false)} onChange={(v) => upd({ existePlanilha: v === "true" })}
              options={[{ value: "false", label: "Não" }, { value: "true", label: "Sim" }]}
            />
          </Field>
          <Field label="Existe dashboard?">
            <GSelect
              className="h-8 w-full" value={String(i?.existeDashboard ?? false)} onChange={(v) => upd({ existeDashboard: v === "true" })}
              options={[{ value: "false", label: "Não" }, { value: "true", label: "Sim" }]}
            />
          </Field>
          <Field label="O líder apresenta indicadores para o dono?">
            <GSelect
              className="h-8 w-full" value={String(i?.apresentaIndicadores ?? false)} onChange={(v) => upd({ apresentaIndicadores: v === "true" })}
              options={[{ value: "false", label: "Não" }, { value: "true", label: "Sim" }]}
            />
          </Field>
          <Field label="Frequência da análise"><Input className="h-8" value={i?.frequenciaAnalise ?? ""} onChange={(e) => upd({ frequenciaAnalise: e.target.value })} /></Field>
          <Field label="Meta do setor"><Input className="h-8" value={i?.meta ?? ""} onChange={(e) => upd({ meta: e.target.value })} /></Field>
          <Field label="Principal indicador a melhorar"><Input className="h-8" value={i?.indicadorPrincipal ?? ""} onChange={(e) => upd({ indicadorPrincipal: e.target.value })} /></Field>
          <Field label="Link do dashboard"><Input className="h-8" value={i?.dashboardLink ?? ""} onChange={(e) => upd({ dashboardLink: e.target.value })} /></Field>
          <Field label="Plano de ação">
            <Textarea className="min-h-[80px]" value={i?.planoAcao ?? ""} onChange={(e) => upd({ planoAcao: e.target.value })} />
          </Field>
        </div>
      )}
    </div>
  )
}

function FormFase3() {
  const st = useStore((s) => s)
  return (
    <div className="rounded-lg border card-glass p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Mapeamento de gargalos</h3>
        <Button asChild size="sm">
          <Link to="/guardiao/gargalos"><Plus className="h-4 w-4" /> Abrir Mapeador de Gargalos</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Use a aba <Link to="/guardiao/gargalos" className="text-primary">Gargalos</Link> para cadastrar processo a processo. A IA do sistema gera diagnóstico, causa provável e sugestão de solução automaticamente.
      </p>
      <div className="grid md:grid-cols-3 gap-3">
        <StatCard label="Gargalos mapeados" value={st.gargalos.length} />
        <StatCard label="Solução sugerida" value={st.gargalos.filter((g) => g.status === "Solução sugerida").length} />
        <StatCard label="Viraram projeto" value={st.gargalos.filter((g) => g.status === "Virou projeto piloto").length} />
      </div>
      <h4 className="text-xs font-semibold mt-5 mb-2 uppercase tracking-widest text-muted-foreground">Top gargalos</h4>
      <div className="space-y-2">
        {st.gargalos.slice(0, 5).map((g) => {
          const setor = st.setores.find((s) => s.id === g.setorId)
          return (
            <div key={g.id} className="p-3 rounded-md bg-muted">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{g.processo}</div>
                <Badge tone={g.prioridade === "Alta" ? "neon" : "default"}>{g.prioridade}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{setor?.nome ?? "—"} · {g.status}</div>
            </div>
          )
        })}
        {st.gargalos.length === 0 && <div className="text-sm text-muted-foreground">Nenhum gargalo cadastrado.</div>}
      </div>
    </div>
  )
}

function FormFase4() {
  const st = useStore((s) => s)
  return (
    <div className="rounded-lg border card-glass p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Soluções operacionais</h3>
        <Button asChild size="sm">
          <Link to="/guardiao/projetos"><Plus className="h-4 w-4" /> Abrir Projetos</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Cada gargalo prioritário deve virar um projeto com tipo (Piloto/Projeto) e fluxo no Kanban. Use a aba <Link to="/guardiao/projetos" className="text-primary">Projetos</Link>.
      </p>
      <div className="grid md:grid-cols-3 gap-3">
        <StatCard label="Projetos em construção" value={st.projetos.filter((p) => p.status === "Em construção").length} />
        <StatCard label="Em teste" value={st.projetos.filter((p) => p.status === "Em teste").length} />
        <StatCard label="Validado com líder" value={st.projetos.filter((p) => p.status === "Validado com líder").length} />
      </div>
    </div>
  )
}

function FormFase5() {
  const st = useStore((s) => s)
  return (
    <div className="rounded-lg border card-glass p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Copilotos e rotinas</h3>
        <div className="flex gap-2 items-center">
          <Link to="/guardiao/agenda" className="text-xs px-3 py-1.5 rounded-md bg-muted">Rotinas e Rituais</Link>
          <Button asChild size="sm">
            <Link to="/guardiao/tarefas">+ Atividade recorrente</Link>
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Transforme soluções validadas em rotinas diárias, semanais, quinzenais ou mensais. Cada copiloto precisa de prompt base, responsável humano e quem valida.
      </p>
      <div className="grid md:grid-cols-4 gap-3">
        <StatCard label="Rotinas diárias" value={st.tarefas.filter((t) => t.tipoRotina === "Diária").length} />
        <StatCard label="Semanais" value={st.tarefas.filter((t) => t.tipoRotina === "Semanal").length} />
        <StatCard label="Quinzenais" value={st.tarefas.filter((t) => t.tipoRotina === "Quinzenal").length} />
        <StatCard label="Mensais" value={st.tarefas.filter((t) => t.tipoRotina === "Mensal").length} />
      </div>
    </div>
  )
}

function FormFase6() {
  const st = useStore((s) => s)
  const sistemas = st.projetos.filter((p) => p.tipoEntrega === "Sistema")
  return (
    <div className="rounded-lg border card-glass p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Sistemas inteligentes</h3>
        <Button asChild size="sm">
          <Link to="/guardiao/projetos"><Plus className="h-4 w-4" /> Criar sistema (Projetos)</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        <span className="text-primary">Mantra desta fase:</span> Eu tenho um problema. Eu crio um sistema para resolver.
      </p>
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <StatCard label="Sistemas em construção" value={sistemas.filter((p) => p.status === "Em construção").length} />
        <StatCard label="Implementando" value={sistemas.filter((p) => p.status === "Implementando").length} />
        <StatCard label="Implementados" value={sistemas.filter((p) => p.status === "Implementado").length} />
      </div>
      <div className="space-y-2">
        {sistemas.slice(0, 6).map((p) => (
          <Link key={p.id} to={`/guardiao/projetos/${p.id}`} className="block p-3 rounded-md bg-muted hover:bg-muted/70 transition">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{p.nome}</div>
              <Badge tone="neon">{p.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">{p.problema}</div>
          </Link>
        ))}
        {sistemas.length === 0 && <div className="text-sm text-muted-foreground">Nenhum sistema criado ainda.</div>}
      </div>
    </div>
  )
}

function FormFase7() {
  const st = useStore((s) => s)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    categoria: CATEGORIAS_ARSENAL[0], objetivo: "", setorId: "", descricao: "",
    resultadoEsperado: "", consultorSugerido: "", linkAgenda: "",
  })
  return (
    <div className="rounded-lg border card-glass p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Arsenal do Lucro</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Solicitar apoio PMC
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Fase paralela: pode ser usada a qualquer momento. Não bloqueia as fases 1 a 6.
      </p>
      <div className="space-y-2">
        {st.arsenal.map((a) => (
          <div key={a.id} className="p-3 rounded-md bg-muted">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{a.categoria} · {a.objetivo}</div>
              <Badge tone="neon">{a.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">{a.descricao}</div>
          </div>
        ))}
        {st.arsenal.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma demanda registrada ainda.</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova demanda — Arsenal do Lucro</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Categoria">
              <GSelect
                className="h-8 w-full" value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v })}
                options={CATEGORIAS_ARSENAL.map((c) => ({ value: c, label: c }))}
              />
            </Field>
            <Field label="Setor envolvido">
              <GSelect
                className="h-8 w-full" value={form.setorId} onChange={(v) => setForm({ ...form, setorId: v })}
                options={[
                  { value: "", label: "—" },
                  ...st.setores.map((s) => ({ value: s.id, label: s.nome })),
                  ...SETORES_DISPONIVEIS.map((s) => ({ value: s, label: s })),
                ]}
              />
            </Field>
            <Field label="Objetivo"><Input className="h-8" value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} /></Field>
            <Field label="Consultor sugerido"><Input className="h-8" value={form.consultorSugerido} onChange={(e) => setForm({ ...form, consultorSugerido: e.target.value })} /></Field>
            <Field label="Descrição do problema">
              <Textarea className="min-h-[80px]" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </Field>
            <Field label="Resultado esperado">
              <Textarea className="min-h-[80px]" value={form.resultadoEsperado} onChange={(e) => setForm({ ...form, resultadoEsperado: e.target.value })} />
            </Field>
            <Field label="Link de agenda"><Input className="h-8" value={form.linkAgenda} onChange={(e) => setForm({ ...form, linkAgenda: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!form.objetivo) return
                actions.addArsenal({ ...form })
                setOpen(false)
                setForm({ categoria: CATEGORIAS_ARSENAL[0], objetivo: "", setorId: "", descricao: "",
                  resultadoEsperado: "", consultorSugerido: "", linkAgenda: "" })
              }}
            >Salvar demanda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SugestaoIA({ faseNum }: { faseNum: Fase }) {
  const st = useStore((s) => s)
  const estadoFase = st.jornada.fases[faseNum]
  const fase = FASES.find((f) => f.num === faseNum)!
  const [loading, setLoading] = useState(false)
  const [texto, setTexto] = useState("")

  const gerar = async () => {
    const checklist = CHECKLIST_FASE[faseNum] ?? []
    const evFase = st.evidencias.filter((e) => e.fase === faseNum)
    const tarefasFase = st.tarefas.filter((t) => t.fase === faseNum)
    const progresso = progressoFase(st, faseNum)

    setLoading(true)
    try {
      const r = await sugerirProximaAcaoFase({
        faseNum,
        titulo: fase.titulo,
        objetivo: fase.objetivo,
        status: estadoFase.status,
        progresso,
        checklistPendente: checklist.filter((c) => !estadoFase.checklist[c]),
        evidenciasFaltantes: evidenciasFaltantes(st, faseNum).slice(0, 10),
        tarefasPendentes: tarefasFase
          .filter((t) => t.status !== "Concluído" && t.status !== "Concluída")
          .map((t) => t.titulo),
        setoresEnvolvidos: estadoFase.setoresEnvolvidos ?? [],
        resultadoAlcancado: estadoFase.resultadoAlcancado || "",
      })
      setTexto(r.text)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("RATE_LIMIT")) toast.error("IA ocupada. Tente em alguns segundos.")
      else if (msg.includes("CREDITS_EXHAUSTED")) toast.error("Créditos de IA esgotados.")
      else toast.error("Erro: " + msg)
    } finally {
      setLoading(false)
    }
    void evFase
  }

  const aplicarComoProxima = () => {
    if (!texto.trim()) return
    const primeira = texto.split("\n").find((l) => l.trim().match(/^(\d+\.|[-*])\s/))?.replace(/^(\d+\.|[-*])\s/, "").trim() || texto.slice(0, 200)
    actions.setProximaAcaoFase(faseNum, primeira)
    toast.success("Próxima ação da fase atualizada.")
  }

  const copiar = () => {
    navigator.clipboard.writeText(texto)
    toast.success("Copiado.")
  }

  return (
    <section className="rounded-lg border border-primary/30 card-glass p-5 glow-neon">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Sugestão da IA — próximo passo</h3>
        </div>
        <Button size="sm" onClick={gerar} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          {loading ? "Pensando..." : texto ? "Gerar novamente" : "Gerar sugestão"}
        </Button>
      </div>

      {!texto && !loading && (
        <p className="text-sm text-muted-foreground">A IA analisa o estado atual desta fase (checklist, evidências, tarefas) e recomenda 3 próximas ações práticas com responsável e evidência esperada.</p>
      )}

      {texto && (
        <div className="space-y-3">
          <pre className="whitespace-pre-wrap text-sm bg-muted rounded-lg p-4 border border-border font-sans leading-relaxed">{texto}</pre>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={aplicarComoProxima}>Usar 1ª ação como “Próxima ação” da fase</Button>
            <Button variant="outline" size="sm" onClick={copiar}>Copiar</Button>
          </div>
        </div>
      )}
    </section>
  )
}
