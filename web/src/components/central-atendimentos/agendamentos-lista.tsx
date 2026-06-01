import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SearchIcon, FilterIcon, AlertTriangleIcon } from "@/components/ui/icons"
import {
  formatarData,
  statusEfetivo,
  nomesDoConsultor,
  STATUS_EFETIVO_BADGE,
  STATUS_EFETIVO_LABEL,
  STATUS_EFETIVO_LIST,
} from "@/lib/atendimentos"
import type { Consultor, AgendamentoCentral } from "@/lib/atendimentos"

interface Props {
  agendamentos: AgendamentoCentral[]
  consultores: Consultor[]
  onOpenDetails: (ag: AgendamentoCentral) => void
}

export function AgendamentosLista({ agendamentos, consultores, onOpenDetails }: Props) {
  const [sp, setSp] = useSearchParams()

  const consultorFilter = sp.get("consultor") ?? "all"
  const statusFilter = sp.get("status") ?? "all"
  const dateFrom = sp.get("de") ?? ""
  const dateTo = sp.get("ate") ?? ""
  const searchTerm = sp.get("q") ?? ""

  function updateParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === "" || v === "all") next.delete(k)
      else next.set(k, v)
    }
    setSp(next, { replace: true })
  }

  const filtered = useMemo(() => {
    // nome selecionado → consultor → seus nomes (com aliases), pra casar reuniões
    // gravadas com nome alternativo (ex.: Léo ↔ Leonardo).
    const consultorSel = consultores.find(c => c.nome === consultorFilter)
    const nomesSel = consultorSel ? nomesDoConsultor(consultorSel) : [consultorFilter]
    return agendamentos.filter(a => {
      if (consultorFilter !== "all" && !nomesSel.includes(a.consultor_nome ?? "")) return false
      if (statusFilter !== "all" && statusEfetivo(a) !== statusFilter) return false
      if (dateFrom && (a.data_reuniao ?? "") < dateFrom) return false
      if (dateTo && (a.data_reuniao ?? "") > dateTo) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const blob = [a.consultor_nome, a.cliente_nome, a.cliente_email, a.empresa]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [agendamentos, consultores, consultorFilter, statusFilter, dateFrom, dateTo, searchTerm])

  const consultorOpts = consultores.map(c => c.nome).sort()
  if (!consultorOpts.includes("Galdino")) consultorOpts.unshift("Galdino")

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar consultor, cliente, empresa..."
              className="pl-11 h-11 bg-muted/10 border-border focus-visible:border-primary/50"
              value={searchTerm}
              onChange={e => updateParams({ q: e.target.value })}
            />
          </div>
          <Select value={consultorFilter} onValueChange={v => updateParams({ consultor: v })}>
            <SelectTrigger className="w-full sm:w-48 h-11 bg-muted/10 border-border rounded-xl">
              <FilterIcon className="mr-2 size-4 text-primary/60" />
              <SelectValue placeholder="Consultor" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card/95 backdrop-blur-xl border-border">
              <SelectItem value="all" className="rounded-lg font-medium">Todos consultores</SelectItem>
              {consultorOpts.map(n => (
                <SelectItem key={n} value={n} className="rounded-lg font-medium">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => updateParams({ status: v })}>
            <SelectTrigger className="w-full sm:w-44 h-11 bg-muted/10 border-border rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card/95 backdrop-blur-xl border-border">
              <SelectItem value="all" className="rounded-lg font-medium">Todos status</SelectItem>
              {STATUS_EFETIVO_LIST.map(s => (
                <SelectItem key={s} value={s} className="rounded-lg font-medium">{STATUS_EFETIVO_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <DatePicker
              compact
              placeholder="De"
              className="w-40"
              value={dateFrom}
              onChange={v => updateParams({ de: v })}
            />
            <span className="text-muted-foreground text-xs font-medium">a</span>
            <DatePicker
              compact
              placeholder="Até"
              className="w-40"
              value={dateTo}
              onChange={v => updateParams({ ate: v })}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-[10px] uppercase tracking-widest font-bold">Data</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest font-bold">Hora</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest font-bold">Consultor</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest font-bold">Cliente</TableHead>
                <TableHead className="hidden md:table-cell text-[10px] uppercase tracking-widest font-bold">Empresa</TableHead>
                <TableHead className="hidden lg:table-cell text-[10px] uppercase tracking-widest font-bold">Email</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest font-bold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">
                    Nenhum agendamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(a => (
                  <TableRow key={a.id_unico} className="hover:bg-muted/10">
                    <TableCell className="font-medium">{formatarData(a.data_reuniao)}</TableCell>
                    <TableCell className="text-muted-foreground">{(a.horario ?? "").slice(0, 5)}</TableCell>
                    <TableCell className="font-semibold text-foreground">{a.consultor_nome ?? "—"}</TableCell>
                    <TableCell className="text-foreground">{a.cliente_nome ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{a.empresa ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{a.cliente_email ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`uppercase font-bold text-[9px] px-2 ${STATUS_EFETIVO_BADGE[statusEfetivo(a)]}`}>
                          {STATUS_EFETIVO_LABEL[statusEfetivo(a)]}
                        </Badge>
                        {statusEfetivo(a) === "agendada" && !a.id_reuniao && (
                          <span title="Evento ainda não criado no Google Calendar">
                            <AlertTriangleIcon className="size-3.5 text-amber-400" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenDetails(a)}
                        className="text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/5"
                      >
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-xs text-muted-foreground">
          {filtered.length} de {agendamentos.length} agendamentos
        </div>
      </CardContent>
    </Card>
  )
}
