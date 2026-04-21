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
import { motion } from "framer-motion"

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
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="border-l-4 border-primary pl-8 py-2"
      >
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Mapeamento Empresarial</h1>
        <p className="text-muted-foreground font-medium text-sm mt-2">Cenários, produtos e canais de aquisição</p>
      </motion.div>

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
