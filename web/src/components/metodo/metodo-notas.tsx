// Bloco de notas persistente por seção do Método (tabela metodo_notas).
// Autosave com debounce; indicador sutil de "Salvando…/Salvo".
import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Edit3Icon as Edit3, CheckCircle2Icon as Check } from "@/components/ui/icons"

interface Props {
  clientId: string
  chave: string
  titulo?: string
  placeholder?: string
}

export function MetodoNotas({ clientId, chave, titulo = "Minhas anotações", placeholder }: Props) {
  const [notas, setNotas] = useState("")
  const [estado, setEstado] = useState<"carregando" | "ocioso" | "salvando" | "salvo">("carregando")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const carregou = useRef(false)

  useEffect(() => {
    let cancel = false
    async function carregar() {
      const { data } = await supabase
        .from("metodo_notas")
        .select("notas")
        .eq("id_cliente", clientId)
        .eq("chave", chave)
        .maybeSingle()
      if (!cancel) {
        setNotas(data?.notas ?? "")
        setEstado("ocioso")
        carregou.current = true
      }
    }
    carregar()
    return () => { cancel = true; if (timer.current) clearTimeout(timer.current) }
  }, [clientId, chave])

  function onChange(valor: string) {
    setNotas(valor)
    if (!carregou.current) return
    setEstado("salvando")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const { error } = await supabase.from("metodo_notas").upsert(
        { id_cliente: clientId, chave, notas: valor, updated_at: new Date().toISOString() },
        { onConflict: "id_cliente,chave" }
      )
      setEstado(error ? "ocioso" : "salvo")
    }, 800)
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="size-4 text-primary" />
            <p className="text-sm font-bold tracking-tight text-foreground">{titulo}</p>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground min-h-4">
            {estado === "salvando" && "Salvando…"}
            {estado === "salvo" && <span className="text-primary inline-flex items-center gap-1"><Check className="size-3.5" />Salvo</span>}
          </span>
        </div>
        <Textarea
          value={notas}
          onChange={(e) => onChange(e.target.value)}
          disabled={estado === "carregando"}
          placeholder={placeholder ?? "Anote aqui as melhorias, ideias e ajustes que você quer aplicar…"}
          className="rounded-xl min-h-32 resize-y"
        />
      </CardContent>
    </Card>
  )
}
