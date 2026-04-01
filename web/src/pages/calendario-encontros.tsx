import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { CalendarIcon, ClockIcon, ChevronRightIcon, VideoIcon, PlayCircleIcon } from "@/components/ui/icons"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

interface Encontro {
  id_unico: string
  tipo_encontro: string
  titulo_formatado: string
  titulo_original: string
  data_encontro: string
  horario_inicio: string
  horario_fim: string
  data_hora_inicio_iso: string
  data_hora_fim_iso: string
  link_google_meet: string | null
  link_gravacao: string | null
  status: string
  timezone: string
}

const TIPO_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  multiplica_time_nivel_1: { bg: "bg-primary/15", text: "text-primary", border: "border-primary/30", dot: "bg-primary" },
  multiplica_time_nivel_2: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
  multiplica_dono: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
  multiplica_case: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" },
}

const TIPO_LABELS: Record<string, string> = {
  multiplica_time_nivel_1: "Multiplica Time – Nível 01",
  multiplica_time_nivel_2: "Multiplica Time – Nível 02",
  multiplica_dono: "Multiplica Dono",
  multiplica_case: "Multiplica Case",
}

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number)
  return new Date(year, month - 1, day)
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()
}

function generateGoogleCalendarUrl(encontro: Encontro): string {
  const start = encontro.data_hora_inicio_iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const end = encontro.data_hora_fim_iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const startClean = start.replace(/[+-]\d{2}:\d{2}$/, "").replace(/[+-]\d{4}$/, "")
  const endClean = end.replace(/[+-]\d{2}:\d{2}$/, "").replace(/[+-]\d{4}$/, "")

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: encontro.titulo_formatado,
    dates: `${startClean}/${endClean}`,
    ctz: encontro.timezone || "America/Fortaleza",
    details: `Encontro ao vivo do Programa Multiplicador de Crescimento\n\nLink do Meet: ${encontro.link_google_meet || "A definir"}`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const target = new Date(targetDate).getTime()

    function update() {
      const now = Date.now()
      const diff = Math.max(0, target - now)
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  const units = [
    { value: timeLeft.days, label: "DIAS" },
    { value: timeLeft.hours, label: "HORAS" },
    { value: timeLeft.minutes, label: "MIN" },
    { value: timeLeft.seconds, label: "SEG" },
  ]

  return (
    <div className="flex gap-3">
      {units.map((unit) => (
        <div key={unit.label} className="flex flex-col items-center">
          <span className="text-2xl md:text-3xl font-black text-primary tabular-nums leading-none">
            {String(unit.value).padStart(2, "0")}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground tracking-[0.2em] mt-1.5">{unit.label}</span>
        </div>
      ))}
    </div>
  )
}

function CalendarGrid({ month, year, encontros, onNavigate }: { month: number; year: number; encontros: Encontro[]; onNavigate: (dir: number) => void }) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const today = new Date()

  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = []

  for (let i = 0; i < startDayOfWeek; i++) currentWeek.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  function getEncontrosForDay(day: number): Encontro[] {
    const date = new Date(year, month, day)
    return encontros.filter(e => isSameDay(parseDate(e.data_encontro), date))
  }

  const isToday = (day: number) => isSameDay(new Date(year, month, day), today)

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <button
          onClick={() => onNavigate(-1)}
          className="size-9 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
        >
          <ChevronRightIcon className="size-5 rotate-180" />
        </button>
        <h3 className="text-lg font-bold tracking-tight">
          {MONTHS[month]} {year}
        </h3>
        <button
          onClick={() => onNavigate(1)}
          className="size-9 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-border/50">
        {WEEKDAYS.map(day => (
          <div key={day} className="px-2 py-3 text-center text-[11px] font-bold text-muted-foreground tracking-[0.15em]">
            {day}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-border/30 last:border-b-0">
          {week.map((day, di) => {
            const dayEncontros = day ? getEncontrosForDay(day) : []
            const todayClass = day && isToday(day) ? "bg-primary/5" : ""

            return (
              <div
                key={di}
                className={`min-h-[120px] md:min-h-[140px] p-1.5 md:p-2 border-r border-border/20 last:border-r-0 ${todayClass} ${!day ? "bg-muted/5" : ""}`}
              >
                {day && (
                  <>
                    <span className={`text-xs font-semibold inline-flex items-center justify-center size-6 rounded-full ${isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayEncontros.map(enc => {
                        const colors = TIPO_COLORS[enc.tipo_encontro] || TIPO_COLORS.multiplica_time_nivel_1
                        const isPast = new Date(enc.data_hora_inicio_iso) < new Date()

                        return (
                          <div
                            key={enc.id_unico}
                            className={`rounded-lg p-1.5 md:p-2 border ${colors.bg} ${colors.border} ${isPast ? "opacity-60" : ""}`}
                          >
                            <p className={`text-[10px] md:text-xs font-bold leading-tight ${colors.text}`}>
                              {enc.titulo_formatado}
                            </p>
                            <p className="text-[9px] md:text-[10px] text-muted-foreground mt-0.5 font-medium">
                              {enc.horario_inicio} às {enc.horario_fim}
                            </p>
                            {!isPast && (
                              <div className="mt-1.5 space-y-1 hidden md:block">
                                {enc.link_google_meet && (
                                  <a
                                    href={enc.link_google_meet}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[9px] font-bold text-primary-foreground bg-primary/90 hover:bg-primary rounded px-1.5 py-0.5 transition-colors w-fit"
                                  >
                                    <VideoIcon className="size-2.5" />
                                    Entrar
                                  </a>
                                )}
                                <a
                                  href={generateGoogleCalendarUrl(enc)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <CalendarIcon className="size-2.5" />
                                  Salvar na agenda
                                </a>
                              </div>
                            )}
                            {isPast && enc.link_gravacao && (
                              <a
                                href={enc.link_gravacao}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 mt-1.5 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:flex"
                              >
                                <PlayCircleIcon className="size-2.5" />
                                Ver gravação
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </Card>
  )
}

export default function CalendarioEncontrosPage() {
  const [encontros, setEncontros] = useState<Encontro[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  useEffect(() => {
    async function fetchEncontros() {
      try {
        const { data, error } = await supabase
          .from("encontros_ao_vivo")
          .select("id_unico, tipo_encontro, titulo_formatado, titulo_original, data_encontro, horario_inicio, horario_fim, data_hora_inicio_iso, data_hora_fim_iso, link_google_meet, link_gravacao, status, timezone")
          .order("data_hora_inicio_iso", { ascending: true })

        if (error) throw error
        setEncontros(data || [])
      } catch (err) {
        console.error("Erro ao buscar encontros:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchEncontros()
  }, [])

  const proximoEncontro = useMemo(() => {
    const now = new Date()
    return encontros.find(e => new Date(e.data_hora_inicio_iso) > now) || null
  }, [encontros])

  function handleNavigate(direction: number) {
    let newMonth = currentMonth + direction
    let newYear = currentYear
    if (newMonth > 11) { newMonth = 0; newYear++ }
    if (newMonth < 0) { newMonth = 11; newYear-- }
    setCurrentMonth(newMonth)
    setCurrentYear(newYear)
  }

  if (loading) {
    return (
      <div className="space-y-8 pt-14">
        <div className="space-y-3">
          <div className="h-10 w-80 bg-muted/30 rounded-xl animate-pulse" />
          <div className="h-5 w-96 bg-muted/20 rounded-lg animate-pulse" />
        </div>
        <div className="h-32 bg-muted/20 rounded-2xl animate-pulse" />
        <div className="h-[500px] bg-muted/20 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pt-14">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <CalendarIcon className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Calendário de Encontros
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Encontros ao vivo do Programa Multiplicador de Crescimento
            </p>
          </div>
        </div>
      </motion.div>

      {/* Proximo Encontro */}
      {proximoEncontro && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-primary/20 bg-card/80 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
            <CardContent className="p-6 md:p-8 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold tracking-[0.15em] uppercase px-3 py-1">
                    Próximo Encontro
                  </Badge>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">
                    {proximoEncontro.titulo_formatado}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <ClockIcon className="size-4" />
                    <span>
                      {proximoEncontro.data_encontro} • {proximoEncontro.horario_inicio} às {proximoEncontro.horario_fim} (Horário de Brasília)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    {proximoEncontro.link_google_meet && (
                      <a
                        href={proximoEncontro.link_google_meet}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                      >
                        <VideoIcon className="size-3.5" />
                        Entrar no Encontro
                      </a>
                    )}
                    <a
                      href={generateGoogleCalendarUrl(proximoEncontro)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border border-border/50 text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-muted/20 transition-all"
                    >
                      <CalendarIcon className="size-3.5" />
                      Salvar na Agenda
                    </a>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <CountdownTimer targetDate={proximoEncontro.data_hora_inicio_iso} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex flex-wrap items-center gap-4"
      >
        {Object.entries(TIPO_LABELS).map(([key, label]) => {
          const colors = TIPO_COLORS[key]
          return (
            <div key={key} className="flex items-center gap-2">
              <div className={`size-2.5 rounded-full ${colors.dot}`} />
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            </div>
          )
        })}
      </motion.div>

      {/* Calendar Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <CalendarGrid
          month={currentMonth}
          year={currentYear}
          encontros={encontros}
          onNavigate={handleNavigate}
        />
      </motion.div>

      {/* Upcoming List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-bold tracking-tight">Próximos Encontros</h3>
        <div className="grid gap-3">
          {encontros
            .filter(e => new Date(e.data_hora_inicio_iso) > new Date())
            .map((enc, i) => {
              const colors = TIPO_COLORS[enc.tipo_encontro] || TIPO_COLORS.multiplica_time_nivel_1
              return (
                <motion.div
                  key={enc.id_unico}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.04 }}
                >
                  <Card className="border-border/30 bg-card/50 backdrop-blur-sm hover:border-border/60 transition-all group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`size-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${colors.text}`}>{enc.titulo_formatado}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {enc.data_encontro} • {enc.horario_inicio} às {enc.horario_fim}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {enc.link_google_meet && (
                          <a
                            href={enc.link_google_meet}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                          >
                            <VideoIcon className="size-3" />
                            Entrar
                          </a>
                        )}
                        <a
                          href={generateGoogleCalendarUrl(enc)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-muted/20"
                        >
                          <CalendarIcon className="size-3" />
                          <span className="hidden md:inline">Salvar</span>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
        </div>
      </motion.div>
    </div>
  )
}
