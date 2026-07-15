import { useEffect, useState, Component } from "react"
import type { ReactNode } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import LoginPage from "@/pages/login"
import AdminDashboard from "@/pages/admin-dashboard"
import MentoresPage from "@/pages/mentores"
import ClientesPage from "@/pages/clientes"
import AcessosPage from "@/pages/acessos"
import MapeamentoPage from "@/pages/mapeamento"
import IndicadoresPage from "@/pages/indicadores"
import AcoesPage from "@/pages/acoes"
import OnboardingPage from "@/pages/onboarding"
import ClientProfilePage from "@/pages/client-profile"
import ClientReunioesPage from "@/pages/client-reunioes"
import DefinirSenhaPage from "@/pages/definir-senha"
import AtivarContaPage from "@/pages/ativar-conta"
import RecuperarSenhaPage from "@/pages/recuperar-senha"
import TrocarSenhaPage from "@/pages/trocar-senha"
import CadastroPage from "@/pages/cadastro"
import ReuniaoDetalhePage from "@/pages/reuniao-detalhe"
import ReunioesGaldinoPage from "@/pages/reunioes-galdino"
import ReuniaoGaldinoDetalhePage from "@/pages/reuniao-galdino-detalhe"
import ReunioesBlackCRMPage from "@/pages/reunioes-blackcrm"
import ReuniaoBlackCRMDetalhePage from "@/pages/reuniao-blackcrm-detalhe"
import RecursosPage from "@/pages/recursos"
import FerramentasPage from "@/pages/ferramentas"
import CalendarioEncontrosPage from "@/pages/calendario-encontros"
import ConfiguracoesPage from "@/pages/configuracoes"
import AgendarPage from "@/pages/agendar"
import InicioPage from "@/pages/inicio"
import MetodoPage from "@/pages/metodo"
import NovidadesPage from "@/pages/novidades"
import NovidadesAdminPage from "@/pages/novidades-admin"
import EstudosCasoPage from "@/pages/estudos-caso"
import EstudosCasoAdminPage from "@/pages/estudos-caso-admin"
import Dashboard2 from "@/pages/dashboard-2"
import CanaisVendasPage from "@/pages/canais-vendas"
import MultiplicadoresPage from "@/pages/multiplicadores"
import MultiplicadoresAdminPage from "@/pages/multiplicadores-admin"
import SkillsPage from "@/pages/skills"
import SkillsAdminPage from "@/pages/skills-admin"
import RepositorioVitoriasPage from "@/pages/repositorio-vitorias"
import VitoriasPage from "@/pages/vitorias"
import MeuTimePage from "@/pages/meu-time"
import TrilhasPage from "@/pages/trilhas"
import TrilhaEvidenciasPage from "@/pages/trilha-evidencias"
import InformacoesEmpresaPage from "@/pages/informacoes-empresa"
import RoadmapSistemasPage from "@/pages/roadmap-sistemas"
import CentralAtendimentosPage from "@/pages/central-atendimentos"
import AtendimentoPublicoPage from "@/pages/atendimento-publico"
import FunisPage from "@/pages/funis"
import RespostasOnboardingPage from "@/pages/respostas-onboarding"
import CRMPage from "@/pages/crm"
import AgentePage from "@/pages/agente"
import GuardiaoPage from "@/pages/guardiao"
import GuardiaoResponderPage from "@/pages/guardiao-responder"
import GuardiaoAdminPage from "@/pages/guardiao-admin"
import type { Session } from "@supabase/supabase-js"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
// import { BackgroundShader } from "@/components/ui/background-shader" // fallback: shader padrão
import { BackgroundShaderPaper } from "@/components/ui/background-shader-paper"

// Error Boundary to catch any component crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("APP CRASH:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-10 text-center">
          <div className="size-20 bg-destructive/10 rounded-2xl flex items-center justify-center mb-8 border border-destructive/20">
            <h1 className="text-4xl font-bold text-destructive">!</h1>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">CRITICAL ERROR</h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto font-medium">Ocorreu um erro inesperado no sistema. Os detalhes técnicos foram registrados para nossa equipe.</p>
          <pre className="bg-muted/30 p-6 rounded-2xl border border-border text-muted-foreground text-xs overflow-auto max-w-2xl text-left mb-10 w-full">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
          >
            Resetar e Tentar Novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)

  useEffect(() => {
    let mounted = true

    async function initialize() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        if (mounted) {
          setSession(s)
          setLoading(false)
        }
      } catch (err) {
        console.error("Session check error:", err)
        if (mounted) setLoading(false)
      }
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (mounted && event !== 'TOKEN_REFRESHED') {
        setSession(s)
      }
    })

    document.documentElement.classList.add("dark")

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user?.email) return
    const { email, id } = session.user

    let cancelled = false

    async function checkUserRole() {
      const [{ data: mentor }, { data: onboarding }] = await Promise.all([
        supabase
          .from('mentores')
          .select('id')
          .eq('email', email)
          .maybeSingle(),
        supabase
          .from('cliente_onboarding')
          .select('status, senha_definida')
          .eq('id_cliente', id)
          .maybeSingle(),
      ])

      if (cancelled) return

      const admin = !!mentor
      setIsAdmin(admin)

      if (!admin && onboarding && onboarding.status === 'em_andamento') {
        setNeedsPassword(!onboarding.senha_definida)
        setNeedsOnboarding(!!onboarding.senha_definida)
      } else {
        setNeedsPassword(false)
        setNeedsOnboarding(false)
      }
    }

    checkUserRole()
    return () => { cancelled = true }
  }, [session?.user?.id])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="size-16 relative">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="font-bold tracking-[0.4em] text-sm text-foreground uppercase animate-pulse">
            PMC OS
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <BackgroundShaderPaper />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={!session ? <LoginPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/definir-senha"
            element={<DefinirSenhaPage />}
          />
          <Route
            path="/ativar-conta"
            element={<AtivarContaPage />}
          />
          <Route
            path="/recuperar-senha"
            element={<RecuperarSenhaPage />}
          />
          <Route
            path="/cadastro"
            element={session ? <CadastroPage session={session} /> : <Navigate to="/login" replace />}
          />
          <Route path="/atendimento" element={<AtendimentoPublicoPage />} />
          <Route path="/atendimento/:slug" element={<AtendimentoPublicoPage />} />
          <Route path="/guardiao/r/:token" element={<GuardiaoResponderPage />} />
          <Route
            path="/*"
            element={session ? (
              (!isAdmin && needsPassword) ? <Navigate to="/definir-senha" replace /> :
              (!isAdmin && needsOnboarding) ? <Navigate to="/cadastro" replace /> : (
                <DashboardLayout isAdmin={isAdmin}>
                  <Routes>
                    <Route path="/" element={isAdmin ? <AdminDashboard /> : <Navigate to="/inicio" replace />} />
                    <Route path="/inicio" element={<InicioPage session={session} />} />
                    <Route path="/metodo" element={<MetodoPage session={session} />} />
                    <Route path="/novidades" element={<NovidadesPage session={session} />} />
                    <Route path="/novidades-admin" element={isAdmin ? <NovidadesAdminPage /> : <Navigate to="/" replace />} />
                    <Route path="/estudos-caso" element={<EstudosCasoPage session={session} />} />
                    <Route path="/estudos-caso-admin" element={isAdmin ? <EstudosCasoAdminPage /> : <Navigate to="/" replace />} />
                    <Route path="/dashboard-2" element={isAdmin ? <Dashboard2 /> : <Navigate to="/" replace />} />
                    <Route path="/canais-vendas" element={isAdmin ? <CanaisVendasPage /> : <Navigate to="/" replace />} />
                    <Route path="/multiplicadores" element={<MultiplicadoresPage />} />
                    <Route path="/multiplicadores-admin" element={isAdmin ? <MultiplicadoresAdminPage /> : <Navigate to="/" replace />} />
                    <Route path="/skills" element={<SkillsPage />} />
                    <Route path="/skills-admin" element={isAdmin ? <SkillsAdminPage /> : <Navigate to="/" replace />} />
                    <Route path="/repositorio-vitorias" element={isAdmin ? <RepositorioVitoriasPage /> : <Navigate to="/" replace />} />
                    <Route path="/mentores" element={isAdmin ? <MentoresPage isAdmin={isAdmin} /> : <Navigate to="/" replace />} />
                    <Route path="/clientes" element={isAdmin ? <ClientesPage /> : <Navigate to="/" replace />} />
                    <Route path="/acessos" element={isAdmin ? <AcessosPage /> : <Navigate to="/" replace />} />
                    <Route path="/mapeamento" element={<MapeamentoPage session={session} />} />
                    <Route path="/produtos" element={<Navigate to="/mapeamento?tab=produtos" replace />} />
                    <Route path="/canais" element={<Navigate to="/mapeamento?tab=canais" replace />} />
                    <Route path="/indicadores" element={<IndicadoresPage session={session} />} />
                    <Route path="/acoes" element={<AcoesPage session={session} />} />
                    <Route path="/reunioes" element={<ClientReunioesPage session={session} />} />
                    <Route path="/cliente/:id" element={isAdmin ? <ClientProfilePage /> : <Navigate to="/" replace />} />
                    <Route path="/reuniao/:id" element={<ReuniaoDetalhePage isAdmin={isAdmin} />} />
                    <Route path="/reunioes-galdino" element={<ReunioesGaldinoPage session={session} isAdmin={isAdmin} />} />
                    <Route path="/reuniao-galdino/:id" element={<ReuniaoGaldinoDetalhePage isAdmin={isAdmin} />} />
                    <Route path="/reunioes-blackcrm" element={<ReunioesBlackCRMPage session={session} isAdmin={isAdmin} />} />
                    <Route path="/reuniao-blackcrm/:id" element={<ReuniaoBlackCRMDetalhePage isAdmin={isAdmin} />} />
                    <Route path="/recursos" element={<RecursosPage session={session} />} />
                    <Route path="/ferramentas" element={<FerramentasPage session={session} forceAdmin={isAdmin} />} />
                    <Route path="/calendario" element={<CalendarioEncontrosPage isAdmin={isAdmin} />} />
                    <Route path="/onboarding" element={isAdmin ? <OnboardingPage /> : <Navigate to="/" replace />} />
                    <Route path="/configuracoes" element={isAdmin ? <ConfiguracoesPage /> : <Navigate to="/" replace />} />
                    <Route path="/trocar-senha" element={<TrocarSenhaPage />} />
                    <Route path="/agendar" element={<AgendarPage />} />
                    <Route path="/vitorias" element={<VitoriasPage session={session} />} />
                    <Route path="/meu-time" element={<MeuTimePage session={session} />} />
                    <Route path="/trilhas" element={<TrilhasPage session={session} />} />
                    <Route path="/trilhas/evidencias" element={<TrilhaEvidenciasPage session={session} />} />
                    <Route path="/informacoes-empresa" element={<InformacoesEmpresaPage session={session} />} />
                    <Route path="/roadmap-sistemas" element={isAdmin ? <RoadmapSistemasPage /> : <Navigate to="/" replace />} />
                    <Route path="/central-atendimentos" element={isAdmin ? <CentralAtendimentosPage /> : <Navigate to="/" replace />} />
                    <Route path="/funis" element={isAdmin ? <FunisPage /> : <Navigate to="/" replace />} />
                    <Route path="/respostas-onboarding" element={isAdmin ? <RespostasOnboardingPage /> : <Navigate to="/" replace />} />
                    <Route path="/crm" element={isAdmin ? <CRMPage /> : <Navigate to="/" replace />} />
                    <Route path="/agente" element={isAdmin ? <AgentePage /> : <Navigate to="/" replace />} />
                    <Route path="/guardiao" element={<GuardiaoPage session={session} hideTabList />} />
                    <Route path="/guardiao-admin" element={isAdmin ? <GuardiaoAdminPage /> : <Navigate to="/" replace />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </DashboardLayout>
              )
            ) : <Navigate to="/login" replace />}
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
