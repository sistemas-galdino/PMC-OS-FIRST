import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ShieldCheck } from "lucide-react"

export default function LoginPage() {
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
      
      // Redirect or state update handled by App.tsx
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiLz4KPHJlY3Qgd2lkdGg9IjEiIGhlaWdodD0iMSIgZmlsbD0iI2RhZmM2NyIgZmlsbC1vcGFjaXR5PSIwLjEiLz4KPC9zdmc+')]">
      <Card className="w-full max-w-md bg-card p-6 border-4 border-foreground shadow-[8px_8px_0px_0px_var(--color-foreground)] rounded-none">
        <CardHeader className="space-y-4 text-center px-0 pt-0 pb-6 border-b-2 border-foreground mb-6">
          <div className="flex justify-center">
            <div className="bg-primary text-primary-foreground p-4 border-2 border-foreground shadow-brutal-sm">
              <ShieldCheck className="size-10" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black uppercase tracking-tighter">PMC OS</CardTitle>
          <CardDescription className="uppercase font-bold tracking-widest text-[10px] text-muted-foreground">
            Acesso Restrito
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6 px-0 pb-6">
            {error && (
              <div className="bg-destructive text-destructive-foreground p-3 text-sm font-bold uppercase border-2 border-foreground shadow-brutal-sm text-center">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="uppercase font-bold tracking-widest text-[11px]">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-none border-2 border-foreground shadow-[2px_2px_0px_0px_var(--color-foreground)] focus-visible:shadow-none focus-visible:translate-y-[2px] focus-visible:translate-x-[2px] transition-all bg-background h-12 font-bold uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="uppercase font-bold tracking-widest text-[11px]">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-none border-2 border-foreground shadow-[2px_2px_0px_0px_var(--color-foreground)] focus-visible:shadow-none focus-visible:translate-y-[2px] focus-visible:translate-x-[2px] transition-all bg-background h-12 font-bold uppercase"
              />
            </div>
          </CardContent>
          <CardFooter className="px-0 pb-0">
            <Button className="w-full text-lg h-14" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Acessar Sistema"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
