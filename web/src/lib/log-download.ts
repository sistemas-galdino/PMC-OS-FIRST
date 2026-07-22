// Registro de download — chamado no clique de qualquer botão/link de baixar.
// Fire-and-forget: nunca bloqueia nem atrapalha o download em si.
import { supabase } from "@/lib/supabase"

export type TipoDownload = "skill" | "multiplicador" | "gravacao" | "estudo_caso" | "arquivo" | "outro"

export function logarDownload(tipo: TipoDownload, recursoId?: string | null, recursoNome?: string | null, url?: string | null): void {
  supabase
    .rpc("registrar_download", {
      p_tipo: tipo,
      p_recurso_id: recursoId ?? null,
      p_recurso_nome: recursoNome ?? null,
      p_url: url ?? null,
    })
    .then(({ error }) => { if (error) console.warn("log download falhou:", error.message) })
}
