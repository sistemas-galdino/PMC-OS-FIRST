import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TargetIcon, CalendarIcon } from "@/components/ui/icons"
import { StatusBadgeToggle } from "@/components/status-badge-toggle"

const TOTAL_DEFAULT = 4
const TOTAL_OPTIONS = [4, 6, 12] as const

interface GaldinoMeeting {
  id_unico: string
  data_reuniao: string
  horario: string | null
  empresa: string | null
  pessoa: string | null
  nome_empresa_formatado: string | null
  nome_cliente_formatado: string | null
  cliente_compareceu: boolean | null
  nps: number | null
}

interface CicloData {
  realizadas: number
  totalGaldino: number
  dataEntrada: string | null
  meetings: GaldinoMeeting[]
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

function formatDateLong(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR")
}

function formatDateFromObj(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`
}

export default function TabCicloGaldino({ clientId }: { clientId: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<CicloData>({
    realizadas: 0,
    totalGaldino: TOTAL_DEFAULT,
    dataEntrada: null,
    meetings: [],
  })
  const [loading, setLoading] = useState(true)
  const [savingTotal, setSavingTotal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      const [realizadasRes, infoRes, listRes] = await Promise.all([
        supabase
          .from("reunioes_galdino")
          .select("id_cliente", { count: "exact", head: true })
          .eq("id_cliente", clientId)
          .eq("cliente_compareceu", true),
        supabase
          .from("cliente_informacoes_empresa")
          .select("data_entrada, total_galdino")
          .eq("id_cliente", clientId)
          .maybeSingle(),
        supabase
          .from("reunioes_galdino")
          .select(
            "id_unico, data_reuniao, horario, empresa, pessoa, nome_empresa_formatado, nome_cliente_formatado, cliente_compareceu, nps"
          )
          .eq("id_cliente", clientId)
          .order("data_reuniao", { ascending: false }),
      ])

      if (cancelled) return
      if (realizadasRes.error) {
        setError(realizadasRes.error.message)
        setLoading(false)
        return
      }

      setData({
        realizadas: realizadasRes.count ?? 0,
        totalGaldino: infoRes.data?.total_galdino ?? TOTAL_DEFAULT,
        dataEntrada: infoRes.data?.data_entrada ?? null,
        meetings: listRes.data ?? [],
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

  async function handleChangeTotal(next: string) {
    const value = Number(next)
    const previous = data.totalGaldino
    if (value === previous) return
    setData((d) => ({ ...d, totalGaldino: value })) // otimista
    setSavingTotal(true)
    const { error: upsertError } = await supabase
      .from("cliente_informacoes_empresa")
      .upsert({ id_cliente: clientId, total_galdino: value }, { onConflict: "id_cliente" })
    setSavingTotal(false)
    if (upsertError) {
      setData((d) => ({ ...d, totalGaldino: previous })) // rollback
      toast.error("Não foi possível salvar o ciclo. Tente novamente.")
      return
    }
    toast.success(`Ciclo Galdino definido para ${value} reuniões.`)
    window.dispatchEvent(new Event("galdino:changed")) // header atualiza
  }

  function handleStatusChange(idUnico: string, novo: boolean) {
    setData((d) => ({
      ...d,
      meetings: d.meetings.map((m) =>
        m.id_unico === idUnico ? { ...m, cliente_compareceu: novo } : m
      ),
    }))
  }

  const today = todayKey()
  const agendadas = data.meetings
    .filter((m) => m.data_reuniao > today)
    .sort((a, b) => a.data_reuniao.localeCompare(b.data_reuniao))
  const realizadasList = data.meetings
    .filter((m) => m.data_reuniao <= today)
    .sort((a, b) => b.data_reuniao.localeCompare(a.data_reuniao))

  const realizadas = data.realizadas
  const pendentes = Math.max(0, data.totalGaldino - realizadas)
  const proximaAgendada = agendadas[0]?.data_reuniao ?? null
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
        <CardHeader className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <TargetIcon className="size-4 text-yellow-400" />
            Ciclo Galdino
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Ciclo
            </span>
            <Select
              value={String(data.totalGaldino)}
              onValueChange={handleChangeTotal}
              disabled={savingTotal}
            >
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOTAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt} reuniões
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KpiCell label="Total" value={String(data.totalGaldino)} valueClass="text-foreground" />
            <KpiCell label="Realizadas" value={String(realizadas)} valueClass="text-emerald-400" />
            <KpiCell label="Pendentes" value={String(pendentes)} valueClass="text-yellow-400" />
            <KpiCell
              label="Próxima agendada"
              value={formatDateShort(proximaAgendada)}
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

      <MeetingSection
        title="Agendadas"
        meetings={agendadas}
        emptyText="Nenhuma reunião agendada."
        onOpen={(id) => navigate(`/reuniao-galdino/${id}`)}
        onStatusChange={handleStatusChange}
      />

      <MeetingSection
        title="Realizadas"
        meetings={realizadasList}
        emptyText="Nenhuma reunião realizada."
        onOpen={(id) => navigate(`/reuniao-galdino/${id}`)}
        onStatusChange={handleStatusChange}
      />
    </motion.div>
  )
}

function MeetingSection({
  title,
  meetings,
  emptyText,
  onOpen,
  onStatusChange,
}: {
  title: string
  meetings: GaldinoMeeting[]
  emptyText: string
  onOpen: (idUnico: string) => void
  onStatusChange: (idUnico: string, novo: boolean) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
        <span className="text-[10px] font-bold text-muted-foreground/60">({meetings.length})</span>
      </div>

      {meetings.length === 0 ? (
        <Card className="hover:translate-y-0">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {emptyText}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meetings.map((m) => (
            <GaldinoMeetingCard
              key={m.id_unico}
              meeting={m}
              onOpen={() => onOpen(m.id_unico)}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GaldinoMeetingCard({
  meeting,
  onOpen,
  onStatusChange,
}: {
  meeting: GaldinoMeeting
  onOpen: () => void
  onStatusChange: (idUnico: string, novo: boolean) => void
}) {
  const nome =
    meeting.nome_cliente_formatado || meeting.pessoa || meeting.empresa || "Sem identificação"
  const empresa = meeting.nome_empresa_formatado || meeting.empresa || ""

  return (
    <Card
      onClick={onOpen}
      className="cursor-pointer hover:border-primary/30 transition-all duration-300"
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <h4 className="font-bold text-sm text-foreground leading-tight line-clamp-1">{nome}</h4>
            {empresa && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest line-clamp-1">
                {empresa}
              </p>
            )}
          </div>
          <StatusBadgeToggle
            compareceu={meeting.cliente_compareceu}
            dataReuniao={meeting.data_reuniao}
            idUnico={meeting.id_unico}
            tabela="reunioes_galdino"
            isAdmin
            onChange={(novo) => onStatusChange(meeting.id_unico, novo)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-3 text-[11px] font-semibold text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-3.5 text-primary/60" />
            <span className="uppercase tracking-widest">{formatDateLong(meeting.data_reuniao)}</span>
            {meeting.horario && <span className="text-border">|</span>}
            {meeting.horario && <span>{meeting.horario}</span>}
          </div>
          {meeting.nps != null && (
            <span>
              NPS: <span className="text-primary font-bold">{meeting.nps}</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
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
