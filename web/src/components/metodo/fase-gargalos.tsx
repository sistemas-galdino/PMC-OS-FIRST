// Fase 3 — Mapeamento de Gargalos: processos que consomem >10h viram planos de ação com IA.
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { invokeMetodoIA, type PlanoGargaloIA } from "@/lib/metodo-ia"
import { FaseHeader, VazioFase, MarkdownBox, BadgeIA } from "./compartilhados"

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

const STATUS_LABEL: Record<string, string> = {
  mapeado: "Mapeado",
  analisado: "Analisado pela IA",
  em_implementacao: "Em implementação",
  resolvido: "Resolvido",
}

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
  const [erroIA, setErroIA] = useState<string | null>(null)
  const [abertoId, setAbertoId] = useState<string | null>(null)
  const [skillAberta, setSkillAberta] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

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
    fetchGargalos()
  }

  async function mudarStatus(g: Gargalo, status: string) {
    await supabase.from("metodo_gargalos").update({ status, updated_at: new Date().toISOString() }).eq("id", g.id)
    setGargalos((prev) => prev.map((x) => (x.id === g.id ? { ...x, status } : x)))
  }

  async function gerarPlanoIA(g: Gargalo) {
    setGerandoId(g.id)
    setErroIA(null)
    try {
      const plano = await invokeMetodoIA<PlanoGargaloIA>("gargalo_plano", {
        area: g.area, processo: g.processo, descricao: g.descricao,
        quem_executa: g.quem_executa, ferramentas: g.ferramentas,
        horas_mes: g.horas_mes, frequencia: g.frequencia,
      })
      await supabase
        .from("metodo_gargalos")
        .update({ plano_ia: plano, status: "analisado", updated_at: new Date().toISOString() })
        .eq("id", g.id)
      setGargalos((prev) => prev.map((x) => (x.id === g.id ? { ...x, plano_ia: plano, status: "analisado" } : x)))
      setAbertoId(g.id)
    } catch (e: any) {
      setErroIA(e.message || "Erro ao gerar plano com IA.")
    } finally {
      setGerandoId(null)
    }
  }

  const horasTotais = gargalos.reduce((acc, g) => acc + (Number(g.horas_mes) || 0), 0)

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
        a causa raiz e o passo a passo para substituir aquele processo usando IA.
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
        <VazioFase>
          Nenhum gargalo mapeado. Pergunte ao seu time: "qual tarefa consome mais de 10 horas por mês
          na frente do computador?" — e comece por ela.
        </VazioFase>
      ) : (
        <div className="space-y-3">
          {gargalos.map((g) => {
            const aberto = abertoId === g.id
            return (
              <Card key={g.id} className={g.status === "resolvido" ? "border-primary/30 bg-primary/5" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm font-bold tracking-tight">{g.processo}</CardTitle>
                        {g.area && (
                          <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[10px] font-bold uppercase">
                            {g.area}
                          </Badge>
                        )}
                        {g.horas_mes ? (
                          <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[10px] font-bold gap-1">
                            <Clock className="size-3" />
                            {Number(g.horas_mes).toLocaleString("pt-BR")}h/mês
                          </Badge>
                        ) : null}
                        {g.plano_ia?.prioridade && (
                          <Badge className={`rounded-lg px-2 py-0 text-[10px] font-bold border ${PRIORIDADE_COR[g.plano_ia.prioridade] ?? "bg-muted/20 text-muted-foreground border-border"}`}>
                            {g.plano_ia.prioridade.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      {g.descricao && <p className="text-[12px] font-medium text-muted-foreground mt-1 line-clamp-2">{g.descricao}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select value={g.status} onValueChange={(v) => mudarStatus(g, v)}>
                        <SelectTrigger className="h-8 w-44 rounded-lg text-[11px] font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABEL).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost" size="sm"
                        className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={() => excluir(g.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      disabled={gerandoId === g.id}
                      className="h-9 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider"
                      onClick={() => gerarPlanoIA(g)}
                    >
                      <Sparkles className="size-3.5" />
                      {gerandoId === g.id ? "Gerando plano..." : g.plano_ia ? "Gerar novo plano com IA" : "Gerar plano com IA"}
                    </Button>
                    {g.plano_ia && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-9 gap-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider text-primary hover:text-primary hover:bg-primary/5"
                        onClick={() => setAbertoId(aberto ? null : g.id)}
                      >
                        <ChevronDown className={`size-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
                        {aberto ? "Fechar plano" : "Ver plano da IA"}
                      </Button>
                    )}
                  </div>

                  {aberto && g.plano_ia && (
                    <div className="rounded-xl bg-muted/20 border border-primary/20 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <BadgeIA />
                        <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0.5 text-[10px] font-bold">
                          SOLUÇÃO: {g.plano_ia.tipo_solucao?.toUpperCase()}
                        </Badge>
                      </div>
                      {g.plano_ia.causa_raiz && (
                        <p className="text-[13px] font-bold text-foreground">
                          Causa raiz: <span className="font-medium text-muted-foreground">{g.plano_ia.causa_raiz}</span>
                        </p>
                      )}
                      <MarkdownBox>{g.plano_ia.analise || ""}</MarkdownBox>
                      {Array.isArray(g.plano_ia.tarefas) && g.plano_ia.tarefas.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Próximos passos (30 dias)</p>
                          {g.plano_ia.tarefas.map((t, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="font-mono text-[11px] font-bold text-primary mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                              <p className="text-[13px] font-medium text-foreground">{t}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Skills geradas pela IA */}
                      {Array.isArray(g.plano_ia.skills) && g.plano_ia.skills.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Bot className="size-3.5 text-primary" />
                            Skills para resolver ({g.plano_ia.skills.length})
                          </p>
                          {g.plano_ia.skills.map((s, i) => {
                            const chave = `${g.id}-${i}`
                            const aberta = skillAberta === chave
                            return (
                              <div key={chave} className="rounded-xl bg-background/40 border border-border p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                                      <Bot className="size-3.5 text-primary shrink-0" />
                                      {s.nome}
                                    </p>
                                    {s.objetivo && <p className="text-[12px] font-medium text-muted-foreground mt-0.5">{s.objetivo}</p>}
                                  </div>
                                  {s.documento && (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost" size="sm"
                                        className="h-8 gap-1.5 rounded-lg text-[11px] font-bold text-primary hover:text-primary hover:bg-primary/5"
                                        onClick={() => copiarSkill(chave, s.documento!)}
                                      >
                                        <Copy className="size-3.5" />
                                        {copiado === chave ? "Copiado!" : "Copiar"}
                                      </Button>
                                      <Button
                                        variant="ghost" size="sm"
                                        className="size-8 p-0 rounded-lg text-muted-foreground"
                                        onClick={() => setSkillAberta(aberta ? null : chave)}
                                      >
                                        <ChevronDown className={`size-4 transition-transform ${aberta ? "rotate-180" : ""}`} />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                {aberta && s.documento && (
                                  <div className="mt-3 rounded-lg bg-muted/20 border border-border p-3">
                                    <MarkdownBox>{s.documento}</MarkdownBox>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Rotina sugerida pela IA */}
                      {g.plano_ia.rotina?.necessaria && (g.plano_ia.rotina.nome || (g.plano_ia.rotina.passos?.length ?? 0) > 0) && (
                        <div className="rounded-xl bg-background/40 border border-primary/20 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                              <RefreshCw className="size-3.5 text-primary shrink-0" />
                              {g.plano_ia.rotina.nome || "Rotina recomendada"}
                            </p>
                            {g.plano_ia.rotina.cadencia && (
                              <Badge variant="outline" className="rounded-lg border-primary/30 text-primary px-2 py-0 text-[10px] font-bold uppercase">
                                {g.plano_ia.rotina.cadencia}
                              </Badge>
                            )}
                          </div>
                          {Array.isArray(g.plano_ia.rotina.passos) && g.plano_ia.rotina.passos.length > 0 && (
                            <div className="space-y-1.5">
                              {g.plano_ia.rotina.passos.map((p, i) => (
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}


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
