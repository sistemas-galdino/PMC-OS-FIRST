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
  XIcon,
  CopyIcon,
} from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion"
import { DIAS_SEMANA } from "@/lib/atendimentos"
import { ConsultorAvatar } from "@/components/consultor-avatar"
import type {
  Consultor,
  Disponibilidade,
  ExcecaoConsultor,
  Feriado,
  EquipeConfig,
} from "@/lib/atendimentos"
import { FeriadosSection } from "./feriados-section"
import { CalendarioMesConsultor } from "./calendario-mes-consultor"

type JanelaForm = { dia_semana: number; hora_inicio: string; hora_fim: string }

function formatarDataExtra(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  })
}

interface Props {
  consultores: Consultor[]
  cfg: EquipeConfig
  disponibilidade: Disponibilidade[]
  excecoes: ExcecaoConsultor[]
  feriados: Feriado[]
  onNovo: () => void
  onEditar: (c: Consultor) => void
  onToggleAtivo: (c: Consultor) => void
  onSaveDisponibilidade: (consultorId: string, janelas: JanelaForm[]) => Promise<void>
  onAddExcecoes: (payloads: Omit<ExcecaoConsultor, "id" | "created_at">[]) => Promise<void>
  onRemoveExcecao: (id: string) => Promise<void>
  onAddFeriado: (payload: Omit<Feriado, "id" | "created_at">) => Promise<void>
  onRemoveFeriado: (id: string) => Promise<void>
  onImportFeriadosNacionais: (ano: number) => Promise<void>
}

export function DisponibilidadeConsultores({
  consultores,
  disponibilidade,
  excecoes,
  feriados,
  onNovo,
  onEditar,
  onToggleAtivo,
  onSaveDisponibilidade,
  onAddExcecoes,
  onRemoveExcecao,
  onAddFeriado,
  onRemoveFeriado,
  onImportFeriadosNacionais,
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

  const excecoesPorConsultor = useMemo(() => {
    const m: Record<string, ExcecaoConsultor[]> = {}
    for (const e of excecoes) {
      if (!m[e.consultor_id]) m[e.consultor_id] = []
      m[e.consultor_id].push(e)
    }
    return m
  }, [excecoes])

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

  function adicionarJanelaNoDia(consultorId: string, dia: number) {
    setDraft(prev => ({
      ...prev,
      [consultorId]: [
        ...(prev[consultorId] ?? []),
        { dia_semana: dia, hora_inicio: "09:00", hora_fim: "10:00" },
      ],
    }))
  }

  // Substitui as faixas dos dias de destino pelas faixas do dia de origem (igual ao Google).
  function copiarDia(consultorId: string, diaOrigem: number, diasDestino: number[]) {
    if (diasDestino.length === 0) return
    setDraft(prev => {
      const arr = prev[consultorId] ?? []
      const origem = arr.filter(j => j.dia_semana === diaOrigem)
      const semDestino = arr.filter(j => !diasDestino.includes(j.dia_semana))
      const novos = diasDestino.flatMap(d => origem.map(o => ({ ...o, dia_semana: d })))
      return { ...prev, [consultorId]: [...semDestino, ...novos] }
    })
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
      <FeriadosSection
        feriados={feriados}
        onAdd={onAddFeriado}
        onRemove={onRemoveFeriado}
        onImportNacionais={onImportFeriadosNacionais}
      />

      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="text-base font-bold tracking-tight text-foreground">Agendas</h3>
          <p className="text-xs text-muted-foreground">{consultores.length} cadastrado{consultores.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={onNovo} className="gap-2" size="sm">
          <PlusIcon className="size-4" />
          Nova agenda
        </Button>
      </div>

      <div className="space-y-3">
        {consultores.map(c => {
          const expanded = expandedId === c.id
          const janelas = draft[c.id] ?? []
          const janelasAtuais = disponibilidadePorConsultor[c.id] ?? []
          const extras = (excecoesPorConsultor[c.id] ?? [])
            .filter(e => e.tipo === "extra")
            .sort((a, b) => a.data.localeCompare(b.data) || (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""))
          const extrasCount = extras.length

          return (
            <Card key={c.id} className={!c.ativo ? "opacity-60" : ""}>
              <CardContent className="p-0">
                <div className="flex items-center gap-4 p-5">
                  <ConsultorAvatar nome={c.nome} url={c.avatar_url} className="size-12 rounded-xl text-sm" />
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
                      {janelasAtuais.length === 0 && extrasCount === 0 ? (
                        <span className="text-amber-400">Sem disponibilidade configurada</span>
                      ) : (
                        <span>
                          {janelasAtuais.length > 0 && (
                            <>{janelasAtuais.length} janela{janelasAtuais.length !== 1 ? "s" : ""} semanal{janelasAtuais.length !== 1 ? "is" : ""}</>
                          )}
                          {janelasAtuais.length > 0 && extrasCount > 0 && " · "}
                          {extrasCount > 0 && (
                            <span className="text-emerald-400">{extrasCount} data{extrasCount !== 1 ? "s" : ""} avulsa{extrasCount !== 1 ? "s" : ""}</span>
                          )}
                        </span>
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
                      <div className="p-5 bg-muted/5 grid gap-6 lg:grid-cols-2">
                        <div className="space-y-3">
                          <div className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground">
                            Disponibilidade semanal
                          </div>
                          <p className="text-xs text-muted-foreground -mt-1">
                            Defina os horários dessa agenda toda semana.
                          </p>

                          <div className="divide-y divide-border/50 rounded-lg border border-border/50 bg-background/40">
                            {DIAS_SEMANA.map(d => {
                              const doDia = janelas
                                .map((j, idx) => ({ j, idx }))
                                .filter(x => x.j.dia_semana === d.value)
                              return (
                                <div key={d.value} className="flex items-start gap-3 p-3">
                                  <div className="w-10 shrink-0 pt-2 text-xs font-bold text-foreground">
                                    {d.curto}.
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-2">
                                    {doDia.length === 0 ? (
                                      <div className="flex items-center gap-2 h-9">
                                        <span className="flex-1 text-sm text-muted-foreground">Indisponível</span>
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() => adicionarJanelaNoDia(c.id, d.value)}
                                          title="Adicionar horário"
                                        >
                                          <PlusIcon className="size-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      doDia.map(({ j, idx }, posicao) => (
                                        <div key={idx} className="flex items-center gap-2">
                                          <Input
                                            type="time"
                                            value={j.hora_inicio}
                                            onChange={e => atualizarJanela(c.id, idx, { hora_inicio: e.target.value })}
                                            className="w-28 h-9"
                                          />
                                          <span className="text-muted-foreground text-xs">–</span>
                                          <Input
                                            type="time"
                                            value={j.hora_fim}
                                            onChange={e => atualizarJanela(c.id, idx, { hora_fim: e.target.value })}
                                            className="w-28 h-9"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => removerJanela(c.id, idx)}
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            title="Remover horário"
                                          >
                                            <XIcon className="size-4" />
                                          </Button>
                                          {posicao === 0 && (
                                            <>
                                              <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => adicionarJanelaNoDia(c.id, d.value)}
                                                title="Adicionar outro horário"
                                              >
                                                <PlusIcon className="size-4" />
                                              </Button>
                                              <CopiarParaDias
                                                diaOrigem={d.value}
                                                onCopiar={dias => copiarDia(c.id, d.value, dias)}
                                              />
                                            </>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <Button size="sm" onClick={() => salvar(c.id)}>
                              Salvar disponibilidade
                            </Button>
                          </div>

                          <div className="pt-4 mt-2 border-t border-border/50 space-y-2">
                            <div className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground">
                              Atendimentos avulsos (datas específicas)
                            </div>
                            {extras.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-1">
                                Nenhum atendimento avulso. Selecione uma data no calendário ao lado para adicionar.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {extras.map(e => (
                                  <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/50">
                                    <Badge variant="outline" className="text-[9px] uppercase font-bold bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shrink-0">
                                      Avulso
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-foreground capitalize">
                                        {formatarDataExtra(e.data)}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {e.hora_inicio?.slice(0, 5)} – {e.hora_fim?.slice(0, 5)}
                                        {e.motivo ? ` · ${e.motivo}` : ""}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onRemoveExcecao(e.id)}
                                      className="text-destructive hover:bg-destructive/10 shrink-0"
                                    >
                                      <Trash2Icon className="size-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <CalendarioMesConsultor
                          consultorId={c.id}
                          duracaoMinutos={c.duracao_padrao_minutos}
                          janelasSemanais={janelasAtuais}
                          excecoes={excecoesPorConsultor[c.id] ?? []}
                          feriados={feriados}
                          onAddExcecoes={onAddExcecoes}
                          onRemoveExcecao={onRemoveExcecao}
                        />
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
              Nenhuma agenda cadastrada. Clique em "Nova agenda".
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// Menu pra copiar as faixas de um dia pra outros dias da semana (escolha múltipla).
function CopiarParaDias({
  diaOrigem,
  onCopiar,
}: {
  diaOrigem: number
  onCopiar: (dias: number[]) => void
}) {
  const [sel, setSel] = useState<number[]>([])
  const outrosDias = DIAS_SEMANA.filter(d => d.value !== diaOrigem)

  function toggle(v: number) {
    setSel(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]))
  }

  return (
    <DropdownMenu onOpenChange={o => { if (!o) setSel([]) }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="Copiar para outros dias">
          <CopyIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Copiar para</DropdownMenuLabel>
        {outrosDias.map(d => (
          <DropdownMenuCheckboxItem
            key={d.value}
            checked={sel.includes(d.value)}
            onCheckedChange={() => toggle(d.value)}
            onSelect={e => e.preventDefault()}
          >
            {d.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={sel.length === 0} onSelect={() => onCopiar(sel)}>
          Copiar {sel.length > 0 ? `(${sel.length})` : ""}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
