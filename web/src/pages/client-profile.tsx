import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon as ArrowLeft } from "@/components/ui/icons"
import ClientDashboard from "@/pages/client-dashboard"
import ProdutosView from "@/components/mapeamento/produtos-view"
import CanaisView from "@/components/mapeamento/canais-view"
import CenariosTab from "@/components/mapeamento/cenarios-tab"
import ObjetivosTab from "@/components/mapeamento/objetivos-tab"
import AcoesPage from "@/pages/acoes"
import ClientReunioesPage from "@/pages/client-reunioes"
import ReunioesGaldinoPage from "@/pages/reunioes-galdino"
import ReunioesBlackCRMPage from "@/pages/reunioes-blackcrm"
import RecursosPage from "@/pages/recursos"
import CalendarioEncontrosPage from "@/pages/calendario-encontros"
import VitoriasPage from "@/pages/vitorias"
import TrilhasPage from "@/pages/trilhas"

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "cenarios", label: "Cenários" },
  { key: "produtos", label: "Produtos" },
  { key: "canais", label: "Canais" },
  { key: "objetivos", label: "Objetivos" },
  { key: "reunioes", label: "Reuniões Consultores" },
  { key: "reunioes-galdino", label: "Reuniões Galdino" },
  { key: "reunioes-blackcrm", label: "Reuniões BlackCRM" },
  { key: "acoes", label: "Ações" },
  { key: "vitorias", label: "Vitórias" },
  { key: "trilhas", label: "Trilha" },
  { key: "recursos", label: "Links Importantes" },
  { key: "calendario", label: "Calendário" },
] as const

type TabKey = typeof TABS[number]["key"]

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard")

  if (!id) return null

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-xl"
          onClick={() => navigate("/clientes")}
        >
          <ArrowLeft className="size-4" />
          <span className="font-bold text-xs uppercase tracking-wider">Voltar</span>
        </Button>

        <div className="flex gap-2 ml-4">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              className="h-9 px-5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" && <ClientDashboard clientId={id} />}
      {activeTab === "cenarios" && <CenariosTab clientId={id} />}
      {activeTab === "produtos" && <ProdutosView clientId={id} />}
      {activeTab === "canais" && <CanaisView clientId={id} />}
      {activeTab === "objetivos" && <ObjetivosTab clientId={id} />}
      {activeTab === "reunioes" && <ClientReunioesPage clientId={id} />}
      {activeTab === "reunioes-galdino" && <ReunioesGaldinoPage clientId={id} />}
      {activeTab === "reunioes-blackcrm" && <ReunioesBlackCRMPage clientId={id} />}
      {activeTab === "acoes" && <AcoesPage clientId={id} />}
      {activeTab === "vitorias" && <VitoriasPage clientId={id} />}
      {activeTab === "trilhas" && <TrilhasPage clientId={id} embedded />}
      {activeTab === "recursos" && <RecursosPage forceAdmin />}
      {activeTab === "calendario" && <CalendarioEncontrosPage />}
    </div>
  )
}
