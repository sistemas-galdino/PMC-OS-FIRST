import { useSearchParams } from "react-router-dom"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExecutiveSummaryHeader } from "@/components/client-profile/executive-summary-header"
import TabPerfil from "@/components/client-profile/admin-tabs/tab-perfil"
import TabPrograma from "@/components/client-profile/admin-tabs/tab-programa"
import TabBlackCRM from "@/components/client-profile/admin-tabs/tab-black-crm"
import TabCicloGaldino from "@/components/client-profile/admin-tabs/tab-ciclo-galdino"
import TabConsultores from "@/components/client-profile/admin-tabs/tab-consultores"
import TabAtividades from "@/components/client-profile/admin-tabs/tab-atividades"
import TabHistorico from "@/components/client-profile/admin-tabs/tab-historico"
import TabRenovacao from "@/components/client-profile/admin-tabs/tab-renovacao"
import TabVitorias from "@/components/client-profile/admin-tabs/tab-vitorias"
import TabComunicacao from "@/components/client-profile/admin-tabs/tab-comunicacao"
import TabCancelamento from "@/components/client-profile/admin-tabs/tab-cancelamento"

const ADMIN_TABS = [
  { key: "perfil", label: "Perfil", Component: TabPerfil },
  { key: "programa", label: "Programa", Component: TabPrograma },
  { key: "black-crm", label: "Black CRM", Component: TabBlackCRM },
  { key: "ciclo-galdino", label: "Ciclo Galdino", Component: TabCicloGaldino },
  { key: "consultores", label: "Consultores", Component: TabConsultores },
  { key: "atividades", label: "Atividades", Component: TabAtividades },
  { key: "historico", label: "Histórico", Component: TabHistorico },
  { key: "renovacao", label: "Renovação", Component: TabRenovacao },
  { key: "vitorias", label: "Vitórias", Component: TabVitorias },
  { key: "comunicacao", label: "Comunicação", Component: TabComunicacao },
  { key: "cancelamento", label: "Cancelamento", Component: TabCancelamento },
] as const

const VALID_KEYS = new Set(ADMIN_TABS.map((t) => t.key))
const DEFAULT_KEY = "programa"

export default function ClientProfileAdmin({ clientId }: { clientId: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawAba = searchParams.get("aba")
  const activeTab = rawAba && VALID_KEYS.has(rawAba as any) ? rawAba : DEFAULT_KEY

  const handleChange = (next: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set("aba", next)
    setSearchParams(newParams, { replace: true })
  }

  return (
    <div className="space-y-6">
      <ExecutiveSummaryHeader clientId={clientId} />

      <Tabs value={activeTab} onValueChange={handleChange} className="gap-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="h-11 w-fit min-w-full justify-start gap-1">
            {ADMIN_TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="flex-none px-4 text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {ADMIN_TABS.map(({ key, Component }) => (
          <TabsContent key={key} value={key} className="mt-0">
            <Component clientId={clientId} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
