import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ShieldCheckIcon as ShieldCheck } from "@/components/ui/icons"
import { motion } from "framer-motion"

export default function TrocarSenhaPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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

      setSuccess(true)
      setTimeout(() => navigate('/', { replace: true }), 1800)
    } catch (err: any) {
      setError(err.message || "Erro ao trocar senha")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md mx-auto"
    >
      <div className="flex justify-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/20"
        >
          <ShieldCheck className="size-8" />
        </motion.div>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-2 text-center pb-6 pt-8">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Trocar Senha</CardTitle>
          <CardDescription className="text-sm font-medium text-muted-foreground">
            Defina uma nova senha para acessar o sistema PMC OS
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
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/10 text-foreground border border-primary/20 p-4 rounded-xl text-sm font-semibold text-center"
              >
                Senha alterada com sucesso! Redirecionando...
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
                disabled={loading || success}
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="confirm" className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Confirmar Nova Senha</Label>
              <Input
                id="confirm"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="bg-muted/10 border-border focus-visible:border-primary/50"
                disabled={loading || success}
              />
            </div>
            <Button className="w-full text-base font-bold h-12 shadow-xl shadow-primary/20" type="submit" disabled={loading || success}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Salvando...
                </div>
              ) : "Trocar Senha"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </motion.div>
  )
}
