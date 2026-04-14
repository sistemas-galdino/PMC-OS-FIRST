import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  UsersIcon as Users,
  PlusIcon as Plus,
  Edit3Icon as Edit3,
  Trash2Icon as Trash2,
  SearchIcon as Search,
  XIcon as X,
  Sparkles2Icon as Sparkles,
  SettingsIcon as Cog,
  Building2Icon as Building,
  FilterIcon as Filter,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion, AnimatePresence } from "framer-motion"

interface Colaborador {
  id: string
  id_cliente: string
  nome: string
  cargo: string
  whatsapp: string | null
  setor: string
  guardiao_ia: boolean
  guardiao_crm: boolean
  created_at?: string
}

interface MeuTimePageProps {
  session?: Session
  clientId?: string
}

const SETORES = [
  "CEO",
  "Comercial",
  "Sucesso do Cliente",
  "Operações",
  "CRM",
  "Marketing",
  "Financeiro",
  "Jurídico",
] as const
type Setor = (typeof SETORES)[number]

const SETOR_COLOR: Record<Setor, string> = {
  "CEO": "#DAFC67",
  "Comercial": "#22D3EE",
  "Sucesso do Cliente": "#34D399",
  "Operações": "#F59E0B",
  "CRM": "#A78BFA",
  "Marketing": "#FB7185",
  "Financeiro": "#60A5FA",
  "Jurídico": "#94A3B8",
}

const IA_COLOR = "#DAFC67"
const CRM_COLOR = "#A78BFA"

const emptyForm = {
  nome: "",
  cargo: "",
  whatsapp: "",
  setor: "",
  guardiao_ia: false,
  guardiao_crm: false,
}

function maskWhatsapp(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function MeuTimePage({ session, clientId }: MeuTimePageProps) {
  const [resolvedClientId, setResolvedClientId] = useState<string | undefined>(clientId || session?.user?.id)
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Colaborador | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [setorFilter, setSetorFilter] = useState<string>("all")
  const [guardianFilter, setGuardianFilter] = useState<"all" | "ia" | "crm">("all")

  useEffect(() => {
    if (resolvedClientId) return
    if (clientId) { setResolvedClientId(clientId); return }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) setResolvedClientId(data.session.user.id)
      else setLoading(false)
    })
  }, [clientId, resolvedClientId])

  useEffect(() => {
    if (!resolvedClientId) return
    let cancelled = false
    async function fetchAll() {
      const { data } = await supabase
        .from("cliente_colaboradores")
        .select("*")
        .eq("id_cliente", resolvedClientId)
        .order("created_at", { ascending: true })
      if (cancelled) return
      setColaboradores((data as Colaborador[]) || [])
      setLoading(false)
    }
    fetchAll()
    return () => { cancelled = true }
  }, [resolvedClientId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return colaboradores.filter(c => {
      if (setorFilter !== "all" && c.setor !== setorFilter) return false
      if (guardianFilter === "ia" && !c.guardiao_ia) return false
      if (guardianFilter === "crm" && !c.guardiao_crm) return false
      if (q && !(`${c.nome} ${c.cargo}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [colaboradores, search, setorFilter, guardianFilter])

  const totals = useMemo(() => {
    const setoresUnicos = new Set(colaboradores.map(c => c.setor)).size
    const ia = colaboradores.filter(c => c.guardiao_ia).length
    const crm = colaboradores.filter(c => c.guardiao_crm).length
    return { total: colaboradores.length, setores: setoresUnicos, ia, crm }
  }, [colaboradores])

  const grouped = useMemo(() => {
    const g: Record<string, Colaborador[]> = {}
    for (const s of SETORES) g[s] = []
    for (const c of filtered) {
      if (g[c.setor]) g[c.setor].push(c)
      else g[c.setor] = [c]
    }
    return g
  }, [filtered])

  const guardioesIa = colaboradores.filter(c => c.guardiao_ia)
  const guardioesCrm = colaboradores.filter(c => c.guardiao_crm)

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setShowDialog(true)
  }

  function openEdit(c: Colaborador) {
    setEditing(c)
    setForm({
      nome: c.nome,
      cargo: c.cargo,
      whatsapp: c.whatsapp || "",
      setor: c.setor,
      guardiao_ia: c.guardiao_ia,
      guardiao_crm: c.guardiao_crm,
    })
    setShowDialog(true)
  }

  const isValid = () => form.nome.trim() && form.cargo.trim() && form.setor

  async function handleSave() {
    if (!resolvedClientId || !isValid()) return
    setSaving(true)
    const payload = {
      id_cliente: resolvedClientId,
      nome: form.nome.trim(),
      cargo: form.cargo.trim(),
      whatsapp: form.whatsapp.trim() || null,
      setor: form.setor,
      guardiao_ia: form.guardiao_ia,
      guardiao_crm: form.guardiao_crm,
      updated_at: new Date().toISOString(),
    }
    if (editing) {
      const { data } = await supabase.from("cliente_colaboradores").update(payload).eq("id", editing.id).select().single()
      if (data) setColaboradores(prev => prev.map(c => c.id === editing.id ? (data as Colaborador) : c))
    } else {
      const { data } = await supabase.from("cliente_colaboradores").insert(payload).select().single()
      if (data) setColaboradores(prev => [...prev, data as Colaborador])
    }
    setSaving(false)
    setShowDialog(false)
  }

  async function handleDelete(c: Colaborador) {
    if (!confirm(`Remover ${c.nome} do time?`)) return
    await supabase.from("cliente_colaboradores").delete().eq("id", c.id)
    setColaboradores(prev => prev.filter(x => x.id !== c.id))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-card/40 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between border-l-4 border-primary pl-8 py-2"
      >
        <div className="flex items-start gap-5">
          <div className="bg-primary/10 p-3.5 rounded-2xl shrink-0">
            <Users className="size-8 text-primary" />
          </div>
          <div className="flex flex-col gap-2 max-w-2xl">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
              Organograma do Time
            </h1>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Este espaço foi criado para você organizar as pessoas que estão junto com você na execução dentro do programa. Adicione aqui os colaboradores da sua empresa que vão participar ativamente, definindo o papel de cada um. Destaque também quem será o responsável por <span className="text-primary font-semibold">IA</span> e <span className="font-semibold" style={{ color: CRM_COLOR }}>CRM</span> dentro do seu time.
            </p>
          </div>
        </div>
        <Button
          className="h-12 gap-2 rounded-xl px-6 shadow-xl shadow-primary/10 shrink-0"
          onClick={openNew}
        >
          <Plus className="size-5" />
          <span className="font-bold uppercase tracking-wider text-[11px]">Adicionar Colaborador</span>
        </Button>
      </motion.div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={<Users className="size-5" />} label="Colaboradores" value={totals.total} tone="neutral" />
        <Kpi icon={<Building className="size-5" />} label="Setores" value={totals.setores} tone="neutral" />
        <Kpi icon={<Sparkles className="size-5" />} label="Guardiões de IA" value={totals.ia} tone="ia" />
        <Kpi icon={<Cog className="size-5" />} label="Guardiões de CRM" value={totals.crm} tone="crm" />
      </div>

      {/* Guardiões panels */}
      {(guardioesIa.length > 0 || guardioesCrm.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GuardianPanel
            title="Guardiões de IA"
            color={IA_COLOR}
            icon={<Sparkles className="size-4" />}
            people={guardioesIa}
          />
          <GuardianPanel
            title="Guardiões de CRM"
            color={CRM_COLOR}
            icon={<Cog className="size-4" />}
            people={guardioesCrm}
          />
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-10 rounded-xl bg-muted/10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={setorFilter} onValueChange={setSetorFilter}>
            <SelectTrigger className="h-11 w-[200px] rounded-xl bg-muted/10 gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <SelectValue placeholder="Todos os setores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/10 border border-border h-11">
            <FilterPill active={guardianFilter === "all"} onClick={() => setGuardianFilter("all")} label="Todos" />
            <FilterPill active={guardianFilter === "ia"} onClick={() => setGuardianFilter("ia")} label="IA" color={IA_COLOR} />
            <FilterPill active={guardianFilter === "crm"} onClick={() => setGuardianFilter("crm")} label="CRM" color={CRM_COLOR} />
          </div>
        </div>
      </div>

      {/* Empty state */}
      {colaboradores.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center space-y-4 bg-muted/5">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Users className="size-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Seu time está vazio</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Comece adicionando o primeiro colaborador da sua empresa para montar o organograma.
            </p>
          </div>
          <Button onClick={openNew} className="h-11 rounded-xl gap-2 mt-2">
            <Plus className="size-4" />
            <span className="font-bold uppercase tracking-wider text-xs">Adicionar primeiro colaborador</span>
          </Button>
        </div>
      )}

      {/* Organograma */}
      {colaboradores.length > 0 && (
        <div className="space-y-6">
          {/* CEO solo no topo */}
          {grouped["CEO"].length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: SETOR_COLOR["CEO"] }}>
                    ◆ CEO
                  </span>
                  <div className="flex flex-wrap justify-center gap-3">
                    {grouped["CEO"].map(c => (
                      <ColaboradorCard key={c.id} c={c} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              </div>
              {/* vertical connector */}
              <div className="flex justify-center">
                <div className="h-6 w-px bg-gradient-to-b from-primary/40 to-transparent" />
              </div>
            </div>
          )}

          {/* Setores em grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
            <AnimatePresence mode="popLayout">
              {SETORES.filter(s => s !== "CEO").map((setor, idx) => {
                const list = grouped[setor]
                if (setorFilter !== "all" && setorFilter !== setor) return null
                return (
                  <motion.div
                    key={setor}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, delay: idx * 0.04 }}
                    className="flex flex-col"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full" style={{ background: SETOR_COLOR[setor], boxShadow: `0 0 12px ${SETOR_COLOR[setor]}55` }} />
                    </div>
                    <div
                      className="text-[10px] font-bold uppercase tracking-[0.25em] mb-3 text-center"
                      style={{ color: SETOR_COLOR[setor] }}
                    >
                      {setor}
                    </div>
                    <div className="space-y-2 flex-1">
                      {list.length === 0 && (
                        <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Sem colaboradores</p>
                        </div>
                      )}
                      {list.map(c => (
                        <ColaboradorCard key={c.id} c={c} onEdit={openEdit} onDelete={handleDelete} />
                      ))}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">
              {editing ? "Editar Colaborador" : "Adicionar Colaborador"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Nome completo"
              value={form.nome}
              onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))}
              className="h-11 rounded-xl bg-muted/10"
            />
            <Input
              placeholder="Cargo"
              value={form.cargo}
              onChange={(e) => setForm(p => ({ ...p, cargo: e.target.value }))}
              className="h-11 rounded-xl bg-muted/10"
            />
            <Input
              placeholder="Contato WhatsApp — (85) 99999-9999"
              value={form.whatsapp}
              onChange={(e) => setForm(p => ({ ...p, whatsapp: maskWhatsapp(e.target.value) }))}
              className="h-11 rounded-xl bg-muted/10"
            />
            <Select value={form.setor} onValueChange={(v) => setForm(p => ({ ...p, setor: v }))}>
              <SelectTrigger className="h-11 rounded-xl bg-muted/10">
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Funções estratégicas (opcional)
              </p>
              <div className="flex gap-2 flex-wrap">
                <GuardianChip
                  active={form.guardiao_ia}
                  onClick={() => setForm(p => ({ ...p, guardiao_ia: !p.guardiao_ia }))}
                  color={IA_COLOR}
                  icon={<Sparkles className="size-3.5" />}
                  label="Guardião de IA"
                />
                <GuardianChip
                  active={form.guardiao_crm}
                  onClick={() => setForm(p => ({ ...p, guardiao_crm: !p.guardiao_crm }))}
                  color={CRM_COLOR}
                  icon={<Cog className="size-3.5" />}
                  label="Guardião de CRM"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button disabled={saving || !isValid()} className="h-11 rounded-xl gap-2 px-6" onClick={handleSave}>
              {saving ? "Salvando..." : (editing ? "Salvar" : "Adicionar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "neutral" | "ia" | "crm" }) {
  const color = tone === "ia" ? IA_COLOR : tone === "crm" ? CRM_COLOR : undefined
  return (
    <div className="p-5 rounded-2xl border border-border bg-muted/10 flex items-center gap-4">
      <div
        className="size-11 rounded-xl flex items-center justify-center shrink-0"
        style={color ? { background: `${color}15`, color } : { background: "hsl(var(--muted) / 0.3)" }}
      >
        <span className={tone === "neutral" ? "text-muted-foreground" : ""}>{icon}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

function GuardianPanel({ title, color, icon, people }: { title: string; color: string; icon: React.ReactNode; people: Colaborador[] }) {
  return (
    <div
      className="p-5 rounded-2xl border"
      style={{ borderColor: `${color}40`, background: `${color}08` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="size-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, color }}>
          {icon}
        </span>
        <span className="font-bold text-sm" style={{ color }}>{title}</span>
        <span className="ml-auto text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {people.length} {people.length === 1 ? "responsável" : "responsáveis"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {people.length === 0 && (
          <span className="text-xs text-muted-foreground/70 italic">Nenhum guardião atribuído</span>
        )}
        {people.map(p => (
          <Badge
            key={p.id}
            variant="outline"
            className="rounded-lg px-2 py-1 text-[11px] font-semibold"
            style={{ background: `${color}15`, borderColor: `${color}30`, color: "inherit" }}
          >
            {p.nome}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function FilterPill({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
        active ? "bg-foreground text-background" : "hover:bg-muted/40 text-muted-foreground"
      }`}
      style={active && color ? { background: color, color: "#0A0A0A" } : undefined}
    >
      {label}
    </button>
  )
}

function GuardianChip({ active, onClick, color, icon, label }: { active: boolean; onClick: () => void; color: string; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border"
      style={active
        ? { background: `${color}15`, borderColor: color, color }
        : { background: "hsl(var(--muted) / 0.1)", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
    >
      {icon}
      {label}
    </button>
  )
}

function ColaboradorCard({ c, onEdit, onDelete }: { c: Colaborador; onEdit: (c: Colaborador) => void; onDelete: (c: Colaborador) => void }) {
  const setorColor = SETOR_COLOR[c.setor as Setor] || "#94A3B8"
  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="group relative rounded-xl border border-border bg-card/40 p-3 transition-all hover:border-primary/30"
    >
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(c)}
          className="size-6 rounded-md flex items-center justify-center hover:bg-muted/50"
          title="Editar"
        >
          <Edit3 className="size-3 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(c)}
          className="size-6 rounded-md flex items-center justify-center hover:bg-destructive/10 hover:text-destructive"
          title="Remover"
        >
          <Trash2 className="size-3 text-muted-foreground" />
        </button>
      </div>
      <div className="flex items-start gap-2">
        <span
          className="size-1.5 rounded-full mt-2 shrink-0"
          style={{ background: setorColor, boxShadow: `0 0 8px ${setorColor}` }}
        />
        <div className="min-w-0 flex-1 pr-8">
          <p className="text-sm font-bold text-foreground truncate leading-tight">{c.nome}</p>
          <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">{c.cargo}</p>
          {(c.guardiao_ia || c.guardiao_crm) && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {c.guardiao_ia && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: `${IA_COLOR}15`, color: IA_COLOR }}
                >
                  <Sparkles className="size-2.5" /> IA
                </span>
              )}
              {c.guardiao_crm && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: `${CRM_COLOR}15`, color: CRM_COLOR }}
                >
                  <Cog className="size-2.5" /> CRM
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// suppress unused import warning for X if unused
void X
