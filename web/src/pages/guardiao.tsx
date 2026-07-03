import { useSearchParams } from "react-router-dom"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  ShieldCheckIcon as ShieldCheck,
  SendIcon as Send,
  BarChart3Icon as BarChart3,
  TrophyIcon as Trophy,
} from "@/components/ui/icons"
import VisaoGeral from "@/components/guardiao/visao-geral"
import Convites from "@/components/guardiao/convites"
import { Resultados } from "@/components/guardiao/resultados"
import { Ranking } from "@/components/guardiao/ranking"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"

const VALID_TABS = new Set(['visao-geral', 'convites', 'resultados', 'ranking'])

interface Props {
  session?: Session
  clientId?: string
  adminView?: boolean
}

export default function GuardiaoPage({ session, clientId, adminView }: Props) {
  const [sp, setSp] = useSearchParams()
  const raw = sp.get('tab') || 'visao-geral'
  const tab = VALID_TABS.has(raw) ? raw : 'visao-geral'

  const resolvedClientId = clientId || session?.user?.id

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
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Guardião</h1>
        <p className="text-muted-foreground font-medium text-sm mt-2">
          Avaliação e contratação do Guardião de IA da sua empresa
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visao-geral">
            <ShieldCheck className="size-4" />
            <span>Visão geral</span>
          </TabsTrigger>
          <TabsTrigger value="convites">
            <Send className="size-4" />
            <span>Convites</span>
          </TabsTrigger>
          <TabsTrigger value="resultados">
            <BarChart3 className="size-4" />
            <span>Resultados</span>
          </TabsTrigger>
          <TabsTrigger value="ranking">
            <Trophy className="size-4" />
            <span>Ranking</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-8">
          <VisaoGeral />
        </TabsContent>
        <TabsContent value="convites" className="mt-8">
          <Convites clientId={resolvedClientId} adminView={adminView} />
        </TabsContent>
        <TabsContent value="resultados" className="mt-8">
          <Resultados clientId={resolvedClientId} adminView={adminView} session={session} />
        </TabsContent>
        <TabsContent value="ranking" className="mt-8">
          <Ranking clientId={resolvedClientId} adminView={adminView} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
