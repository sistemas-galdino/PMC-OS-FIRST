// Vitrine de Cases — MODO APRESENTAÇÃO.
//
// Esta tela é usada ao vivo em reunião de venda: precisa ser legível de longe e
// navegável em poucos cliques. Duas regras editoriais herdadas do sistema
// original e que NÃO podem ser afrouxadas:
//   1. "Nicho do cliente" (setor da empresa) e "Área impactada" (área do negócio
//      transformada pelo case) são conceitos diferentes — dois filtros separados
//      e visíveis. Nunca fundir.
//   2. PENDENTE_VALIDACAO nunca aparece na tela nem nas opções de filtro (por
//      isso todo texto passa por exibivel/opcoesFiltro).
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/page-header"
import { CaseCard } from "@/components/vitrine/case-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  SearchIcon as Search,
  XIcon as X,
  CompassIcon as Compass,
  PlayCircleIcon as PlayCircle,
} from "@/components/ui/icons"
import {
  FILTRO_VAZIO,
  TODOS,
  filtrarCases,
  filtroParaQuery,
  opcoesFiltro,
  ordenarVitrine,
  temFiltroAtivo,
  type ShowcaseCase,
} from "@/lib/vitrine"

export default function VitrinePage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<ShowcaseCase[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState(FILTRO_VAZIO)
  const { busca, nicho, area } = filtro
  const setBusca = (v: string) => setFiltro((f) => ({ ...f, busca: v }))
  const setNicho = (v: string) => setFiltro((f) => ({ ...f, nicho: v }))
  const setArea = (v: string) => setFiltro((f) => ({ ...f, area: v }))

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data, error } = await supabase.from("vitrine_showcase").select("*")
      if (!ativo) return
      if (error) {
        toast.error("Não foi possível carregar a vitrine de cases.")
        setCases([])
      } else {
        setCases(ordenarVitrine((data ?? []) as ShowcaseCase[]))
      }
      setLoading(false)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const nichos = useMemo(() => opcoesFiltro(cases.map((c) => c.nicho)), [cases])
  const areas = useMemo(() => opcoesFiltro(cases.map((c) => c.categoria)), [cases])

  const filtrados = useMemo(() => filtrarCases(cases, filtro), [cases, filtro])

  const temFiltro = temFiltroAtivo(filtro)

  function limpar() {
    setFiltro(FILTRO_VAZIO)
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Vitrine de Cases"
        description="O acervo das transformações que os clientes viveram com o PMC — do gargalo do dia a dia ao processo que passou a rodar sozinho. Filtre pelo nicho do cliente ou pela área do negócio impactada para mostrar o case certo na conversa certa."
        action={
          /* Abre a apresentação LEVANDO O FILTRO ATUAL: o que está na tela é
             exatamente o deck que a pessoa quer mostrar na reunião. */
          <Button
            className="h-11 gap-2 rounded-xl px-4 text-[11px] font-bold uppercase tracking-wider"
            onClick={() => navigate(`/vitrine/apresentar${filtroParaQuery(filtro)}`)}
            disabled={loading || filtrados.length === 0}
          >
            <PlayCircle className="size-4" />
            Modo apresentação
          </Button>
        }
      />

      {/* Filtros: nicho do cliente e área impactada são conceitos distintos */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl bg-muted/10 pl-10"
            placeholder="Buscar por empresa, transformação, ferramenta ou nicho..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={nicho} onValueChange={setNicho}>
            <SelectTrigger className="h-11 w-full rounded-xl sm:w-56">
              <SelectValue placeholder="Nicho do cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os nichos</SelectItem>
              {nichos.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
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
        </div>

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

      {/* Legenda dos dois eixos — a distinção precisa ficar explícita na tela */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] font-medium text-muted-foreground/80">
        <span>
          <strong className="text-foreground">Nicho do cliente</strong> — o setor da empresa
        </span>
        <span>
          <strong className="text-foreground">Área impactada</strong> — a área do negócio que a transformação atingiu
        </span>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[22rem] rounded-xl" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-20 text-center">
          <Compass className="size-8 text-muted-foreground/60" />
          <p className="text-sm font-bold text-foreground">
            {cases.length === 0 ? "Nenhum case publicado ainda" : "Nenhum case com esses filtros"}
          </p>
          <p className="max-w-md text-[12px] font-medium leading-relaxed text-muted-foreground">
            {cases.length === 0
              ? "Assim que os cases forem aprovados para a vitrine, eles aparecem aqui."
              : "Tente outro nicho, outra área impactada ou uma busca mais aberta."}
          </p>
          {temFiltro && cases.length > 0 && (
            <Button
              variant="outline"
              className="mt-1 h-10 rounded-xl text-[11px] font-bold uppercase tracking-wider"
              onClick={limpar}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtrados.map((c) => (
            <CaseCard key={c.case_id} c={c} />
          ))}
        </div>
      )}
    </div>
  )
}
