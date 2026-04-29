import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Tabela = "reunioes_galdino" | "reunioes_blackcrm" | "reunioes_mentoria_new"

interface StatusBadgeToggleProps {
  compareceu: boolean | null
  dataReuniao: string
  idUnico: string
  tabela: Tabela
  isAdmin: boolean
  onChange?: (novoCompareceu: boolean) => void
  size?: "sm" | "md"
}

function isFuture(dataReuniao: string) {
  return new Date(dataReuniao + "T00:00:00") > new Date()
}

function statusOf(compareceu: boolean | null, dataFutura: boolean): "agendada" | "faltou" | "realizada" {
  if (dataFutura) return "agendada"
  if (compareceu === false) return "faltou"
  return "realizada"
}

export function StatusBadgeToggle({
  compareceu,
  dataReuniao,
  idUnico,
  tabela,
  isAdmin,
  onChange,
  size = "sm",
}: StatusBadgeToggleProps) {
  const [localCompareceu, setLocalCompareceu] = useState<boolean | null>(compareceu)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLocalCompareceu(compareceu)
  }, [compareceu])

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 3500)
    return () => clearTimeout(t)
  }, [error])

  const dataFutura = isFuture(dataReuniao)
  const status = statusOf(localCompareceu, dataFutura)
  const interactive = isAdmin && !dataFutura

  const sizeClasses =
    size === "md" ? "px-2.5 py-1 text-[9px]" : "px-2 py-0.5 text-[9px]"

  const variantClasses =
    status === "agendada"
      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
      : status === "faltou"
        ? "bg-destructive/10 border-destructive/20 text-destructive"
        : "bg-primary/10 border-primary/20 text-primary"

  const label =
    status === "agendada" ? "Agendada" : status === "faltou" ? "Faltou" : "Realizada"

  const novoValor = status === "realizada" ? false : true
  const novoLabel = novoValor ? "Realizada" : "Faltou"

  async function handleConfirm() {
    setSaving(true)
    const previo = localCompareceu
    setLocalCompareceu(novoValor)
    const { error: dbError } = await supabase
      .from(tabela)
      .update({ cliente_compareceu: novoValor })
      .eq("id_unico", idUnico)

    setSaving(false)

    if (dbError) {
      setLocalCompareceu(previo)
      setError(dbError.message || "Falha ao atualizar status")
      return
    }

    onChange?.(novoValor)
    setOpen(false)
  }

  function handleClick(e: React.MouseEvent) {
    if (!interactive) return
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <Badge
        variant="outline"
        onClick={handleClick}
        className={`uppercase font-bold rounded-lg shrink-0 ${sizeClasses} ${variantClasses} ${
          interactive ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
        }`}
        title={interactive ? "Clique para alterar status" : undefined}
      >
        {label}
      </Badge>

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Alterar status da reunião?</DialogTitle>
            <DialogDescription>
              De <span className="font-semibold text-foreground">{label}</span> para{" "}
              <span className="font-semibold text-foreground">{novoLabel}</span>.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
