import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ChevronDownIcon,
  PlusIcon,
  Trash2Icon,
  FlagIcon,
} from "@/components/ui/icons"
import { motion, AnimatePresence } from "framer-motion"
import { formatarData } from "@/lib/atendimentos"
import type { Feriado } from "@/lib/atendimentos"
import { FERIADOS_NACIONAIS_BR, ANOS_DISPONIVEIS } from "@/lib/feriados-br"

interface Props {
  feriados: Feriado[]
  onAdd: (payload: Omit<Feriado, "id" | "created_at">) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onImportNacionais: (ano: number) => Promise<void>
}

export function FeriadosSection({ feriados, onAdd, onRemove, onImportNacionais }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [newData, setNewData] = useState("")
  const [newNome, setNewNome] = useState("")
  const [saving, setSaving] = useState(false)

  const feriadosOrdenados = useMemo(
    () => [...feriados].sort((a, b) => a.data.localeCompare(b.data)),
    [feriados],
  )

  const datasJaCadastradas = useMemo(
    () => new Set(feriados.map(f => f.data)),
    [feriados],
  )

  function anoTemPendentes(ano: number): boolean {
    const oficiais = FERIADOS_NACIONAIS_BR[ano] ?? []
    return oficiais.some(f => !datasJaCadastradas.has(f.data))
  }

  async function handleAdd() {
    if (!newData || !newNome.trim()) {
      alert("Data e nome são obrigatórios")
      return
    }
    setSaving(true)
    await onAdd({ data: newData, nome: newNome.trim(), tipo: "customizado" })
    setNewData("")
    setNewNome("")
    setSaving(false)
  }

  async function handleImport(ano: number) {
    setSaving(true)
    await onImportNacionais(ano)
    setSaving(false)
  }

  return (
    <Card>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-3 p-5 text-left hover:bg-muted/10 transition-colors"
        >
          <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
            <FlagIcon className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">Feriados</span>
              <Badge variant="outline" className="text-[9px] uppercase font-bold bg-muted/30 border-border text-muted-foreground">
                {feriados.length} cadastrado{feriados.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Datas bloqueadas para todos os consultores.
            </div>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border/50"
            >
              <div className="p-5 space-y-4 bg-muted/5">
                {/* Importar nacionais */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Presets nacionais:
                  </span>
                  {ANOS_DISPONIVEIS.map(ano => (
                    <Button
                      key={ano}
                      variant="outline"
                      size="sm"
                      disabled={saving || !anoTemPendentes(ano)}
                      onClick={() => handleImport(ano)}
                    >
                      {anoTemPendentes(ano) ? `Importar ${ano}` : `${ano} ✓`}
                    </Button>
                  ))}
                </div>

                {/* Adicionar manual */}
                <div className="flex items-end gap-2 flex-wrap p-3 rounded-lg bg-background/60 border border-border/50">
                  <div className="flex-1 min-w-[140px] space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                      Data
                    </label>
                    <Input
                      type="date"
                      value={newData}
                      onChange={e => setNewData(e.target.value)}
                    />
                  </div>
                  <div className="flex-[2] min-w-[200px] space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                      Nome
                    </label>
                    <Input
                      placeholder="Ex: Aniversário do escritório"
                      value={newNome}
                      onChange={e => setNewNome(e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={handleAdd} disabled={saving} className="gap-2">
                    <PlusIcon className="size-3.5" />
                    Adicionar
                  </Button>
                </div>

                {/* Lista */}
                {feriadosOrdenados.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Nenhum feriado cadastrado.</p>
                ) : (
                  <div className="space-y-1.5">
                    {feriadosOrdenados.map(f => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 border border-border/50"
                      >
                        <div className="font-mono text-xs text-muted-foreground w-24 shrink-0">
                          {formatarData(f.data)}
                        </div>
                        <div className="flex-1 text-sm font-medium text-foreground">{f.nome}</div>
                        <Badge
                          variant="outline"
                          className={
                            f.tipo === "nacional"
                              ? "text-[9px] uppercase font-bold bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "text-[9px] uppercase font-bold bg-muted/30 border-border text-muted-foreground"
                          }
                        >
                          {f.tipo}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(f.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
