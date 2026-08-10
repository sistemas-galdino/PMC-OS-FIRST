import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
  MegaphoneIcon as Megaphone,
  VideoIcon as Video,
  PackageIcon as Package,
  TrendingUpIcon as TrendingUp,
  RefreshCwIcon as RefreshCw,
  ZapIcon as Zap,
  AlertTriangleIcon as AlertTriangle,
  LayoutKanbanIcon as LayoutKanban,
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
import { useAuth } from "@/lib/auth-context"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { useClienteMoeda } from "@/hooks/use-cliente-moeda"
import { DollarSignIcon } from "@/components/ui/icons"

interface AppSidebarProps {
  isAdmin?: boolean
}

export function AppSidebar({ isAdmin = false }: AppSidebarProps) {
  const { can } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const currentTab = searchParams.get("tab") || "visao-geral"
  const moedaAtual = useClienteMoeda()

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

  type NavChild = { title: string; icon: any; tab?: string; url?: string }
  type NavItem = { title: string; icon: any; url: string; children?: NavChild[] }
  type NavSection = { label: string | null; items: NavItem[] }

  const adminSections: NavSection[] = [
    {
      label: "Visão Geral",
      items: [
        { title: "Dashboard Principal", icon: LayoutDashboard, url: "/" },
        { title: "Agente", icon: MessageCircle, url: "/agente" },
      ],
    },
    {
      label: "Clientes & CRM",
      items: [
        { title: "Clientes", icon: Users, url: "/clientes" },
        { title: "Radar de Renovação", icon: TrendingUp, url: "/radar-renovacao" },
        { title: "Funis", icon: BarChart3, url: "/funis" },
        { title: "Acessos", icon: ShieldCheck, url: "/acessos" },
      ],
    },
    {
      // CS Manager: o dia a dia do time de Customer Success.
      // As chaves RBAC batem com a url sem a barra ("crm/meu-dia"), ver secaoDaUrl.
      label: "CRM",
      items: [
        { title: "Meu Dia", icon: Zap, url: "/crm/meu-dia" },
        { title: "Atividades", icon: CheckSquare, url: "/crm/atividades" },
        { title: "Clientes", icon: Users, url: "/crm/clientes" },
        { title: "Alertas", icon: AlertTriangle, url: "/crm/alertas" },
        { title: "Atendimento", icon: MessageCircle, url: "/crm/atendimento" },
        { title: "Projetos", icon: LayoutKanban, url: "/crm/projetos" },
        { title: "Visão Geral", icon: BarChart3, url: "/crm/visao-geral" },
        { title: "Torre de Comando", icon: Compass, url: "/crm/time" },
        { title: "Acompanhamento", icon: TrendingUp, url: "/crm/acompanhamento" },
        { title: "Manual de CS", icon: BookOpen, url: "/crm/manual" },
      ],
    },
    {
      label: "Vendas",
      items: [
        { title: "Canais de Vendas", icon: TrendingUp, url: "/canais-vendas" },
      ],
    },
    {
      label: "Onboarding",
      items: [
        { title: "Pendentes Onboarding", icon: Clock, url: "/onboarding" },
        { title: "Respostas de Onboarding", icon: FileText, url: "/respostas-onboarding" },
      ],
    },
    {
      label: "Atendimento",
      items: [
        { title: "Central de Atendimentos", icon: MessageSquare, url: "/central-atendimentos" },
        { title: "Consultores", icon: MessageSquare, url: "/mentores" },
        { title: "Guardião (Clientes)", icon: ShieldCheck, url: "/guardiao-admin" },
      ],
    },
    {
      label: "Reuniões",
      items: [
        { title: "Reunioes Galdino", icon: Calendar, url: "/reunioes-galdino" },
        { title: "Reunioes Black CRM", icon: Calendar, url: "/reunioes-blackcrm" },
        { title: "Encontros ao Vivo", icon: Video, url: "/calendario" },
      ],
    },
    {
      label: "Sistemas",
      items: [
        { title: "Roadmap de Sistemas", icon: Compass, url: "/roadmap-sistemas" },
      ],
    },
    {
      label: "Conteúdo",
      items: [
        { title: "Novidades", icon: Megaphone, url: "/novidades-admin" },
        { title: "Repositório de Vitórias", icon: Trophy, url: "/repositorio-vitorias" },
        { title: "Estudos de Caso", icon: BookOpen, url: "/estudos-caso-admin" },
        { title: "Multiplicadores", icon: Package, url: "/multiplicadores-admin" },
        { title: "Skills", icon: Sparkles, url: "/skills-admin" },
      ],
    },
    {
      label: "Recursos",
      items: [
        { title: "Links Importantes", icon: BookOpen, url: "/recursos" },
        { title: "Ferramentas IA", icon: Sparkles, url: "/ferramentas" },
      ],
    },
    {
      label: "Sistema",
      items: [
        { title: "Mensagens & Alcance", icon: Megaphone, url: "/mensagens" },
        { title: "Registro de Downloads", icon: FileText, url: "/logs-download" },
        { title: "Time & Permissões", icon: ShieldCheck, url: "/time-permissoes" },
        { title: "Configurações", icon: Settings, url: "/configuracoes" },
      ],
    },
  ]

  const clientSections: NavSection[] = [
    {
      label: null,
      items: [{ title: "Minha Jornada", icon: Compass, url: "/inicio" }],
    },
    {
      label: "Meu Negócio",
      items: [
        { title: "Informações da Empresa", icon: Building, url: "/informacoes-empresa" },
        { title: "Mapeamento", icon: Share2, url: "/mapeamento" },
      ],
    },
    {
      label: "Execução",
      items: [
        { title: "Método MC", icon: Target, url: "/metodo" },
        { title: "Ações", icon: CheckSquare, url: "/acoes" },
        { title: "Meu Time", icon: Users, url: "/meu-time" },
      ],
    },
    {
      label: "Guardião de IA",
      items: [
        {
          title: "Guardião",
          icon: ShieldCheck,
          url: "/guardiao",
          children: [
            { title: "Assessment", tab: "visao-geral", icon: Compass },
            { title: "Convites", tab: "convites", icon: Share2 },
            { title: "Candidatos", tab: "candidatos", icon: Users },
          ],
        },
        { title: "Meu Dia", icon: Compass, url: "/meu-dia" },
        { title: "Rotinas e Rituais", icon: RefreshCw, url: "/rotinas" },
        { title: "Tarefas", icon: CheckSquare, url: "/tarefas" },
      ],
    },
    {
      label: "Acompanhamento",
      items: [
        { title: "Balanço PMC", icon: Trophy, url: "/balanco" },
        { title: "Meu Nível", icon: Target, url: "/niveis" },
        { title: "Central de Vitórias", icon: Trophy, url: "/vitorias" },
        {
          title: "Reuniões",
          icon: Calendar,
          url: "/reunioes",
          children: [
            { title: "Consultores", icon: Calendar, url: "/reunioes" },
            { title: "Galdino", icon: Calendar, url: "/reunioes-galdino" },
            { title: "BlackCRM", icon: Calendar, url: "/reunioes-blackcrm" },
          ],
        },
      ],
    },
    {
      label: "Comunidade",
      items: [
        { title: "Novidades", icon: Megaphone, url: "/novidades" },
        { title: "Ranking dos Guardiões", icon: Trophy, url: "/ranking-guardioes" },
      ],
    },
    {
      label: "Conhecimento",
      items: [
        { title: "Trilhas", icon: MapTrilha, url: "/trilhas" },
        { title: "Estudos de Caso", icon: BookOpen, url: "/estudos-caso" },
        { title: "Multiplicadores", icon: Package, url: "/multiplicadores" },
        { title: "Skills", icon: Sparkles, url: "/skills" },
        { title: "Encontros ao Vivo", icon: Video, url: "/calendario" },
      ],
    },
    {
      label: "Recursos",
      items: [
        { title: "Links Importantes", icon: BookOpen, url: "/recursos" },
        { title: "Ferramentas IA", icon: Sparkles, url: "/ferramentas" },
      ],
    },
  ]

  // RBAC: esconde do menu admin as seções que o papel não libera.
  // Mapeia a url do item -> chave em secoes_catalogo (null = sempre visível).
  const secaoDaUrl = (url: string): string | null => {
    if (url === "/") return null
    if (url === "/mentores") return "consultores"
    if (url === "/time-permissoes") return "permissoes"
    return url.replace(/^\//, "")
  }
  const filtrarAdmin = (secs: NavSection[]): NavSection[] =>
    secs
      .map((sec) => ({ ...sec, items: sec.items.filter((it) => { const c = secaoDaUrl(it.url); return c === null || can(c) }) }))
      .filter((sec) => sec.items.length > 0)

  const sections: NavSection[] = isAdmin ? filtrarAdmin(adminSections) : clientSections

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r border-border bg-sidebar/40 text-sidebar-foreground backdrop-blur-xl">
      <SidebarHeader className="p-4 border-b border-border bg-sidebar/20 backdrop-blur-sm">
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
      </SidebarHeader>
      <SidebarContent className="px-2">
        {sections.map((section, sectionIndex) => (
          <SidebarGroup key={section.label ?? `section-${sectionIndex}`}>
            {section.label && (
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[11px] font-semibold uppercase text-muted-foreground tracking-widest mt-3 px-4">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="mt-2 space-y-0.5">
                {section.items.map((item, index) => {
                  const active = location.pathname === item.url
                  const childRouteActive = item.children?.some(
                    (c) => c.url ? location.pathname === c.url : (active && currentTab === c.tab)
                  ) ?? false

                  if (item.children) {
                    return (
                      <Collapsible
                        key={item.title}
                        asChild
                        defaultOpen={active || childRouteActive}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.title}
                              className="rounded-lg transition-all duration-300 font-medium h-9 px-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            >
                              <item.icon className="size-4 transition-transform duration-300 group-hover:scale-110" />
                              <span className="ml-2">{item.title}</span>
                              <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.children.map((child) => {
                                const childActive = child.url
                                  ? location.pathname === child.url
                                  : (active && currentTab === child.tab)
                                return (
                                  <SidebarMenuSubItem key={child.url ?? child.tab}>
                                    <SidebarMenuSubButton
                                      asChild
                                      className={childActive ? "bg-primary/10 text-primary hover:bg-primary/20 [&>svg]:text-primary" : ""}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => navigate(child.url ? child.url : `${item.url}?tab=${child.tab}`)}
                                        className="w-full cursor-pointer"
                                      >
                                        <child.icon className="size-4" />
                                        <span>{child.title}</span>
                                      </button>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  }

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
                        </SidebarMenuButton>
                      </motion.div>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
                    <DropdownMenuItem onClick={() => navigate('/notificacoes')} className="cursor-pointer font-medium">
                      <Megaphone className="size-4" />
                      Notificações
                    </DropdownMenuItem>
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
