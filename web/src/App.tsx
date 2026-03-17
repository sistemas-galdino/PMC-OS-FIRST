import { useEffect, useState, Component, ReactNode } from "react"
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
import type { Session } from "@supabase/supabase-js"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

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
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-destructive p-8 text-center border-4 border-destructive shadow-brutal">
          <h1 className="text-4xl font-black uppercase mb-4">CRITICAL ERROR</h1>
          <pre className="bg-muted p-4 border-2 border-foreground text-foreground text-xs overflow-auto max-w-full text-left mb-6">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="bg-primary text-foreground px-6 py-3 font-black uppercase border-2 border-foreground shadow-brutal-sm"
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
        })
    }
  }, [session])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-primary">
        <div className="animate-pulse font-black tracking-widest text-3xl uppercase border-4 border-primary p-8 shadow-brutal">
          PMC OS
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={!session ? <LoginPage /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/*" 
            element={session ? (
              <DashboardLayout session={session}>
                <Routes>
                  <Route path="/" element={isAdmin ? <AdminDashboard /> : <ClientDashboard session={session} />} />
                  <Route path="/mentores" element={<MentoresPage />} />
                  <Route path="/clientes" element={<ClientesPage />} />
                  <Route path="/produtos" element={<ProdutosPage session={session} />} />
                  <Route path="/canais" element={<CanaisPage session={session} />} />
                  <Route path="/acoes" element={<AcoesPage session={session} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </DashboardLayout>
            ) : <Navigate to="/login" replace />} 
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
