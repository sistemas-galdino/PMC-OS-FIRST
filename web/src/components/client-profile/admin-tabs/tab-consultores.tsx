import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  UsersIcon,
  CalendarIcon,
  Trash2Icon,
} from "@/components/ui/icons"

interface Reuniao {
  id_unico: string
  data_reuniao: string
  mentor: string | null
  cliente_compareceu: boolean | null
}

function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) {
    const d = new Date(iso)
    return isNaN(d.getTime()) ? null : d
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = parseIso(iso)
  if (!d) return "—"
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = parseIso(iso)
  if (!d) return "—"
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = String(d.getFullYear())
  return `${dd}/${mm}/${yyyy}`
}

function ordinal(n: number): string {
  return `${n}ª`
}

export default function TabConsultores({ clientId }: { clientId: string }) {
  const [reunioes, setReunioes] = useState<Reuniao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from("reunioes_mentoria_new")
      .select("id_unico, data_reuniao, mentor, cliente_compareceu")
      .eq("id_cliente", clientId)
      .order("data_reuniao", { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setReunioes((data ?? []) as Reuniao[])
    setLoading(false)
  }

  useEffect(() => {
    load().catch((e) => {
      setError(e?.message || "Erro ao carregar consultores")
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const stats = useMemo(() => {
    const now = new Date()
    const realizadas = reunioes.filter(
      (r) => r.cliente_compareceu === true && parseIso(r.data_reuniao)! <= now
    )
    const futuras = reunioes
      .filter((r) => parseIso(r.data_reuniao)! > now)
      .sort((a, b) => parseIso(a.data_reuniao)!.getTime() - parseIso(b.data_reuniao)!.getTime())

    const total = reunioes.length
    const ultima = realizadas[0]?.data_reuniao ?? null
    const proxima = futuras[0]?.data_reuniao ?? null

    let mentorMaisAcionado: string | null = null
    if (realizadas.length > 0) {
      const counts: Record<string, number> = {}
      for (const r of realizadas) {
        if (!r.mentor) continue
        counts[r.mentor] = (counts[r.mentor] ?? 0) + 1
      }
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      if (top) mentorMaisAcionado = top[0]
    }

    let frequenciaMedia: string | null = null
    if (realizadas.length >= 2) {
      const sorted = [...realizadas].sort(
        (a, b) => parseIso(a.data_reuniao)!.getTime() - parseIso(b.data_reuniao)!.getTime()
      )
      let totalDays = 0
      for (let i = 1; i < sorted.length; i++) {
        const diff =
          (parseIso(sorted[i].data_reuniao)!.getTime() -
            parseIso(sorted[i - 1].data_reuniao)!.getTime()) /
          (1000 * 60 * 60 * 24)
        totalDays += diff
      }
      const avg = Math.round(totalDays / (sorted.length - 1))
      frequenciaMedia = `${avg}d`
    }

    const realizadasOrdenadasPorData = [...realizadas].sort(
      (a, b) => parseIso(a.data_reuniao)!.getTime() - parseIso(b.data_reuniao)!.getTime()
    )
    const ordinaisPorId: Record<string, number> = {}
    realizadasOrdenadasPorData.forEach((r, i) => {
      ordinaisPorId[r.id_unico] = i + 1
    })

    return { total, ultima, proxima, mentorMaisAcionado, frequenciaMedia, ordinaisPorId }
  }, [reunioes])

  async function handleDelete(reuniao: Reuniao) {
    if (!confirm("Excluir esta reunião?")) return
    const { error: delErr } = await supabase
      .from("reunioes_mentoria_new")
      .delete()
      .eq("id_unico", reuniao.id_unico)

    if (delErr) {
      setError(delErr.message)
      return
    }
    await load()
  }

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
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      )}

      <Card className="hover:translate-y-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UsersIcon className="size-4 text-yellow-400" />
            Consultores — Resumo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KpiCell label="Total de reuniões" value={String(stats.total)} />
            <KpiCell label="Última reunião" value={formatDate(stats.ultima)} />
            <KpiCell
              label="Consultor + acionado"
              value={stats.mentorMaisAcionado ?? "—"}
            />
            <KpiCell label="Frequência média" value={stats.frequenciaMedia ?? "—"} />
            <KpiCell label="Próxima agendada" value={formatDate(stats.proxima)} />
          </div>
        </CardContent>
      </Card>

      <Card className="hover:translate-y-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="size-4 text-yellow-400" />
            Reuniões registradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reunioes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma reunião com consultor registrada ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {reunioes.map((r) => {
                const realizada = r.cliente_compareceu === true
                const ord = stats.ordinaisPorId[r.id_unico]
                return (
                  <div
                    key={r.id_unico}
                    className="flex items-center gap-3 rounded-xl bg-muted/10 border border-border px-3 py-2"
                  >
                    <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {ord ? ordinal(ord) : "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">
                          {r.mentor || "Sem consultor definido"}
                        </span>
                        {realizada ? (
                          <span className="inline-flex items-center rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                            Realizada
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-destructive">
                            Faltou
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                        <CalendarIcon className="size-3.5" />
                        {formatDateLong(r.data_reuniao)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleDelete(r)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/10 border border-border px-4 py-4 flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="text-base font-bold tracking-tight text-foreground truncate">{value}</span>
    </div>
  )
}
