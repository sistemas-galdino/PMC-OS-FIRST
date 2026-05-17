import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  PlusIcon,
  Edit3Icon,
  ChevronDownIcon,
  Trash2Icon,
} from "@/components/ui/icons"
import { motion, AnimatePresence } from "framer-motion"
import { DIAS_SEMANA, iniciais } from "@/lib/atendimentos"
import type { Consultor, Disponibilidade } from "@/lib/atendimentos"

type JanelaForm = { dia_semana: number; hora_inicio: string; hora_fim: string }

interface Props {
  consultores: Consultor[]
  disponibilidade: Disponibilidade[]
  onNovo: () => void
  onEditar: (c: Consultor) => void
  onToggleAtivo: (c: Consultor) => void
  onSaveDisponibilidade: (consultorId: string, janelas: JanelaForm[]) => Promise<void>
}

export function DisponibilidadeConsultores({
  consultores,
  disponibilidade,
  onNovo,
  onEditar,
  onToggleAtivo,
  onSaveDisponibilidade,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, JanelaForm[]>>({})

  const disponibilidadePorConsultor = useMemo(() => {
    const m: Record<string, Disponibilidade[]> = {}
    for (const d of disponibilidade) {
      if (!m[d.consultor_id]) m[d.consultor_id] = []
      m[d.consultor_id].push(d)
    }
    return m
  }, [disponibilidade])

  function expandir(c: Consultor) {
    if (expandedId === c.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(c.id)
    const janelas = disponibilidadePorConsultor[c.id] ?? []
    setDraft(prev => ({
      ...prev,
      [c.id]: janelas.map(j => ({
        dia_semana: j.dia_semana,
        hora_inicio: j.hora_inicio.slice(0, 5),
        hora_fim: j.hora_fim.slice(0, 5),
      })),
    }))
  }

  function atualizarJanela(consultorId: string, idx: number, patch: Partial<JanelaForm>) {
    setDraft(prev => ({
      ...prev,
      [consultorId]: prev[consultorId].map((j, i) => (i === idx ? { ...j, ...patch } : j)),
    }))
  }

  function adicionarJanela(consultorId: string) {
    setDraft(prev => ({
      ...prev,
      [consultorId]: [
        ...(prev[consultorId] ?? []),
        { dia_semana: 1, hora_inicio: "09:00", hora_fim: "12:00" },
      ],
    }))
  }

  function removerJanela(consultorId: string, idx: number) {
    setDraft(prev => ({
      ...prev,
      [consultorId]: prev[consultorId].filter((_, i) => i !== idx),
    }))
  }

  async function salvar(consultorId: string) {
    const janelas = draft[consultorId] ?? []
    for (const j of janelas) {
      if (j.hora_fim <= j.hora_inicio) {
        alert("Hora fim precisa ser maior que hora início")
        return
      }
    }
    await onSaveDisponibilidade(consultorId, janelas)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold tracking-tight text-foreground">Consultores</h3>
          <p className="text-xs text-muted-foreground">{consultores.length} cadastrado{consultores.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={onNovo} className="gap-2" size="sm">
          <PlusIcon className="size-4" />
          Novo consultor
        </Button>
      </div>

      <div className="space-y-3">
        {consultores.map(c => {
          const expanded = expandedId === c.id
          const janelas = draft[c.id] ?? []
          const janelasAtuais = disponibilidadePorConsultor[c.id] ?? []

          return (
            <Card key={c.id} className={!c.ativo ? "opacity-60" : ""}>
              <CardContent className="p-0">
                <div className="flex items-center gap-4 p-5">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {iniciais(c.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{c.nome}</span>
                      {!c.ativo && (
                        <Badge variant="outline" className="text-[9px] uppercase font-bold bg-muted/30 border-border text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                      {c.tabela_destino === "reunioes_galdino" && (
                        <Badge variant="outline" className="text-[9px] uppercase font-bold bg-primary/10 border-primary/30 text-primary">1:1</Badge>
                      )}
                      {c.tabela_destino === "reunioes_blackcrm" && (
                        <Badge variant="outline" className="text-[9px] uppercase font-bold bg-blue-500/10 border-blue-500/30 text-blue-400">BlackCRM</Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider truncate mt-0.5">
                      {c.especialidade ?? "—"} · {c.email_calendar}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {janelasAtuais.length === 0 ? (
                        <span className="text-amber-400">Sem disponibilidade configurada</span>
                      ) : (
                        <span>{janelasAtuais.length} janela{janelasAtuais.length !== 1 ? "s" : ""} configurada{janelasAtuais.length !== 1 ? "s" : ""}</span>
                      )}
                      {" · "}
                      <span>{c.duracao_padrao_minutos}min por reunião</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground cursor-pointer">
                      <Checkbox checked={c.ativo} onCheckedChange={() => onToggleAtivo(c)} />
                      Ativo
                    </label>
                    <Button variant="ghost" size="sm" onClick={() => onEditar(c)} className="gap-1.5">
                      <Edit3Icon className="size-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => expandir(c)}
                      className="gap-1.5"
                    >
                      Disponibilidade
                      <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDownIcon className="size-3.5" />
                      </motion.div>
                    </Button>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-border/50"
                    >
                      <div className="p-5 space-y-3 bg-muted/5">
                        <div className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground">
                          Janelas semanais
                        </div>

                        {janelas.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">Sem janelas. Adicione a primeira abaixo.</p>
                        ) : (
                          <div className="space-y-2">
                            {janelas.map((j, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/50">
                                <select
                                  className="bg-muted/20 border border-border rounded-lg px-3 py-1.5 text-sm font-medium text-foreground"
                                  value={j.dia_semana}
                                  onChange={e => atualizarJanela(c.id, idx, { dia_semana: Number(e.target.value) })}
                                >
                                  {DIAS_SEMANA.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                  ))}
                                </select>
                                <Input
                                  type="time"
                                  value={j.hora_inicio}
                                  onChange={e => atualizarJanela(c.id, idx, { hora_inicio: e.target.value })}
                                  className="w-28 h-9"
                                />
                                <span className="text-muted-foreground text-xs">até</span>
                                <Input
                                  type="time"
                                  value={j.hora_fim}
                                  onChange={e => atualizarJanela(c.id, idx, { hora_fim: e.target.value })}
                                  className="w-28 h-9"
                                />
                                <Button variant="ghost" size="sm" onClick={() => removerJanela(c.id, idx)} className="text-destructive hover:bg-destructive/10 ml-auto">
                                  <Trash2Icon className="size-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                          <Button variant="outline" size="sm" onClick={() => adicionarJanela(c.id)} className="gap-2">
                            <PlusIcon className="size-3.5" />
                            Adicionar janela
                          </Button>
                          <Button size="sm" onClick={() => salvar(c.id)}>
                            Salvar disponibilidade
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          )
        })}

        {consultores.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum consultor cadastrado. Clique em "Novo consultor".
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
