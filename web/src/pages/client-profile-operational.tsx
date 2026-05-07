import { useState } from "react"
import { Button } from "@/components/ui/button"
import ClientDashboard from "@/pages/client-dashboard"
import MapeamentoPage from "@/pages/mapeamento"
import IndicadoresPage from "@/pages/indicadores"
import AcoesPage from "@/pages/acoes"
import ClientReunioesPage from "@/pages/client-reunioes"
import ReunioesGaldinoPage from "@/pages/reunioes-galdino"
import ReunioesBlackCRMPage from "@/pages/reunioes-blackcrm"
import RecursosPage from "@/pages/recursos"
import CalendarioEncontrosPage from "@/pages/calendario-encontros"
import VitoriasPage from "@/pages/vitorias"
import TrilhasPage from "@/pages/trilhas"
import MeuTimePage from "@/pages/meu-time"
import FerramentasPage from "@/pages/ferramentas"
import InformacoesEmpresaPage from "@/pages/informacoes-empresa"

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "informacoes-empresa", label: "Informações da Empresa" },
  { key: "mapeamento", label: "Mapeamento" },
  { key: "indicadores", label: "Indicadores" },
  { key: "reunioes", label: "Reuniões Consultores" },
  { key: "reunioes-galdino", label: "Reuniões Galdino" },
  { key: "reunioes-blackcrm", label: "Reuniões BlackCRM" },
  { key: "acoes", label: "Ações" },
  { key: "vitorias", label: "Vitórias" },
  { key: "trilhas", label: "Trilha" },
  { key: "meu-time", label: "Meu Time" },
  { key: "recursos", label: "Links Importantes" },
  { key: "ferramentas", label: "Ferramentas IA" },
  { key: "calendario", label: "Calendário" },
] as const

type TabKey = typeof TABS[number]["key"]

export default function ClientProfileOperational({ clientId }: { clientId: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard")

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            size="sm"
            className="h-9 px-4 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "dashboard" && <ClientDashboard clientId={clientId} />}
      {activeTab === "informacoes-empresa" && <InformacoesEmpresaPage clientId={clientId} />}
      {activeTab === "mapeamento" && <MapeamentoPage clientId={clientId} />}
      {activeTab === "indicadores" && <IndicadoresPage clientId={clientId} />}
      {activeTab === "reunioes" && <ClientReunioesPage clientId={clientId} />}
      {activeTab === "reunioes-galdino" && <ReunioesGaldinoPage clientId={clientId} />}
      {activeTab === "reunioes-blackcrm" && <ReunioesBlackCRMPage clientId={clientId} />}
      {activeTab === "acoes" && <AcoesPage clientId={clientId} />}
      {activeTab === "vitorias" && <VitoriasPage clientId={clientId} />}
      {activeTab === "trilhas" && <TrilhasPage clientId={clientId} embedded />}
      {activeTab === "meu-time" && <MeuTimePage clientId={clientId} />}
      {activeTab === "recursos" && <RecursosPage forceAdmin />}
      {activeTab === "ferramentas" && <FerramentasPage forceAdmin />}
      {activeTab === "calendario" && <CalendarioEncontrosPage />}
    </div>
  )
}
