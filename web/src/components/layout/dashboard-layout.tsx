import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FloatingAgente } from "@/components/agente/floating-agente"
import { PontosMCSplash } from "@/components/pontos-mc-splash"
import { NotificationBell } from "./notification-bell"
import { CommandPalette, CommandPaletteTrigger } from "./command-palette"
import { SeletorVisaoCs } from "@/components/crm/SeletorVisaoCs"
import { AvisoSemCarteira } from "@/components/crm/AvisoSemCarteira"
import { motion, AnimatePresence } from "framer-motion"
import { useLocation } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"

interface DashboardLayoutProps {
  children: React.ReactNode
  isAdmin: boolean
}

export function DashboardLayout({ children, isAdmin }: DashboardLayoutProps) {
  const location = useLocation()
  const { can } = useAuth()
  // O recorte de carteira é do CRM inteiro, então mora no layout: montado uma
  // vez, vale para Meu Dia, Atividades, Clientes, Alertas, Projetos e Time.
  const noCrm = location.pathname.startsWith("/crm")

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar isAdmin={isAdmin} />
        <SidebarInset className="bg-background/30 relative">
          <div className="absolute top-4 left-4 z-50">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors shadow-lg bg-background/20 backdrop-blur-md border border-border/50" />
          </div>
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            {noCrm && <SeletorVisaoCs />}
            <CommandPaletteTrigger />
            <NotificationBell />
          </div>
          <CommandPalette isAdmin={isAdmin} />
          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="p-6 pt-16 lg:p-10"
              >
                <div className="mx-auto max-w-7xl">
                  {noCrm && <AvisoSemCarteira />}
                  {children}
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
          {can("agente") && <FloatingAgente />}
          {!isAdmin && <PontosMCSplash />}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

