import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"
import { useLocation } from "react-router-dom"

interface DashboardLayoutProps {
  children: React.ReactNode
  isAdmin: boolean
}

export function DashboardLayout({ children, isAdmin }: DashboardLayoutProps) {
  const location = useLocation()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar isAdmin={isAdmin} />
        <SidebarInset className="bg-background/20 backdrop-blur-3xl relative">
          <div className="absolute top-4 left-4 z-50">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors shadow-lg bg-background/20 backdrop-blur-md border border-border/50" />
          </div>
          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
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

