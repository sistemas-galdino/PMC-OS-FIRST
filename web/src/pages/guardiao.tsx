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
import { PageHeader } from "@/components/layout/page-header"

const VALID_TABS = new Set(['visao-geral', 'convites', 'resultados', 'ranking'])

interface Props {
  session?: Session
  clientId?: string
  adminView?: boolean
  hideTabList?: boolean
}

export default function GuardiaoPage({ session, clientId, adminView, hideTabList }: Props) {
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
      <PageHeader
        title="Guardião"
        description="Avaliação e contratação do Guardião de IA da sua empresa"
      />

      <Tabs value={tab} onValueChange={onTabChange} className="w-full">
        {!hideTabList && (
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
        )}

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
