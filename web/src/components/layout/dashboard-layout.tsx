import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { supabase } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useEffect, useState } from "react"

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
        <SidebarInset className="bg-background">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b-2 border-foreground px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-card">
            <SidebarTrigger className="-ml-1 text-primary hover:bg-primary/20" />
            <div className="h-4 w-[2px] bg-foreground mx-2" />
            <div className="flex-1">
              <span className="text-[13px] font-bold text-foreground uppercase tracking-widest">
                {isAdmin ? "Portal Administrativo" : "Portal do Cliente"}
              </span>
            </div>
          </header>
          <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-background">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
