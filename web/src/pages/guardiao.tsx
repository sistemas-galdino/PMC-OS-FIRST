import { useSearchParams } from "react-router-dom"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  ShieldCheckIcon as ShieldCheck,
  SendIcon as Send,
  UsersIcon as Users,
} from "@/components/ui/icons"
import VisaoGeral from "@/components/guardiao/visao-geral"
import Convites from "@/components/guardiao/convites"
import { Candidatos } from "@/components/guardiao/candidatos"
import type { Session } from "@supabase/supabase-js"
import { PageHeader } from "@/components/layout/page-header"

const VALID_TABS = new Set(['visao-geral', 'convites', 'candidatos'])
// Links antigos (tab=resultados / tab=ranking) caem em Candidatos,
// abrindo na vista equivalente (lista / funil).
const LEGADO: Record<string, string> = { resultados: 'candidatos', ranking: 'candidatos' }

interface Props {
  session?: Session
  clientId?: string
  adminView?: boolean
  hideTabList?: boolean
}

export default function GuardiaoPage({ session, clientId, adminView, hideTabList }: Props) {
  const [sp, setSp] = useSearchParams()
  const raw = sp.get('tab') || 'visao-geral'
  const mapped = LEGADO[raw] ?? raw
  const tab = VALID_TABS.has(mapped) ? mapped : 'visao-geral'
  const vistaInicial = raw === 'ranking' ? 'funil' as const : 'lista' as const

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visao-geral">
            <ShieldCheck className="size-4" />
            <span>Visão geral</span>
          </TabsTrigger>
          <TabsTrigger value="convites">
            <Send className="size-4" />
            <span>Convites</span>
          </TabsTrigger>
          <TabsTrigger value="candidatos">
            <Users className="size-4" />
            <span>Candidatos</span>
          </TabsTrigger>
        </TabsList>
        )}

        <TabsContent value="visao-geral" className="mt-8">
          <VisaoGeral clientId={resolvedClientId} />
        </TabsContent>
        <TabsContent value="convites" className="mt-8">
          <Convites clientId={resolvedClientId} adminView={adminView} />
        </TabsContent>
        <TabsContent value="candidatos" className="mt-8">
          <Candidatos clientId={resolvedClientId} adminView={adminView} session={session} vistaInicial={vistaInicial} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
