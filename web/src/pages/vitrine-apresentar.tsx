// Modo apresentação da Vitrine (/vitrine/apresentar e /vitrine/apresentar/:caseId).
//
// Esta rota fica FORA do DashboardLayout (declarada antes do catch-all em
// App.tsx): sem menu lateral, sem cabeçalho, sem o container max-w-7xl. É o que
// a pessoa projeta na reunião de venda.
//
// Um componente só serve a grade e o case, decidindo pelo :caseId — assim cada
// slide tem URL própria e a apresentação sobrevive a um reload.
//
// ⚠️ Fora do DashboardLayout não existe TooltipProvider: não usar <Tooltip> aqui.
//
// Regras editoriais de sempre: "nicho do cliente" ≠ "área impactada" (dois
// filtros, nunca fundidos) e PENDENTE_VALIDACAO nunca chega na tela.
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CaseCard } from "@/components/vitrine/case-card"
import { CaseEditorial, useEvidenciasCase } from "@/components/vitrine/case-editorial"
import {
  SearchIcon as Search,
  XIcon as X,
  CompassIcon as Compass,
  ArrowLeftIcon as ArrowLeft,
  ChevronRightIcon as ChevronRight,
} from "@/components/ui/icons"
import { useTelaCheia } from "@/hooks/use-tela-cheia"
import {
  TODOS,
  filtrarCases,
  filtroParaQuery,
  opcoesFiltro,
  ordenarVitrine,
  queryParaFiltro,
  temFiltroAtivo,
  type FiltroVitrine,
  type ShowcaseCase,
} from "@/lib/vitrine"

export default function VitrineApresentarPage() {
  const { caseId } = useParams<{ caseId?: string }>()
  const [sp, setSp] = useSearchParams()
  const navigate = useNavigate()
  const { cheia, alternar } = useTelaCheia()

  const [cases, setCases] = useState<ShowcaseCase[]>([])
  const [loading, setLoading] = useState(true)

  // O filtro mora na URL: recarregar a página não desmonta o deck.
  const filtro = useMemo(() => queryParaFiltro(sp), [sp])
  const query = filtroParaQuery(filtro)

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

  // O deck é o resultado filtrado — é sobre ele que as setas navegam.
  const deck = useMemo(() => filtrarCases(cases, filtro), [cases, filtro])

  const indice = caseId ? deck.findIndex((c) => c.case_id === caseId) : -1
  const atual = indice >= 0 ? deck[indice] : null
  const anterior = indice > 0 ? deck[indice - 1] : null
  const proximo = indice >= 0 && indice < deck.length - 1 ? deck[indice + 1] : null

  const evidencias = useEvidenciasCase(atual?.vitrine_case_id)

  const irPara = useCallback(
    (c: ShowcaseCase | null) => {
      if (c) navigate(`/vitrine/apresentar/${encodeURIComponent(c.case_id)}${query}`)
    },
    [navigate, query]
  )
  const voltarParaGrade = useCallback(() => navigate(`/vitrine/apresentar${query}`), [navigate, query])
  const sairDaApresentacao = useCallback(() => navigate("/vitrine"), [navigate])

  function alterarFiltro(mudanca: Partial<FiltroVitrine>) {
    setSp(new URLSearchParams(filtroParaQuery({ ...filtro, ...mudanca }).replace(/^\?/, "")), {
      replace: true,
    })
  }

  // Atalhos de teclado. Detalhe: com a tela cheia nativa ativa, o browser
  // consome o Esc para sair dela e o keydown não chega aqui — por isso o
  // primeiro Esc sai da tela cheia e só o segundo navega.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null
      // Não sequestrar teclas enquanto a pessoa digita na busca.
      if (alvo && ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName)) {
        if (e.key === "Escape") alvo.blur()
        return
      }
      if (e.key === "ArrowRight" && atual) {
        e.preventDefault()
        irPara(proximo)
      } else if (e.key === "ArrowLeft" && atual) {
        e.preventDefault()
        irPara(anterior)
      } else if (e.key === "Escape") {
        e.preventDefault()
        if (atual) voltarParaGrade()
        else sairDaApresentacao()
      } else if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        alternar()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [atual, anterior, proximo, irPara, voltarParaGrade, sairDaApresentacao, alternar])

  const contador = atual
    ? `${indice + 1} de ${deck.length}`
    : loading
      ? "Carregando..."
      : `${deck.length} ${deck.length === 1 ? "case" : "cases"}`

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Moldura mínima da apresentação */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-5 py-3 backdrop-blur lg:px-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="PMC OS" className="size-8 rounded-lg object-cover" />
          <div className="leading-none">
            <p className="text-[13px] font-bold tracking-tight">Vitrine de Cases dos Clientes PMC</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Programa Multiplicador de Crescimento
            </p>
          </div>
        </div>

        <span className="ml-auto shrink-0 rounded-full border border-border px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {contador}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider"
            onClick={alternar}
          >
            {cheia ? "Sair da tela cheia" : "Tela cheia"}
          </Button>
          <Button
            variant="ghost"
            className="h-10 gap-2 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            onClick={sairDaApresentacao}
          >
            <X className="size-4" />
            Sair da apresentação
          </Button>
        </div>
      </header>

      <main className="px-5 py-8 lg:px-8 lg:py-10">
        {atual ? (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                className="h-10 gap-2 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                onClick={voltarParaGrade}
              >
                <ArrowLeft className="size-4" />
                Todos os cases
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={!anterior}
                  onClick={() => irPara(anterior)}
                  className="h-10 gap-1.5 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider"
                >
                  <ArrowLeft className="size-3.5" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={!proximo}
                  onClick={() => irPara(proximo)}
                  className="h-10 gap-1.5 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider"
                >
                  Próximo
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>

            <CaseEditorial c={atual} evidencias={evidencias} escala="apresentacao" />

            <p className="pt-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
              ← → passar de case · Esc voltar · F tela cheia
            </p>
          </div>
        ) : caseId && !loading ? (
          <VazioApresentacao
            titulo="Case não encontrado neste deck"
            texto="Ele pode ter saído da vitrine ou não passar pelos filtros atuais."
            acao={
              <Button className="h-10 rounded-xl text-[11px] font-bold uppercase tracking-wider" onClick={voltarParaGrade}>
                Ver todos os cases
              </Button>
            }
          />
        ) : (
          <div className="space-y-8">
            {/* Filtros — nicho do cliente e área impactada continuam separados */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 lg:max-w-md">
                <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
                <Input
                  className="h-11 rounded-xl bg-muted/10 pl-10"
                  placeholder="Buscar por empresa, transformação, ferramenta ou nicho..."
                  value={filtro.busca}
                  onChange={(e) => alterarFiltro({ busca: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Select value={filtro.nicho} onValueChange={(v) => alterarFiltro({ nicho: v })}>
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

                <Select value={filtro.area} onValueChange={(v) => alterarFiltro({ area: v })}>
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

              {temFiltroAtivo(filtro) && (
                <Button
                  variant="ghost"
                  className="h-11 gap-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground lg:ml-auto"
                  onClick={() => setSp(new URLSearchParams(), { replace: true })}
                >
                  <X className="size-3.5" />
                  Limpar
                </Button>
              )}
            </div>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-[24rem] rounded-xl" />
                ))}
              </div>
            ) : deck.length === 0 ? (
              <VazioApresentacao
                titulo="Nenhum case com esses filtros"
                texto="Tente outro nicho, outra área impactada ou uma busca mais aberta."
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {deck.map((c) => (
                  <CaseCard
                    key={c.case_id}
                    c={c}
                    to={`/vitrine/apresentar/${encodeURIComponent(c.case_id)}${query}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function VazioApresentacao({
  titulo,
  texto,
  acao,
}: {
  titulo: string
  texto: string
  acao?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-24 text-center">
      <Compass className="size-8 text-muted-foreground/60" />
      <p className="text-sm font-bold text-foreground">{titulo}</p>
      <p className="max-w-md text-[12px] font-medium leading-relaxed text-muted-foreground">{texto}</p>
      {acao}
    </div>
  )
}
