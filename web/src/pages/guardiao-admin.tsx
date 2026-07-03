import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ShieldCheckIcon as ShieldCheck } from "@/components/ui/icons"
import GuardiaoPage from "@/pages/guardiao"
import { motion } from "framer-motion"

type ClienteOption = {
  id_cliente: string
  nome_empresa_formatado: string | null
}

export default function GuardiaoAdminPage() {
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string>("")

  useEffect(() => {
    let cancelled = false

    async function fetchClientes() {
      const { data, error } = await supabase
        .from("clientes_entrada_new")
        .select("id_cliente, nome_empresa_formatado")
        .order("nome_empresa_formatado", { ascending: true })

      if (cancelled) return
      if (!error && data) {
        setClientes(
          (data as ClienteOption[]).filter((c) => !!c.id_cliente),
        )
      }
      setLoading(false)
    }

    fetchClientes()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-8 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="border-l-4 border-primary pl-8 py-2"
      >
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
          Guardião — Clientes
        </h1>
        <p className="text-muted-foreground font-medium text-sm mt-2">
          Acompanhe o processo de contratação do Guardião de cada cliente
        </p>
      </motion.div>

      <div className="max-w-md">
        <Select value={selectedId} onValueChange={setSelectedId} disabled={loading}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={loading ? "Carregando clientes..." : "Selecione um cliente"}
            />
          </SelectTrigger>
          <SelectContent>
            {clientes.map((c) => (
              <SelectItem key={c.id_cliente} value={c.id_cliente}>
                {c.nome_empresa_formatado || "(sem nome)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedId ? (
        <GuardiaoPage clientId={selectedId} adminView />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 py-24 text-center"
        >
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
            <ShieldCheck className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Selecione um cliente para ver o processo de Guardião
          </h2>
          <p className="text-muted-foreground font-medium text-sm mt-2 max-w-sm">
            Escolha um cliente no seletor acima para acompanhar convites, resultados e
            ranking de candidatos.
          </p>
        </motion.div>
      )}
    </div>
  )
}
