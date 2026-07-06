import { useMemo, useState, type ReactNode } from "react"

import { PageHeader, StatCard, Badge, EmptyState, FaseBadge } from "@/components/guardiao/ui-kit"
import {
  actions, useStore, FASES, TIPOS_VITORIA, APOIO_QUEM, APOIO_DECISIVO,
  STATUS_VITORIAS, TIPOS_EVIDENCIA_VITORIA, TIPOS_ENTREGA, SETORES_DISPONIVEIS,
  resumoVitoriaParaCEO,
  type Fase, type StatusVitoria, type Vitoria,
} from "@/lib/guardiao"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Trophy, FileText, Copy } from "lucide-react"
import { toast } from "sonner"

type Opt = { value: string; label: string }

// Radix Select proíbe SelectItem com value "". Sentinel interno para a opção
// "todos / nenhum" (value "" no modelo do store).
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

const FILTRO_INICIAL = {
  setor: "", fase: "todas" as "todas" | Fase, tipo: "",
  responsavel: "", apoio: "todos" as "todos" | "sim" | "nao",
  status: "todos" as "todos" | StatusVitoria, periodo: "",
}

function novaVitoriaVazia(): Omit<Vitoria, "id" | "criadoEm"> {
  return {
    titulo: "", data: new Date().toISOString().slice(0, 10),
    setorId: "", setorNome: "", fase: 2, guardiao: "", liderSetor: "",
    tipos: [], gargaloDescricao: "", ondeTravava: "", comoEraAntes: "",
    tempoAntes: "", impactoAntes: "", solucaoDescricao: "", tipoSolucao: "Dashboard",
    nomeSolucao: "", linkSolucao: "", faseSolucao: undefined,
    setorBeneficiado: "", quemUsaHoje: "",
    reducaoHoras: false, horasDia: 0, horasSemana: 0, horasMes: 0,
    ganhoEficiencia: false, percentualEficiencia: 0,
    reducaoCusto: false, valorCustoEconomizado: 0,
    aumentoReceita: false, valorReceita: "",
    melhoriaDecisao: false, resumoVitoria: "",
    teveApoioPMC: false, apoioQuem: [], apoioDecisivo: [],
    apoioDescricao: "", apoioLink: "",
    evidencias: [], observacoes: "",
    status: "Rascunho", noRelatorioCEO: false, resumoCEO: "",
  }
}

export default function Vitorias() {
  const setores = useStore((s) => s.setores)
  const vitorias = useStore((s) => s.vitorias) ?? []
  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<Vitoria | null>(null)
  const [openDetalhes, setOpenDetalhes] = useState<Vitoria | null>(null)
  const [filtros, setFiltros] = useState(FILTRO_INICIAL)
  const [aba, setAba] = useState<"vitorias" | "indicadores">("vitorias")

  const filtradas = vitorias.filter((v) => {
    if (filtros.setor && v.setorId !== filtros.setor) return false
    if (filtros.fase !== "todas" && v.fase !== filtros.fase) return false
    if (filtros.tipo && !v.tipos.includes(filtros.tipo)) return false
    if (filtros.responsavel && !(v.guardiao + " " + v.liderSetor).toLowerCase().includes(filtros.responsavel.toLowerCase())) return false
    if (filtros.apoio === "sim" && !v.teveApoioPMC) return false
    if (filtros.apoio === "nao" && v.teveApoioPMC) return false
    if (filtros.status !== "todos" && v.status !== filtros.status) return false
    if (filtros.periodo && !v.data.startsWith(filtros.periodo)) return false
    return true
  })

  const totais = useMemo(() => calcularTotais(vitorias), [vitorias])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Vitórias"
        subtitle="Registre, organize e apresente os resultados gerados pela implementação de IA."
        action={
          <Button onClick={() => { setEditing(null); setOpenForm(true) }}>
            <Plus className="h-4 w-4" /> Registrar nova vitória
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Vitórias registradas" value={totais.total} />
        <StatCard label="Horas economizadas/semana" value={totais.horasSemana} />
        <StatCard label="Horas economizadas/mês" value={totais.horasMes} />
        <StatCard label="Eficiência média" value={`${totais.eficienciaMedia}%`} />
        <StatCard label="Setores com vitórias" value={totais.setoresUnicos} />
        <StatCard label="Sistemas implantados" value={totais.sistemas} />
        <StatCard label="Vitórias com apoio PMC" value={totais.comApoio} />
        <StatCard label="Apresentadas ao CEO" value={totais.aoCEO} />
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as "vitorias" | "indicadores")}>
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="vitorias">Vitórias</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores das Vitórias</TabsTrigger>
        </TabsList>
      </Tabs>

      {aba === "vitorias" && (
        <>
          <div className="flex flex-wrap gap-2">
            <GSelect
              value={filtros.setor} onChange={(v) => setFiltros({ ...filtros, setor: v })}
              options={[{ value: "", label: "Todos os setores" }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]}
            />
            <GSelect
              value={filtros.fase === "todas" ? "todas" : String(filtros.fase)}
              onChange={(v) => setFiltros({ ...filtros, fase: v === "todas" ? "todas" : Number(v) as Fase })}
              options={[{ value: "todas", label: "Todas as fases" }, ...FASES.map((f) => ({ value: String(f.num), label: `Fase 0${f.num}` }))]}
            />
            <GSelect
              value={filtros.tipo} onChange={(v) => setFiltros({ ...filtros, tipo: v })}
              options={[{ value: "", label: "Todos os tipos" }, ...TIPOS_VITORIA.map((t) => ({ value: t, label: t }))]}
            />
            <Input placeholder="Responsável" className="h-8 w-40" value={filtros.responsavel} onChange={(e) => setFiltros({ ...filtros, responsavel: e.target.value })} />
            <GSelect
              value={filtros.apoio} onChange={(v) => setFiltros({ ...filtros, apoio: v as "todos" | "sim" | "nao" })}
              options={[{ value: "todos", label: "Apoio PMC: todos" }, { value: "sim", label: "Com apoio" }, { value: "nao", label: "Sem apoio" }]}
            />
            <GSelect
              value={filtros.status} onChange={(v) => setFiltros({ ...filtros, status: v as "todos" | StatusVitoria })}
              options={[{ value: "todos", label: "Todos os status" }, ...STATUS_VITORIAS.map((s) => ({ value: s, label: s }))]}
            />
            <Input type="month" className="h-8 w-40" value={filtros.periodo} onChange={(e) => setFiltros({ ...filtros, periodo: e.target.value })} />
          </div>

          {filtradas.length === 0 ? (
            <EmptyState title="Nenhuma vitória registrada ainda" hint="Clique em “Registrar nova vitória” para começar." />
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtradas.map((v) => (
                <VitoriaCard key={v.id} v={v}
                  setorNome={setores.find((s) => s.id === v.setorId)?.nome ?? v.setorNome}
                  onDetalhes={() => setOpenDetalhes(v)}
                  onEditar={() => { setEditing(v); setOpenForm(true) }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {aba === "indicadores" && <PainelIndicadores vitorias={vitorias} setores={setores} />}

      {openForm && (
        <FormularioVitoria
          inicial={editing ?? undefined}
          setores={setores}
          onCancel={() => { setOpenForm(false); setEditing(null) }}
          onSalvar={(dados) => {
            if (editing) actions.updateVitoria(editing.id, dados)
            else actions.addVitoria(dados)
            setOpenForm(false); setEditing(null)
          }}
        />
      )}

      {openDetalhes && (
        <DetalhesVitoria
          v={openDetalhes}
          setorNome={setores.find((s) => s.id === openDetalhes.setorId)?.nome ?? openDetalhes.setorNome}
          onClose={() => setOpenDetalhes(null)}
        />
      )}
    </div>
  )
}

function calcularTotais(vitorias: Vitoria[]) {
  const total = vitorias.length
  const horasSemana = vitorias.reduce((a, v) => a + (v.horasSemana || 0), 0)
  const horasMes = vitorias.reduce((a, v) => a + (v.horasMes || 0), 0)
  const efic = vitorias.filter((v) => v.ganhoEficiencia && v.percentualEficiencia > 0)
  const eficienciaMedia = efic.length ? Math.round(efic.reduce((a, v) => a + v.percentualEficiencia, 0) / efic.length) : 0
  const setoresUnicos = new Set(vitorias.map((v) => v.setorId).filter(Boolean)).size
  const sistemas = vitorias.filter((v) => v.tipos.includes("Criação de sistema") || v.tipoSolucao === "Sistema").length
  const comApoio = vitorias.filter((v) => v.teveApoioPMC).length
  const aoCEO = vitorias.filter((v) => v.status === "Apresentada ao CEO" || v.noRelatorioCEO).length
  return { total, horasSemana, horasMes, eficienciaMedia, setoresUnicos, sistemas, comApoio, aoCEO }
}

function VitoriaCard({ v, setorNome, onDetalhes, onEditar }: {
  v: Vitoria; setorNome?: string; onDetalhes: () => void; onEditar: () => void
}) {
  return (
    <div className="rounded-lg border card-glass p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{v.titulo}</h3>
        </div>
        <Badge tone={v.status === "Apresentada ao CEO" || v.status === "Publicável como case" ? "ok" : v.status === "Rascunho" ? "default" : "neon"}>{v.status}</Badge>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {setorNome ?? "—"} · {new Date(v.data).toLocaleDateString("pt-BR")}
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        <FaseBadge fase={v.fase} />
        {v.tipos.slice(0, 3).map((t) => <Badge key={t}>{t}</Badge>)}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div className="rounded-md bg-muted p-2">
          <div className="text-muted-foreground">Horas/semana</div>
          <div className="font-semibold">{v.horasSemana || 0}h</div>
        </div>
        <div className="rounded-md bg-muted p-2">
          <div className="text-muted-foreground">Eficiência</div>
          <div className="font-semibold">{v.percentualEficiencia || 0}%</div>
        </div>
      </div>
      {v.nomeSolucao && (
        <div className="text-xs text-muted-foreground mt-2">Solução: <span className="text-foreground">{v.nomeSolucao}</span></div>
      )}
      {v.teveApoioPMC && (
        <div className="text-xs text-muted-foreground mt-1">Apoio PMC: {v.apoioQuem.slice(0, 2).join(", ")}{v.apoioQuem.length > 2 ? "…" : ""}</div>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <Button variant="secondary" size="xs" onClick={onDetalhes}>Ver detalhes</Button>
        <Button size="xs" onClick={() => {
          const resumo = resumoVitoriaParaCEO(v, setorNome)
          actions.updateVitoria(v.id, { resumoCEO: resumo, noRelatorioCEO: true })
          navigator.clipboard?.writeText(resumo).catch(() => undefined)
          toast.success("Resumo gerado e adicionado ao Relatório para CEO.")
        }}>
          <FileText className="h-3 w-3" /> Gerar resumo para CEO
        </Button>
        <Button
          size="xs"
          variant={v.noRelatorioCEO ? "outline" : "secondary"}
          className={v.noRelatorioCEO ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 hover:text-emerald-200" : ""}
          onClick={() => actions.toggleVitoriaRelatorioCEO(v.id)}
        >
          {v.noRelatorioCEO ? "No relatório CEO" : "Adicionar ao relatório CEO"}
        </Button>
        <Button variant="secondary" size="xs" className="ml-auto" onClick={onEditar}>Editar</Button>
        <Button
          variant="ghost" size="icon-sm"
          className="hover:bg-destructive/20 hover:text-destructive"
          onClick={() => { if (confirm("Excluir vitória?")) actions.removeVitoria(v.id) }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function PainelIndicadores({ vitorias, setores }: { vitorias: Vitoria[]; setores: { id: string; nome: string }[] }) {
  const porSetor = agruparPor(vitorias, (v) => setores.find((s) => s.id === v.setorId)?.nome ?? v.setorNome ?? "—")
  const porFase = agruparPor(vitorias, (v) => `Fase 0${v.fase}`)
  const horasPorSetor = somarPor(vitorias, (v) => setores.find((s) => s.id === v.setorId)?.nome ?? v.setorNome ?? "—", (v) => v.horasMes || 0)
  const horasPorMes = somarPor(vitorias, (v) => v.data?.slice(0, 7) || "—", (v) => v.horasSemana * 4 || v.horasMes || 0)
  const apoios = vitorias.filter((v) => v.teveApoioPMC).flatMap((v) => v.apoioQuem)
  const fontesApoio = somarPor(apoios.map((a) => ({ a })), (x) => x.a, () => 1)

  const stats = {
    sistemas: vitorias.filter((v) => v.tipos.includes("Criação de sistema") || v.tipoSolucao === "Sistema").length,
    dashboards: vitorias.filter((v) => v.tipos.includes("Criação de dashboard") || v.tipoSolucao === "Dashboard").length,
    automacoes: vitorias.filter((v) => v.tipos.includes("Criação de automação") || v.tipoSolucao === "Automação").length,
    comApoio: vitorias.filter((v) => v.teveApoioPMC).length,
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <BlocoBarras titulo="Vitórias por setor" dados={porSetor} />
      <BlocoBarras titulo="Vitórias por fase" dados={porFase} />
      <BlocoBarras titulo="Horas economizadas por setor (mês)" dados={horasPorSetor} sufixo="h" />
      <BlocoBarras titulo="Horas economizadas por mês" dados={horasPorMes} sufixo="h" />
      <div className="rounded-lg border card-glass p-4">
        <div className="text-sm font-semibold mb-3">Soluções criadas</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Mini label="Sistemas" valor={stats.sistemas} />
          <Mini label="Dashboards" valor={stats.dashboards} />
          <Mini label="Automações" valor={stats.automacoes} />
          <Mini label="Com apoio PMC" valor={stats.comApoio} />
        </div>
      </div>
      <BlocoBarras titulo="Principais fontes de apoio PMC" dados={fontesApoio} />
    </div>
  )
}

function Mini({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold text-primary">{valor}</div>
    </div>
  )
}

function BlocoBarras({ titulo, dados, sufixo }: { titulo: string; dados: Record<string, number>; sufixo?: string }) {
  const entries = Object.entries(dados).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...entries.map(([, v]) => v))
  return (
    <div className="rounded-lg border card-glass p-4">
      <div className="text-sm font-semibold mb-3">{titulo}</div>
      {entries.length === 0 ? (
        <div className="text-xs text-muted-foreground">Sem dados.</div>
      ) : (
        <div className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-xs"><span>{k}</span><span className="text-muted-foreground">{v}{sufixo ?? ""}</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(v / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function agruparPor<T>(arr: T[], fn: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  arr.forEach((x) => { const k = fn(x); out[k] = (out[k] ?? 0) + 1 })
  return out
}
function somarPor<T>(arr: T[], chave: (x: T) => string, valor: (x: T) => number): Record<string, number> {
  const out: Record<string, number> = {}
  arr.forEach((x) => { const k = chave(x); out[k] = (out[k] ?? 0) + valor(x) })
  return out
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={"text-xs px-3 py-1.5 rounded-md border transition " + (active
        ? "bg-primary text-primary-foreground border-primary font-medium"
        : "bg-muted border-border text-muted-foreground hover:text-foreground")}
    >
      {children}
    </button>
  )
}

function FormularioVitoria({ inicial, setores, onCancel, onSalvar }: {
  inicial?: Vitoria; setores: { id: string; nome: string }[]
  onCancel: () => void; onSalvar: (v: Omit<Vitoria, "id" | "criadoEm">) => void
}) {
  const [f, setF] = useState<Omit<Vitoria, "id" | "criadoEm">>(
    inicial ? { ...inicial } : novaVitoriaVazia()
  )
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
  const toggle = (campo: "tipos" | "apoioQuem" | "apoioDecisivo", v: string) =>
    setF((p) => ({ ...p, [campo]: p[campo].includes(v) ? p[campo].filter((x) => x !== v) : [...p[campo], v] }))

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{inicial ? "Editar vitória" : "Registrar nova vitória"}</DialogTitle>
        </DialogHeader>

        <Section title="Dados principais">
          <Campo label="Título da vitória"><Input className="h-8" value={f.titulo} onChange={(e) => set("titulo", e.target.value)} /></Campo>
          <Campo label="Data"><Input type="date" className="h-8" value={f.data} onChange={(e) => set("data", e.target.value)} /></Campo>
          <Campo label="Setor vinculado">
            <GSelect
              className="w-full" value={f.setorId ?? ""}
              onChange={(v) => {
                const s = setores.find((x) => x.id === v)
                setF((p) => ({ ...p, setorId: v, setorNome: s?.nome ?? "" }))
              }}
              options={[{ value: "", label: "—" }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]}
            />
          </Campo>
          <Campo label="Setor (livre)">
            <GSelect
              className="w-full" value={f.setorNome ?? ""}
              onChange={(v) => set("setorNome", v)}
              options={[{ value: "", label: "—" }, ...SETORES_DISPONIVEIS.map((s) => ({ value: s, label: s }))]}
            />
          </Campo>
          <Campo label="Fase vinculada">
            <GSelect
              className="w-full" value={String(f.fase)}
              onChange={(v) => set("fase", Number(v) as Fase)}
              options={FASES.map((x) => ({ value: String(x.num), label: `Fase 0${x.num} — ${x.titulo}` }))}
            />
          </Campo>
          <Campo label="Guardião responsável"><Input className="h-8" value={f.guardiao} onChange={(e) => set("guardiao", e.target.value)} /></Campo>
          <Campo label="Líder do setor envolvido"><Input className="h-8" value={f.liderSetor} onChange={(e) => set("liderSetor", e.target.value)} /></Campo>
          <Campo label="Status">
            <GSelect
              className="w-full" value={f.status}
              onChange={(v) => set("status", v as StatusVitoria)}
              options={STATUS_VITORIAS.map((s) => ({ value: s, label: s }))}
            />
          </Campo>
        </Section>

        <Section title="Tipo de vitória (selecione todos que se aplicam)">
          <div className="md:col-span-2 flex flex-wrap gap-2">
            {TIPOS_VITORIA.map((t) => (
              <Chip key={t} active={f.tipos.includes(t)} onClick={() => toggle("tipos", t)}>{t}</Chip>
            ))}
          </div>
        </Section>

        <Section title="Gargalo antes da vitória">
          <Campo label="Qual era o gargalo?" full><Textarea className="min-h-[60px]" value={f.gargaloDescricao} onChange={(e) => set("gargaloDescricao", e.target.value)} /></Campo>
          <Campo label="Onde o processo travava?"><Input className="h-8" value={f.ondeTravava} onChange={(e) => set("ondeTravava", e.target.value)} /></Campo>
          <Campo label="Como era feito antes?"><Input className="h-8" value={f.comoEraAntes} onChange={(e) => set("comoEraAntes", e.target.value)} /></Campo>
          <Campo label="Quanto tempo levava antes?"><Input className="h-8" value={f.tempoAntes} onChange={(e) => set("tempoAntes", e.target.value)} /></Campo>
          <Campo label="Impacto do problema"><Input className="h-8" value={f.impactoAntes} onChange={(e) => set("impactoAntes", e.target.value)} /></Campo>
        </Section>

        <Section title="Solução implementada">
          <Campo label="O que foi implementado?" full><Textarea className="min-h-[60px]" value={f.solucaoDescricao} onChange={(e) => set("solucaoDescricao", e.target.value)} /></Campo>
          <Campo label="Tipo de solução">
            <GSelect
              className="w-full" value={f.tipoSolucao}
              onChange={(v) => set("tipoSolucao", v)}
              options={TIPOS_ENTREGA.map((t) => ({ value: t, label: t }))}
            />
          </Campo>
          <Campo label="Nome da solução"><Input className="h-8" value={f.nomeSolucao} onChange={(e) => set("nomeSolucao", e.target.value)} /></Campo>
          <Campo label="Link da solução"><Input className="h-8" value={f.linkSolucao} onChange={(e) => set("linkSolucao", e.target.value)} /></Campo>
          <Campo label="Fase em que foi criada">
            <GSelect
              className="w-full" value={f.faseSolucao ? String(f.faseSolucao) : ""}
              onChange={(v) => set("faseSolucao", v ? Number(v) as Fase : undefined)}
              options={[{ value: "", label: "—" }, ...FASES.map((x) => ({ value: String(x.num), label: `Fase 0${x.num}` }))]}
            />
          </Campo>
          <Campo label="Setor beneficiado"><Input className="h-8" value={f.setorBeneficiado} onChange={(e) => set("setorBeneficiado", e.target.value)} /></Campo>
          <Campo label="Quem usa a solução hoje?"><Input className="h-8" value={f.quemUsaHoje} onChange={(e) => set("quemUsaHoje", e.target.value)} /></Campo>
        </Section>

        <Section title="Indicadores de resultado">
          <Check label="Houve redução de horas?" v={f.reducaoHoras} on={(b) => set("reducaoHoras", b)} />
          {f.reducaoHoras && (
            <>
              <Campo label="Horas/dia"><Input type="number" className="h-8" value={f.horasDia} onChange={(e) => set("horasDia", Number(e.target.value))} /></Campo>
              <Campo label="Horas/semana"><Input type="number" className="h-8" value={f.horasSemana} onChange={(e) => set("horasSemana", Number(e.target.value))} /></Campo>
              <Campo label="Horas/mês"><Input type="number" className="h-8" value={f.horasMes} onChange={(e) => set("horasMes", Number(e.target.value))} /></Campo>
            </>
          )}
          <Check label="Houve ganho de eficiência operacional?" v={f.ganhoEficiencia} on={(b) => set("ganhoEficiencia", b)} />
          {f.ganhoEficiencia && (
            <Campo label="% de eficiência"><Input type="number" className="h-8" value={f.percentualEficiencia} onChange={(e) => set("percentualEficiencia", Number(e.target.value))} /></Campo>
          )}
          <Check label="Houve redução de custo?" v={f.reducaoCusto} on={(b) => set("reducaoCusto", b)} />
          {f.reducaoCusto && (
            <Campo label="Valor economizado (R$)"><Input type="number" className="h-8" value={f.valorCustoEconomizado} onChange={(e) => set("valorCustoEconomizado", Number(e.target.value))} /></Campo>
          )}
          <Check label="Houve aumento de receita?" v={f.aumentoReceita} on={(b) => set("aumentoReceita", b)} />
          {f.aumentoReceita && (
            <Campo label="Valor ou % de crescimento"><Input className="h-8" value={f.valorReceita} onChange={(e) => set("valorReceita", e.target.value)} /></Campo>
          )}
          <Check label="Houve melhoria na tomada de decisão?" v={f.melhoriaDecisao} on={(b) => set("melhoriaDecisao", b)} />
          <Campo label="Resumo da vitória" full>
            <Textarea className="min-h-[80px]" placeholder="Explique de forma objetiva o que mudou depois da implementação da IA."
              value={f.resumoVitoria} onChange={(e) => set("resumoVitoria", e.target.value)} />
          </Campo>
        </Section>

        <Section title="Apoio do PMC nessa vitória">
          <Check label="Essa vitória teve apoio do time PMC?" v={f.teveApoioPMC} on={(b) => set("teveApoioPMC", b)} />
          {f.teveApoioPMC && (
            <>
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Quem apoiou?</div>
                <div className="flex flex-wrap gap-2">
                  {APOIO_QUEM.map((t) => (
                    <Chip key={t} active={f.apoioQuem.includes(t)} onClick={() => toggle("apoioQuem", t)}>{t}</Chip>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Qual apoio foi decisivo?</div>
                <div className="flex flex-wrap gap-2">
                  {APOIO_DECISIVO.map((t) => (
                    <Chip key={t} active={f.apoioDecisivo.includes(t)} onClick={() => toggle("apoioDecisivo", t)}>{t}</Chip>
                  ))}
                </div>
              </div>
              <Campo label="Descrição do apoio recebido" full><Textarea className="min-h-[60px]" value={f.apoioDescricao} onChange={(e) => set("apoioDescricao", e.target.value)} /></Campo>
              <Campo label="Link do conteúdo, reunião ou agenda" full><Input className="h-8" value={f.apoioLink} onChange={(e) => set("apoioLink", e.target.value)} /></Campo>
            </>
          )}
        </Section>

        <Section title="Evidências">
          <div className="md:col-span-2 space-y-2">
            {f.evidencias.map((ev, i) => (
              <div key={ev.id} className="grid md:grid-cols-12 gap-2 items-center">
                <div className="md:col-span-3">
                  <GSelect
                    className="w-full" value={ev.tipo}
                    onChange={(val) => { const arr = [...f.evidencias]; arr[i] = { ...ev, tipo: val }; set("evidencias", arr) }}
                    options={TIPOS_EVIDENCIA_VITORIA.map((t) => ({ value: t, label: t }))}
                  />
                </div>
                <Input className="h-8 md:col-span-4" placeholder="Descrição" value={ev.descricao} onChange={(e) => {
                  const arr = [...f.evidencias]; arr[i] = { ...ev, descricao: e.target.value }; set("evidencias", arr)
                }} />
                <Input className="h-8 md:col-span-4" placeholder="Link" value={ev.link} onChange={(e) => {
                  const arr = [...f.evidencias]; arr[i] = { ...ev, link: e.target.value }; set("evidencias", arr)
                }} />
                <Button
                  type="button" variant="ghost" size="icon-sm"
                  className="md:col-span-1 hover:bg-destructive/20 hover:text-destructive"
                  onClick={() => set("evidencias", f.evidencias.filter((x) => x.id !== ev.id))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button" variant="secondary" size="xs"
              onClick={() => set("evidencias", [...f.evidencias, { id: Math.random().toString(36).slice(2, 8), tipo: TIPOS_EVIDENCIA_VITORIA[0], descricao: "", link: "" }])}
            >
              <Plus className="h-3 w-3" /> Adicionar evidência
            </Button>
          </div>
          <Campo label="Observações" full><Textarea className="min-h-[60px]" value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} /></Campo>
        </Section>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => { if (!f.titulo) { toast.error("Informe o título da vitória."); return } onSalvar(f) }}>
            Salvar vitória
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      <div className="text-xs uppercase tracking-wider text-primary mb-2">{title}</div>
      <div className="grid md:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function Campo({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={"text-sm block " + (full ? "md:col-span-2" : "")}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  )
}

function Check({ label, v, on }: { label: string; v: boolean; on: (b: boolean) => void }) {
  return (
    <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
      <input type="checkbox" className="h-4 w-4 accent-primary" checked={v} onChange={(e) => on(e.target.checked)} />
      {label}
    </label>
  )
}

function DetalhesVitoria({ v, setorNome, onClose }: { v: Vitoria; setorNome?: string; onClose: () => void }) {
  const fase = FASES.find((f) => f.num === v.fase)
  const resumo = v.resumoCEO || resumoVitoriaParaCEO(v, setorNome)
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-xs text-muted-foreground">Fase 0{v.fase} — {fase?.titulo} · {setorNome ?? "—"}</div>
          <DialogTitle className="text-xl">{v.titulo}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-1 mb-1">{v.tipos.map((t) => <Badge key={t} tone="neon">{t}</Badge>)}</div>

        <Bloco titulo="Gargalo antes">
          <Linha k="Descrição" v={v.gargaloDescricao} />
          <Linha k="Onde travava" v={v.ondeTravava} />
          <Linha k="Como era antes" v={v.comoEraAntes} />
          <Linha k="Tempo antes" v={v.tempoAntes} />
          <Linha k="Impacto" v={v.impactoAntes} />
        </Bloco>
        <Bloco titulo="Solução implementada">
          <Linha k="Descrição" v={v.solucaoDescricao} />
          <Linha k="Nome" v={v.nomeSolucao} />
          <Linha k="Tipo" v={v.tipoSolucao} />
          <Linha k="Quem usa hoje" v={v.quemUsaHoje} />
          {v.linkSolucao && <Linha k="Link" v={<a href={v.linkSolucao} target="_blank" rel="noreferrer" className="text-primary">{v.linkSolucao}</a>} />}
        </Bloco>
        <Bloco titulo="Resultado">
          <Linha k="Horas/semana" v={v.horasSemana} />
          <Linha k="Horas/mês" v={v.horasMes} />
          <Linha k="Eficiência" v={`${v.percentualEficiencia}%`} />
          {v.reducaoCusto && <Linha k="Custo economizado" v={`R$ ${v.valorCustoEconomizado}`} />}
          {v.aumentoReceita && <Linha k="Receita" v={v.valorReceita} />}
          <Linha k="Resumo" v={v.resumoVitoria} />
        </Bloco>
        {v.teveApoioPMC && (
          <Bloco titulo="Apoio PMC">
            <Linha k="Quem apoiou" v={v.apoioQuem.join(", ")} />
            <Linha k="Apoio decisivo" v={v.apoioDecisivo.join(", ")} />
            <Linha k="Descrição" v={v.apoioDescricao} />
            {v.apoioLink && <Linha k="Link" v={<a href={v.apoioLink} target="_blank" rel="noreferrer" className="text-primary">{v.apoioLink}</a>} />}
          </Bloco>
        )}
        {v.evidencias.length > 0 && (
          <Bloco titulo="Evidências">
            <ul className="text-sm space-y-1">
              {v.evidencias.map((ev) => (
                <li key={ev.id}>• <span className="text-muted-foreground">{ev.tipo}:</span> {ev.descricao} {ev.link && <a href={ev.link} target="_blank" rel="noreferrer" className="text-primary ml-1">[link]</a>}</li>
              ))}
            </ul>
          </Bloco>
        )}

        <Bloco titulo="Resumo para CEO">
          <p className="text-sm whitespace-pre-wrap">{resumo}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button variant="secondary" size="xs" onClick={() => { navigator.clipboard?.writeText(resumo); toast.success("Copiado!") }}>
              <Copy className="h-3 w-3" /> Copiar resumo
            </Button>
            <Button size="xs" onClick={() => { actions.updateVitoria(v.id, { resumoCEO: resumo, noRelatorioCEO: true }); toast.success("Salvo e adicionado ao Relatório para CEO.") }}>
              Salvar e enviar ao Relatório CEO
            </Button>
          </div>
        </Bloco>
      </DialogContent>
    </Dialog>
  )
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mb-1">
      <div className="text-xs uppercase tracking-wider text-primary mb-1">{titulo}</div>
      <div className="rounded-md bg-muted p-3 space-y-1">{children}</div>
    </div>
  )
}
function Linha({ k, v }: { k: string; v: ReactNode }) {
  if (!v && v !== 0) return null
  return <div className="text-sm"><span className="text-muted-foreground">{k}: </span>{v}</div>
}
