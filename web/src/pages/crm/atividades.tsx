import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { NovaAtividadeModal } from "@/components/crm/NovaAtividadeModal"
import { useProfile } from "@/lib/crm/storage"
import {
  IndicadoresAtividades,
  type CardId,
} from "@/components/crm/IndicadoresAtividades"
import { DetalhamentoAtividades } from "@/components/crm/DetalhamentoAtividades"
import { RotinasPanel } from "@/components/crm/RotinasPanel"

type PeriodoTipo = "semana" | "mes" | "custom"
type AbaTipo = "atividades" | "rotinas"

// ===== date helpers (puro, em memória) =====
function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function parseISODate(v?: string | null): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const [y, m, d] = v.split("-").map(Number)
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0)
  return isNaN(dt.getTime()) ? null : dt
}
function fmtDM(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
}
function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
/** Segunda a sexta da semana da data informada */
function semanaUtil(ref: Date): { inicio: Date; fim: Date } {
  const day = ref.getDay() // 0 dom
  const monday = addDays(ref, -((day + 6) % 7))
  monday.setHours(12, 0, 0, 0)
  return { inicio: monday, fim: addDays(monday, 4) }
}
function mesRange(ref: Date): { inicio: Date; fim: Date } {
  return {
    inicio: new Date(ref.getFullYear(), ref.getMonth(), 1, 12, 0, 0, 0),
    fim: new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 12, 0, 0, 0),
  }
}

const TIPOS: { id: PeriodoTipo; label: string }[] = [
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "custom", label: "Período" },
]

export default function CrmAtividadesPage() {
  const [profile] = useProfile()
  // O estado da tela vive na URL, como no original (lá era o search validado
  // do TanStack Router; aqui, useSearchParams do react-router).
  const [searchParams, setSearchParams] = useSearchParams()
  const [openNew, setOpenNew] = useState(false)
  const [selected, setSelected] = useState<CardId | null>(null)
  const [agendarCliente, setAgendarCliente] = useState<string | null>(null)

  const hoje = useMemo(() => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return d
  }, [])

  const periodoParam = searchParams.get("periodo")
  const tipo: PeriodoTipo =
    periodoParam === "mes" || periodoParam === "custom" ? periodoParam : "semana"
  const inicioParam = searchParams.get("inicio")
  const fimParam = searchParams.get("fim")
  const secao = searchParams.get("secao") ?? undefined
  const aba: AbaTipo = searchParams.get("aba") === "rotinas" ? "rotinas" : "atividades"

  // Intervalo efetivo derivado da URL (com fallback no período corrente)
  const { inicio, fim } = useMemo(() => {
    const i = parseISODate(inicioParam)
    const f = parseISODate(fimParam)
    if (tipo === "custom") {
      return { inicio: i ?? hoje, fim: f ?? (i ?? hoje) }
    }
    const base = i ?? hoje
    return tipo === "mes" ? mesRange(base) : semanaUtil(base)
  }, [tipo, inicioParam, fimParam, hoje])

  function apply(next: { periodo: PeriodoTipo; inicio: Date; fim: Date }) {
    const p = new URLSearchParams()
    p.set("periodo", next.periodo)
    p.set("inicio", toISODate(next.inicio))
    p.set("fim", toISODate(next.fim))
    p.set("aba", aba)
    if (secao) p.set("secao", secao)
    setSearchParams(p, { replace: true })
  }

  function trocarAba(a: AbaTipo) {
    const p = new URLSearchParams()
    p.set("periodo", tipo)
    p.set("inicio", toISODate(inicio))
    p.set("fim", toISODate(fim))
    p.set("aba", a)
    if (a === "rotinas" && secao) p.set("secao", secao)
    setSearchParams(p, { replace: true })
  }

  function trocarTipo(t: PeriodoTipo) {
    if (t === "semana") {
      apply({ periodo: t, ...semanaUtil(hoje) })
    } else if (t === "mes") {
      apply({ periodo: t, ...mesRange(hoje) })
    } else {
      apply({ periodo: t, inicio, fim })
    }
  }

  function shift(dir: -1 | 1) {
    if (tipo === "semana") {
      apply({ periodo: tipo, ...semanaUtil(addDays(inicio, dir * 7)) })
    } else if (tipo === "mes") {
      apply({
        periodo: tipo,
        ...mesRange(new Date(inicio.getFullYear(), inicio.getMonth() + dir, 1, 12)),
      })
    } else {
      const span = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1)
      apply({
        periodo: tipo,
        inicio: addDays(inicio, dir * span),
        fim: addDays(fim, dir * span),
      })
    }
  }

  const primeiroNome = (profile ?? "").split(" ")[0]
  const label = `${fmtDM(inicio)} – ${fmtDM(fim)}`

  return (
    <div>
      <header className="max-w-[1100px]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">
            Atividades{primeiroNome ? ` · ${primeiroNome}` : ""}
          </h1>
          <button
            onClick={() => setOpenNew(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Nova Atividade
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <div className="inline-flex bg-card border border-border rounded-lg p-1">
            {TIPOS.map((t) => (
              <button
                key={t.id}
                onClick={() => trocarTipo(t.id)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  tipo === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1">
            <button
              onClick={() => shift(-1)}
              aria-label="Período anterior"
              title="Período anterior"
              className="h-8 w-8 grid place-items-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm text-foreground tabular-nums">{label}</span>
            <button
              onClick={() => shift(1)}
              aria-label="Próximo período"
              title="Próximo período"
              className="h-8 w-8 grid place-items-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {tipo === "custom" && (
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="date"
                value={toISODate(inicio)}
                onChange={(e) => {
                  const d = parseISODate(e.target.value)
                  if (d) apply({ periodo: "custom", inicio: d, fim: d > fim ? d : fim })
                }}
                className="bg-card border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
              <span>até</span>
              <input
                type="date"
                value={toISODate(fim)}
                onChange={(e) => {
                  const d = parseISODate(e.target.value)
                  if (d) apply({ periodo: "custom", inicio: d < inicio ? d : inicio, fim: d })
                }}
                className="bg-card border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </div>
      </header>

      {/* Indicadores */}
      <IndicadoresAtividades
        cs={profile ?? null}
        inicio={inicio}
        fim={fim}
        hoje={hoje}
        selected={selected}
        onSelect={(id) => setSelected((prev) => (prev === id ? null : id))}
      />

      {/* Abas */}
      <div className="mt-8 border-b border-border flex items-center gap-1">
        {([
          { id: "atividades" as const, label: "Atividades" },
          { id: "rotinas" as const, label: "Rotinas" },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => trocarAba(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              aba === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {aba === "atividades" ? (
          <DetalhamentoAtividades
            cs={profile ?? null}
            inicio={inicio}
            fim={fim}
            hoje={hoje}
            selected={selected}
            onClear={() => setSelected(null)}
            onAgendar={(clienteId) => setAgendarCliente(clienteId)}
          />
        ) : (
          <RotinasPanel secao={secao} />
        )}
      </div>

      {openNew && <NovaAtividadeModal onClose={() => setOpenNew(false)} />}
      {agendarCliente && (
        <NovaAtividadeModal
          defaultClienteId={agendarCliente}
          onClose={() => setAgendarCliente(null)}
        />
      )}
    </div>
  )
}
