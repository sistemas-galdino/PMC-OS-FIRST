// Fonte única de autenticação/autorização. Resolve sessão + papel (admin) e
// os gates de onboarding UMA vez, e expõe via useAuth() — eliminando as
// re-consultas de `mentores` espalhadas pelas páginas e o prop drilling de
// `isAdmin`. O App consome isto para montar as rotas.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthState {
  session: Session | null
  user: User | null
  isAdmin: boolean
  /** Super admin: gere papéis e permissões do time. */
  isSuperAdmin: boolean
  /** Chave do papel do membro do time (ex: 'super_admin', 'admin', 'cs'), ou null. */
  papel: string | null
  /** Empresa (id_cliente) resolvida do usuário logado — vale para cliente legado
   * (= próprio auth.uid) e para 2º+ usuário vinculado à empresa. null para time. */
  idCliente: string | null
  /** Seções admin que este usuário pode ver (chaves de secoes_catalogo). */
  secoes: Set<string>
  /** true se o usuário pode ver a seção (papéis "full" liberam tudo). */
  can: (secao: string) => boolean
  needsPassword: boolean
  needsOnboarding: boolean
  loading: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [papel, setPapel] = useState<string | null>(null)
  const [isFull, setIsFull] = useState(false)
  const [secoes, setSecoes] = useState<Set<string>>(new Set())
  const [idCliente, setIdCliente] = useState<string | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  // Segura o roteamento até o papel resolver: sem isto, `isAdmin` ainda é false no
  // primeiro render e a rota "/" manda o admin pra /inicio (corrida de role).
  const [roleResolved, setRoleResolved] = useState(false)

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
      if (mounted && event !== "TOKEN_REFRESHED") {
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
    if (!session?.user?.email) {
      setIsAdmin(false)
      setIsSuperAdmin(false)
      setPapel(null)
      setIsFull(false)
      setSecoes(new Set())
      setIdCliente(null)
      setNeedsPassword(false)
      setNeedsOnboarding(false)
      // Sem sessão não há papel a resolver — libera a renderização (ex.: /login).
      setRoleResolved(true)
      return
    }
    const { email, id } = session.user
    let cancelled = false
    setRoleResolved(false)

    async function checkUserRole() {
      try {
      const [{ data: mentor }, { data: onboarding }] = await Promise.all([
        // papeis(...) embute o papel do membro (FK mentores.papel -> papeis.chave)
        supabase.from("mentores").select("id, papel, papeis(is_full, is_super)").eq("email", email).maybeSingle(),
        supabase.from("cliente_onboarding").select("status, senha_definida").eq("id_cliente", id).maybeSingle(),
      ])

      if (cancelled) return

      const m = mentor as any
      const admin = !!m
      setIsAdmin(admin)

      // Papel + seções efetivas. Papel "full" (super_admin/admin) libera tudo;
      // limitado busca as seções via RPC minhas_secoes().
      if (admin) {
        const full = m.papeis?.is_full ?? false
        setPapel(m.papel ?? null)
        setIsSuperAdmin(m.papeis?.is_super ?? false)
        setIsFull(full)
        if (full) {
          setSecoes(new Set())
        } else {
          const { data: secs } = await supabase.rpc("minhas_secoes")
          if (cancelled) return
          setSecoes(new Set((secs ?? []) as string[]))
        }
        setIdCliente(null)   // membro do time não é cliente
      } else {
        setPapel(null)
        setIsSuperAdmin(false)
        setIsFull(false)
        setSecoes(new Set())
        // Cliente: resolve a empresa (legado = próprio id; 2º usuário = a empresa).
        const { data: cid } = await supabase.rpc("meu_id_cliente")
        if (cancelled) return
        setIdCliente((cid as string | null) ?? id)
      }

      if (!admin && onboarding && onboarding.status === "em_andamento") {
        setNeedsPassword(!onboarding.senha_definida)
        setNeedsOnboarding(!!onboarding.senha_definida)
      } else {
        setNeedsPassword(false)
        setNeedsOnboarding(false)
      }
      } finally {
        // Sempre libera o roteamento (mesmo se a query falhar, pra não travar no spinner).
        if (!cancelled) setRoleResolved(true)
      }
    }

    checkUserRole()
    return () => { cancelled = true }
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Papéis "full" veem todas as seções (inclusive novas ainda não no catálogo);
  // limitados veem só as chaves resolvidas em `secoes`.
  const can = (secao: string) => isFull || secoes.has(secao)

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isAdmin, isSuperAdmin, papel, idCliente, secoes, can, needsPassword, needsOnboarding, loading: loading || (!!session?.user && !roleResolved) }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>")
  return ctx
}
