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
  MessageCircleIcon as MessageCircle,
  LogOutIcon as LogOut,
  ChevronRightIcon as ChevronRight,
  ChevronDownIcon as ChevronDown,
  Share2Icon as Share2,
  CheckSquareIcon as CheckSquare,
  BookOpenIcon as BookOpen,
  TrophyIcon as Trophy,
  MapIcon as MapTrilha,
  ShieldCheckIcon as ShieldCheck,
  Sparkles2Icon as Sparkles,
  Building2Icon as Building,
  BarChart3Icon as BarChart3,
  CompassIcon as Compass,
  FileTextIcon as FileText,
  TargetIcon as Target,
} from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useClienteMoeda } from "@/hooks/use-cliente-moeda"
import { DollarSignIcon } from "@/components/ui/icons"
import type { ComponentType, SVGProps } from "react"

interface AppSidebarProps {
  isAdmin?: boolean
}

type NavItem = { title: string; icon: ComponentType<SVGProps<SVGSVGElement>>; url: string }
type NavGroup = { label: string; items: NavItem[] }

export function AppSidebar({ isAdmin = false }: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const moedaAtual = useClienteMoeda()

  // Estamos dentro do Sistema Operacional do Guardião?
  const isGuardiao = location.pathname.startsWith("/guardiao")

  async function trocarMoeda(nova: string) {
    if (nova !== "BRL" && nova !== "USD") return
    const { error } = await supabase.rpc("update_minha_moeda", { nova_moeda: nova })
    if (error) {
      console.error("Erro ao trocar moeda:", error)
      return
    }
    const { data } = await supabase.auth.getSession()
    const id = data.session?.user?.id
    if (id) {
      window.dispatchEvent(
        new CustomEvent("cliente:moeda", { detail: { id, moeda: nova } })
      )
    }
  }

  const adminItems: NavItem[] = [
    { title: "Dashboard Principal", icon: LayoutDashboard, url: "/" },
    { title: "Agente", icon: MessageCircle, url: "/agente" },
    { title: "Clientes", icon: Users, url: "/clientes" },
    { title: "CRM", icon: Target, url: "/crm" },
    { title: "Acessos", icon: ShieldCheck, url: "/acessos" },
    { title: "Roadmap de Sistemas", icon: Compass, url: "/roadmap-sistemas" },
    { title: "Central de Atendimentos", icon: MessageSquare, url: "/central-atendimentos" },
    { title: "Funis", icon: BarChart3, url: "/funis" },
    { title: "Pendentes Onboarding", icon: Clock, url: "/onboarding" },
    { title: "Respostas de Onboarding", icon: FileText, url: "/respostas-onboarding" },
    { title: "Consultores", icon: MessageSquare, url: "/mentores" },
    { title: "Reunioes Galdino", icon: Calendar, url: "/reunioes-galdino" },
    { title: "Reunioes Black CRM", icon: Settings, url: "/reunioes-blackcrm" },
    { title: "Links Importantes", icon: BookOpen, url: "/recursos" },
    { title: "Ferramentas IA", icon: Sparkles, url: "/ferramentas" },
    { title: "Calendário Encontros", icon: Calendar, url: "/calendario" },
    { title: "Configurações", icon: Settings, url: "/configuracoes" },
  ]

  const clientItems: NavItem[] = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/" },
    { title: "Informações da Empresa", icon: Building, url: "/informacoes-empresa" },
    { title: "Mapeamento", icon: Share2, url: "/mapeamento" },
    { title: "Indicadores", icon: BarChart3, url: "/indicadores" },
    { title: "Reuniões Consultores", icon: Calendar, url: "/reunioes" },
    { title: "Reuniões Galdino", icon: Calendar, url: "/reunioes-galdino" },
    { title: "Reuniões BlackCRM", icon: Calendar, url: "/reunioes-blackcrm" },
    { title: "Ações", icon: CheckSquare, url: "/acoes" },
    { title: "Trilhas", icon: MapTrilha, url: "/trilhas" },
    { title: "Central de Vitórias", icon: Trophy, url: "/vitorias" },
    { title: "Meu Time", icon: Users, url: "/meu-time" },
    { title: "Links Importantes", icon: BookOpen, url: "/recursos" },
    { title: "Ferramentas IA", icon: Sparkles, url: "/ferramentas" },
    { title: "Calendário Encontros", icon: Calendar, url: "/calendario" },
  ]

  // Nav do Sistema do Guardião (3 grupos, espelhando o app original).
  const guardiaoGroups: NavGroup[] = [
    {
      label: "Gestão do Guardião",
      items: [
        { title: "Painel de Controle", icon: LayoutDashboard, url: "/guardiao" },
        { title: "Setores / Projetos", icon: Building, url: "/guardiao/setores" },
        { title: "Tarefas", icon: CheckSquare, url: "/guardiao/tarefas" },
        { title: "Central de Vitórias", icon: Trophy, url: "/guardiao/vitorias" },
        { title: "Relatório para CEO", icon: FileText, url: "/guardiao/relatorio" },
      ],
    },
    {
      label: "Metodologia",
      items: [
        { title: "Jornada das 7 Fases", icon: MapTrilha, url: "/guardiao/jornada" },
        { title: "Rotinas e Rituais", icon: Clock, url: "/guardiao/agenda" },
        { title: "Evidências", icon: ShieldCheck, url: "/guardiao/evidencias" },
      ],
    },
    {
      label: "Apoio",
      items: [{ title: "Apoio PMC", icon: Sparkles, url: "/guardiao/apoio" }],
    },
  ]

  const items = isAdmin ? adminItems : clientItems

  // Rota ativa: painel/raiz por match exato; demais consideram sub-rotas (ex.: /guardiao/setores/:id).
  function isActive(url: string) {
    if (url === "/" || url === "/guardiao") return location.pathname === url
    return location.pathname === url || location.pathname.startsWith(url + "/")
  }

  function renderItem(item: NavItem, index: number, active: boolean) {
    return (
      <SidebarMenuItem key={item.title}>
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
        >
          <SidebarMenuButton
            tooltip={item.title}
            isActive={active}
            onClick={() => navigate(item.url)}
            className={`rounded-lg transition-all duration-300 font-medium h-9 px-3 ${
              active
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon className={`size-4 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`} />
            <span className="ml-2">{item.title}</span>
            {active && (
              <motion.div layoutId="activeTab" className="ml-auto">
                <ChevronRight className="size-4" />
              </motion.div>
            )}
          </SidebarMenuButton>
        </motion.div>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r border-border bg-sidebar/40 text-sidebar-foreground backdrop-blur-xl">
      <SidebarHeader className="p-4 border-b border-border bg-sidebar/20 backdrop-blur-sm">
        {!isAdmin ? (
          // Cliente: logo vira seletor de perfil (Painel Geral ↔ Sistema do Guardião).
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="-m-1 flex w-full items-center gap-3 rounded-lg p-1 text-left outline-none transition-colors hover:bg-sidebar-accent/50">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="flex size-9 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-primary/20"
                >
                  <img src="/logo.png" alt="PMC OS" className="size-full object-cover" />
                </motion.div>
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-bold tracking-tight text-lg text-foreground">PMC OS</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${isGuardiao ? "text-primary" : "text-muted-foreground"}`}>
                    {isGuardiao ? "Sistema do Guardião" : "Black Eagle"}
                  </span>
                </div>
                <ChevronDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="min-w-[230px]">
              <DropdownMenuItem
                onClick={() => navigate("/")}
                className={`cursor-pointer font-medium ${!isGuardiao ? "text-primary" : ""}`}
              >
                <LayoutDashboard className="size-4" />
                Painel Geral
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/guardiao")}
                className={`cursor-pointer font-medium ${isGuardiao ? "text-primary" : ""}`}
              >
                <ShieldCheck className="size-4" />
                Sistema do Guardião de IA
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Admin: logo estático (o guardião é acessado via oversight, com ?cliente).
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex size-9 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-primary/20"
            >
              <img src="/logo.png" alt="PMC OS" className="size-full object-cover" />
            </motion.div>
            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
              <span className="font-bold tracking-tight text-lg text-foreground">PMC OS</span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.2em]">Black Eagle</span>
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="px-2">
        {isGuardiao ? (
          guardiaoGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[11px] font-semibold uppercase text-muted-foreground tracking-widest mt-3 px-4">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="mt-2 space-y-0.5">
                  {group.items.map((item, index) => renderItem(item, index, isActive(item.url)))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[11px] font-semibold uppercase text-muted-foreground tracking-widest mt-3 px-4">
              {isAdmin ? "Visão Geral" : "Gestão"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="mt-2 space-y-0.5">
                {items.map((item, index) => renderItem(item, index, location.pathname === item.url))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-border bg-sidebar/20">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip="Configurações"
                  className="rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-300 font-medium h-9 px-3"
                >
                  <Settings className="size-4" />
                  <span>Configurações</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="min-w-[180px]">
                <DropdownMenuItem onClick={() => navigate('/trocar-senha')} className="cursor-pointer font-medium">
                  <ShieldCheck className="size-4" />
                  Trocar senha
                </DropdownMenuItem>
                {!isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer font-medium">
                        <DollarSignIcon className="size-4" />
                        Moeda
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="min-w-[160px]">
                        <DropdownMenuRadioGroup value={moedaAtual} onValueChange={trocarMoeda}>
                          <DropdownMenuRadioItem value="BRL" className="cursor-pointer font-medium">
                            R$ Real (BRL)
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="USD" className="cursor-pointer font-medium">
                            $ Dólar (USD)
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={() => supabase.auth.signOut()}
              className="rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all duration-300 font-medium h-9 px-3"
            >
              <LogOut className="size-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
