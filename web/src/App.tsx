import { useEffect, useState, Component } from "react"
import type { ReactNode } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import LoginPage from "@/pages/login"
import AdminDashboard from "@/pages/admin-dashboard"
import ClientDashboard from "@/pages/client-dashboard"
import MentoresPage from "@/pages/mentores"
import ClientesPage from "@/pages/clientes"
import ProdutosPage from "@/pages/produtos"
import CanaisPage from "@/pages/canais"
import AcoesPage from "@/pages/acoes"
import OnboardingPage from "@/pages/onboarding"
import ClientProfilePage from "@/pages/client-profile"
import ClientReunioesPage from "@/pages/client-reunioes"
import DefinirSenhaPage from "@/pages/definir-senha"
import CadastroPage from "@/pages/cadastro"
import ReuniaoDetalhePage from "@/pages/reuniao-detalhe"
import ReunioesGaldinoPage from "@/pages/reunioes-galdino"
import ReuniaoGaldinoDetalhePage from "@/pages/reuniao-galdino-detalhe"
import type { Session } from "@supabase/supabase-js"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { BackgroundShader } from "@/components/ui/background-shader"

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) {
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
    if (session?.user?.email) {
      supabase
        .from('mentores')
        .select('id')
        .eq('email', session.user.email)
        .maybeSingle()
        .then(({ data }) => {
          setIsAdmin(!!data)
          // If not admin, check if client needs onboarding
          if (!data) {
            supabase
              .from('cliente_onboarding')
              .select('status, senha_definida')
              .eq('id_cliente', session.user.id)
              .maybeSingle()
              .then(({ data: onboarding }) => {
                if (onboarding && onboarding.status === 'em_andamento') {
                  if (!onboarding.senha_definida) {
                    setNeedsPassword(true)
                    setNeedsOnboarding(false)
                  } else {
                    setNeedsPassword(false)
                    setNeedsOnboarding(true)
                  }
                } else {
                  setNeedsPassword(false)
                  setNeedsOnboarding(false)
                }
              })
          }
        })
    }
  }, [session])

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
      <BackgroundShader />
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
            path="/cadastro"
            element={session ? <CadastroPage session={session} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/*"
            element={session ? (
              (!isAdmin && needsPassword) ? <Navigate to="/definir-senha" replace /> :
              (!isAdmin && needsOnboarding) ? <Navigate to="/cadastro" replace /> : (
                <DashboardLayout session={session}>
                  <Routes>
                    <Route path="/" element={isAdmin ? <AdminDashboard /> : <ClientDashboard session={session} />} />
                    <Route path="/mentores" element={<MentoresPage />} />
                    <Route path="/clientes" element={<ClientesPage />} />
                    <Route path="/produtos" element={<ProdutosPage session={session} />} />
                    <Route path="/canais" element={<CanaisPage session={session} />} />
                    <Route path="/acoes" element={<AcoesPage session={session} />} />
                    <Route path="/reunioes" element={<ClientReunioesPage session={session} />} />
                    <Route path="/cliente/:id" element={<ClientProfilePage />} />
                    <Route path="/reuniao/:id" element={<ReuniaoDetalhePage />} />
                    <Route path="/reunioes-galdino" element={<ReunioesGaldinoPage />} />
                    <Route path="/reuniao-galdino/:id" element={<ReuniaoGaldinoDetalhePage />} />
                    <Route path="/onboarding" element={<OnboardingPage />} />
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
