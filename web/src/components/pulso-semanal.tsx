// Pulso Semanal do Dono — o loop semanal do PMC OS (padrão EOS Scorecard).
// 60 segundos: 3 números do negócio + confiança 0-10 + destaque opcional.
// Mantém a sequência (streak de semanas consecutivas) e rende +20 Pontos MC.
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle2Icon as CheckCircle2,
  Edit3Icon as Edit3,
  TrendingUpIcon as TrendingUp,
} from "@/components/ui/icons"
import { toast } from "sonner"
import { motion } from "framer-motion"

interface Pulso {
  id: string
  semana: string
  faturamento: number | null
  vendas: number | null
  leads: number | null
  confianca: number
  destaque: string | null
}

// Segunda-feira (ISO) da semana de uma data, no fuso local.
export function segundaDaSemana(d: Date): string {
  const dt = new Date(d)
  const dia = dt.getDay() // 0=dom
  const diff = dia === 0 ? -6 : 1 - dia
  dt.setDate(dt.getDate() + diff)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, "0")
  const day = String(dt.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Streak: semanas consecutivas com pulso, terminando na semana atual ou anterior.
export function calcularStreak(semanas: string[], hoje = new Date()): number {
  if (semanas.length === 0) return 0
  const set = new Set(semanas)
  let cursor = segundaDaSemana(hoje)
  // a sequência pode "ainda estar viva" se a semana atual não foi respondida
  if (!set.has(cursor)) {
    const d = new Date(cursor + "T00:00:00")
    d.setDate(d.getDate() - 7)
    cursor = segundaDaSemana(d)
    if (!set.has(cursor)) return 0
  }
  let streak = 0
  while (set.has(cursor)) {
    streak++
    const d = new Date(cursor + "T00:00:00")
    d.setDate(d.getDate() - 7)
    cursor = segundaDaSemana(d)
  }
  return streak
}

const fmtNum = (v: number | null) =>
  v == null ? "—" : v >= 1000 ? v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : String(v)

function varPct(atual: number | null, anterior: number | null): string | null {
  if (atual == null || anterior == null || anterior === 0) return null
  const p = Math.round(((atual - anterior) / Math.abs(anterior)) * 100)
  return `${p > 0 ? "+" : ""}${p}%`
}

export function PulsoSemanalCard({ clientId }: { clientId: string }) {
  const [pulsos, setPulsos] = useState<Pulso[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ faturamento: "", vendas: "", leads: "", confianca: 7, destaque: "" })

  const semanaAtual = segundaDaSemana(new Date())

  useEffect(() => {
    let cancel = false
    supabase
      .from("pulso_semanal")
      .select("id, semana, faturamento, vendas, leads, confianca, destaque")
      .eq("id_cliente", clientId)
      .order("semana", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (cancel) return
        setPulsos((data ?? []) as Pulso[])
        setLoading(false)
      })
    return () => { cancel = true }
  }, [clientId])

  const atual = useMemo(() => pulsos.find((p) => p.semana === semanaAtual) ?? null, [pulsos, semanaAtual])
  const anterior = useMemo(() => pulsos.find((p) => p.semana < semanaAtual) ?? null, [pulsos, semanaAtual])
  const streak = useMemo(() => calcularStreak(pulsos.map((p) => p.semana)), [pulsos])

  function abrirForm() {
    setForm({
      faturamento: atual?.faturamento != null ? String(atual.faturamento) : "",
      vendas: atual?.vendas != null ? String(atual.vendas) : "",
      leads: atual?.leads != null ? String(atual.leads) : "",
      confianca: atual?.confianca ?? 7,
      destaque: atual?.destaque ?? "",
    })
    setEditando(true)
  }

  async function salvar() {
    setSalvando(true)
    const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\./g, "").replace(",", ".")))
    const payload = {
      id_cliente: clientId,
      semana: semanaAtual,
      faturamento: num(form.faturamento),
      vendas: num(form.vendas),
      leads: num(form.leads),
      confianca: form.confianca,
      destaque: form.destaque.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from("pulso_semanal")
      .upsert(payload, { onConflict: "id_cliente,semana" })
      .select("id, semana, faturamento, vendas, leads, confianca, destaque")
      .single()
    setSalvando(false)
    if (error) { toast.error("Não consegui salvar o pulso."); return }
    const jaExistia = !!atual
    setPulsos((prev) => [data as Pulso, ...prev.filter((p) => p.semana !== semanaAtual)])
    setEditando(false)
    if (!jaExistia) {
      toast.success(`📊 Pulso respondido! +20 Pontos MC · 🔥 ${streak + 1} semana${streak + 1 === 1 ? "" : "s"}`)
    } else {
      toast.success("Pulso atualizado.")
    }
  }

  if (loading) return <div className="h-28 rounded-2xl bg-card/40 animate-pulse" />

  // ---- estado: respondido e fora de edição ----
  if (atual && !editando) {
    return (
      <Card className="border-primary/25">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/15 p-2 rounded-lg shrink-0">
                <CheckCircle2 className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Pulso desta semana ✓</p>
                <p className="text-[12px] font-bold text-foreground">🔥 {streak} semana{streak === 1 ? "" : "s"} de sequência</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-center">
              {[
                { l: "Faturamento", v: fmtNum(atual.faturamento), d: varPct(atual.faturamento, anterior?.faturamento ?? null) },
                { l: "Vendas", v: fmtNum(atual.vendas), d: varPct(atual.vendas, anterior?.vendas ?? null) },
                { l: "Leads", v: fmtNum(atual.leads), d: varPct(atual.leads, anterior?.leads ?? null) },
                { l: "Confiança", v: `${atual.confianca}/10`, d: anterior ? varPct(atual.confianca, anterior.confianca) : null },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-[13px] font-bold tabular-nums text-foreground">{s.v}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {s.l}{s.d && <span className={s.d.startsWith("+") ? " text-emerald-400" : " text-rose-400"}> {s.d}</span>}
                  </p>
                </div>
              ))}
            </div>
            <button onClick={abrirForm} className="text-muted-foreground hover:text-primary transition-colors" title="Editar pulso">
              <Edit3 className="size-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ---- estado: pendente (ou editando) ----
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-primary/40 bg-primary/[0.05]">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/15 p-2 rounded-lg shrink-0">
                <TrendingUp className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Pulso Semanal · 60 segundos</p>
                <p className="text-[13px] font-bold text-foreground">Como foi a semana do seu negócio?</p>
              </div>
            </div>
            {streak > 0 && (
              <span className="text-[11px] font-bold text-amber-400">🔥 {streak} semana{streak === 1 ? "" : "s"} — não quebre a sequência</span>
            )}
          </div>

          {!editando ? (
            <Button onClick={abrirForm} className="h-10 w-full sm:w-auto gap-2 rounded-xl font-bold text-xs uppercase tracking-wider">
              Responder agora (+20 pts MC)
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: "faturamento" as const, l: "Faturamento (R$)", ph: "85000" },
                  { k: "vendas" as const, l: "Vendas fechadas", ph: "12" },
                  { k: "leads" as const, l: "Leads novos", ph: "40" },
                ].map((c) => (
                  <div key={c.k}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{c.l}</p>
                    <Input
                      inputMode="decimal"
                      className="h-10 rounded-xl text-[13px]"
                      placeholder={c.ph}
                      value={form[c.k]}
                      onChange={(e) => setForm((p) => ({ ...p, [c.k]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Confiança no negócio esta semana: <span className="text-primary text-[12px]">{form.confianca}/10</span>
                </p>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={form.confianca}
                  onChange={(e) => setForm((p) => ({ ...p, confianca: Number(e.target.value) }))}
                  className="w-full accent-[var(--color-primary)]"
                />
              </div>
              <Textarea
                className="rounded-xl min-h-14 text-[13px]"
                placeholder="Opcional: a melhor coisa (ou a maior trava) da semana em uma frase."
                value={form.destaque}
                onChange={(e) => setForm((p) => ({ ...p, destaque: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <Button disabled={salvando} onClick={salvar} className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider">
                  {salvando ? "Salvando..." : "Salvar pulso"}
                </Button>
                <Button variant="ghost" onClick={() => setEditando(false)} className="h-10 rounded-xl text-xs font-bold text-muted-foreground">
                  Depois
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
