// Cases (admin) — a mesa de curadoria da Vitrine.
//
// Aqui o time decide o que entra na vitrine e escreve a headline que vai ser
// lida ao vivo na reunião de venda. Duas regras editoriais herdadas do sistema
// original e que NÃO podem ser afrouxadas:
//   1. "Nicho do cliente" (setor da empresa) e "Área impactada" (categoria — a
//      área do negócio transformada) são conceitos diferentes. O filtro desta
//      tela é o de ÁREA IMPACTADA; nunca fundir com nicho.
//   2. PENDENTE_VALIDACAO nunca aparece na tela nem nas opções de filtro (por
//      isso todo texto passa por exibivel/opcoesFiltro).
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/page-header"
import { CaseCard } from "@/components/vitrine/case-card"
import { LogoCliente } from "@/components/vitrine/logo-cliente"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  SearchIcon as Search,
  XIcon as X,
  Sparkles2Icon as Sparkles,
  Edit3Icon as Edit3,
  CheckIcon as Check,
  EyeIcon as Eye,
  EyeOffIcon as EyeOff,
  PackageIcon as Package,
  StarIcon as Star,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import {
  exibivel,
  nomeEmpresa,
  normalizar,
  opcoesFiltro,
  type ShowcaseCase,
  type VitrineCase,
  type VitrineCliente,
} from "@/lib/vitrine"

/** Radix não aceita SelectItem com value vazio — sentinela para "todos". */
const TODOS = "__todos__"

type StatusVitrine = "todos" | "dentro" | "fora" | "arquivados"

type Linha = VitrineCase & { cliente: VitrineCliente | null }

/** Ordem padrão: destaque, ordem_vitrine (nulls no fim), empresa. */
function ordenar(linhas: Linha[]): Linha[] {
  return [...linhas].sort((a, b) => {
    if (a.destaque !== b.destaque) return a.destaque ? -1 : 1
    const oa = a.ordem_vitrine ?? Number.MAX_SAFE_INTEGER
    const ob = b.ordem_vitrine ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    return (a.empresa_nome ?? "").localeCompare(b.empresa_nome ?? "", "pt-BR")
  })
}

/** Monta o objeto que o CaseCard consome, pra ver a headline como ela vai sair. */
function paraShowcase(l: Linha, headlineVitrine: string, categoria: string, ferramenta: string, focoIa: boolean): ShowcaseCase {
  return {
    case_id: l.case_id,
    vitrine_case_id: l.id,
    vitrine_cliente_id: l.vitrine_cliente_id,
    id_cliente: l.id_cliente,
    codigo_cliente: l.codigo_cliente,
    empresa_nome: l.empresa_nome ?? l.cliente?.empresa_nome ?? "Empresa",
    cliente_nome: l.cliente?.cliente_nome ?? null,
    nicho: l.cliente?.nicho ?? null,
    subnicho: l.cliente?.subnicho ?? null,
    cs_responsavel: l.cliente?.cs_responsavel ?? null,
    logo_path: l.cliente?.logo_path ?? null,
    logo_display_path: l.cliente?.logo_display_path ?? null,
    categoria: categoria || null,
    foco_ia: focoIa,
    ferramenta_card: ferramenta || null,
    headline_impacto: l.headline_impacto,
    headline_vitrine: headlineVitrine || null,
    resumo_executivo: l.resumo_executivo,
    como_era_antes: l.como_era_antes,
    principais_gargalos: l.principais_gargalos ?? [],
    como_ficou_depois: l.como_ficou_depois,
    o_que_pmc_transformou: l.o_que_pmc_transformou,
    principais_ganhos: l.principais_ganhos ?? [],
    solucao_criada: l.solucao_criada,
    processo_atual: l.processo_atual,
    resultado_principal: l.resultado_principal,
    capa_url: l.capa_url,
    palavras_chave: l.palavras_chave ?? [],
    destaque: l.destaque,
    ordem_vitrine: l.ordem_vitrine,
  }
}

const paraLinhas = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean)

type Form = {
  headline_vitrine: string
  categoria: string
  ferramenta_card: string
  foco_ia: boolean
  destaque: boolean
  ordem_vitrine: string
  resumo_executivo: string
  como_era_antes: string
  como_ficou_depois: string
  o_que_pmc_transformou: string
  solucao_criada: string
  principais_gargalos: string
  principais_ganhos: string
}

function formDe(l: Linha): Form {
  return {
    headline_vitrine: exibivel(l.headline_vitrine) ?? "",
    categoria: exibivel(l.categoria) ?? "",
    ferramenta_card: exibivel(l.ferramenta_card) ?? "",
    foco_ia: l.foco_ia,
    destaque: l.destaque,
    ordem_vitrine: l.ordem_vitrine == null ? "" : String(l.ordem_vitrine),
    resumo_executivo: exibivel(l.resumo_executivo) ?? "",
    como_era_antes: exibivel(l.como_era_antes) ?? "",
    como_ficou_depois: exibivel(l.como_ficou_depois) ?? "",
    o_que_pmc_transformou: exibivel(l.o_que_pmc_transformou) ?? "",
    solucao_criada: exibivel(l.solucao_criada) ?? "",
    principais_gargalos: (l.principais_gargalos ?? []).join("\n"),
    principais_ganhos: (l.principais_ganhos ?? []).join("\n"),
  }
}

export default function VitrineCasesPage() {
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [somenteIa, setSomenteIa] = useState(false)
  const [statusVitrine, setStatusVitrine] = useState<StatusVitrine>("todos")
  const [area, setArea] = useState(TODOS)
  const [editando, setEditando] = useState<Linha | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const [{ data: cases, error: erroCases }, { data: clientes }] = await Promise.all([
        supabase.from("vitrine_cases").select("*"),
        supabase.from("vitrine_clientes").select("*"),
      ])
      if (!ativo) return
      if (erroCases) {
        toast.error("Não foi possível carregar os cases.")
        setLinhas([])
        setLoading(false)
        return
      }
      const porId = new Map<string, VitrineCliente>(
        ((clientes ?? []) as VitrineCliente[]).map((c) => [c.id, c])
      )
      setLinhas(
        ordenar(
          ((cases ?? []) as VitrineCase[]).map((c) => ({
            ...c,
            cliente: porId.get(c.vitrine_cliente_id) ?? null,
          }))
        )
      )
      setLoading(false)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const resumo = useMemo(
    () => ({
      total: linhas.length,
      naVitrine: linhas.filter((l) => l.aprovado_vitrine && !l.arquivado).length,
      comIa: linhas.filter((l) => l.foco_ia).length,
      arquivados: linhas.filter((l) => l.arquivado).length,
    }),
    [linhas]
  )

  const areas = useMemo(() => opcoesFiltro(linhas.map((l) => l.categoria)), [linhas])

  const filtrados = useMemo(() => {
    const q = normalizar(busca)
    return linhas.filter((l) => {
      if (somenteIa && !l.foco_ia) return false
      if (statusVitrine === "arquivados" && !l.arquivado) return false
      if (statusVitrine === "dentro" && (!l.aprovado_vitrine || l.arquivado)) return false
      if (statusVitrine === "fora" && (l.aprovado_vitrine || l.arquivado)) return false
      if (statusVitrine !== "arquivados" && statusVitrine !== "todos" && l.arquivado) return false
      if (area !== TODOS && exibivel(l.categoria) !== area) return false
      if (!q) return true
      const alvo = normalizar(
        [
          l.empresa_nome ?? l.cliente?.empresa_nome ?? "",
          l.case_id,
          exibivel(l.headline_vitrine) ?? "",
          exibivel(l.headline_impacto) ?? "",
          exibivel(l.ferramenta_card) ?? "",
        ]
          .filter(Boolean)
          .join(" ")
      )
      return alvo.includes(q)
    })
  }, [linhas, busca, somenteIa, statusVitrine, area])

  const temFiltro = Boolean(busca.trim()) || somenteIa || statusVitrine !== "todos" || area !== TODOS

  function limpar() {
    setBusca("")
    setSomenteIa(false)
    setStatusVitrine("todos")
    setArea(TODOS)
  }

  /** Liga/desliga a presença do case na vitrine, sem refetch da lista inteira. */
  async function alternarVitrine(l: Linha) {
    const novo = !l.aprovado_vitrine
    setLinhas((atual) => atual.map((x) => (x.id === l.id ? { ...x, aprovado_vitrine: novo } : x)))
    const { error } = await supabase.from("vitrine_cases").update({ aprovado_vitrine: novo }).eq("id", l.id)
    if (error) {
      setLinhas((atual) => atual.map((x) => (x.id === l.id ? { ...x, aprovado_vitrine: !novo } : x)))
      toast.error("Não foi possível atualizar a vitrine.")
      return
    }
    toast.success(novo ? "Case entrou na vitrine." : "Case saiu da vitrine.")
  }

  function abrirEdicao(l: Linha) {
    setEditando(l)
    setForm(formDe(l))
  }

  function fecharEdicao() {
    setEditando(null)
    setForm(null)
  }

  async function salvar() {
    if (!editando || !form) return
    setSalvando(true)
    const ordem = form.ordem_vitrine.trim() === "" ? null : Number(form.ordem_vitrine)
    if (ordem != null && Number.isNaN(ordem)) {
      toast.error("A ordem na vitrine precisa ser um número.")
      setSalvando(false)
      return
    }
    const patch = {
      headline_vitrine: form.headline_vitrine.trim() || null,
      categoria: form.categoria.trim() || null,
      ferramenta_card: form.ferramenta_card.trim() || null,
      foco_ia: form.foco_ia,
      destaque: form.destaque,
      ordem_vitrine: ordem,
      resumo_executivo: form.resumo_executivo.trim() || null,
      como_era_antes: form.como_era_antes.trim() || null,
      como_ficou_depois: form.como_ficou_depois.trim() || null,
      o_que_pmc_transformou: form.o_que_pmc_transformou.trim() || null,
      solucao_criada: form.solucao_criada.trim() || null,
      principais_gargalos: paraLinhas(form.principais_gargalos),
      principais_ganhos: paraLinhas(form.principais_ganhos),
    }
    const { error } = await supabase.from("vitrine_cases").update(patch).eq("id", editando.id)
    setSalvando(false)
    if (error) {
      toast.error("Não foi possível salvar o case.")
      return
    }
    setLinhas((atual) => ordenar(atual.map((x) => (x.id === editando.id ? { ...x, ...patch } : x))))
    toast.success("Case atualizado.")
    fecharEdicao()
  }

  const preview = editando && form ? paraShowcase(editando, form.headline_vitrine, form.categoria, form.ferramenta_card, form.foco_ia) : null

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Cases"
        description="A curadoria dos cases da vitrine: quem entra, com qual headline e em que ordem. A área impactada é a área do negócio que a transformação atingiu — não confundir com o nicho do cliente."
      />

      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total de cases", valor: resumo.total, icon: Package },
          { label: "Na vitrine", valor: resumo.naVitrine, icon: Eye },
          { label: "Com IA", valor: resumo.comIa, icon: Sparkles },
          { label: "Arquivados", valor: resumo.arquivados, icon: EyeOff },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none text-foreground">{loading ? "—" : c.valor}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl bg-muted/10 pl-10"
            placeholder="Buscar por empresa, ID do case ou headline..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <Button
          type="button"
          variant={somenteIa ? "default" : "outline"}
          className="h-11 gap-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider"
          onClick={() => setSomenteIa((v) => !v)}
        >
          <Sparkles className="size-3.5" />
          Somente com IA
        </Button>

        <Select value={statusVitrine} onValueChange={(v) => setStatusVitrine(v as StatusVitrine)}>
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-52">
            <SelectValue placeholder="Status da vitrine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="dentro">Na vitrine</SelectItem>
            <SelectItem value="fora">Fora da vitrine</SelectItem>
            <SelectItem value="arquivados">Arquivados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-56">
            <SelectValue placeholder="Área impactada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as áreas</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3 lg:ml-auto">
          {temFiltro && (
            <Button
              variant="ghost"
              className="h-11 gap-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              onClick={limpar}
            >
              <X className="size-3.5" />
              Limpar
            </Button>
          )}
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {loading ? "Carregando..." : `${filtrados.length} ${filtrados.length === 1 ? "case" : "cases"}`}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-20 text-center">
          <Package className="size-8 text-muted-foreground/60" />
          <p className="text-sm font-bold text-foreground">Nenhum case com esses filtros</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>ID do case</TableHead>
                <TableHead>Headline da vitrine</TableHead>
                <TableHead>Área impactada</TableHead>
                <TableHead>IA</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((l) => {
                const empresa = l.empresa_nome ?? l.cliente?.empresa_nome ?? "Empresa"
                const headline = exibivel(l.headline_vitrine) || exibivel(l.headline_impacto)
                const areaLinha = exibivel(l.categoria)
                return (
                  <TableRow key={l.id} className={cn(l.arquivado && "opacity-60")}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <LogoCliente
                          empresa={empresa}
                          logoPath={l.cliente?.logo_path}
                          logoDisplayPath={l.cliente?.logo_display_path}
                          className="size-8 shrink-0"
                          classeIniciais="text-[10px]"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold tracking-wide text-foreground">
                            {nomeEmpresa(empresa)}
                          </p>
                          {l.destaque && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                              <Star className="size-3" />
                              Destaque
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {l.case_id}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
                        {headline ?? "Transformação em validação"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {areaLinha ? (
                        <Badge variant="outline" className="text-[10px]">
                          {areaLinha}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {l.foco_ia ? (
                        <Badge variant="outline" className="gap-1 border-primary/40 text-[10px] text-primary">
                          <Sparkles className="size-3" />
                          IA
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => alternarVitrine(l)}
                          className={cn(
                            "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-[10px] font-bold uppercase tracking-wider transition-colors",
                            l.aprovado_vitrine
                              ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                              : "border-border text-muted-foreground hover:bg-muted/40"
                          )}
                        >
                          {l.aprovado_vitrine ? (
                            <>
                              <Check className="size-3" />
                              Na vitrine
                            </>
                          ) : (
                            "Fora"
                          )}
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                          onClick={() => abrirEdicao(l)}
                        >
                          <Edit3 className="size-3" />
                          Editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edição: headline com preview ao vivo do card + blocos editoriais */}
      <Dialog open={Boolean(editando)} onOpenChange={(o) => !o && fecharEdicao()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Editar case</DialogTitle>
            <DialogDescription>
              {editando ? `${nomeEmpresa(editando.empresa_nome ?? editando.cliente?.empresa_nome ?? "Empresa")} · ${editando.case_id}` : ""}
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline da vitrine</Label>
                  <Textarea
                    id="headline"
                    rows={3}
                    value={form.headline_vitrine}
                    onChange={(e) => setForm({ ...form, headline_vitrine: e.target.value })}
                    placeholder="A transformação em uma frase — é o que aparece no card."
                  />
                  {editando && exibivel(editando.headline_impacto) && (
                    <p className="text-[11px] text-muted-foreground">
                      Headline de impacto original: {exibivel(editando.headline_impacto)}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Área impactada</Label>
                    <Input
                      id="categoria"
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      placeholder="Ex.: Vendas, Financeiro, Operações"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      A área do negócio transformada — não é o nicho do cliente.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ferramenta">Ferramenta do card</Label>
                    <Input
                      id="ferramenta"
                      value={form.ferramenta_card}
                      onChange={(e) => setForm({ ...form, ferramenta_card: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <Checkbox
                      checked={form.foco_ia}
                      onCheckedChange={(v) => setForm({ ...form, foco_ia: v === true })}
                    />
                    Case com foco em IA
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <Checkbox
                      checked={form.destaque}
                      onCheckedChange={(v) => setForm({ ...form, destaque: v === true })}
                    />
                    Destaque
                  </label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="ordem" className="text-xs">
                      Ordem na vitrine
                    </Label>
                    <Input
                      id="ordem"
                      inputMode="numeric"
                      className="h-9 w-24"
                      value={form.ordem_vitrine}
                      onChange={(e) => setForm({ ...form, ordem_vitrine: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resumo">Resumo executivo</Label>
                  <Textarea id="resumo" rows={3} value={form.resumo_executivo} onChange={(e) => setForm({ ...form, resumo_executivo: e.target.value })} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="antes">Como era antes</Label>
                    <Textarea id="antes" rows={4} value={form.como_era_antes} onChange={(e) => setForm({ ...form, como_era_antes: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="depois">Como ficou depois</Label>
                    <Textarea id="depois" rows={4} value={form.como_ficou_depois} onChange={(e) => setForm({ ...form, como_ficou_depois: e.target.value })} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gargalos">Principais gargalos (um por linha)</Label>
                    <Textarea id="gargalos" rows={4} value={form.principais_gargalos} onChange={(e) => setForm({ ...form, principais_gargalos: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ganhos">Principais ganhos (um por linha)</Label>
                    <Textarea id="ganhos" rows={4} value={form.principais_ganhos} onChange={(e) => setForm({ ...form, principais_ganhos: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transformou">O que o PMC transformou</Label>
                  <Textarea id="transformou" rows={3} value={form.o_que_pmc_transformou} onChange={(e) => setForm({ ...form, o_que_pmc_transformou: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="solucao">Solução criada</Label>
                  <Textarea id="solucao" rows={3} value={form.solucao_criada} onChange={(e) => setForm({ ...form, solucao_criada: e.target.value })} />
                </div>
              </div>

              {/* Preview ao vivo — é assim que o card sai na vitrine */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Preview do card
                </p>
                {preview && <CaseCard c={preview} className="pointer-events-none" />}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={fecharEdicao} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
