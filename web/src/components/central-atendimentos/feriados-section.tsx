import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PlusIcon, Trash2Icon } from "@/components/ui/icons"
import {
  DIAS_SEMANA,
  diasDoMes,
  isoData,
  formatarDataLonga,
} from "@/lib/atendimentos"
import type { Feriado } from "@/lib/atendimentos"
import { FERIADOS_NACIONAIS_BR, ANOS_DISPONIVEIS } from "@/lib/feriados-br"

interface Props {
  feriados: Feriado[]
  onAdd: (payload: Omit<Feriado, "id" | "created_at">) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onImportNacionais: (ano: number) => Promise<void>
}

const HEADER_DIAS = DIAS_SEMANA.map(d => d.curto)

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

export function FeriadosSection({ feriados, onAdd, onRemove, onImportNacionais }: Props) {
  const [mesRef, setMesRef] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null)
  const [novoNome, setNovoNome] = useState("")
  const [saving, setSaving] = useState(false)

  const datasJaCadastradas = useMemo(
    () => new Set(feriados.map(f => f.data)),
    [feriados],
  )

  const feriadosPorData = useMemo(() => {
    const m: Record<string, Feriado> = {}
    for (const f of feriados) m[f.data] = f
    return m
  }, [feriados])

  const cells = useMemo(() => diasDoMes(mesRef), [mesRef])

  function anoTemPendentes(ano: number): boolean {
    const oficiais = FERIADOS_NACIONAIS_BR[ano] ?? []
    return oficiais.some(f => !datasJaCadastradas.has(f.data))
  }

  async function handleImport(ano: number) {
    setSaving(true)
    await onImportNacionais(ano)
    setSaving(false)
  }

  function abrir(data: Date) {
    setDataSelecionada(data)
    setNovoNome("")
  }

  function fechar() {
    setDataSelecionada(null)
  }

  async function adicionarFeriado() {
    if (!dataSelecionada || !novoNome.trim()) {
      alert("Informe o nome do feriado")
      return
    }
    setSaving(true)
    await onAdd({
      data: isoData(dataSelecionada),
      nome: novoNome.trim(),
      tipo: "customizado",
    })
    setSaving(false)
    setNovoNome("")
  }

  async function removerFeriado(id: string) {
    setSaving(true)
    await onRemove(id)
    setSaving(false)
  }

  const feriadoSelecionado = dataSelecionada
    ? feriadosPorData[isoData(dataSelecionada)]
    : undefined

  const tituloMes = mesRef
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, c => c.toUpperCase())

  return (
    <Card className="w-fit">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">Feriados</span>
            <Badge variant="outline" className="text-[9px] uppercase font-bold bg-muted/30 border-border text-muted-foreground">
              {feriados.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setMesRef(m => addMonths(m, -1))} className="size-7 p-0">
              ‹
            </Button>
            <span className="text-xs font-bold text-foreground w-32 text-center">{tituloMes}</span>
            <Button variant="ghost" size="sm" onClick={() => setMesRef(m => addMonths(m, 1))} className="size-7 p-0">
              ›
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {ANOS_DISPONIVEIS.map(ano => (
            <Button
              key={ano}
              variant="outline"
              size="sm"
              disabled={saving || !anoTemPendentes(ano)}
              onClick={() => handleImport(ano)}
              className="text-[11px] h-7 px-2"
            >
              {anoTemPendentes(ano) ? `Importar ${ano}` : `${ano} ✓`}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 w-[280px]">
          {HEADER_DIAS.map(d => (
            <div key={d} className="text-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground py-1">
              {d}
            </div>
          ))}
          {cells.map((d, idx) => {
            const iso = isoData(d)
            const noMes = d.getMonth() === mesRef.getMonth()
            const feriado = feriadosPorData[iso]

            const classes = [
              "relative aspect-square flex items-center justify-center rounded-lg text-xs font-semibold cursor-pointer transition-colors",
            ]
            if (!noMes) classes.push("opacity-30")
            if (feriado) classes.push("bg-amber-500/15 text-amber-400 border border-amber-500/40 hover:bg-amber-500/25")
            else classes.push("text-muted-foreground hover:bg-muted/20 border border-transparent")

            return (
              <button
                key={idx}
                type="button"
                onClick={() => abrir(d)}
                className={classes.join(" ")}
                title={feriado?.nome}
              >
                <span>{d.getDate()}</span>
                {feriado && <span className="absolute bottom-0.5 size-1 rounded-full bg-amber-400" />}
              </button>
            )
          })}
        </div>
      </CardContent>

      <Dialog open={!!dataSelecionada} onOpenChange={v => !v && fechar()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {dataSelecionada ? formatarDataLonga(dataSelecionada) : "—"}
            </DialogTitle>
          </DialogHeader>

          {feriadoSelecionado ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <div className="text-xs uppercase font-bold tracking-widest text-amber-400 mb-0.5">Feriado</div>
                <div className="text-sm font-semibold text-foreground">{feriadoSelecionado.nome}</div>
                <Badge
                  variant="outline"
                  className={
                    feriadoSelecionado.tipo === "nacional"
                      ? "mt-1 text-[9px] uppercase font-bold bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "mt-1 text-[9px] uppercase font-bold bg-muted/30 border-border text-muted-foreground"
                  }
                >
                  {feriadoSelecionado.tipo}
                </Badge>
              </div>
              <Button
                variant="outline"
                onClick={() => removerFeriado(feriadoSelecionado.id)}
                disabled={saving}
                className="w-full gap-2 text-destructive hover:bg-destructive/10"
              >
                <Trash2Icon className="size-4" />
                Remover feriado
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  Nome do feriado
                </label>
                <Input
                  placeholder="Ex: Aniversário do escritório"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  autoFocus
                />
              </div>
              <Button onClick={adicionarFeriado} disabled={saving || !novoNome.trim()} className="w-full gap-2">
                <PlusIcon className="size-4" />
                Adicionar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
