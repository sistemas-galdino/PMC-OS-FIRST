import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Moeda } from "@/lib/format-currency"

const CACHE = new Map<string, Moeda>()

export function useClienteMoeda(clientId?: string): Moeda {
  const [moeda, setMoeda] = useState<Moeda>("BRL")

  useEffect(() => {
    let cancelled = false

    async function load() {
      let id = clientId
      if (!id) {
        const { data } = await supabase.auth.getSession()
        id = data.session?.user?.id
      }
      if (!id) return

      const cached = CACHE.get(id)
      if (cached) {
        setMoeda(cached)
        return
      }

      const { data } = await supabase
        .from("clientes_entrada_new")
        .select("moeda")
        .eq("id_cliente", id)
        .maybeSingle()

      if (cancelled) return
      const m = (data?.moeda as Moeda) ?? "BRL"
      CACHE.set(id, m)
      setMoeda(m)
    }

    load()

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; moeda: Moeda }
      CACHE.set(detail.id, detail.moeda)
      if (clientId === detail.id || !clientId) setMoeda(detail.moeda)
    }
    window.addEventListener("cliente:moeda", handler)
    return () => {
      cancelled = true
      window.removeEventListener("cliente:moeda", handler)
    }
  }, [clientId])

  return moeda
}
