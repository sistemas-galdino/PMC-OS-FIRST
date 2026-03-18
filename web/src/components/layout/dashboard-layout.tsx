import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { supabase } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface DashboardLayoutProps {
  children: React.ReactNode
  session: Session
}

export function DashboardLayout({ children, session }: DashboardLayoutProps) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      if (session?.user?.email) {
        const { data } = await supabase
          .from('mentores')
          .select('id')
          .eq('email', session.user.email)
          .maybeSingle()
        
        setIsAdmin(!!data)
      }
    }

    checkAdmin()
  }, [session.user.email])

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar isAdmin={isAdmin} />
        <SidebarInset className="bg-background/20 backdrop-blur-3xl">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-background/40 backdrop-blur-md sticky top-0 z-10">
            <SidebarTrigger className="-ml-1 text-primary hover:bg-primary/10 transition-colors" />
            <div className="h-4 w-px bg-border mx-4" />
            <div className="flex-1">
              <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                {isAdmin ? "Portal Administrativo" : "Portal do Cliente"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[12px] font-bold text-foreground">{session.user.email?.split('@')[0]}</span>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider">{isAdmin ? "Admin" : "Cliente"}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div 
                key={window.location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="p-6 lg:p-10"
              >
                <div className="mx-auto max-w-7xl">
                  {children}
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

