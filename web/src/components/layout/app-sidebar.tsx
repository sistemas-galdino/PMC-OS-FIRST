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
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon as LayoutDashboard,
  UsersIcon as Users,
  CalendarIcon as Calendar,
  ClockIcon as Clock,
  SettingsIcon as Settings,
  MessageSquareIcon as MessageSquare,
  LogOutIcon as LogOut,
  ChevronRightIcon as ChevronRight,
  TrendingUpIcon as TrendingUp,
  Share2Icon as Share2,
  CheckSquareIcon as CheckSquare,
  BookOpenIcon as BookOpen,
  TrophyIcon as Trophy,
  MapIcon as MapTrilha,
  ShieldCheckIcon as ShieldCheck,
} from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

interface AppSidebarProps {
  isAdmin?: boolean
}

export function AppSidebar({ isAdmin = false }: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const adminItems = [
    { title: "Dashboard Principal", icon: LayoutDashboard, url: "/" },
    { title: "Clientes", icon: Users, url: "/clientes" },
    { title: "Acessos", icon: ShieldCheck, url: "/acessos" },
    { title: "Pendentes Onboarding", icon: Clock, url: "/onboarding" },
    { title: "Consultores", icon: MessageSquare, url: "/mentores" },
    { title: "Reunioes Galdino", icon: Calendar, url: "/reunioes-galdino" },
    { title: "Reunioes Black CRM", icon: Settings, url: "/reunioes-blackcrm" },
    { title: "Links Importantes", icon: BookOpen, url: "/recursos" },
    { title: "Calendário Encontros", icon: Calendar, url: "/calendario" },
    { title: "Configurações", icon: Settings, url: "/configuracoes" },
  ]

  const clientItems = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/" },
    { title: "Mapeamento", icon: Share2, url: "/mapeamento" },
    { title: "Reuniões Consultores", icon: Calendar, url: "/reunioes" },
    { title: "Reuniões Galdino", icon: Calendar, url: "/reunioes-galdino" },
    { title: "Reuniões BlackCRM", icon: Calendar, url: "/reunioes-blackcrm" },
    { title: "Ações", icon: CheckSquare, url: "/acoes" },
    { title: "Trilhas", icon: MapTrilha, url: "/trilhas" },
    { title: "Central de Vitórias", icon: Trophy, url: "/vitorias" },
    { title: "Meu Time", icon: Users, url: "/meu-time" },
    { title: "Links Importantes", icon: BookOpen, url: "/recursos" },
    { title: "Calendário Encontros", icon: Calendar, url: "/calendario" },
  ]

  const items = isAdmin ? adminItems : clientItems

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r border-border bg-sidebar/40 text-sidebar-foreground backdrop-blur-xl">
      <SidebarHeader className="p-6 border-b border-border bg-sidebar/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            <TrendingUp className="size-5" />
          </motion.div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-bold tracking-tight text-lg text-foreground">PMC OS</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.2em]">Black Eagle</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[11px] font-semibold uppercase text-muted-foreground tracking-widest mt-6 px-4">
            {isAdmin ? "Visão Geral" : "Gestão"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="mt-4 space-y-1">
              {items.map((item, index) => (
                <SidebarMenuItem key={item.title}>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
                  >
                    <SidebarMenuButton 
                      tooltip={item.title}
                      isActive={location.pathname === item.url}
                      onClick={() => navigate(item.url)}
                      className={`rounded-lg transition-all duration-300 font-medium h-11 px-4 ${
                        location.pathname === item.url 
                          ? "bg-primary/10 text-primary hover:bg-primary/20" 
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <item.icon className={`size-5 transition-transform duration-300 ${location.pathname === item.url ? "scale-110" : "group-hover:scale-110"}`} />
                      <span className="ml-2">{item.title}</span>
                      {location.pathname === item.url && (
                        <motion.div
                          layoutId="activeTab"
                          className="ml-auto"
                        >
                          <ChevronRight className="size-4" />
                        </motion.div>
                      )}
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border bg-sidebar/20">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip="Configurações"
                  className="rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-300 font-medium h-11 px-4"
                >
                  <Settings className="size-5" />
                  <span>Configurações</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="min-w-[180px]">
                <DropdownMenuItem onClick={() => navigate('/trocar-senha')} className="cursor-pointer font-medium">
                  <ShieldCheck className="size-4" />
                  Trocar senha
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={() => supabase.auth.signOut()}
              className="rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all duration-300 font-medium h-11 px-4"
            >
              <LogOut className="size-5" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
