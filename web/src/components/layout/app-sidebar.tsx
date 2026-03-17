import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Clock, 
  Settings, 
  MessageSquare,
  LogOut,
  ChevronRight,
  TrendingUp,
  Package,
  Megaphone,
  CheckSquare,
  Compass
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useLocation, useNavigate } from "react-router-dom"

interface AppSidebarProps {
  isAdmin?: boolean
}

export function AppSidebar({ isAdmin = false }: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const adminItems = [
    { title: "Dashboard Principal", icon: LayoutDashboard, url: "/" },
    { title: "Clientes", icon: Users, url: "/clientes" },
    { title: "Turmas e Estados", icon: Calendar, url: "/turmas" },
    { title: "Pendentes Onboarding", icon: Clock, url: "/onboarding" },
    { title: "Mentores", icon: MessageSquare, url: "/mentores" },
    { title: "Black CRM", icon: Settings, url: "/crm" },
  ]

  const clientItems = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/" },
    { title: "Time", icon: Users, url: "/time" },
    { title: "Produtos", icon: Package, url: "/produtos" },
    { title: "Canais", icon: Megaphone, url: "/canais" },
    { title: "Ações", icon: CheckSquare, url: "/acoes" },
    { title: "Jornada", icon: Compass, url: "/jornada" },
  ]

  const items = isAdmin ? adminItems : clientItems

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r-2 border-foreground bg-card text-card-foreground">
      <SidebarHeader className="p-4 border-b-2 border-foreground">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center bg-primary text-primary-foreground border-2 border-foreground shadow-brutal-sm">
            <TrendingUp className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-bold tracking-tight text-lg uppercase">PMC OS</span>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Black Eagle</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[11px] font-bold uppercase text-foreground/50 tracking-widest mt-4">
            {isAdmin ? "Visão Geral" : "Gestão"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="mt-2 space-y-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    tooltip={item.title}
                    isActive={location.pathname === item.url}
                    onClick={() => navigate(item.url)}
                    className={`rounded-none border-2 transition-all font-bold uppercase text-[12px] h-10 ${
                      location.pathname === item.url 
                        ? "border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_var(--color-foreground)] translate-y-[-1px] translate-x-[-1px]" 
                        : "border-transparent hover:border-foreground hover:bg-card hover:shadow-[2px_2px_0px_0px_var(--color-foreground)] hover:translate-y-[-1px] hover:translate-x-[-1px]"
                    }`}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                    {location.pathname === item.url && (
                      <ChevronRight className="ml-auto size-4" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t-2 border-foreground">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => supabase.auth.signOut()}
              className="rounded-none border-2 border-transparent hover:border-destructive hover:bg-destructive hover:text-destructive-foreground hover:shadow-[2px_2px_0px_0px_var(--color-destructive)] transition-all font-bold uppercase h-10"
            >
              <LogOut className="size-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
