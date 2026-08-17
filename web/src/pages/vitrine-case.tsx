// Página editorial de um case da vitrine (/vitrine/case/:caseId), dentro do painel.
//
// O corpo (hero + os 6 blocos + a ficha lateral) vive em
// @/components/vitrine/case-editorial porque o modo apresentação
// (/vitrine/apresentar/:caseId) mostra exatamente o mesmo conteúdo. Aqui ficam
// só a moldura do admin: voltar para a vitrine e a navegação anterior/próximo.
import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CaseEditorial, useEvidenciasCase } from "@/components/vitrine/case-editorial"
import {
  ArrowLeftIcon as ArrowLeft,
  ChevronRightIcon as ChevronRight,
  CompassIcon as Compass,
} from "@/components/ui/icons"
import { ordenarVitrine, type ShowcaseCase } from "@/lib/vitrine"

export default function VitrineCasePage() {
  const { caseId } = useParams<{ caseId: string }>()
  const [cases, setCases] = useState<ShowcaseCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      setLoading(true)
      const { data, error } = await supabase.from("vitrine_showcase").select("*")
      if (!ativo) return
      if (error) {
        toast.error("Não foi possível carregar o case.")
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

  const indice = useMemo(
    () => (caseId ? cases.findIndex((c) => c.case_id === caseId) : -1),
    [cases, caseId]
  )
  const c = indice >= 0 ? cases[indice] : null
  const anterior = indice > 0 ? cases[indice - 1] : null
  const proximo = indice >= 0 && indice < cases.length - 1 ? cases[indice + 1] : null

  const evidencias = useEvidenciasCase(c?.vitrine_case_id)

  if (loading) {
    return (
      <div className="space-y-8 pb-10">
        <Skeleton className="h-64 rounded-2xl" />
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!c) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-24 text-center">
          <Compass className="size-8 text-muted-foreground/60" />
          <p className="text-sm font-bold text-foreground">Case não encontrado</p>
          <p className="max-w-md text-[12px] font-medium leading-relaxed text-muted-foreground">
            Este case pode ter saído da vitrine ou o link está desatualizado.
          </p>
          <Button asChild className="mt-2 h-11 gap-2 rounded-xl text-[11px] font-bold uppercase tracking-wider">
            <Link to="/vitrine">
              <ArrowLeft className="size-4" />
              Voltar para a vitrine
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Navegação de topo */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          asChild
          variant="ghost"
          className="h-10 gap-2 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <Link to="/vitrine">
            <ArrowLeft className="size-4" />
            Voltar para a vitrine
          </Link>
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            asChild={Boolean(anterior)}
            variant="outline"
            disabled={!anterior}
            className="h-10 gap-1.5 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider"
          >
            {anterior ? (
              <Link to={`/vitrine/case/${encodeURIComponent(anterior.case_id)}`}>
                <ArrowLeft className="size-3.5" />
                Anterior
              </Link>
            ) : (
              <span>
                <ArrowLeft className="size-3.5" />
                Anterior
              </span>
            )}
          </Button>
          <Button
            asChild={Boolean(proximo)}
            variant="outline"
            disabled={!proximo}
            className="h-10 gap-1.5 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider"
          >
            {proximo ? (
              <Link to={`/vitrine/case/${encodeURIComponent(proximo.case_id)}`}>
                Próximo
                <ChevronRight className="size-3.5" />
              </Link>
            ) : (
              <span>
                Próximo
                <ChevronRight className="size-3.5" />
              </span>
            )}
          </Button>
        </div>
      </div>

      <CaseEditorial c={c} evidencias={evidencias} escala="normal" />
    </div>
  )
}
