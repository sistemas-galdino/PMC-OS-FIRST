// Conquistas MC — avalia badges (concede as que faltam no servidor) e devolve
// catálogo + conquistadas + métricas atuais (para progresso das bloqueadas).
// `celebrar` mostra um toast por badge nova (usar só onde o grid é exibido).
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import type { BadgeCatalogo } from "@/data/badges-mc"

interface Resultado {
  loading: boolean
  catalogo: BadgeCatalogo[]
  ganhas: Map<string, string>            // slug → conquistada_em
  metrics: Record<string, number>
  novas: string[]
}

export function useConquistas(ativo: boolean, celebrar = false): Resultado {
  const [loading, setLoading] = useState(true)
  const [catalogo, setCatalogo] = useState<BadgeCatalogo[]>([])
  const [ganhas, setGanhas] = useState<Map<string, string>>(new Map())
  const [metrics, setMetrics] = useState<Record<string, number>>({})
  const [novas, setNovas] = useState<string[]>([])

  useEffect(() => {
    if (!ativo) return
    let cancelado = false
    async function run() {
      const [{ data: cat }, { data: sync }] = await Promise.all([
        supabase.from("badges_catalogo").select("*").order("ordem"),
        supabase.rpc("sync_badges"),
      ])
      if (cancelado) return
      setCatalogo((cat ?? []) as BadgeCatalogo[])
      const res: any = sync ?? {}
      const mapa = new Map<string, string>()
      ;(res.earned ?? []).forEach((e: any) => mapa.set(e.slug, e.em))
      setGanhas(mapa)
      setMetrics(res.metrics ?? {})
      const novasSlugs: string[] = res.novas ?? []
      setNovas(novasSlugs)
      if (celebrar && novasSlugs.length > 0 && cat) {
        const porSlug = new Map((cat as BadgeCatalogo[]).map((b) => [b.slug, b]))
        novasSlugs.forEach((s, i) => {
          const b = porSlug.get(s)
          if (b) setTimeout(() => toast.success(`🏅 Nova conquista: ${b.nome}`, { description: b.descricao }), i * 600)
        })
      }
      setLoading(false)
    }
    run()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo])

  return { loading, catalogo, ganhas, metrics, novas }
}
