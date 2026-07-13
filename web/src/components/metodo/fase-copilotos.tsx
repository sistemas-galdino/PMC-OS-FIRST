// Fase 4 — Co-Pilotos & Rotinas: o organograma híbrido.
// Colaboradores vêm de cliente_colaboradores (Meu Time); cada copiloto orbita um colaborador.
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
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
  BotIcon as Bot,
  Sparkles2Icon as Sparkles,
  CopyIcon as Copy,
  ExternalLinkIcon as ExternalLink,
} from "@/components/ui/icons"
import { invokeMetodoIA, type SugestaoCopilotoIA } from "@/lib/metodo-ia"
import { FaseHeader, VazioFase, MarkdownBox } from "./compartilhados"

interface Colaborador { id: string; nome: string; cargo: string; setor: string; nivel: string | null; guardiao_ia: boolean }

type NivelKey = "estrategico" | "tatico" | "operacional"

const NIVEIS: { key: NivelKey; label: string; hint: string }[] = [
  { key: "estrategico", label: "Estratégico", hint: "Direção e decisão" },
  { key: "tatico", label: "Tático", hint: "Gestão e coordenação" },
  { key: "operacional", label: "Operacional", hint: "Execução no dia a dia" },
]

/** Nível quando o colaborador ainda não foi classificado: infere pelo cargo/setor. */
function inferNivel(colab: Colaborador): NivelKey {
  const c = colab.cargo.toLowerCase()
  if (colab.setor === "CEO" || /\b(ceo|s[oó]cio|diretor|dono|founder|fundador|presidente|cfo|coo|cto|c-level)\b/.test(c)) return "estrategico"
  if (/\b(gerente|coordenador|coordenadora|l[ií]der|head|supervisor|supervisora|manager)\b/.test(c)) return "tatico"
  return "operacional"
}

function nivelDe(colab: Colaborador): NivelKey {
  const n = colab.nivel as NivelKey | null
  return n && NIVEIS.some((x) => x.key === n) ? n : inferNivel(colab)
}
interface Copiloto {
  id: string
  colaborador_id: string | null
  colaborador_nome: string | null
  nome: string
  funcao: string | null
  url: string | null
  skill_documento: string | null
  status: string
  origem: string
}

const STATUS_LABEL: Record<string, string> = { ideia: "Ideia", em_criacao: "Em criação", ativo: "Ativo" }

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase()
}

export function FaseCopilotos({ clientId }: { clientId: string }) {
  const navigate = useNavigate()
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [copilotos, setCopilotos] = useState<Copiloto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ colaborador_id: "", nome: "", funcao: "", url: "" })
  const [salvando, setSalvando] = useState(false)
  const [detalhe, setDetalhe] = useState<Copiloto | null>(null)
  const [gerandoSkill, setGerandoSkill] = useState(false)
  const [sugestoes, setSugestoes] = useState<SugestaoCopilotoIA[] | null>(null)
  const [gerandoSugestoes, setGerandoSugestoes] = useState(false)
  const [erroIA, setErroIA] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function fetchTudo() {
    const [{ data: cs }, { data: cps }] = await Promise.all([
      supabase.from("cliente_colaboradores").select("id, nome, cargo, setor, nivel, guardiao_ia").eq("id_cliente", clientId).order("setor").order("nome"),
      supabase.from("metodo_copilotos").select("*").eq("id_cliente", clientId).order("created_at"),
    ])
    setColaboradores(cs ?? [])
    setCopilotos(cps ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTudo() }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  const porNivel = useMemo(() => {
    const g: Record<NivelKey, Colaborador[]> = { estrategico: [], tatico: [], operacional: [] }
    colaboradores.forEach((c) => { g[nivelDe(c)].push(c) })
    return g
  }, [colaboradores])

  function copilotosDe(colabId: string): Copiloto[] {
    return copilotos.filter((c) => c.colaborador_id === colabId)
  }

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    const colab = colaboradores.find((c) => c.id === form.colaborador_id)
    const { error } = await supabase.from("metodo_copilotos").insert({
      id_cliente: clientId,
      colaborador_id: form.colaborador_id || null,
      colaborador_nome: colab?.nome ?? null,
      nome: form.nome.trim(),
      funcao: form.funcao.trim() || null,
      url: form.url.trim() || null,
    })
    setSalvando(false)
    if (!error) {
      setShowForm(false)
      setForm({ colaborador_id: "", nome: "", funcao: "", url: "" })
      fetchTudo()
    }
  }

  async function excluir(id: string) {
    await supabase.from("metodo_copilotos").delete().eq("id", id)
    setDetalhe(null)
    fetchTudo()
  }

  async function mudarStatus(cp: Copiloto, status: string) {
    await supabase.from("metodo_copilotos").update({ status, updated_at: new Date().toISOString() }).eq("id", cp.id)
    setCopilotos((prev) => prev.map((x) => (x.id === cp.id ? { ...x, status } : x)))
    setDetalhe((prev) => (prev?.id === cp.id ? { ...prev, status } : prev))
  }

  async function gerarSkill(cp: Copiloto) {
    setGerandoSkill(true)
    setErroIA(null)
    try {
      const colab = colaboradores.find((c) => c.id === cp.colaborador_id)
      const res = await invokeMetodoIA<{ skill_documento: string }>("copiloto_skill", {
        copiloto_nome: cp.nome,
        funcao: cp.funcao,
        colaborador_nome: cp.colaborador_nome ?? colab?.nome,
        cargo: colab?.cargo,
      })
      await supabase
        .from("metodo_copilotos")
        .update({ skill_documento: res.skill_documento, origem: "ia", updated_at: new Date().toISOString() })
        .eq("id", cp.id)
      setCopilotos((prev) => prev.map((x) => (x.id === cp.id ? { ...x, skill_documento: res.skill_documento } : x)))
      setDetalhe((prev) => (prev?.id === cp.id ? { ...prev, skill_documento: res.skill_documento } : prev))
    } catch (e: any) {
      setErroIA(e.message || "Erro ao gerar skill.")
    } finally {
      setGerandoSkill(false)
    }
  }

  async function sugerirComIA() {
    setGerandoSugestoes(true)
    setErroIA(null)
    try {
      const res = await invokeMetodoIA<{ sugestoes: SugestaoCopilotoIA[] }>("copiloto_sugestoes", {
        colaboradores: colaboradores.map((c) => ({ nome: c.nome, cargo: c.cargo, setor: c.setor })),
      })
      setSugestoes(res.sugestoes ?? [])
    } catch (e: any) {
      setErroIA(e.message || "Erro ao sugerir copilotos.")
    } finally {
      setGerandoSugestoes(false)
    }
  }

  async function aceitarSugestao(s: SugestaoCopilotoIA) {
    const colab = colaboradores.find((c) => c.nome.toLowerCase() === s.colaborador_nome.toLowerCase())
    await supabase.from("metodo_copilotos").insert({
      id_cliente: clientId,
      colaborador_id: colab?.id ?? null,
      colaborador_nome: s.colaborador_nome,
      nome: s.copiloto_nome,
      funcao: s.funcao,
      origem: "ia",
    })
    setSugestoes((prev) => (prev ?? []).filter((x) => x !== s))
    fetchTudo()
  }

  return (
    <div className="space-y-6">
      <FaseHeader numero={4} titulo="Co-Pilotos & Rotinas" subtitulo="O organograma híbrido: IA orbitando o time">
        <Button
          variant="outline"
          disabled={gerandoSugestoes || colaboradores.length === 0}
          className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
          onClick={sugerirComIA}
        >
          <Sparkles className="size-4" />
          {gerandoSugestoes ? "Analisando o time..." : "Sugerir com IA"}
        </Button>
        <Button className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={() => setShowForm(true)}>
          <Plus className="size-4" />
          Novo Co-Piloto
        </Button>
      </FaseHeader>

      <p className="text-[15px] font-medium text-muted-foreground leading-relaxed max-w-3xl">
        Toda função repetitiva feita na frente do computador pode virar um co-piloto de IA.
        Cada bolinha orbitando um colaborador é um co-piloto trabalhando com ele. Mapeie você mesmo
        ou peça sugestões à IA — e gere o documento de skill pronto para colar no Claude.
      </p>

      {erroIA && <p className="text-[12px] font-medium text-destructive">{erroIA}</p>}

      {/* Sugestões da IA */}
      {sugestoes && (
        <Card className="border-primary/30">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Sugestões da IA ({sugestoes.length})
              </p>
              <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs font-bold" onClick={() => setSugestoes(null)}>
                Fechar
              </Button>
            </div>
            {sugestoes.length === 0 ? (
              <p className="text-[13px] font-medium text-muted-foreground">Nenhuma sugestão restante.</p>
            ) : (
              sugestoes.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-foreground">
                      {s.copiloto_nome} <span className="text-muted-foreground font-medium">→ {s.colaborador_nome}</span>
                    </p>
                    <p className="text-[12px] font-medium text-muted-foreground">{s.funcao}</p>
                    <p className="text-[11px] font-medium text-muted-foreground/70 italic">{s.justificativa}</p>
                  </div>
                  <Button size="sm" className="h-8 rounded-lg text-[11px] font-bold uppercase shrink-0" onClick={() => aceitarSugestao(s)}>
                    Adicionar
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Organograma híbrido */}
      {loading ? (
        <div className="h-52 rounded-2xl bg-card/40 animate-pulse" />
      ) : colaboradores.length === 0 ? (
        <VazioFase>
          Para desenhar o organograma híbrido, primeiro cadastre seu time em{" "}
          <button className="text-primary font-bold underline underline-offset-2" onClick={() => navigate("/meu-time")}>
            Meu Time
          </button>
          . Depois volte aqui para orbitar os co-pilotos em cada colaborador.
        </VazioFase>
      ) : (
        <div className="space-y-6">
          {NIVEIS.map(({ key, label, hint }, idx) => {
            const membros = porNivel[key]
            return (
              <div key={key} className="relative">
                {/* linha conectora vertical entre as faixas do organograma */}
                {idx < NIVEIS.length - 1 && (
                  <div className="absolute left-4 top-8 bottom-0 w-px bg-border/40" aria-hidden />
                )}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/10 pl-2.5 pr-3.5 py-1.5">
                    <span className="grid size-6 place-items-center rounded-lg bg-primary/15 text-[10px] font-mono font-bold text-primary">
                      {idx + 1}
                    </span>
                    <div className="leading-tight">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-foreground">{label}</p>
                      <p className="text-[10px] font-medium text-muted-foreground">{hint}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[10px] font-bold">
                    {membros.length}
                  </Badge>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
                {membros.length === 0 ? (
                  <p className="pl-4 text-[11px] font-medium text-muted-foreground/60 italic">
                    Nenhum colaborador neste nível.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-x-10 gap-y-8 pl-4">
                    {membros.map((colab) => {
                      const cps = copilotosDe(colab.id)
                      const n = cps.length
                      return (
                        <div key={colab.id} className="flex flex-col items-center gap-2 w-32">
                          {/* núcleo + órbita */}
                          <div className="relative size-24 flex items-center justify-center">
                            {n > 0 && (
                              <div className="absolute inset-0 rounded-full border border-dashed border-primary/40" />
                            )}
                            <div className={`size-14 rounded-full flex items-center justify-center font-bold text-sm ${
                              colab.guardiao_ia
                                ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                                : "bg-muted/40 text-foreground border border-border"
                            }`}>
                              {iniciais(colab.nome)}
                            </div>
                            {cps.map((cp, i) => {
                              const ang = (i * 360) / n - 90
                              const rad = (ang * Math.PI) / 180
                              const x = 48 + 48 * Math.cos(rad)
                              const y = 48 + 48 * Math.sin(rad)
                              return (
                                <button
                                  key={cp.id}
                                  title={cp.nome}
                                  onClick={() => setDetalhe(cp)}
                                  className={`absolute size-7 rounded-full flex items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 ${
                                    cp.status === "ativo" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"
                                  }`}
                                  style={{ left: x, top: y }}
                                >
                                  <Bot className="size-3.5" />
                                </button>
                              )
                            })}
                          </div>
                          <div className="text-center">
                            <p className="text-[12px] font-bold tracking-tight text-foreground leading-tight">{colab.nome}</p>
                            <p className="text-[10px] font-medium text-muted-foreground">{colab.cargo}</p>
                            {colab.setor && (
                              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">{colab.setor}</p>
                            )}
                            <p className="text-[10px] font-bold text-primary mt-0.5">
                              {n === 0 ? "sem co-piloto" : `${n} co-piloto${n > 1 ? "s" : ""}`}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Copilotos sem colaborador vinculado */}
          {copilotos.some((c) => !c.colaborador_id) && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Co-pilotos sem colaborador vinculado</p>
              <div className="flex flex-wrap gap-2">
                {copilotos.filter((c) => !c.colaborador_id).map((cp) => (
                  <button
                    key={cp.id}
                    onClick={() => setDetalhe(cp)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/20 border border-border hover:border-primary/40 transition-all"
                  >
                    <Bot className="size-4 text-primary" />
                    <span className="text-[12px] font-bold text-foreground">{cp.nome}</span>
                    {cp.colaborador_nome && <span className="text-[11px] text-muted-foreground">({cp.colaborador_nome})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* Novo copiloto */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Co-Piloto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Colaborador</Label>
              <Select value={form.colaborador_id} onValueChange={(v) => setForm((p) => ({ ...p, colaborador_id: v }))}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Quem vai usar este co-piloto?" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome} — {c.cargo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do co-piloto *</Label>
              <Input className="h-11 rounded-xl" placeholder="Ex.: Copiloto de Propostas" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Função repetitiva que ele executa</Label>
              <Textarea className="rounded-xl min-h-20" placeholder="Ex.: Montar propostas comerciais a partir do briefing do vendedor" value={form.funcao} onChange={(e) => setForm((p) => ({ ...p, funcao: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Link do co-piloto</Label>
              <Input className="h-11 rounded-xl" placeholder="https://... (projeto no Claude, ferramenta)" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={salvando || !form.nome.trim()} className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs" onClick={salvar}>
              {salvando ? "Salvando..." : "Criar Co-Piloto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhe do copiloto */}
      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="sm:max-w-2xl">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bot className="size-5 text-primary" />
                  {detalhe.nome}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {detalhe.colaborador_nome && (
                    <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0.5 text-[11px] font-bold">
                      {detalhe.colaborador_nome}
                    </Badge>
                  )}
                  <Select value={detalhe.status} onValueChange={(v) => mudarStatus(detalhe, v)}>
                    <SelectTrigger className="h-8 w-36 rounded-lg text-[11px] font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {detalhe.funcao && (
                  <p className="text-[13px] font-medium text-muted-foreground">
                    <strong className="text-foreground">Função:</strong> {detalhe.funcao}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {detalhe.url && (
                    <Button
                      variant="outline" size="sm"
                      className="h-9 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
                      onClick={() => window.open(detalhe.url!, "_blank")}
                    >
                      <ExternalLink className="size-3.5" />
                      Abrir co-piloto
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={gerandoSkill}
                    className="h-9 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider"
                    onClick={() => gerarSkill(detalhe)}
                  >
                    <Sparkles className="size-3.5" />
                    {gerandoSkill ? "Gerando skill..." : detalhe.skill_documento ? "Regerar skill com IA" : "Gerar skill com IA"}
                  </Button>
                  {detalhe.skill_documento && (
                    <Button
                      variant="outline" size="sm"
                      className="h-9 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:border-primary/30"
                      onClick={() => {
                        navigator.clipboard.writeText(detalhe.skill_documento!)
                        setCopiado(true)
                        setTimeout(() => setCopiado(false), 2000)
                      }}
                    >
                      <Copy className="size-3.5" />
                      {copiado ? "Copiado!" : "Copiar skill"}
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="sm"
                    className="h-9 gap-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider text-muted-foreground hover:text-destructive"
                    onClick={() => excluir(detalhe.id)}
                  >
                    <Trash2 className="size-3.5" />
                    Excluir
                  </Button>
                </div>
                {erroIA && <p className="text-[12px] font-medium text-destructive">{erroIA}</p>}
                {detalhe.skill_documento ? (
                  <div className="rounded-xl bg-muted/20 border border-border p-4">
                    <MarkdownBox>{detalhe.skill_documento}</MarkdownBox>
                  </div>
                ) : (
                  <p className="text-[12px] font-medium text-muted-foreground/70 italic">
                    Sem documento de skill ainda — gere com IA para ter as instruções prontas para colar no Claude.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
