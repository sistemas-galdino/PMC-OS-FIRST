import { useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { StatCard, Badge } from "@/components/guardiao/ui-kit"
import { actions, useStore, type ProjetoRegistro } from "@/lib/guardiao"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { ArrowLeft, Play, Share2, Plus, CheckCircle2, Circle, Trash2, Clock } from "lucide-react"

type Opt = { value: string; label: string }

// Radix Select proíbe SelectItem com value "". Usamos um sentinel interno para
// representar a opção "todos / nenhum" (value "" no modelo do store).
const EMPTY = "__empty__"
function GSelect({
  value, onChange, options, placeholder, className,
}: {
  value: string
  onChange: (v: string) => void
  options: Opt[]
  placeholder?: string
  className?: string
}) {
  return (
    <Select value={value === "" ? EMPTY : value} onValueChange={(v) => onChange(v === EMPTY ? "" : v)}>
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

export default function ProjetoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const projeto = useStore((s) => s.projetos.find((p) => p.id === id))
  const setor = useStore((s) => projeto ? s.setores.find((x) => x.id === projeto.setorId) : undefined)
  const gargalo = useStore((s) => projeto?.gargaloId ? s.gargalos.find((g) => g.id === projeto.gargaloId) : undefined)
  const tarefas = useStore((s) => s.tarefas.filter((t) => t.projetoId === id))

  const [novoReg, setNovoReg] = useState<{ texto: string; tipo: ProjetoRegistro["tipo"]; autor: string }>({
    texto: "", tipo: "Nota", autor: "",
  })

  if (!projeto) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-10 text-center">
          <div className="text-base font-medium">Projeto não encontrado</div>
          <Link to="/guardiao/projetos" className="text-sm text-primary mt-2 inline-block">← Voltar para projetos</Link>
        </div>
      </div>
    )
  }

  const totalTarefas = projeto.tarefasPadrao.length
  const feitas = projeto.tarefasPadrao.filter((t) => t.done).length
  const progresso = totalTarefas ? Math.round((feitas / totalTarefas) * 100) : 0

  // agrupa tarefas por etapa
  const etapas: Record<string, typeof projeto.tarefasPadrao> = {}
  projeto.tarefasPadrao.forEach((t) => {
    const m = t.label.match(/^(Etapa \d+)/)
    const key = m?.[1] ?? "Outras"
    ;(etapas[key] ??= []).push(t)
  })

  const adicionarReg = () => {
    if (!novoReg.texto.trim()) return
    actions.addRegistro(projeto.id, novoReg)
    setNovoReg({ texto: "", tipo: novoReg.tipo, autor: novoReg.autor })
  }

  const copiarLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copiado")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/guardiao/projetos" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar para projetos
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copiarLink}>
            <Share2 className="h-4 w-4" /> Copiar link
          </Button>
          <Button onClick={() => navigate(`/guardiao/apresentacao?projeto=${projeto.id}`)}>
            <Play className="h-4 w-4" /> Apresentar este projeto
          </Button>
        </div>
      </div>

      {/* Hero */}
      <div className="rounded-lg border bg-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(600px 200px at 0% 0%, color-mix(in oklab, var(--primary) 25%, transparent), transparent 60%)" }} />
        <div className="relative">
          <div className="text-xs uppercase tracking-[0.2em] text-primary mb-2">{setor?.nome ?? "—"}</div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{projeto.nome}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge tone="neon">{projeto.status}</Badge>
            <Badge>{projeto.tipoEntrega}</Badge>
            <Badge>Prazo: {projeto.prazo || "—"}</Badge>
            {projeto.precisaApoio && <Badge tone="warn">Apoio PMC: {projeto.tipoApoio || "—"}</Badge>}
          </div>
          <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
            <Info label="Líder" value={projeto.lider || "—"} />
            <Info label="Guardião" value={projeto.guardiao || "—"} />
            <Info label="Meta" value={projeto.meta || "—"} />
          </div>
          {projeto.updatedAt && (
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Última atualização: {new Date(projeto.updatedAt).toLocaleString("pt-BR")}
            </div>
          )}
        </div>
      </div>

      {/* Narrativa Antes / Solução / Depois */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Bloco titulo="O problema" tom="warn">
          {gargalo?.processo && <p className="font-medium mb-1">{gargalo.processo}</p>}
          <p>{projeto.problema || gargalo?.descricao || "—"}</p>
          {gargalo?.ondeTrava && <p className="mt-2 text-xs text-muted-foreground">Onde trava: {gargalo.ondeTrava}</p>}
        </Bloco>
        <Bloco titulo="A solução do Guardião" tom="neon">
          <p className="mb-2">{projeto.solucao || "—"}</p>
          <div className="text-xs text-muted-foreground">Tipo de entrega: <strong className="text-foreground">{projeto.tipoEntrega}</strong></div>
        </Bloco>
        <Bloco titulo="O resultado esperado" tom="ok">
          <p className="mb-2">{projeto.resultadoEsperado || "—"}</p>
          {projeto.resultadoAlcancado && (
            <div className="mt-2 pt-2 border-t border-border text-xs">
              <div className="text-muted-foreground mb-1">Alcançado:</div>
              <p>{projeto.resultadoAlcancado}</p>
            </div>
          )}
        </Bloco>
      </div>

      {/* Análise da IA */}
      {gargalo?.analiseIA && (
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Análise da IA</h3>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{gargalo.analiseIA}</pre>
        </div>
      )}

      {/* Progresso por etapa */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Andamento da construção</h3>
          <div className="text-sm text-muted-foreground">{feitas} de {totalTarefas} concluídas · <span className="text-primary font-medium">{progresso}%</span></div>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-5">
          <div className="h-full bg-primary transition-all" style={{ width: `${progresso}%` }} />
        </div>

        <div className="space-y-4">
          {Object.entries(etapas).map(([etapa, tasks]) => {
            const okQtd = tasks.filter((t) => t.done).length
            return (
              <div key={etapa}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={"h-7 w-7 rounded-full grid place-items-center text-xs font-bold " + (okQtd === tasks.length ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {okQtd === tasks.length ? "✓" : etapa.replace("Etapa ", "")}
                  </div>
                  <div className="text-sm font-semibold">{etapa}</div>
                  <div className="text-xs text-muted-foreground">({okQtd}/{tasks.length})</div>
                </div>
                <div className="ml-9 space-y-1">
                  {tasks.map((t, i) => {
                    const idx = projeto.tarefasPadrao.indexOf(t)
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          const next = projeto.tarefasPadrao.map((x, j) => j === idx ? { ...x, done: !x.done } : x)
                          actions.updateProjeto(projeto.id, { tarefasPadrao: next })
                        }}
                        className="flex items-start gap-2 text-sm w-full text-left p-1.5 hover:bg-muted rounded"
                      >
                        {t.done ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                        <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.label.replace(/^Etapa \d+ — /, "")}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Impacto */}
      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard label="Economizadas/semana" value={`${projeto.horasEconomizadas}h`} />
        <StatCard label="Tarefas operacionais vinculadas" value={`${tarefas.length}`} />
        <StatCard label="Apoio PMC necessário" value={projeto.precisaApoio ? "Sim" : "Não"} />
      </div>

      {/* Timeline */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-lg font-semibold mb-3">Linha do tempo do projeto</h3>
        <div className="grid sm:grid-cols-4 gap-2 mb-4">
          <GSelect
            className="w-full"
            value={novoReg.tipo}
            onChange={(v) => setNovoReg({ ...novoReg, tipo: v as ProjetoRegistro["tipo"] })}
            options={["Nota", "Marco", "Evidência", "Decisão"].map((o) => ({ value: o, label: o }))}
          />
          <Input
            className="h-8" placeholder="Autor" value={novoReg.autor}
            onChange={(e) => setNovoReg({ ...novoReg, autor: e.target.value })}
          />
          <Input
            className="h-8 sm:col-span-2" placeholder="O que aconteceu?" value={novoReg.texto}
            onChange={(e) => setNovoReg({ ...novoReg, texto: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") adicionarReg() }}
          />
        </div>
        <Button onClick={adicionarReg}>
          <Plus className="h-4 w-4" /> Adicionar registro
        </Button>

        <div className="mt-5 space-y-3">
          {(projeto.registros ?? []).length === 0 && <div className="text-sm text-muted-foreground">Sem registros ainda — adicione marcos, evidências, decisões e notas que o CEO precisa ver.</div>}
          {(projeto.registros ?? []).map((r) => (
            <div key={r.id} className="relative pl-5 border-l-2 border-primary/40">
              <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-primary" />
              <div className="flex items-baseline gap-2 flex-wrap">
                <Badge tone={r.tipo === "Marco" ? "neon" : r.tipo === "Evidência" ? "ok" : r.tipo === "Decisão" ? "warn" : "default"}>{r.tipo}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(r.data).toLocaleString("pt-BR")}</span>
                {r.autor && <span className="text-xs text-muted-foreground">· {r.autor}</span>}
                <Button
                  variant="ghost" size="icon-sm"
                  className="ml-auto hover:bg-destructive/20 hover:text-destructive"
                  onClick={() => actions.removeRegistro(projeto.id, r.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="text-sm mt-1">{r.texto}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-muted/60 rounded-md">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

function Bloco({ titulo, tom, children }: { titulo: string; tom: "warn" | "neon" | "ok"; children: ReactNode }) {
  const tones = {
    warn: "border-amber-500/30 bg-amber-500/5",
    neon: "border-primary/30 bg-primary/5",
    ok: "border-emerald-500/30 bg-emerald-500/5",
  }
  return (
    <div className={"rounded-lg border p-5 " + tones[tom]}>
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{titulo}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}
