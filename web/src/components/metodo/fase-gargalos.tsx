// Fase 3 — Mapeamento de Gargalos: processos que consomem >10h viram planos de ação com IA.
// Visualização em KANBAN por status; arraste o card entre colunas para mudar de etapa.
// Clique no card para abrir o detalhe (plano da IA, skills, rotina).
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  Sparkles2Icon as Sparkles,
  ClockIcon as Clock,
  ChevronDownIcon as ChevronDown,
  CheckCircle2Icon as CheckCircle2,
  BotIcon as Bot,
  CopyIcon as Copy,
  RefreshCwIcon as RefreshCw,
} from "@/components/ui/icons"
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import { streamMetodoIAGargalo, type PlanoGargaloIA } from "@/lib/metodo-ia"
import { FaseHeader, MarkdownBox, BadgeIA } from "./compartilhados"

// Extrai o valor (parcial) do campo "analise" do JSON que está sendo transmitido, pra mostrar a IA
// "escrevendo" ao vivo. Enquanto o campo não fechou (sem aspa final não-escapada), devolve o texto atual.
function extrairAnaliseParcial(acc: string): string {
  const m = acc.match(/"analise"\s*:\s*"/)
  if (!m || m.index === undefined) return ""
  const start = m.index + m[0].length
  let out = ""
  for (let i = start; i < acc.length; i++) {
    const ch = acc[i]
    if (ch === "\\") {
      const next = acc[i + 1]
      if (next === "n") out += "\n"
      else if (next === "t") out += "\t"
      else if (next === '"') out += '"'
      else if (next === "\\") out += "\\"
      else out += next ?? ""
      i++
    } else if (ch === '"') {
      break // fim do campo analise
    } else {
      out += ch
    }
  }
  return out
}

interface Gargalo {
  id: string
  area: string | null
  processo: string
  descricao: string | null
  quem_executa: string | null
  ferramentas: string | null
  horas_mes: number | null
  frequencia: string | null
  status: string
  plano_ia: PlanoGargaloIA | null
}

const COLUNAS: { key: string; label: string }[] = [
  { key: "mapeado", label: "Mapeado" },
  { key: "analisado", label: "Analisado pela IA" },
  { key: "em_implementacao", label: "Em implementação" },
  { key: "resolvido", label: "Resolvido" },
]

const PRIORIDADE_COR: Record<string, string> = {
  Alta: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Média: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Baixa: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
}

const FORM_VAZIO = { area: "", processo: "", descricao: "", quem_executa: "", ferramentas: "", horas_mes: "", frequencia: "" }

export function FaseGargalos({ clientId }: { clientId: string }) {
  const [gargalos, setGargalos] = useState<Gargalo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [gerandoId, setGerandoId] = useState<string | null>(null)
  const [gerandoSeg, setGerandoSeg] = useState(0)
  const [streamPreview, setStreamPreview] = useState("")
  const [erroIA, setErroIA] = useState<string | null>(null)
  const [detalheId, setDetalheId] = useState<string | null>(null)
  const [skillAberta, setSkillAberta] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function copiarSkill(chave: string, texto: string) {
    navigator.clipboard.writeText(texto)
    setCopiado(chave)
    setTimeout(() => setCopiado((c) => (c === chave ? null : c)), 2000)
  }

  async function fetchGargalos() {
    const { data } = await supabase
      .from("metodo_gargalos")
      .select("*")
      .eq("id_cliente", clientId)
      .order("created_at", { ascending: false })
    setGargalos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchGargalos() }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Conta os segundos enquanto a IA gera, pra dar feedback de progresso.
  useEffect(() => {
    if (!gerandoId) return
    setGerandoSeg(0)
    const t = setInterval(() => setGerandoSeg((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [gerandoId])

  async function salvar() {
    if (!form.processo.trim()) return
    setSalvando(true)
    const { error } = await supabase.from("metodo_gargalos").insert({
      id_cliente: clientId,
      area: form.area.trim() || null,
      processo: form.processo.trim(),
      descricao: form.descricao.trim() || null,
      quem_executa: form.quem_executa.trim() || null,
      ferramentas: form.ferramentas.trim() || null,
      horas_mes: form.horas_mes ? Number(form.horas_mes) : null,
      frequencia: form.frequencia.trim() || null,
    })
    setSalvando(false)
    if (!error) {
      setShowForm(false)
      setForm(FORM_VAZIO)
      fetchGargalos()
    }
  }

  async function excluir(id: string) {
    await supabase.from("metodo_gargalos").delete().eq("id", id)
    setDetalheId((d) => (d === id ? null : d))
    fetchGargalos()
  }

  async function mudarStatus(g: Gargalo, status: string) {
    if (g.status === status) return
    setGargalos((prev) => prev.map((x) => (x.id === g.id ? { ...x, status } : x)))
    await supabase.from("metodo_gargalos").update({ status, updated_at: new Date().toISOString() }).eq("id", g.id)
  }

  async function gerarPlanoIA(g: Gargalo) {
    setGerandoId(g.id)
    setErroIA(null)
    setStreamPreview("")
    setDetalheId(g.id) // abre o detalhe pra mostrar a IA escrevendo
    try {
      const plano = await streamMetodoIAGargalo(
        {
          area: g.area, processo: g.processo, descricao: g.descricao,
          quem_executa: g.quem_executa, ferramentas: g.ferramentas,
          horas_mes: g.horas_mes, frequencia: g.frequencia,
        },
        (acc) => setStreamPreview(extrairAnaliseParcial(acc)),
      )
      await supabase
        .from("metodo_gargalos")
        .update({ plano_ia: plano, status: g.status === "mapeado" ? "analisado" : g.status, updated_at: new Date().toISOString() })
        .eq("id", g.id)
      setGargalos((prev) => prev.map((x) => (x.id === g.id ? { ...x, plano_ia: plano, status: x.status === "mapeado" ? "analisado" : x.status } : x)))
    } catch (e: any) {
      setErroIA(e.message || "Erro ao gerar plano com IA.")
    } finally {
      setGerandoId(null)
      setStreamPreview("")
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const g = gargalos.find((x) => x.id === active.id)
    const novo = String(over.id)
    if (g && COLUNAS.some((c) => c.key === novo)) mudarStatus(g, novo)
  }

  const horasTotais = gargalos.reduce((acc, g) => acc + (Number(g.horas_mes) || 0), 0)
  const detalhe = detalheId ? gargalos.find((g) => g.id === detalheId) ?? null : null

  return (
    <div className="space-y-6">
      <FaseHeader numero={3} titulo="Mapeamento de Gargalos" subtitulo="Onde a operação sangra horas e caixa">
        <Button className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={() => setShowForm(true)}>
          <Plus className="size-4" />
          Mapear Gargalo
        </Button>
      </FaseHeader>

      <p className="text-[15px] font-medium text-muted-foreground leading-relaxed max-w-3xl">
        Escolha uma área e mapeie os processos que consomem <strong className="text-foreground">10 horas ou mais</strong>.
        Para cada gargalo, clique em <strong className="text-foreground">Gerar plano com IA</strong> — a IA devolve a análise,
        a causa raiz e o passo a passo para substituir aquele processo usando IA. Arraste o card entre as colunas para mudar de etapa.
      </p>

      {gargalos.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-3 py-1 text-[11px] font-bold gap-1.5">
            <Clock className="size-3.5" />
            {horasTotais.toLocaleString("pt-BR")}h/mês mapeadas
          </Badge>
          <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-3 py-1 text-[11px] font-bold">
            {gargalos.filter((g) => g.plano_ia).length}/{gargalos.length} com plano da IA
          </Badge>
          <Badge variant="outline" className="rounded-lg border-primary/30 text-primary px-3 py-1 text-[11px] font-bold gap-1.5">
            <CheckCircle2 className="size-3.5" />
            {gargalos.filter((g) => g.status === "resolvido").length} resolvidos
          </Badge>
        </div>
      )}

      {erroIA && <p className="text-[12px] font-medium text-destructive">{erroIA}</p>}

      {loading ? (
        <div className="h-40 rounded-2xl bg-card/40 animate-pulse" />
      ) : gargalos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground max-w-md mx-auto">
            Nenhum gargalo mapeado. Pergunte ao seu time: "qual tarefa consome mais de 10 horas por mês
            na frente do computador?" — e comece por ela.
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {COLUNAS.map((col) => (
              <Coluna
                key={col.key}
                col={col}
                itens={gargalos.filter((g) => g.status === col.key)}
                onAbrir={setDetalheId}
              />
            ))}
          </div>
        </DndContext>
      )}

      {/* Detalhe do gargalo (plano da IA, skills, rotina) */}
      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalheId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{detalhe.processo}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {detalhe.area && (
                    <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[10px] font-bold uppercase">{detalhe.area}</Badge>
                  )}
                  {detalhe.horas_mes ? (
                    <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[10px] font-bold gap-1">
                      <Clock className="size-3" />{Number(detalhe.horas_mes).toLocaleString("pt-BR")}h/mês
                    </Badge>
                  ) : null}
                  {detalhe.plano_ia?.prioridade && (
                    <Badge className={`rounded-lg px-2 py-0 text-[10px] font-bold border ${PRIORIDADE_COR[detalhe.plano_ia.prioridade] ?? "bg-muted/20 text-muted-foreground border-border"}`}>
                      {detalhe.plano_ia.prioridade.toUpperCase()}
                    </Badge>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    {/* Mover de etapa */}
                    {COLUNAS.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => mudarStatus(detalhe, c.key)}
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border transition-colors ${detalhe.status === c.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {detalhe.descricao && <p className="text-[13px] font-medium text-muted-foreground">{detalhe.descricao}</p>}

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    disabled={gerandoId === detalhe.id}
                    className="h-9 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider"
                    onClick={() => gerarPlanoIA(detalhe)}
                  >
                    <Sparkles className="size-3.5" />
                    {gerandoId === detalhe.id ? "Gerando plano..." : detalhe.plano_ia ? "Gerar novo plano com IA" : "Gerar plano com IA"}
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="h-9 gap-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider text-muted-foreground hover:text-destructive ml-auto"
                    onClick={() => excluir(detalhe.id)}
                  >
                    <Trash2 className="size-3.5" /> Excluir
                  </Button>
                </div>

                {/* IA escrevendo o plano ao vivo (streaming) */}
                {gerandoId === detalhe.id && (
                  <div className="rounded-xl bg-muted/20 border border-primary/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <BadgeIA />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-primary animate-pulse">
                        A IA está escrevendo o plano… {gerandoSeg}s
                      </span>
                    </div>
                    {streamPreview ? (
                      <p className="text-[13px] font-medium text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {streamPreview}
                        <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-primary animate-pulse" />
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-3 w-3/4 rounded bg-muted/40 animate-pulse" />
                        <div className="h-3 w-2/3 rounded bg-muted/40 animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-muted/40 animate-pulse" />
                      </div>
                    )}
                  </div>
                )}

                {detalhe.plano_ia && gerandoId !== detalhe.id && (
                  <div className="rounded-xl bg-muted/20 border border-primary/20 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <BadgeIA />
                      <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0.5 text-[10px] font-bold">
                        SOLUÇÃO: {detalhe.plano_ia.tipo_solucao?.toUpperCase()}
                      </Badge>
                    </div>
                    {detalhe.plano_ia.causa_raiz && (
                      <p className="text-[13px] font-bold text-foreground">
                        Causa raiz: <span className="font-medium text-muted-foreground">{detalhe.plano_ia.causa_raiz}</span>
                      </p>
                    )}
                    <MarkdownBox>{detalhe.plano_ia.analise || ""}</MarkdownBox>
                    {Array.isArray(detalhe.plano_ia.tarefas) && detalhe.plano_ia.tarefas.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Próximos passos (30 dias)</p>
                        {detalhe.plano_ia.tarefas.map((t, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="font-mono text-[11px] font-bold text-primary mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                            <p className="text-[13px] font-medium text-foreground">{t}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {Array.isArray(detalhe.plano_ia.skills) && detalhe.plano_ia.skills.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <Bot className="size-3.5 text-primary" />
                          Skills para resolver ({detalhe.plano_ia.skills.length})
                        </p>
                        {detalhe.plano_ia.skills.map((s, i) => {
                          const chave = `${detalhe.id}-${i}`
                          const aberta = skillAberta === chave
                          return (
                            <div key={chave} className="rounded-xl bg-background/40 border border-border p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                                    <Bot className="size-3.5 text-primary shrink-0" />{s.nome}
                                  </p>
                                  {s.objetivo && <p className="text-[12px] font-medium text-muted-foreground mt-0.5">{s.objetivo}</p>}
                                </div>
                                {s.documento && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg text-[11px] font-bold text-primary hover:text-primary hover:bg-primary/5" onClick={() => copiarSkill(chave, s.documento!)}>
                                      <Copy className="size-3.5" />{copiado === chave ? "Copiado!" : "Copiar"}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="size-8 p-0 rounded-lg text-muted-foreground" onClick={() => setSkillAberta(aberta ? null : chave)}>
                                      <ChevronDown className={`size-4 transition-transform ${aberta ? "rotate-180" : ""}`} />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              {aberta && s.documento && (
                                <div className="mt-3 rounded-lg bg-muted/20 border border-border p-3"><MarkdownBox>{s.documento}</MarkdownBox></div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {detalhe.plano_ia.rotina?.necessaria && (detalhe.plano_ia.rotina.nome || (detalhe.plano_ia.rotina.passos?.length ?? 0) > 0) && (
                      <div className="rounded-xl bg-background/40 border border-primary/20 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                            <RefreshCw className="size-3.5 text-primary shrink-0" />
                            {detalhe.plano_ia.rotina.nome || "Rotina recomendada"}
                          </p>
                          {detalhe.plano_ia.rotina.cadencia && (
                            <Badge variant="outline" className="rounded-lg border-primary/30 text-primary px-2 py-0 text-[10px] font-bold uppercase">{detalhe.plano_ia.rotina.cadencia}</Badge>
                          )}
                        </div>
                        {Array.isArray(detalhe.plano_ia.rotina.passos) && detalhe.plano_ia.rotina.passos.length > 0 && (
                          <div className="space-y-1.5">
                            {detalhe.plano_ia.rotina.passos.map((p, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="font-mono text-[11px] font-bold text-primary mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                                <p className="text-[13px] font-medium text-foreground">{p}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mapear Gargalo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Área</Label>
                <Input className="h-11 rounded-xl" placeholder="Ex.: Comercial" value={form.area} onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Horas por mês</Label>
                <Input type="number" className="h-11 rounded-xl" placeholder="Ex.: 12" value={form.horas_mes} onChange={(e) => setForm((p) => ({ ...p, horas_mes: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Processo / tarefa *</Label>
              <Input className="h-11 rounded-xl" placeholder="Ex.: Montagem manual de propostas comerciais" value={form.processo} onChange={(e) => setForm((p) => ({ ...p, processo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição (onde trava, por quê)</Label>
              <Textarea className="rounded-xl min-h-20" value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quem executa</Label>
                <Input className="h-11 rounded-xl" value={form.quem_executa} onChange={(e) => setForm((p) => ({ ...p, quem_executa: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Frequência</Label>
                <Input className="h-11 rounded-xl" placeholder="Ex.: diária, semanal" value={form.frequencia} onChange={(e) => setForm((p) => ({ ...p, frequencia: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ferramentas atuais</Label>
              <Input className="h-11 rounded-xl" placeholder="Ex.: Excel, e-mail, WhatsApp" value={form.ferramentas} onChange={(e) => setForm((p) => ({ ...p, ferramentas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={salvando || !form.processo.trim()} className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs" onClick={salvar}>
              {salvando ? "Salvando..." : "Mapear Gargalo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Coluna do kanban (área que recebe o card) ----
function Coluna({ col, itens, onAbrir }: { col: { key: string; label: string }; itens: Gargalo[]; onAbrir: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  const resolvido = col.key === "resolvido"
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-3 min-h-[160px] transition-colors ${isOver ? "border-primary/50 bg-primary/5" : "border-border bg-muted/10"}`}
    >
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${resolvido ? "bg-primary" : "bg-muted-foreground/40"}`} />
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{col.label}</p>
        </div>
        <span className="text-[11px] font-bold text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5 tabular-nums">{itens.length}</span>
      </div>
      <div className="space-y-2">
        {itens.map((g) => <CardGargalo key={g.id} g={g} onAbrir={onAbrir} />)}
        {itens.length === 0 && (
          <p className="text-[11px] text-muted-foreground/50 text-center py-6">Arraste um card aqui</p>
        )}
      </div>
    </div>
  )
}

// ---- Card arrastável ----
function CardGargalo({ g, onAbrir }: { g: Gargalo; onAbrir: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: g.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onAbrir(g.id)}
      className={`cursor-grab active:cursor-grabbing touch-none select-none transition-shadow ${isDragging ? "opacity-50 shadow-xl" : "hover:border-primary/30"}`}
    >
      <CardContent className="p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-bold tracking-tight text-foreground leading-snug line-clamp-2">{g.processo}</p>
          {g.plano_ia && <Bot className="size-3.5 text-primary shrink-0 mt-0.5" />}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {g.area && (
            <Badge variant="outline" className="rounded-md border-border text-muted-foreground px-1.5 py-0 text-[9px] font-bold uppercase">{g.area}</Badge>
          )}
          {g.horas_mes ? (
            <Badge variant="outline" className="rounded-md border-border text-muted-foreground px-1.5 py-0 text-[9px] font-bold gap-0.5">
              <Clock className="size-2.5" />{Number(g.horas_mes).toLocaleString("pt-BR")}h
            </Badge>
          ) : null}
          {g.plano_ia?.prioridade && (
            <Badge className={`rounded-md px-1.5 py-0 text-[9px] font-bold border ${PRIORIDADE_COR[g.plano_ia.prioridade] ?? "bg-muted/20 text-muted-foreground border-border"}`}>
              {g.plano_ia.prioridade.toUpperCase()}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
