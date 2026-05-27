import { useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { TrendingUp, FileText, MapPin } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SocialSellingFunil } from "@/components/funis/social-selling"
import { AplicacaoFunil } from "@/components/funis/aplicacao"
import { EventosFunil } from "@/components/funis/eventos"

type TabKey = "social-selling" | "aplicacao" | "eventos"

const TABS: { key: TabKey; label: string; icon: typeof TrendingUp }[] = [
  { key: "social-selling", label: "Social Selling", icon: TrendingUp },
  { key: "aplicacao", label: "Funil de Aplicação", icon: FileText },
  { key: "eventos", label: "Funil de Eventos", icon: MapPin },
]

export default function FunisPage() {
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get("tab") as TabKey | null) ?? "social-selling"

  function setTab(k: TabKey) {
    const next = new URLSearchParams(sp)
    next.set("tab", k)
    setSp(next, { replace: true })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1.5">PMC OS</div>
        <h1 className="text-4xl font-bold tracking-tight">Funis</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Acompanhe Social Selling, Aplicação e Eventos em um só lugar. Métricas, conversões e gráficos atualizados em tempo real.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="w-full flex-wrap h-auto p-1">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <TabsTrigger key={t.key} value={t.key} className="flex-1 min-w-[160px]">
                <Icon className="size-4" />
                {t.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="social-selling" className="mt-6">
          <SocialSellingFunil />
        </TabsContent>

        <TabsContent value="aplicacao" className="mt-6">
          <AplicacaoFunil />
        </TabsContent>

        <TabsContent value="eventos" className="mt-6">
          <EventosFunil />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
