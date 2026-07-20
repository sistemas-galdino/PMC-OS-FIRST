// Admin → Registro de Downloads. Lista tudo que os clientes baixaram no PMC OS
// (skills, multiplicadores, gravações, arquivos), com filtros e export CSV.
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DownloadIcon as Download,
  SearchIcon as Search,
  ExternalLinkIcon as ExternalLink,
} from "@/components/ui/icons"
import { exportarCsv } from "@/lib/export-csv"

interface LogRow {
  id: string
  cliente_nome: string | null
  empresa: string | null
  tipo: string
  recurso_nome: string | null
  recurso_id: string | null
  url: string | null
  created_at: string
}

const TIPO_META: Record<string, { label: string; cls: string }> = {
  skill: { label: "Skill", cls: "bg-primary/10 text-primary border-primary/25" },
  multiplicador: { label: "Multiplicador", cls: "bg-violet-500/10 text-violet-400 border-violet-500/25" },
  gravacao: { label: "Gravação", cls: "bg-sky-500/10 text-sky-400 border-sky-500/25" },
  estudo_caso: { label: "Estudo de caso", cls: "bg-amber-500/10 text-amber-400 border-amber-500/25" },
  arquivo: { label: "Arquivo", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" },
  outro: { label: "Outro", cls: "bg-muted/30 text-muted-foreground border-border" },
}

const dt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })

export default function LogsDownloadPage() {
  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos")

  useEffect(() => {
    supabase
      .from("download_logs")
      .select("id, cliente_nome, empresa, tipo, recurso_nome, recurso_id, url, created_at")
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data }) => { setRows((data ?? []) as LogRow[]); setLoading(false) })
  }, [])

  const tiposPresentes = useMemo(() => Array.from(new Set(rows.map((r) => r.tipo))), [rows])
  const filtradas = useMemo(() => rows.filter((r) => {
    if (tipoFiltro !== "todos" && r.tipo !== tipoFiltro) return false
    if (!busca.trim()) return true
    const q = busca.toLowerCase()
    return [r.cliente_nome, r.empresa, r.recurso_nome, r.tipo].some((v) => (v ?? "").toLowerCase().includes(q))
  }), [rows, tipoFiltro, busca])

  const porTipo = useMemo(() => {
    const m: Record<string, number> = {}
    rows.forEach((r) => { m[r.tipo] = (m[r.tipo] ?? 0) + 1 })
    return m
  }, [rows])

  function exportar() {
    exportarCsv(
      `downloads-pmc-${new Date().toISOString().slice(0, 10)}`,
      [
        { chave: "created_at", titulo: "Data", valor: (r) => dt(r.created_at) },
        { chave: "empresa", titulo: "Empresa", valor: (r) => r.empresa ?? "" },
        { chave: "cliente_nome", titulo: "Cliente", valor: (r) => r.cliente_nome ?? "" },
        { chave: "tipo", titulo: "Tipo", valor: (r) => TIPO_META[r.tipo]?.label ?? r.tipo },
        { chave: "recurso_nome", titulo: "Recurso", valor: (r) => r.recurso_nome ?? "" },
        { chave: "url", titulo: "URL", valor: (r) => r.url ?? "" },
      ],
      filtradas,
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Registro de Downloads"
        description="Tudo que os clientes baixaram no PMC OS — skills, multiplicadores, gravações e arquivos."
        action={
          <Button onClick={exportar} disabled={filtradas.length === 0} className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider">
            <Download className="size-4" /> Exportar CSV
          </Button>
        }
      />

      {/* Resumo por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold tabular-nums">{rows.length}</p><p className="text-[11px] font-medium text-muted-foreground">Total</p></CardContent></Card>
        {Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
          <Card key={t}><CardContent className="p-4"><p className="text-2xl font-bold tabular-nums">{n}</p><p className="text-[11px] font-medium text-muted-foreground">{TIPO_META[t]?.label ?? t}</p></CardContent></Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
          <Input placeholder="Buscar por empresa, cliente ou recurso..." className="pl-11 h-11 rounded-xl" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setTipoFiltro("todos")} className={`rounded-xl px-3 py-1.5 text-[12px] font-bold border transition-colors ${tipoFiltro === "todos" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground border-border hover:text-foreground"}`}>Todos</button>
          {tiposPresentes.map((t) => (
            <button key={t} onClick={() => setTipoFiltro(t)} className={`rounded-xl px-3 py-1.5 text-[12px] font-bold border transition-colors ${tipoFiltro === t ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground border-border hover:text-foreground"}`}>{TIPO_META[t]?.label ?? t}</button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 rounded-xl bg-muted/20 animate-pulse" />)}</div>
          ) : filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Download className="size-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum download registrado {rows.length > 0 ? "com esse filtro" : "ainda"}.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtradas.map((r) => {
                const meta = TIPO_META[r.tipo] ?? TIPO_META.outro
                return (
                  <div key={r.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="w-32 shrink-0">
                      <p className="text-[12px] font-medium text-muted-foreground tabular-nums">{dt(r.created_at)}</p>
                    </div>
                    <Badge variant="outline" className={`rounded-md text-[10px] font-bold shrink-0 w-28 justify-center ${meta.cls}`}>{meta.label}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-foreground truncate">{r.recurso_nome || r.recurso_id || "—"}</p>
                      <p className="text-[11px] font-medium text-muted-foreground truncate">
                        {r.empresa || "—"}{r.cliente_nome ? ` · ${r.cliente_nome}` : ""}
                      </p>
                    </div>
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground hover:text-primary" title="Abrir recurso">
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
