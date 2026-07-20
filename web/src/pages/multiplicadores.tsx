// Conhecimento → Multiplicadores: galeria de projetos completos PMC prontos
// para o cliente importar no Claude. Hero + busca + filtros (tipo/categoria) +
// grid de cards + modal de detalhe. Deep-link via ?m=<slug>.
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  SearchIcon as Search,
  ClockIcon as Clock,
  ZapIcon as Zap,
  PackageIcon as Package,
  CheckCircle2Icon as CheckCircle2,
  ArrowUpRightIcon as ArrowUpRight,
} from "@/components/ui/icons"
import { ItemThumb, COR } from "@/components/biblioteca/biblioteca-ui"
import { TIPOS, CATEGORIAS, tipoLabel, type Multiplicador } from "@/data/multiplicadores"
import { logarDownload } from "@/lib/log-download"

function normalizar(row: any): Multiplicador {
  return {
    ...row,
    inclui: Array.isArray(row.inclui) ? row.inclui : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    descricao: row.descricao ?? "",
    detalhe: row.detalhe ?? "",
    tempo: row.tempo ?? "",
    plataforma: row.plataforma ?? "",
  }
}

export default function MultiplicadoresPage() {
  const [sp, setSp] = useSearchParams()
  const q = sp.get("q") ?? ""
  const tipo = sp.get("tipo") ?? "todos"
  const cat = sp.get("cat") ?? "todas"
  const abertoSlug = sp.get("m")

  const [itens, setItens] = useState<Multiplicador[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from("conhecimento_multiplicadores")
        .select("*")
        .eq("publicado", true)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true })
      setItens((data ?? []).map(normalizar))
      setLoading(false)
    }
    carregar()
  }, [])

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(sp)
    if (value === null || value === "") next.delete(key)
    else next.set(key, value)
    setSp(next, { replace: true })
  }

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase()
    return itens.filter((m) => {
      if (tipo !== "todos" && m.tipo !== tipo) return false
      if (cat !== "todas" && m.categoria !== cat) return false
      if (termo && !(`${m.nome} ${m.descricao}`.toLowerCase().includes(termo))) return false
      return true
    })
  }, [itens, q, tipo, cat])

  const aberto = abertoSlug ? itens.find((m) => m.slug === abertoSlug) ?? null : null

  // categorias que têm ao menos 1 item no tipo atual (para não mostrar chip vazio)
  const catsDisponiveis = useMemo(() => {
    const set = new Set(itens.filter((m) => tipo === "todos" || m.tipo === tipo).map((m) => m.categoria))
    return CATEGORIAS.filter((c) => set.has(c.slug))
  }, [itens, tipo])

  return (
    <div className="space-y-8 pb-12">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="overflow-hidden border-primary/20">
          <CardContent className="relative p-8 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/15 p-3.5 rounded-2xl shrink-0">
                  <Package className="size-7 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Multiplicadores</h1>
                    <span className="rounded-lg bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Novo</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mt-1 max-w-xl">
                    Projetos completos prontos para você importar no Claude, personalizar e usar no seu negócio.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-5 text-sm shrink-0">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Package className="size-4 text-primary" /> {itens.length} multiplicadores
                </div>
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Zap className="size-4 text-primary" /> Importe em minutos
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Busca */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Buscar multiplicadores..."
          className="h-12 pl-10 rounded-xl"
        />
      </div>

      {/* Filtros de tipo */}
      <div className="flex items-center gap-2 flex-wrap">
        <FiltroChip ativo={tipo === "todos"} onClick={() => setParam("tipo", null)}>Todos</FiltroChip>
        {TIPOS.map((t) => (
          <FiltroChip key={t.slug} ativo={tipo === t.slug} onClick={() => setParam("tipo", t.slug)}>
            {t.label}
          </FiltroChip>
        ))}
      </div>

      {/* Filtros de categoria */}
      <div className="flex items-center gap-2 flex-wrap">
        <FiltroChip variante="outline" ativo={cat === "todas"} onClick={() => setParam("cat", null)}>Todas</FiltroChip>
        {catsDisponiveis.map((c) => (
          <FiltroChip key={c.slug} variante="outline" ativo={cat === c.slug} onClick={() => setParam("cat", c.slug)}>
            {c.label}
          </FiltroChip>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-card/40 animate-pulse" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-border rounded-2xl">
          <Package className="size-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum multiplicador encontrado com esses filtros.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((m, i) => (
            <motion.div
              key={m.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card
                onClick={() => setParam("m", m.slug)}
                className="group h-full overflow-hidden cursor-pointer border-border hover:border-primary/30 transition-colors"
              >
                <ItemThumb icon={m.icon} cor={m.cor} tipoLabel={tipoLabel(m.tipo)} tags={m.tags} />
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-[15px] font-bold tracking-tight text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                    {m.nome}
                  </h3>
                  <p className="text-[13px] font-medium text-muted-foreground leading-relaxed line-clamp-3">
                    {m.descricao}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-border/50 mt-1 text-[11px] font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Clock className="size-3.5" />{m.tempo}</span>
                    <span className="flex items-center gap-1.5"><Zap className="size-3.5 text-primary" />{m.plataforma}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de detalhe */}
      <Dialog open={!!aberto} onOpenChange={(o) => !o && setParam("m", null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
          {aberto && <DetalheMultiplicador m={aberto} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FiltroChip({
  children, ativo, onClick, variante = "solid",
}: { children: React.ReactNode; ativo: boolean; onClick: () => void; variante?: "solid" | "outline" }) {
  if (variante === "outline") {
    return (
      <button
        onClick={onClick}
        className={`rounded-xl px-3 py-1.5 text-[12px] font-bold transition-all border ${ativo ? "bg-primary/10 text-primary border-primary/40" : "bg-transparent text-muted-foreground hover:text-foreground border-border"}`}
      >
        {children}
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3.5 py-1.5 text-[12px] font-bold transition-all ${ativo ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border"}`}
    >
      {children}
    </button>
  )
}

function DetalheMultiplicador({ m }: { m: Multiplicador }) {
  const c = COR[m.cor]
  return (
    <div>
      <ItemThumb icon={m.icon} cor={m.cor} tipoLabel={tipoLabel(m.tipo)} tags={m.tags} className="aspect-[16/7]" />
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{m.nome}</h2>
          <p className="text-sm font-medium text-muted-foreground mt-2 leading-relaxed">{m.detalhe}</p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">O que vem dentro</p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {m.inclui.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13px] font-medium text-foreground">
                <CheckCircle2 className={`size-4 mt-0.5 shrink-0 ${c.fg}`} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-4 text-[12px] font-medium text-muted-foreground border-t border-border/50 pt-4">
          <span className="flex items-center gap-1.5"><Clock className="size-4" />{m.tempo}</span>
          <span className="flex items-center gap-1.5"><Zap className="size-4 text-primary" />{m.plataforma}</span>
        </div>

        {m.importar_url ? (
          <Button asChild className="w-full h-11 gap-2 rounded-xl font-bold">
            <a
              href={m.importar_url}
              target="_blank"
              rel="noreferrer"
              onClick={() => logarDownload("multiplicador", m.slug, m.nome, m.importar_url)}
            >
              <ArrowUpRight className="size-4" />
              Importar no Claude
            </a>
          </Button>
        ) : (
          <Button className="w-full h-11 gap-2 rounded-xl font-bold" disabled>
            <ArrowUpRight className="size-4" />
            Importar no Claude — em breve
          </Button>
        )}
      </div>
    </div>
  )
}
