// Seletor da área do Método — usado nas fases 3, 4, 5 e 6.
// As áreas nascem na Fase 2 (Inteligência Empresarial) e atravessam o método:
// é o que permite ler "o que a IA fez no Comercial" ponta a ponta, em vez de
// cada fase ter o seu próprio texto solto.
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface AreaMetodo { id: string; nome: string }

/** Carrega as áreas do cliente. Compartilhado pelas fases que vinculam área. */
export function useAreasMetodo(clientId: string) {
  const [areas, setAreas] = useState<AreaMetodo[]>([])
  useEffect(() => {
    let cancelado = false
    supabase
      .from("metodo_areas")
      .select("id, nome")
      .eq("id_cliente", clientId)
      .order("nome")
      .then(({ data }) => { if (!cancelado) setAreas((data ?? []) as AreaMetodo[]) })
    return () => { cancelado = true }
  }, [clientId])
  return areas
}

const SEM_AREA = "__sem__"

export function SeletorArea({
  areas, value, onChange, label = "Área", ajudaVazio = true,
}: {
  areas: AreaMetodo[]
  value: string | null
  onChange: (id: string | null) => void
  label?: string
  ajudaVazio?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {areas.length === 0 ? (
        ajudaVazio ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-[12px] font-medium text-muted-foreground">
            Nenhuma área cadastrada ainda. Crie as áreas na <strong className="text-foreground">Fase 2 · Inteligência
            Empresarial</strong> para conectá-las ao restante do Método.
          </p>
        ) : null
      ) : (
        <Select value={value ?? SEM_AREA} onValueChange={(v) => onChange(v === SEM_AREA ? null : v)}>
          <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_AREA}>Sem área</SelectItem>
            {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

/** Etiqueta da área para exibir num card. Null quando não há vínculo. */
export function nomeDaArea(areas: AreaMetodo[], id: string | null | undefined): string | null {
  if (!id) return null
  return areas.find((a) => a.id === id)?.nome ?? null
}
