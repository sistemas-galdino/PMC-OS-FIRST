// Aba Candidatos — funde as antigas "Resultados" (lista analítica) e
// "Ranking" (kanban do funil) numa tela só, com toggle Lista ↔ Funil.
import { useState } from "react"
import {
  ListIcon as List,
  LayoutKanbanIcon as LayoutGrid,
} from "@/components/ui/icons"
import { Resultados } from "./resultados"
import { Ranking } from "./ranking"
import type { Session } from "@supabase/supabase-js"

type Vista = "lista" | "funil"

interface Props {
  clientId?: string
  adminView?: boolean
  session?: Session
  vistaInicial?: Vista
}

export function Candidatos({ clientId, adminView, session, vistaInicial = "lista" }: Props) {
  const [vista, setVista] = useState<Vista>(vistaInicial)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm font-medium text-muted-foreground">
          {vista === "lista"
            ? "Compare os candidatos: nota geral, análise por pilar e relatório completo."
            : "Conduza o processo: arraste cada candidato pela etapa do funil."}
        </p>
        <div className="inline-flex rounded-xl border border-border bg-muted/20 p-1">
          <button
            type="button"
            onClick={() => setVista("lista")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              vista === "lista" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="size-3.5" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setVista("funil")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              vista === "funil" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="size-3.5" />
            Funil
          </button>
        </div>
      </div>

      {vista === "lista" ? (
        <Resultados clientId={clientId} adminView={adminView} session={session} />
      ) : (
        <Ranking clientId={clientId} adminView={adminView} />
      )}
    </div>
  )
}
