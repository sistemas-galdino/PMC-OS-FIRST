import { Link } from "react-router-dom"

import { PageHeader, Badge, FaseBadge, EmptyState } from "@/components/guardiao/ui-kit"
import { useStore } from "@/lib/guardiao"
import { MessageSquare, ArrowRight } from "lucide-react"

export default function Feedbacks() {
  const feedbacks = useStore((s) => s.feedbacks ?? [])
  const setores = useStore((s) => s.setores)

  const sorted = [...feedbacks].sort((a, b) =>
    (b.atualizadoEm ?? b.criadoEm).localeCompare(a.atualizadoEm ?? a.criadoEm)
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedbacks para Líderes"
        subtitle="Histórico das interações enviadas pelo Guardião aos líderes de setor."
      />

      {sorted.length === 0 ? (
        <EmptyState title="Nenhum feedback registrado" hint="Cadastre o primeiro feedback dentro da página do setor." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {sorted.map((f) => {
            const setor = setores.find((s) => s.id === f.setorId)
            return (
              <div key={f.id} className="rounded-lg border bg-card p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold truncate">{f.titulo}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {setor?.nome ?? "—"} · Líder {f.liderDestinatario || "—"}
                    </div>
                  </div>
                  <FaseBadge fase={f.fase} />
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{f.descricao}</p>

                {f.proximaAcao && (
                  <div className="text-[11px] p-2 rounded bg-primary/10 border border-primary/20">
                    <span className="text-primary">Próxima ação: </span>{f.proximaAcao}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={f.status === "Concluído" ? "ok" : f.status === "Travado" ? "warn" : "neon"}>{f.status}</Badge>
                    {f.prazo && <Badge>Prazo {f.prazo}</Badge>}
                    <Badge tone={f.prioridade === "Alta" ? "warn" : "default"}>{f.prioridade}</Badge>
                  </div>
                  {setor && (
                    <Link to={`/guardiao/setores/${setor.id}`} className="text-primary inline-flex items-center gap-1">
                      Abrir setor <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
