import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  Edit3Icon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import {
  VALORES,
  COMPLEXIDADES,
  FASES,
  FASE_BADGE,
  calcRoi,
  faseLabel,
} from "@/lib/roadmap"
import type { RoadmapItem, Valor, Complexidade } from "@/lib/roadmap"

interface Props {
  itens: RoadmapItem[]
  onUpdateItem: (id: string, patch: Partial<RoadmapItem>) => void
  onDeleteItem: (id: string) => void
  onEditItem: (item: RoadmapItem) => void
  onAddItem: () => void
}

type SortKey = "nome" | "valor" | "complexidade" | "roi" | "fase" | "prazo" | "responsavel"

const VALOR_RANK: Record<Valor, number> = { alto: 3, medio: 2, baixo: 1 }
const COMPLEX_RANK: Record<Complexidade, number> = { alta: 3, media: 2, baixa: 1 }
const FASE_RANK = Object.fromEntries(FASES.map((f, i) => [f.value, i]))

const headCls =
  "py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"

export function EscopoPriorizacao({
  itens,
  onUpdateItem,
  onDeleteItem,
  onEditItem,
  onAddItem,
}: Props) {
  const [filtro, setFiltro] = useState("")
  const [respFiltro, setRespFiltro] = useState("__all")
  const [sortKey, setSortKey] = useState<SortKey>("roi")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const responsaveis = useMemo(() => {
    const set = new Set<string>()
    itens.forEach(i => {
      if (i.responsavel && i.responsavel.trim()) set.add(i.responsavel.trim())
    })
    return [...set].sort()
  }, [itens])

  const linhas = useMemo(() => {
    let list = itens
    const q = filtro.trim().toLowerCase()
    if (q) list = list.filter(i => i.nome.toLowerCase().includes(q))
    if (respFiltro !== "__all") {
      list = list.filter(i => (i.responsavel ?? "").trim() === respFiltro)
    }
    const sorted = [...list].sort((a, b) => {
      let av: number | string
      let bv: number | string
      switch (sortKey) {
        case "valor":
          av = VALOR_RANK[a.valor]; bv = VALOR_RANK[b.valor]; break
        case "complexidade":
          av = COMPLEX_RANK[a.complexidade]; bv = COMPLEX_RANK[b.complexidade]; break
        case "roi":
          av = calcRoi(a.valor, a.complexidade); bv = calcRoi(b.valor, b.complexidade); break
        case "fase":
          av = FASE_RANK[a.fase]; bv = FASE_RANK[b.fase]; break
        case "prazo":
          av = (a.prazo ?? "").toLowerCase(); bv = (b.prazo ?? "").toLowerCase(); break
        case "responsavel":
          av = (a.responsavel ?? "").toLowerCase(); bv = (b.responsavel ?? "").toLowerCase(); break
        default:
          av = a.nome.toLowerCase(); bv = b.nome.toLowerCase()
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1
      if (av > bv) return sortDir === "asc" ? 1 : -1
      return 0
    })
    return sorted
  }, [itens, filtro, respFiltro, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "nome" || key === "prazo" || key === "responsavel" ? "asc" : "desc")
    }
  }

  function SortHead({ label, k, className }: { label: string; k: SortKey; className?: string }) {
    return (
      <TableHead className={cn(headCls, className)}>
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className="flex items-center gap-1 transition-colors hover:text-foreground"
        >
          {label}
          {sortKey === k &&
            (sortDir === "asc" ? (
              <ChevronUpIcon className="size-3" />
            ) : (
              <ChevronDownIcon className="size-3" />
            ))}
        </button>
      </TableHead>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Prioridade automática:</span>{" "}
          calculada com Valor ÷ Complexidade. Itens de alto impacto e baixa complexidade sobem no ranking.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="Filtrar..."
              className="h-9 w-44 pl-8"
            />
          </div>
          <Select value={respFiltro} onValueChange={setRespFiltro}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os responsáveis</SelectItem>
              {responsaveis.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-9 gap-1.5" onClick={onAddItem}>
            <PlusIcon className="size-4" />
            Adicionar
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/40">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortHead label="Sistema / Funcionalidade" k="nome" />
              <SortHead label="Valor" k="valor" />
              <SortHead label="Complexidade" k="complexidade" />
              <SortHead label="Prioridade (ROI)" k="roi" />
              <SortHead label="Marco" k="fase" />
              <SortHead label="Prazo" k="prazo" className="hidden lg:table-cell" />
              <SortHead label="Responsável" k="responsavel" className="hidden md:table-cell" />
              <TableHead className={cn(headCls, "hidden xl:table-cell")}>Observações</TableHead>
              <TableHead className={cn(headCls, "text-right")}>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum item cadastrado. Clique em "Adicionar" para começar.
                </TableCell>
              </TableRow>
            ) : (
              linhas.map(item => {
                const roi = calcRoi(item.valor, item.complexidade)
                return (
                  <TableRow key={item.id}>
                    <TableCell className="px-3 font-semibold text-foreground">
                      {item.nome}
                    </TableCell>
                    <TableCell className="px-3">
                      <Select
                        value={item.valor}
                        onValueChange={v => onUpdateItem(item.id, { valor: v as Valor })}
                      >
                        <SelectTrigger size="sm" className="w-[88px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VALORES.map(v => (
                            <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-3">
                      <Select
                        value={item.complexidade}
                        onValueChange={v =>
                          onUpdateItem(item.id, { complexidade: v as Complexidade })
                        }
                      >
                        <SelectTrigger size="sm" className="w-[88px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPLEXIDADES.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-3">
                      <span className="font-bold tabular-nums text-foreground">
                        {roi.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge variant="outline" className={cn("border", FASE_BADGE[item.fase])}>
                        {faseLabel(item.fase)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden px-3 text-muted-foreground lg:table-cell">
                      {item.prazo || "—"}
                    </TableCell>
                    <TableCell className="hidden px-3 text-muted-foreground md:table-cell">
                      {item.responsavel || "—"}
                    </TableCell>
                    <TableCell className="hidden max-w-[220px] px-3 text-muted-foreground xl:table-cell">
                      <span className="block truncate">{item.observacoes || "—"}</span>
                    </TableCell>
                    <TableCell className="px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onEditItem(item)}
                          aria-label="Editar item"
                        >
                          <Edit3Icon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDeleteItem(item.id)}
                          aria-label="Excluir item"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
