import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { BackgroundShader } from "@/components/ui/background-shader"
import { TrendingUpIcon as TrendingUp } from "@/components/ui/icons"
import { motion } from "framer-motion"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export default function RecuperarSenhaPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-password-recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, app_url: window.location.origin }),
      })
    } catch {
      // Silently ignore — UI sempre mostra sucesso genérico (anti-enumeration)
    } finally {
      setSent(true)
      setLoading(false)
    }
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
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Recuperar senha</CardTitle>
            <CardDescription className="text-sm font-medium text-muted-foreground">
              Informe seu email e enviaremos um link para redefinir sua senha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-10">
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/10 text-foreground border border-primary/20 p-5 rounded-xl text-sm font-medium text-center"
              >
                Se esse email estiver cadastrado, você receberá um link em alguns minutos.
                <br />
                <span className="text-muted-foreground text-xs">Verifique também a caixa de spam.</span>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-muted/10 border-border focus-visible:border-primary/50"
                  />
                </div>
                <Button
                  className="w-full text-base font-bold h-12 shadow-xl shadow-primary/20"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Enviando...
                    </div>
                  ) : "Enviar link de redefinição"}
                </Button>
              </form>
            )}
            <Button
              variant="outline"
              className="w-full h-12 font-semibold"
              onClick={() => navigate('/login', { replace: true })}
            >
              Voltar para login
            </Button>
          </CardContent>
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
