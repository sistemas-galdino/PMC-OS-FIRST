import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { BackgroundShader } from "@/components/ui/background-shader"
import { TrendingUpIcon as TrendingUp } from "@/components/ui/icons"
import { motion } from "framer-motion"

export default function DefinirSenhaPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [expiredEmail, setExpiredEmail] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const emailFromUrl = params.get('email')

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED')) {
        setSessionReady(true)
        setChecking(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      } else if (!emailFromUrl) {
        // Sem email na URL e sem session -> acesso direto, manda pro login
        navigate('/login', { replace: true })
        return
      } else {
        setExpiredEmail(emailFromUrl)
      }
      setChecking(false)
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleResend = async () => {
    if (!expiredEmail) return
    setResendStatus('sending')
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-invite-legacy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: expiredEmail, app_url: window.location.origin }),
      })
    } catch {
      // Fail silently — mesma UX pra sucesso/erro (não vazamos estado)
    }
    setResendStatus('sent')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      // Mark password as set
      const { data: { session: s } } = await supabase.auth.getSession()
      if (s?.user?.id) {
        await supabase
          .from('cliente_onboarding')
          .update({ senha_definida: true })
          .eq('id_cliente', s.user.id)
      }

      window.location.href = '/'
    } catch (err: any) {
      setError(err.message || "Erro ao definir senha")
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <BackgroundShader />
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Verificando convite...</p>
        </div>
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <BackgroundShader />
        <div className="relative z-10 text-center space-y-6 max-w-md px-4">
          <h1 className="text-2xl font-bold text-foreground">Link expirado</h1>
          {resendStatus === 'sent' ? (
            <>
              <p className="text-muted-foreground font-medium">
                Se <strong className="text-foreground">{expiredEmail}</strong> tiver conta ativa, um novo link foi enviado. Confira sua caixa em até 2 minutos (e a pasta de spam).
              </p>
              <Button variant="outline" onClick={() => navigate('/login', { replace: true })}>
                Ir para Login
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground font-medium">
                Seu link de acesso já expirou. Clique abaixo para receber um novo link em <strong className="text-foreground">{expiredEmail}</strong>.
              </p>
              <Button onClick={handleResend} disabled={resendStatus === 'sending'} className="h-12 shadow-xl shadow-primary/20">
                {resendStatus === 'sending' ? 'Enviando...' : 'Reenviar novo link'}
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent relative overflow-hidden">
      <BackgroundShader />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md px-4 relative z-10"
      >
        <div className="flex justify-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/20"
          >
            <TrendingUp className="size-8" />
          </motion.div>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-6 pt-8">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Defina sua Senha</CardTitle>
            <CardDescription className="text-sm font-medium text-muted-foreground">
              Crie uma senha segura para acessar o sistema PMC OS
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 px-8 pb-10">
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-xl text-sm font-semibold text-center"
                >
                  {error}
                </motion.div>
              )}
              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-muted/10 border-border focus-visible:border-primary/50"
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="confirm" className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Confirmar Senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="bg-muted/10 border-border focus-visible:border-primary/50"
                />
              </div>
              <Button className="w-full text-base font-bold h-12 shadow-xl shadow-primary/20" type="submit" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Salvando...
                  </div>
                ) : "Definir Senha e Continuar"}
              </Button>
            </CardContent>
          </form>
        </Card>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-[11px] text-muted-foreground font-medium uppercase tracking-[0.3em]"
        >
          PMC OS — Black Eagle
        </motion.p>
      </motion.div>
    </div>
  )
}
