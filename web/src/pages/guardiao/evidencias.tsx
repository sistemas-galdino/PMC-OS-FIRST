import { useState, type ReactNode } from "react"

import { PageHeader, Badge, EmptyState, FaseBadge } from "@/components/guardiao/ui-kit"
import {
  actions, useStore, FASES, TIPOS_EVIDENCIA, EVIDENCIAS_OBRIGATORIAS,
  type Fase,
} from "@/lib/guardiao"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { CheckCircle2, AlertCircle, Trash2, Plus } from "lucide-react"

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

function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={"text-sm block " + (full ? "md:col-span-2" : "")}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  )
}

export default function Evidencias() {
  const modo = useStore((s) => s.modo)
  const evidencias = useStore((s) => s.evidencias)
  const setores = useStore((s) => s.setores)

  // Filtros ("" = todos)
  const [filtroFase, setFiltroFase] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("")
  const [filtroSetor, setFiltroSetor] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")

  const lista = evidencias.filter((e) => {
    if (filtroFase && e.fase !== (Number(filtroFase) as Fase)) return false
    if (filtroStatus && e.status !== filtroStatus) return false
    if (filtroSetor && e.setorId !== filtroSetor) return false
    if (filtroTipo && e.tipo !== filtroTipo) return false
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidências"
        subtitle="Tudo que o cliente envia para validar o avanço de cada fase."
        action={<NovaEvidenciaButton />}
      />

      <div className="flex flex-wrap gap-2">
        <GSelect
          className="h-8" value={filtroFase} onChange={setFiltroFase}
          options={[{ value: "", label: "Todas as fases" }, ...FASES.map((f) => ({ value: String(f.num), label: `Fase 0${f.num} — ${f.titulo}` }))]}
        />
        <GSelect
          className="h-8" value={filtroStatus} onChange={setFiltroStatus}
          options={[{ value: "", label: "Todos os status" }, ...["Pendente", "Aprovada", "Ajustar"].map((s) => ({ value: s, label: s }))]}
        />
        <GSelect
          className="h-8" value={filtroSetor} onChange={setFiltroSetor}
          options={[{ value: "", label: "Todos os setores" }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]}
        />
        <GSelect
          className="h-8" value={filtroTipo} onChange={setFiltroTipo}
          options={[{ value: "", label: "Todos os tipos" }, ...TIPOS_EVIDENCIA.map((t) => ({ value: t, label: t }))]}
        />
      </div>

      {/* Painel por fase: obrigatórias */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {FASES.filter((f) => EVIDENCIAS_OBRIGATORIAS[f.num].length > 0).map((f) => {
          const obrig = EVIDENCIAS_OBRIGATORIAS[f.num]
          const aprov = obrig.filter((tipo) => evidencias.some((e) => e.fase === f.num && e.tipo === tipo && e.status === "Aprovada")).length
          return (
            <div key={f.num} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Fase 0{f.num}</div>
                <Badge tone={aprov === obrig.length ? "ok" : "warn"}>{aprov}/{obrig.length}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-2">{f.titulo}</div>
              <ul className="space-y-1 text-sm">
                {obrig.map((tipo) => {
                  const ok = evidencias.some((e) => e.fase === f.num && e.tipo === tipo && e.status === "Aprovada")
                  return (
                    <li key={tipo} className="flex items-center gap-2">
                      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-400" />}
                      <span className={ok ? "text-muted-foreground line-through" : ""}>{tipo}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Lista geral */}
      {lista.length === 0 ? (
        <EmptyState title="Nenhuma evidência registrada" hint="Use o botão acima ou envie pelas fases." />
      ) : (
        <div className="space-y-2">
          {lista.map((e) => {
            const fase = FASES.find((f) => f.num === e.fase)
            const setor = setores.find((s) => s.id === e.setorId)
            return (
              <div key={e.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <FaseBadge fase={e.fase} titulo={fase?.titulo} />
                      <Badge>{e.tipo}</Badge>
                      {setor && <Badge tone="neon">{setor.nome}</Badge>}
                    </div>
                    <div className="text-sm font-semibold">{e.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.data).toLocaleDateString("pt-BR")}
                    </div>
                    {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="text-xs text-primary break-all">{e.link}</a>}
                    <div className="text-xs text-muted-foreground mt-1">Responsável: {e.responsavel || "—"}</div>
                    {e.observacaoCS && (
                      <div className="mt-2 p-2 rounded-md bg-muted text-xs">
                        <span className="text-muted-foreground">CS / PMC: </span>{e.observacaoCS}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={e.status === "Aprovada" ? "ok" : e.status === "Ajustar" ? "warn" : "default"}>{e.status}</Badge>
                    {modo === "cs" && e.status !== "Aprovada" && (
                      <>
                        <Button size="sm" onClick={() => actions.aprovarEvidencia(e.id)}>Aprovar</Button>
                        <Button
                          size="sm" variant="outline"
                          className="border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
                          onClick={() => {
                            const obs = prompt("Observação para o cliente:") ?? ""
                            actions.pedirAjusteEvidencia(e.id, obs)
                          }}
                        >Pedir ajuste</Button>
                      </>
                    )}
                    <Button
                      variant="ghost" size="icon-sm"
                      className="hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => actions.removeEvidencia(e.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NovaEvidenciaButton() {
  const setores = useStore((s) => s.setores)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    fase: 1 as Fase, tipo: TIPOS_EVIDENCIA[0], titulo: "", link: "",
    setorId: "", responsavel: "",
  })

  // Tipos disponíveis: catálogo geral + obrigatórios da fase (dedupe p/ evitar
  // SelectItem com value duplicado).
  const tiposFase = Array.from(new Set([...TIPOS_EVIDENCIA, ...EVIDENCIAS_OBRIGATORIAS[form.fase]]))

  const salvar = () => {
    if (!form.titulo) return
    actions.addEvidencia({ ...form, observacaoCS: "" })
    setOpen(false)
    setForm({ fase: 1 as Fase, tipo: TIPOS_EVIDENCIA[0], titulo: "", link: "", setorId: "", responsavel: "" })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova evidência</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova evidência</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Fase">
              <GSelect
                className="w-full h-8" value={String(form.fase)}
                onChange={(v) => setForm({ ...form, fase: Number(v) as Fase })}
                options={FASES.map((f) => ({ value: String(f.num), label: `Fase 0${f.num} — ${f.titulo}` }))}
              />
            </Field>
            <Field label="Tipo">
              <GSelect
                className="w-full h-8" value={form.tipo}
                onChange={(v) => setForm({ ...form, tipo: v })}
                options={tiposFase.map((t) => ({ value: t, label: t }))}
              />
            </Field>
            <Field label="Título" full>
              <Input className="h-8" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </Field>
            <Field label="Link (opcional)" full>
              <Input className="h-8" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            </Field>
            <Field label="Setor">
              <GSelect
                className="w-full h-8" value={form.setorId}
                onChange={(v) => setForm({ ...form, setorId: v })}
                options={[{ value: "", label: "—" }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]}
              />
            </Field>
            <Field label="Responsável">
              <Input className="h-8" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar evidência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
