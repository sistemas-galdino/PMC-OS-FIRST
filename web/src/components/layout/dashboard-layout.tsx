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
        <SidebarInset className="bg-background/20 backdrop-blur-3xl relative">
          <div className="absolute top-4 left-4 z-50">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors shadow-lg bg-background/20 backdrop-blur-md border border-border/50" />
          </div>
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

