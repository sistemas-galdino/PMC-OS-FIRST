import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { CalendarIcon, ChevronRightIcon, XIcon } from "@/components/ui/icons"

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

interface DatePickerProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  compact?: boolean
  clearable?: boolean
  className?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecionar data",
  compact = false,
  clearable = true,
  className = "",
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [flipUp, setFlipUp] = useState(false)
  const selected = value ? new Date(value + "T00:00:00") : null
  const [viewMonth, setViewMonth] = useState(() => {
    const base = selected ?? new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function esc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", handler)
    document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("keydown", esc)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const popoverHeight = compact ? 280 : 320
    const spaceBelow = window.innerHeight - rect.bottom
    setFlipUp(spaceBelow < popoverHeight + 16 && rect.top > popoverHeight + 16)
  }, [open, compact])

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { date: Date; outside: boolean }[] = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), outside: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), outside: false })
  }
  while (cells.length < 42) {
    const next = cells.length - (firstDayOfWeek + daysInMonth) + 1
    cells.push({ date: new Date(year, month + 1, next), outside: true })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  }
  function fmt(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${d.getFullYear()}-${mm}-${dd}`
  }

  const displayLabel = selected
    ? selected.toLocaleDateString("pt-BR", compact ? { day: "2-digit", month: "2-digit", year: "2-digit" } : { day: "2-digit", month: "long", year: "numeric" })
    : placeholder

  const cellSize = compact ? "size-7 text-[11px]" : "size-9 text-sm"
  const popoverWidth = compact ? "w-[252px]" : "w-[300px]"
  const triggerHeight = compact ? "h-11" : "h-11"

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 ${triggerHeight} w-full px-3 rounded-xl border border-border bg-background text-sm font-medium transition-all hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed ${selected ? "text-foreground" : "text-muted-foreground"}`}
      >
        <CalendarIcon className="size-4 text-primary shrink-0" />
        <span className="flex-1 text-left capitalize truncate">{displayLabel}</span>
        {clearable && selected && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange("") }}
            className="size-5 rounded-md flex items-center justify-center hover:bg-muted/40 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Limpar data"
          >
            <XIcon className="size-3" />
          </span>
        )}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: flipUp ? 4 : -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          className={`absolute z-50 ${popoverWidth} ${flipUp ? "bottom-full mb-2" : "top-full mt-2"} left-0 p-3 rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="size-7 rounded-lg border border-border hover:bg-muted/30 flex items-center justify-center transition-colors"
              aria-label="Mês anterior"
            >
              <ChevronRightIcon className="size-3.5 rotate-180 text-muted-foreground" />
            </button>
            <div className="font-bold text-xs text-foreground capitalize tracking-wide">
              {MONTHS[month]} {year}
            </div>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="size-7 rounded-lg border border-border hover:bg-muted/30 flex items-center justify-center transition-colors"
              aria-label="Próximo mês"
            >
              <ChevronRightIcon className="size-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground text-center py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map(({ date, outside }, i) => {
              const isSelected = selected ? isSameDay(date, selected) : false
              const isToday = isSameDay(date, today)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { onChange(fmt(date)); setOpen(false) }}
                  className={`${cellSize} rounded-lg font-medium transition-all flex items-center justify-center ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30"
                      : outside
                        ? "text-muted-foreground/30 hover:bg-muted/20"
                        : isToday
                          ? "border border-primary/40 text-primary hover:bg-primary/10"
                          : "text-foreground hover:bg-muted/30"
                  }`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border">
            <button
              type="button"
              onClick={() => { onChange(fmt(today)); setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setOpen(false) }}
              className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
            >
              Hoje
            </button>
            {clearable && selected && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false) }}
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive"
              >
                Limpar
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
