import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BackgroundShader } from "@/components/ui/background-shader"
import { TrendingUpIcon as TrendingUp } from "@/components/ui/icons"
import { motion } from "framer-motion"
import type { EmailOtpType } from "@supabase/supabase-js"

export default function AtivarContaPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token_hash = params.get('token_hash')
  const type = (params.get('type') as EmailOtpType) || 'magiclink'
  const next = params.get('next') || '/definir-senha'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAtivar = async () => {
    if (!token_hash) {
      setError('Link inválido. Solicite um novo convite ao time de Sucesso do Cliente.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({ token_hash, type })
      if (verifyErr) {
        setError('Link expirado ou inválido. Solicite um novo convite ao time de Sucesso do Cliente.')
        return
      }
      navigate(next, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Erro ao ativar conta')
    } finally {
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
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Ativar minha conta</CardTitle>
            <CardDescription className="text-sm font-medium text-muted-foreground">
              Clique no botão abaixo para confirmar seu convite e definir sua senha.
            </CardDescription>
          </CardHeader>
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
            <Button
              className="w-full text-base font-bold h-12 shadow-xl shadow-primary/20"
              onClick={handleAtivar}
              disabled={loading || !token_hash}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Ativando...
                </div>
              ) : "Ativar e definir senha"}
            </Button>
            {error && (
              <Button
                variant="outline"
                className="w-full h-12 font-semibold"
                onClick={() => navigate('/login', { replace: true })}
              >
                Ir para Login
              </Button>
            )}
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
