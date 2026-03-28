import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RegistrarClienteDialog({ open, onOpenChange, onSuccess }: Props) {
  const [nome, setNome] = useState("")
  const [nomeEmpresa, setNomeEmpresa] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('invite-client', {
        body: { nome, nome_empresa: nomeEmpresa, email },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setNome("")
        setNomeEmpresa("")
        setEmail("")
        onOpenChange(false)
        onSuccess()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Erro ao registrar cliente")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Registrar Novo Cliente</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            O cliente receberá um e-mail com o link para completar o cadastro.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="size-14 bg-primary/10 border-2 border-primary/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="size-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-foreground">Convite enviado!</p>
            <p className="text-sm text-muted-foreground">E-mail enviado para {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {error && (
              <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-xl text-sm font-semibold text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome do Cliente</Label>
              <Input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                className="bg-muted/10 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome da Empresa</Label>
              <Input
                required
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                placeholder="Nome da empresa"
                className="bg-muted/10 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">E-mail</Label>
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="bg-muted/10 border-border"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="font-bold shadow-xl shadow-primary/20">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Enviando...
                  </div>
                ) : "Enviar Convite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
