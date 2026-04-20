import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  TrendingUpIcon as TrendingUp
} from "@/components/ui/icons"
import { motion } from "framer-motion"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(218,252,103,0.03)_0%,transparent_70%)]" />
      
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
          <CardHeader className="space-y-2 text-center pb-8 pt-8">
            <CardTitle className="text-3xl font-bold tracking-tight text-foreground">PMC OS</CardTitle>
            <CardDescription className="text-sm font-medium text-muted-foreground uppercase tracking-[0.2em]">
              Black Eagle — Acesso Restrito
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-6 px-8">
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
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-muted/10 border-border focus-visible:border-primary/50"
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-muted/10 border-border focus-visible:border-primary/50"
                />
              </div>
            </CardContent>
            <CardFooter className="px-8 pb-10 pt-4 flex flex-col gap-4">
              <Button className="w-full text-base font-bold h-12 shadow-xl shadow-primary/20" type="submit" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Entrando...
                  </div>
                ) : "Acessar Sistema"}
              </Button>
              <button
                type="button"
                onClick={() => navigate('/recuperar-senha')}
                className="text-xs text-muted-foreground hover:text-primary font-semibold uppercase tracking-widest transition-colors"
              >
                Esqueci minha senha
              </button>
            </CardFooter>
          </form>
        </Card>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-[11px] text-muted-foreground font-medium uppercase tracking-[0.3em]"
        >
          Powering Business Acceleration — v2.0
        </motion.p>
      </motion.div>
    </div>
  )
}

