import { useNavigate } from "react-router-dom"

import { PageHeader } from "@/components/guardiao/ui-kit"
import { actions, useStore } from "@/lib/guardiao"
import { Button } from "@/components/ui/button"

const BIBLIOTECA: Record<string, string[]> = {
  "Marketing": [
    "Sistema de calendário editorial",
    "Análise de postagens",
    "Relatório de performance",
    "Gerador de briefing",
    "Dashboard de leads",
    "Automação de criativos",
    "Sistema de acompanhamento de campanhas",
  ],
  "Financeiro": [
    "Relatório automático de entradas e saídas",
    "Controle de inadimplência",
    "Dashboard de DRE",
    "Análise de despesas",
    "Conciliação simples",
    "Alerta de custos fora do padrão",
  ],
  "Comercial": [
    "Dashboard de propostas",
    "Análise de conversão",
    "Follow-up automático",
    "Resumo de reuniões",
    "Controle de objeções",
    "Priorização de leads",
  ],
  "CEO / Diretoria": [
    "Painel executivo",
    "Relatório semanal por setor",
    "Central de indicadores",
    "Mapa de gargalos",
    "Acompanhamento de projetos de IA",
    "Análise de decisões estratégicas",
  ],
  "Administrativo": [
    "Controle de documentos",
    "Checklist de processos internos",
    "Relatório de pendências",
    "Automação de comunicações internas",
    "Central de solicitações",
  ],
  "Operações": [
    "Controle de tarefas recorrentes",
    "Checklist operacional",
    "Relatório de produtividade",
    "Mapeamento de gargalos",
    "Automação de processos repetitivos",
  ],
  "Compras": [
    "Comparativo de fornecedores",
    "Controle de pedidos",
    "Alerta de preço",
    "Análise de recorrência de compras",
    "Histórico de negociação",
  ],
  "Estoque": [
    "Controle de entrada e saída",
    "Alerta de ruptura",
    "Previsão de necessidade",
    "Dashboard de produtos parados",
    "Relatório de giro de estoque",
  ],
  "CS / Atendimento": [
    "Painel de clientes em acompanhamento",
    "Relatório de atendimentos",
    "Mapeamento de dúvidas recorrentes",
    "Automação de follow-up",
    "Análise de satisfação",
  ],
}

export default function Biblioteca() {
  const setores = useStore((s) => s.setores)
  const navigate = useNavigate()

  const usar = (setorNome: string, solucao: string) => {
    const setor = setores.find((s) => s.nome === setorNome)
    actions.addProjeto({
      nome: solucao, tipoProjeto: "Piloto", setorId: setor?.id ?? "", lider: setor?.lider ?? "",
      guardiao: setor?.guardiao ?? "", gargaloId: undefined,
      problema: `Implementar: ${solucao}`, solucao: solucao,
      tipoEntrega: /dashboard|painel/i.test(solucao) ? "Dashboard"
        : /automaç|automation/i.test(solucao) ? "Automação"
        : /relatório/i.test(solucao) ? "Relatório" : "Sistema",
      meta: "", prazo: "", status: "Ideia",
      resultadoEsperado: "", resultadoAlcancado: "",
      horasEconomizadas: 0, evidencias: "", observacoes: `Origem: Biblioteca de Soluções — ${setorNome}`,
      precisaApoio: false, tipoApoio: "", consultor: "",
    })
    navigate("/guardiao/projetos")
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Biblioteca de Soluções" subtitle="Soluções prontas por setor. Use como ponto de partida." />

      <div className="grid lg:grid-cols-2 gap-6">
        {Object.entries(BIBLIOTECA).map(([setor, lista]) => (
          <div key={setor} className="rounded-lg border bg-card p-5">
            <h3 className="text-lg font-semibold mb-1">{setor}</h3>
            <p className="text-xs text-muted-foreground mb-4">{lista.length} soluções sugeridas</p>
            <div className="space-y-2">
              {lista.map((sol) => (
                <div key={sol} className="flex items-center justify-between gap-3 p-3 bg-muted rounded-md">
                  <span className="text-sm">{sol}</span>
                  <Button size="xs" className="whitespace-nowrap shrink-0" onClick={() => usar(setor, sol)}>
                    Usar como projeto piloto
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
