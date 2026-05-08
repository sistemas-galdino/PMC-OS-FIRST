import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TargetIcon } from "@/components/ui/icons"

const TOTAL_GALDINO = 12

interface CicloData {
  realizadas: number
  proximaAgendada: string | null
  dataEntrada: string | null
}

function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function addMonths(d: Date, months: number): Date {
  const r = new Date(d)
  r.setMonth(r.getMonth() + months)
  return r
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (m) return `${m[3]}/${m[2]}`
  return "—"
}

function formatDateFromObj(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

export default function TabCicloGaldino({ clientId }: { clientId: string }) {
  const [data, setData] = useState<CicloData>({
    realizadas: 0,
    proximaAgendada: null,
    dataEntrada: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      const nowIso = new Date().toISOString()

      const [realizadasRes, proximaRes, entradaRes] = await Promise.all([
        supabase
          .from("reunioes_galdino")
          .select("id_cliente", { count: "exact", head: true })
          .eq("id_cliente", clientId)
          .eq("cliente_compareceu", true),
        supabase
          .from("reunioes_galdino")
          .select("data_reuniao")
          .eq("id_cliente", clientId)
          .gt("data_reuniao", nowIso)
          .order("data_reuniao", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("cliente_informacoes_empresa")
          .select("data_entrada")
          .eq("id_cliente", clientId)
          .maybeSingle(),
      ])

      if (cancelled) return
      if (realizadasRes.error) {
        setError(realizadasRes.error.message)
        setLoading(false)
        return
      }

      setData({
        realizadas: realizadasRes.count ?? 0,
        proximaAgendada: proximaRes.data?.data_reuniao ?? null,
        dataEntrada: entradaRes.data?.data_entrada ?? null,
      })
      setLoading(false)
    }

    load().catch((e) => {
      if (cancelled) return
      setError(e?.message || "Erro ao carregar ciclo Galdino")
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [clientId])

  const realizadas = data.realizadas
  const pendentes = Math.max(0, TOTAL_GALDINO - realizadas)
  const dataEntradaParsed = parseIso(data.dataEntrada)
  const dataIdeal = dataEntradaParsed
    ? formatDateFromObj(addMonths(dataEntradaParsed, (realizadas + 1) * 3))
    : "—"

  if (loading) {
    return (
      <Card className="p-12 flex items-center justify-center hover:translate-y-0">
        <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <Card className="hover:translate-y-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TargetIcon className="size-4 text-yellow-400" />
            Ciclo Galdino
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KpiCell label="Total" value={String(TOTAL_GALDINO)} valueClass="text-foreground" />
            <KpiCell label="Realizadas" value={String(realizadas)} valueClass="text-emerald-400" />
            <KpiCell label="Pendentes" value={String(pendentes)} valueClass="text-yellow-400" />
            <KpiCell
              label="Próxima agendada"
              value={formatDateShort(data.proximaAgendada)}
              valueClass="text-foreground"
            />
            <KpiCell label="Data ideal próxima" value={dataIdeal} valueClass="text-emerald-400" />
          </div>

          <p className="text-xs text-muted-foreground">
            Cadência ideal: 1 reunião a cada 3 meses. Defina a data de entrada do cliente para
            sugerir a próxima reunião.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function KpiCell({
  label,
  value,
  valueClass = "",
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl bg-muted/10 border border-border px-4 py-4 flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className={`text-2xl font-bold tracking-tight ${valueClass}`}>{value}</span>
    </div>
  )
}
