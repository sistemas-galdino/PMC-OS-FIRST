// Admin → Inteligência de Nicho. É a mesa de curadoria do catálogo que alimenta
// as sugestões de gargalo na Fase 3.
//
// Regra que a tela existe para sustentar: NADA que a IA escreve chega ao cliente
// sem passar por aqui. Uma assinatura errada não erra sozinha — ela contamina a
// contagem do nicho inteiro, e o estrago só aparece depois de publicado.
//
// Esta tela nunca mostra dado de empresa. O que ela manipula é vocabulário
// (o catálogo) e estatística agregada (a tabela publicada).
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Sparkles2Icon as Sparkles,
  CheckCircle2Icon as CheckCircle2,
  CircleIcon as Circle,
  Trash2Icon as Trash2,
  Edit3Icon as Edit3,
  RefreshCwIcon as RefreshCw,
  SearchIcon as Search,
  BotIcon as Bot,
  ShieldCheckIcon as ShieldCheck,
} from "@/components/ui/icons"
import { motion } from "framer-motion"
import { AREAS_GARGALO } from "@/data/gargalos"

interface Assinatura {
  id: string
  chave: string
  titulo: string
  descricao: string | null
  area_sugerida: string | null
  impactos_sugeridos: string[]
  ferramentas_tipicas: string[]
  horas_mes_tipicas: number | null
  nichos_alvo: string[]
  origem: "curado" | "referencia" | "emergente"
  aprovado: boolean
}

interface Stat {
  nicho: string
  assinatura_id: string
  empresas: number
  empresas_no_nicho: number
  aderencia: number | null
  horas_mes_mediana: number | null
  origem: "dado_real" | "referencia"
}

const ORIGEM_LABEL: Record<string, string> = {
  curado: "Escrito pelo time",
  referencia: "Gerado por IA",
  emergente: "Padrão novo detectado",
}

const ORIGEM_COR: Record<string, string> = {
  curado: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  referencia: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  emergente: "bg-amber-500/15 text-amber-400 border-amber-500/30",
}

export default function InteligenciaNichoPage() {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [stats, setStats] = useState<Stat[]>([])
  const [nichos, setNichos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [filtro, setFiltro] = useState<"pendentes" | "aprovadas" | "todas">("pendentes")
  const [nichoSemear, setNichoSemear] = useState("")
  const [rodando, setRodando] = useState<string | null>(null)
  const [editando, setEditando] = useState<Assinatura | null>(null)

  async function carregar() {
    const [a, s, n] = await Promise.all([
      supabase.from("gargalos_assinaturas").select("*").order("aprovado").order("titulo"),
      supabase.from("gargalo_nicho_stats").select("*"),
      supabase.from("nichos_padrao").select("nicho").order("ordem"),
    ])
    setAssinaturas((a.data ?? []) as Assinatura[])
    setStats((s.data ?? []) as Stat[])
    setNichos(((n.data ?? []) as { nicho: string }[]).map((x) => x.nicho))
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  /** Chama a edge function. O token do admin logado vai junto — é ele que autoriza. */
  async function invocar(acao: string, corpo: Record<string, unknown> = {}) {
    setRodando(acao)
    try {
      const { data, error } = await supabase.functions.invoke("inteligencia-nicho", {
        body: { acao, ...corpo },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(String(data.error))
      return data as Record<string, unknown>
    } finally {
      setRodando(null)
    }
  }

  async function semear() {
    if (!nichoSemear) return
    try {
      const r = await invocar("semear", { nicho: nichoSemear, quantidade: 10 })
      toast.success(`${r.criadas} gargalos gerados para ${nichoSemear}. Revise antes de aprovar.`)
      carregar()
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar o catálogo.")
    }
  }

  async function classificar() {
    try {
      const r = await invocar("classificar", { limite: 25 })
      if (Number(r.pendentes) === 0) toast.info("Nenhum gargalo pendente de classificação.")
      else toast.success(`${r.classificados} de ${r.pendentes} classificados · ${r.novas} padrões novos propostos.`)
      carregar()
    } catch (e: any) {
      toast.error(e.message || "Falha ao classificar.")
    }
  }

  async function alternarAprovacao(a: Assinatura) {
    setAssinaturas((prev) => prev.map((x) => (x.id === a.id ? { ...x, aprovado: !x.aprovado } : x)))
    const { error } = await supabase
      .from("gargalos_assinaturas")
      .update({ aprovado: !a.aprovado, updated_at: new Date().toISOString() })
      .eq("id", a.id)
    if (error) {
      toast.error("Não consegui salvar. Recarregando.")
      carregar()
    }
  }

  async function excluir(a: Assinatura) {
    await supabase.from("gargalos_assinaturas").delete().eq("id", a.id)
    carregar()
  }

  async function salvarEdicao(a: Assinatura) {
    const { error } = await supabase
      .from("gargalos_assinaturas")
      .update({
        titulo: a.titulo.trim(),
        descricao: a.descricao?.trim() || null,
        area_sugerida: a.area_sugerida,
        horas_mes_tipicas: a.horas_mes_tipicas,
        nichos_alvo: a.nichos_alvo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", a.id)
    if (error) return toast.error(error.message)
    setEditando(null)
    carregar()
  }

  /** Republica o agregado sem esperar o job da madrugada. */
  async function atualizarAgora() {
    setRodando("publicar")
    // Wrapper com checagem de is_admin(); a agregação em si segue revogada.
    const { data, error } = await supabase.rpc("republicar_inteligencia_nicho")
    setRodando(null)
    if (error) return toast.error(error.message)
    toast.success(`Agregado republicado — ${data}`)
    carregar()
  }

  const usoPorAssinatura = useMemo(() => {
    const m = new Map<string, { nichos: number; empresas: number; real: boolean }>()
    stats.forEach((s) => {
      const atual = m.get(s.assinatura_id) ?? { nichos: 0, empresas: 0, real: false }
      m.set(s.assinatura_id, {
        nichos: atual.nichos + 1,
        empresas: Math.max(atual.empresas, s.empresas),
        real: atual.real || s.origem === "dado_real",
      })
    })
    return m
  }, [stats])

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return assinaturas.filter((a) => {
      if (filtro === "pendentes" && a.aprovado) return false
      if (filtro === "aprovadas" && !a.aprovado) return false
      if (termo && !`${a.titulo} ${a.descricao ?? ""} ${a.chave}`.toLowerCase().includes(termo)) return false
      return true
    })
  }, [assinaturas, busca, filtro])

  const pendentes = assinaturas.filter((a) => !a.aprovado).length
  const publicadasReais = stats.filter((s) => s.origem === "dado_real").length

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Inteligência de Nicho"
        description="O catálogo de gargalos que alimenta as sugestões da Fase 3. Nada chega ao cliente sem sua aprovação."
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi valor={String(assinaturas.length)} label="Assinaturas no catálogo" />
        <Kpi valor={String(assinaturas.filter((a) => a.aprovado).length)} label="Aprovadas" destaque />
        <Kpi valor={String(pendentes)} label="Aguardando curadoria" />
        <Kpi valor={String(publicadasReais)} label="Publicadas com dado real" />
      </div>

      {/* Ações da IA */}
      <Card className="border-primary/25 bg-primary/[0.03]">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">Operar a IA</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Gerar catálogo de um nicho
              </Label>
              <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">
                Resolve a partida a frio: enquanto o nicho não tem massa de dado real, a sugestão sai
                deste catálogo de referência.
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={nichoSemear}
                  onChange={(e) => setNichoSemear(e.target.value)}
                  className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-[13px] font-medium text-foreground"
                >
                  <option value="">Escolha o nicho...</option>
                  {nichos.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <Button
                  disabled={!nichoSemear || rodando !== null}
                  className="h-11 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider"
                  onClick={semear}
                >
                  <Sparkles className="size-4" />
                  {rodando === "semear" ? "Gerando..." : "Gerar"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Classificar gargalos das empresas
              </Label>
              <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">
                Lê os gargalos ainda sem assinatura e encaixa cada um no catálogo. O que não encaixa
                vira um padrão novo, para você aprovar aqui.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={rodando !== null}
                  className="h-11 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
                  onClick={classificar}
                >
                  <Bot className="size-4" />
                  {rodando === "classificar" ? "Classificando..." : "Classificar lote de 25"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={rodando !== null}
                  className="h-11 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider text-muted-foreground"
                  onClick={atualizarAgora}
                >
                  <RefreshCw className="size-4" />
                  Republicar agregado
                </Button>
              </div>
            </div>
          </div>

          <p className="flex items-start gap-2 rounded-xl border border-border bg-background/40 p-3 text-[11.5px] font-medium text-muted-foreground leading-relaxed">
            <ShieldCheck className="size-4 shrink-0 mt-0.5 text-primary" />
            <span>
              O texto que as empresas escrevem nunca sai do lugar delas — a IA lê só para produzir o
              rótulo. A tabela que o cliente enxerga não tem empresa nem texto livre, e uma estatística
              só é publicada com <strong className="text-foreground">5 empresas ou mais</strong> do nicho.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar assinatura..."
            className="h-10 pl-10 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {([
            ["pendentes", `Aguardando (${pendentes})`],
            ["aprovadas", `Aprovadas (${assinaturas.length - pendentes})`],
            ["todas", "Todas"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFiltro(k)}
              className={`h-10 px-3.5 rounded-xl border text-[12px] font-bold transition-colors ${
                filtro === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl bg-card/40 animate-pulse" />
      ) : filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground max-w-md mx-auto">
            {assinaturas.length === 0
              ? "Catálogo vazio. Escolha um nicho acima e clique em Gerar para a IA propor os gargalos típicos do setor."
              : "Nada aqui com esse filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((a, i) => {
            const uso = usoPorAssinatura.get(a.id)
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
              >
                <Card className={a.aprovado ? "" : "border-amber-500/25 bg-amber-500/[0.03]"}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <button
                      onClick={() => alternarAprovacao(a)}
                      title={a.aprovado ? "Tirar de produção" : "Aprovar"}
                      className="mt-0.5 shrink-0"
                    >
                      {a.aprovado
                        ? <CheckCircle2 className="size-5 text-primary" />
                        : <Circle className="size-5 text-muted-foreground/50 hover:text-primary transition-colors" />}
                    </button>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13.5px] font-bold tracking-tight text-foreground">{a.titulo}</p>
                        <Badge className={`rounded-md px-1.5 py-0 text-[9px] font-bold border ${ORIGEM_COR[a.origem]}`}>
                          {ORIGEM_LABEL[a.origem]}
                        </Badge>
                        {uso?.real && (
                          <Badge className="rounded-md px-1.5 py-0 text-[9px] font-bold border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                            EM USO · {uso.empresas} empresas
                          </Badge>
                        )}
                      </div>
                      {a.descricao && (
                        <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">{a.descricao}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-medium text-muted-foreground/70">
                        <code className="rounded bg-muted/30 px-1.5 py-0.5 font-mono">{a.chave}</code>
                        {a.area_sugerida && <span>· {a.area_sugerida}</span>}
                        {a.horas_mes_tipicas ? <span>· ~{a.horas_mes_tipicas}h/mês</span> : null}
                        <span>· {a.nichos_alvo.length === 0 ? "todos os nichos" : a.nichos_alvo.join(", ")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="size-8 p-0 rounded-lg" onClick={() => setEditando({ ...a })}>
                        <Edit3 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={() => excluir(a)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Edição */}
      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar assinatura</DialogTitle></DialogHeader>
          {editando && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título</Label>
                <Input
                  className="h-11 rounded-xl"
                  value={editando.titulo}
                  onChange={(e) => setEditando({ ...editando, titulo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</Label>
                <Textarea
                  className="rounded-xl min-h-20"
                  value={editando.descricao ?? ""}
                  onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Área</Label>
                <select
                  value={editando.area_sugerida ?? ""}
                  onChange={(e) => setEditando({ ...editando, area_sugerida: e.target.value || null })}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[13px] font-medium text-foreground"
                >
                  <option value="">Sem área definida</option>
                  {AREAS_GARGALO.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Horas/mês típicas <span className="font-medium normal-case">(referência enquanto não há dado real)</span>
                </Label>
                <Input
                  type="number" min={0}
                  className="h-11 rounded-xl max-w-32"
                  value={editando.horas_mes_tipicas ?? ""}
                  onChange={(e) => setEditando({ ...editando, horas_mes_tipicas: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nichos <span className="font-medium normal-case">(nenhum marcado = vale para todos)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {nichos.map((n) => {
                    const ativo = editando.nichos_alvo.includes(n)
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setEditando({
                          ...editando,
                          nichos_alvo: ativo ? editando.nichos_alvo.filter((x) => x !== n) : [...editando.nichos_alvo, n],
                        })}
                        className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                          ativo ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs"
              onClick={() => editando && salvarEdicao(editando)}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Kpi({ valor, label, destaque }: { valor: string; label: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${destaque ? "border-primary/30 bg-primary/[0.05]" : "border-border bg-muted/10"}`}>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${destaque ? "text-primary" : "text-foreground"}`}>{valor}</p>
    </div>
  )
}
