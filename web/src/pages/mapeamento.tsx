import { useSearchParams } from "react-router-dom"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import CenariosTab from "@/components/mapeamento/cenarios-tab"
import ObjetivosTab from "@/components/mapeamento/objetivos-tab"
import ProdutosView from "@/components/mapeamento/produtos-view"
import CanaisView from "@/components/mapeamento/canais-view"
import {
  TargetIcon as Target,
  PackageIcon as Package,
  MegaphoneIcon as Megaphone,
  FlagIcon as Flag,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { PageHeader } from "@/components/layout/page-header"

const VALID_TABS = new Set(['cenarios', 'produtos', 'canais', 'objetivos'])

interface Props {
  session?: Session
  clientId?: string
}

export default function MapeamentoPage({ session, clientId }: Props) {
  const [sp, setSp] = useSearchParams()
  const raw = sp.get('tab') || 'cenarios'
  const tab = VALID_TABS.has(raw) ? raw : 'cenarios'

  function onTabChange(v: string) {
    const next = new URLSearchParams(sp)
    next.set('tab', v)
    setSp(next, { replace: true })
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Mapeamento Empresarial"
        description="Cenários, produtos e canais de aquisição"
      />

      <Tabs value={tab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cenarios">
            <Target className="size-4" />
            <span>Cenários</span>
          </TabsTrigger>
          <TabsTrigger value="produtos">
            <Package className="size-4" />
            <span>Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="canais">
            <Megaphone className="size-4" />
            <span>Canais</span>
          </TabsTrigger>
          <TabsTrigger value="objetivos">
            <Flag className="size-4" />
            <span>Objetivos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cenarios" className="mt-8">
          <CenariosTab session={session} clientId={clientId} />
        </TabsContent>
        <TabsContent value="produtos" className="mt-8">
          <ProdutosView session={session} clientId={clientId} />
        </TabsContent>
        <TabsContent value="canais" className="mt-8">
          <CanaisView session={session} clientId={clientId} />
        </TabsContent>
        <TabsContent value="objetivos" className="mt-8">
          <ObjetivosTab session={session} clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
