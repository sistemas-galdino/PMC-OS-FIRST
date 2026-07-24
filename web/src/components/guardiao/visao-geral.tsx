// Visão geral do Guardião — o guia didático (conceito, 4 passos, 5 pilares e
// perfil ideal) vem do componente reutilizável GuiaGuardiao, com o bloco dinâmico
// "Seu processo agora" (números reais + próxima ação) injetado após os 4 passos.
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronRightIcon as ChevronRight } from "@/components/ui/icons"
import { listarResultados, type InviteWithResult } from "@/lib/guardiao/api"
import { GuiaGuardiao } from "./guia-guardiao"

export default function VisaoGeral({ clientId }: { clientId?: string }) {
  const [, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<InviteWithResult[]>([])
  const [carregou, setCarregou] = useState(false)

  useEffect(() => {
    let cancelled = false
    listarResultados(clientId)
      .then((r) => { if (!cancelled) setRows(r) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCarregou(true) })
    return () => { cancelled = true }
  }, [clientId])

  function goTo(tab: string) {
    setSearchParams((p) => { p.set("tab", tab); return p }, { replace: true })
  }

  // Números do processo + próxima ação sugerida (muda conforme o estado real).
  const status = useMemo(() => {
    const convites = rows.length
    const responderam = rows.filter((r) => r.result != null).length
    const aprovados = rows.filter((r) => Number(r.result?.score_pct ?? 0) >= 70).length
    const contratado = rows.some((r) => (r as any).stage === "contratado_guardiao")
    let proximo: { texto: string; tab: string }
    if (contratado) {
      proximo = { texto: "Guardião contratado! Acompanhe a evolução dele nas fases do Método.", tab: "candidatos" }
    } else if (convites === 0) {
      proximo = { texto: "Comece agora: gere o primeiro convite e envie para quem você enxerga potencial.", tab: "convites" }
    } else if (responderam === 0) {
      proximo = { texto: "Convites enviados — aguardando respostas. Reforce com as pessoas ou convide mais gente.", tab: "convites" }
    } else if (aprovados === 0) {
      proximo = { texto: "Ninguém atingiu 70% ainda. Veja as notas por pilar e convide novos candidatos.", tab: "candidatos" }
    } else {
      proximo = {
        texto: `Você tem ${aprovados} aprovado${aprovados > 1 ? "s" : ""} — mova para o envio de case ou agende a entrevista.`,
        tab: "candidatos",
      }
    }
    return { convites, responderam, aprovados, proximo }
  }, [rows])

  const processoAgora = carregou ? (
    <Card className="border-primary/30">
      <CardContent className="p-5 lg:p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Seu processo agora</p>
        <div className="flex items-center gap-6 lg:gap-10 flex-wrap">
          <div>
            <p className="text-3xl font-bold tabular-nums text-foreground">{status.convites}</p>
            <p className="text-[12px] font-medium text-muted-foreground">convite{status.convites === 1 ? "" : "s"}</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums text-foreground">{status.responderam}</p>
            <p className="text-[12px] font-medium text-muted-foreground">responderam</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums text-primary">{status.aprovados}</p>
            <p className="text-[12px] font-medium text-muted-foreground">aprovados ≥ 70%</p>
          </div>
          <button type="button" onClick={() => goTo(status.proximo.tab)} className="flex-1 min-w-56 text-left group">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Próximo passo</p>
            <p className="text-[13px] font-bold text-foreground leading-snug mt-0.5 group-hover:text-primary transition-colors">
              {status.proximo.texto} <ChevronRight className="inline size-3.5 text-primary" />
            </p>
          </button>
        </div>
      </CardContent>
    </Card>
  ) : null

  return <GuiaGuardiao onIr={goTo} slotAposPassos={processoAgora} />
}
