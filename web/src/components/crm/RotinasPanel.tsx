import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { NovaAtividadeModal } from "@/components/crm/NovaAtividadeModal"
import {
  buildDisplayIdMap,
  diasSemContato,
  isCS,
  useAtividades,
  useClientes,
  useProfile,
} from "@/lib/crm/storage"
import {
  itensFeitosDe,
  salvarExecucaoRotina,
  useRotinaExecucoes,
  useRotinas,
} from "@/lib/crm/rotinas"
import { CS_LIST, type CSName } from "@/lib/crm/types"
import { Calendar, MessageCircle, Repeat, Trophy, Plus } from "lucide-react"

// ---------- helpers ----------
function isoWeek(d: Date): [number, number] {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7)
  return [date.getUTCFullYear(), week]
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Segunda-feira da semana corrente (domingo conta como fim da semana anterior). */
function segundaDaSemana(ref = new Date()): Date {
  const d = new Date(ref)
  d.setHours(12, 0, 0, 0)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d
}

/** Data de referência da rotina: o dia da semana dela, nesta semana. */
function dataDaRotina(diaSemana: number, ref = new Date()): string {
  const seg = segundaDaSemana(ref)
  const offset = diaSemana === 0 ? 6 : diaSemana - 1
  const d = new Date(seg)
  d.setDate(seg.getDate() + offset)
  return toISODate(d)
}

type RotItem = { label: string; acao: string; entrega: string }

const ROT_SEG: RotItem[] = [
  {
    label: "Filtrar clientes no PMC OS: novos, ativos, menos engajados",
    acao: "Engajar cliente",
    entrega: "WhatsApp",
  },
  {
    label: "Verificar novos clientes: todos têm acesso ao sistema?",
    acao: "Atualizar cadastro",
    entrega: "Área de Membros",
  },
  {
    label: "Verificar clientes ativos: há reunião com Galdino/consultor para agendar? Material pendente?",
    acao: "Agendar reunião",
    entrega: "Reunião com Galdino",
  },
  {
    label: "Identificar clientes menos engajados e criar comunicação de reengajamento",
    acao: "Fazer follow-up no WhatsApp",
    entrega: "WhatsApp",
  },
]
const ROT_QUA: RotItem[] = [
  {
    label: "Acessar a Skill do Cloud e checar clientes + implementações de quem teve reunião na última semana",
    acao: "Acompanhar implementação",
    entrega: "Guardião de IA",
  },
  {
    label: "Analisar clientes que precisam de atenção especial (implementação lenta, sem retorno, risco)",
    acao: "Atualizar risco do cliente",
    entrega: "WhatsApp",
  },
  {
    label: "Entrar em contato com clientes que têm Guardião: marcar plano de ação, verificar status",
    acao: "Acompanhar implementação",
    entrega: "Guardião de IA",
  },
  {
    label: "Entrar em contato com clientes sem Guardião: checar tarefas e status da contratação do Guardião",
    acao: "Acompanhar implementação",
    entrega: "Guardião de IA",
  },
  {
    label: "Registrar respostas e atualizar health score",
    acao: "Atualizar saúde do cliente",
    entrega: "WhatsApp",
  },
]
const ROT_SEX: RotItem[] = [
  {
    label: "Varrer todos os grupos: há retorno pendente meu ou de consultores?",
    acao: "Aguardar resposta",
    entrega: "WhatsApp",
  },
  {
    label: "Verificar pendências gerais da semana",
    acao: "Atualizar risco do cliente",
    entrega: "WhatsApp",
  },
  {
    label: "Enviar mensagem de fechamento de semana para os grupos",
    acao: "Fazer follow-up no WhatsApp",
    entrega: "WhatsApp",
  },
]

const MICRO_T1 = [
  "Revisar o que foi instalado vs. planejado",
  "Desbloquear um entrave de implementação",
  "Reforçar próximo passo e celebrar primeira vitória",
]
const MICRO_T2 = [
  "Mapear setores da empresa que ainda não sentiram a IA",
  "Propor nova área para atacar no próximo mês",
  "Conectar cliente ao consultor da frente adequada",
]
const MICRO_T3 = [
  "Conversar com viés de visão de futuro, não de cobrança",
  "Identificar e nomear um sinal de platô",
  "Dar prévia do Raio-X de Maturidade e relembrar ponto de partida com dados",
]
const TRIM = [
  "Preparar o entregável do marco",
  "Agendar reunião com Galdino",
  "Conduzir o ritual de fechamento do ciclo",
]

// ---------- UI primitives ----------
function ChecklistCard({
  title,
  dia,
  items,
  feitos,
  toggle,
  accent,
  onCreate,
}: {
  title: string
  dia: string
  items: RotItem[]
  feitos: string[]
  toggle: (item: RotItem) => void
  accent: string
  onCreate: (item: RotItem) => void
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col">
      <div className={`text-[10px] uppercase tracking-wider font-bold ${accent}`}>
        {dia}
      </div>
      <div className="font-bold text-base mt-1">{title}</div>
      <ul className="mt-4 space-y-2.5 flex-1">
        {items.map((t, i) => {
          const done = feitos.includes(t.label)
          return (
            <li key={i} className="flex items-start gap-2">
              <button
                onClick={() => toggle(t)}
                className="flex-1 text-left flex items-start gap-2.5 group"
              >
                <span
                  className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                    done
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border group-hover:border-primary"
                  }`}
                >
                  {done && (
                    <svg viewBox="0 0 16 16" className="h-3 w-3 fill-none stroke-current stroke-[3]">
                      <path d="M3 8.5l3 3 7-7" />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-sm leading-snug ${
                    done ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {t.label}
                </span>
              </button>
              <button
                onClick={() => onCreate(t)}
                title={`Criar atividade: ${t.acao} · ${t.entrega}`}
                className="shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-1 rounded-md border border-border text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="h-3 w-3" /> atividade
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: typeof Calendar
  title: string
  badge: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="text-[11px] text-muted-foreground font-semibold">{badge}</div>
      </div>
    </div>
  )
}

// ---------- Page ----------
export function RotinasPanel({ secao }: { secao?: string }) {
  const [profile] = useProfile()
  const csName: CSName | null = isCS(profile) ? (profile as CSName) : null
  // A lista do time chega assíncrona (tabela `mentores`): pode vir vazia no 1º render.
  const [coordCS, setCoordCS] = useState<CSName>("")
  const cs: CSName = csName || coordCS || CS_LIST[0] || ""
  const clientes = useClientes()
  const atividades = useAtividades()

  const rotinas = useRotinas()
  const semana = useMemo(() => {
    const seg = segundaDaSemana()
    const dom = new Date(seg)
    dom.setDate(seg.getDate() + 6)
    return { de: toISODate(seg), ate: toISODate(dom) }
  }, [])
  const execucoes = useRotinaExecucoes(cs || null, semana.de, semana.ate)

  const rotinaPorChave = useMemo(
    () => new Map(rotinas.map((r) => [r.chave, r])),
    [rotinas],
  )

  /**
   * Marcação do checklist: antes ficava em localStorage por semana ISO, agora
   * vira uma linha em crm_rotina_execucoes (CS + data da rotina na semana).
   */
  function feitosDe(chave: string, diaSemana: number): string[] {
    const rotina = rotinaPorChave.get(chave)
    if (!rotina) return []
    const data = dataDaRotina(diaSemana)
    return itensFeitosDe(
      execucoes.find((e) => e.rotina_id === rotina.id && e.data_referencia === data),
    )
  }

  function toggleItem(chave: string, diaSemana: number, total: number, item: RotItem) {
    const rotina = rotinaPorChave.get(chave)
    if (!rotina || !cs) {
      toast.error("Rotina não encontrada no catálogo.")
      return
    }
    const data = dataDaRotina(diaSemana)
    const atuais = feitosDe(chave, diaSemana)
    const proximos = atuais.includes(item.label)
      ? atuais.filter((l) => l !== item.label)
      : [...atuais, item.label]
    void salvarExecucaoRotina({
      rotinaId: rotina.id,
      cs,
      dataReferencia: data,
      itensFeitos: proximos,
      totalItens: total,
    }).catch((e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar a rotina"),
    )
  }

  type ModalCfg = {
    defaultClienteId?: string
    defaultAcao?: string
    defaultEntrega?: string
    defaultTitulo?: string
    defaultTipo?: "Contato" | "Follow-up" | "Reunião" | "Handoff" | "Outro"
    presetFilters?: import("@/components/crm/NovaAtividadeModal").PresetFilters
    origem?: import("@/lib/crm/types").AtividadeOrigem
    origemLabel?: string
  } | null
  const [modal, setModal] = useState<ModalCfg>(null)

  const idMap = useMemo(() => buildDisplayIdMap(clientes), [clientes])

  const myClientes = useMemo(
    () => clientes.filter((c) => c.responsavel_cs === cs && c.status !== "Cancelado"),
    [clientes, cs],
  )

  const clientesComDias = useMemo(() => {
    return myClientes
      .map((c) => {
        const d = diasSemContato(c.id, atividades)
        return { cliente: c, dias: d ?? 999 }
      })
      .sort((a, b) => b.dias - a.dias)
  }, [myClientes, atividades])

  const semanaTitle = (() => {
    const [y, w] = isoWeek(new Date())
    return `Semana ${w} · ${y}`
  })()

  // Auto-scroll para seção
  useEffect(() => {
    if (secao) {
      const el = document.getElementById(`secao-${secao}`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [secao])

  return (
    <div className="max-w-7xl">
      <header className="mb-6 flex items-end justify-end flex-wrap gap-4">
        {!csName && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ver rotina de:</span>
            <select
              value={cs}
              onChange={(e) => setCoordCS(e.target.value as CSName)}
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm"
            >
              {CS_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* ============ SEÇÃO 1 — SEMANAL ============ */}
      <section id="secao-semanal" className="mb-10">
        <div className="flex items-end justify-between flex-wrap gap-2 mb-4">
          <SectionHeader
            icon={Calendar}
            title="Rotina Semanal"
            badge={`📅 Toda semana · Seg · Qua · Sex · ${semanaTitle}`}
          />
          <button
            onClick={() =>
              setModal({
                presetFilters: { ciclo: "Cliente Novo · 30 dias" },
                origem: "rotina_semanal",
                origemLabel: "Rotina semanal — Check Geral da Carteira",
              })
            }
            className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Criar atividade para cliente(s)
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChecklistCard
            dia="Segunda-feira"
            title="Check Geral da Carteira"
            items={ROT_SEG}
            feitos={feitosDe("checkup_segunda", 1)}
            toggle={(it) => toggleItem("checkup_segunda", 1, ROT_SEG.length, it)}
            accent="text-status-blue"
            onCreate={(it) =>
              setModal({
                defaultAcao: it.acao,
                defaultEntrega: it.entrega,
                presetFilters: { ciclo: "Cliente Novo · 30 dias" },
                origem: "rotina_semanal",
                origemLabel: "Rotina semanal — Segunda · Check Geral da Carteira",
              })
            }
          />
          <ChecklistCard
            dia="Quarta-feira"
            title="Acompanhamento de Implementações"
            items={ROT_QUA}
            feitos={feitosDe("checkup_quarta", 3)}
            toggle={(it) => toggleItem("checkup_quarta", 3, ROT_QUA.length, it)}
            accent="text-status-yellow"
            onCreate={(it) =>
              setModal({
                defaultAcao: it.acao,
                defaultEntrega: it.entrega,
                presetFilters: { implementacao: "em_andamento" },
                origem: "rotina_semanal",
                origemLabel: "Rotina semanal — Quarta · Acompanhamento de Implementações",
              })
            }
          />
          <ChecklistCard
            dia="Sexta-feira"
            title="Revisor Final"
            items={ROT_SEX}
            feitos={feitosDe("checkup_sexta", 5)}
            toggle={(it) => toggleItem("checkup_sexta", 5, ROT_SEX.length, it)}
            accent="text-status-green"
            onCreate={(it) =>
              setModal({
                defaultAcao: it.acao,
                defaultEntrega: it.entrega,
                presetFilters: { janela: "sem_contato_14" },
                origem: "rotina_semanal",
                origemLabel: "Rotina semanal — Sexta · Revisor Final",
              })
            }
          />
        </div>
      </section>

      {/* ============ SEÇÃO 2 — QUINZENAL ============ */}
      <section id="secao-quinzenal" className="mb-10">
        <div className="flex items-end justify-between flex-wrap gap-2 mb-4">
          <SectionHeader
            icon={MessageCircle}
            title="Rotina Quinzenal"
            badge="📆 A cada 14 dias · Cadência de Contato"
          />
          <button
            onClick={() =>
              setModal({
                defaultAcao: "Fazer follow-up no WhatsApp",
                defaultEntrega: "WhatsApp",
                presetFilters: { janela: "sem_contato_14" },
                origem: "rotina_quinzenal",
                origemLabel: "Rotina quinzenal — Contato de valor",
              })
            }
            className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Criar contato de valor
          </button>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="font-bold text-base">Contato de Valor</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Nenhum cliente pode ficar mais de 14 dias sem contato proativo.
            Nunca use contato vazio — leve sempre algo de valor.
          </p>
          <div className="mt-4 border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Cliente</th>
                  <th className="text-left px-4 py-2 font-semibold">Dias sem contato</th>
                  <th className="text-right px-4 py-2 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {clientesComDias.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      Nenhum cliente.
                    </td>
                  </tr>
                )}
                {clientesComDias.map(({ cliente, dias }) => {
                  const isRed = dias >= 14
                  const isYellow = dias >= 8 && dias < 14
                  const color = isRed
                    ? "bg-status-red/15 text-status-red border-status-red/40"
                    : isYellow
                      ? "bg-status-yellow/15 text-status-yellow border-status-yellow/40"
                      : "bg-status-green/15 text-status-green border-status-green/40"
                  const label = dias >= 999 ? "Sem registro" : `${dias} dia${dias === 1 ? "" : "s"}`
                  return (
                    <tr
                      key={cliente.id}
                      className={`border-t border-border ${isRed ? "bg-status-red/5" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-semibold">
                        <span className="font-mono text-primary mr-2">{idMap.get(cliente.id)}</span>
                        {cliente.nome}
                        {cliente.empresa && (
                          <span className="text-xs text-muted-foreground ml-2">· {cliente.empresa}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isRed && (
                          <button
                            onClick={() =>
                              setModal({
                                defaultClienteId: cliente.id,
                                defaultAcao: "Fazer follow-up no WhatsApp",
                                defaultEntrega: "WhatsApp",
                                origem: "rotina_quinzenal",
                                origemLabel: "Rotina quinzenal — Contato de valor",
                              })
                            }
                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-status-red text-white hover:bg-status-red/90"
                          >
                            Contatar agora
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============ SEÇÃO 3 — MICRO-CICLOS ============ */}
      <section id="secao-micro" className="mb-10">
        <SectionHeader
          icon={Repeat}
          title="Micro-ciclos"
          badge="🔁 Entre marcos trimestrais · Check-in leve"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { t: "T1 — Check-in de Tração", w: "Meio do 1º Trimestre (≈ dia 45-60)", items: MICRO_T1, ciclo: "Ciclo 90 dias" as const },
            { t: "T2 — Check-in de Expansão", w: "Meio do 2º Trimestre (≈ dia 120-150)", items: MICRO_T2, ciclo: "Ciclo 180 dias" as const },
            { t: "T3 — Check-in de Maturidade", w: "Meio do 3º Trimestre (≈ dia 210-240)", items: MICRO_T3, ciclo: "Ciclo 270 dias" as const },
          ].map((m) => (
            <div key={m.t} className="bg-card border border-border rounded-lg p-5 flex flex-col">
              <div className="font-bold text-base">{m.t}</div>
              <div className="text-[11px] text-muted-foreground font-semibold mt-1">
                {m.w}
              </div>
              <ul className="mt-4 space-y-2 flex-1">
                {m.items.map((i, idx) => (
                  <li key={idx} className="text-sm flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span className="text-foreground/90">{i}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() =>
                  setModal({
                    defaultAcao: "Agendar reunião",
                    defaultEntrega: "Reunião com Consultor",
                    presetFilters: { ciclo: m.ciclo },
                    origem: "micro_ciclo",
                    origemLabel: `Micro-ciclo — ${m.t}`,
                  })
                }
                className="mt-4 inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg border border-border hover:border-primary"
              >
                <Plus className="h-3.5 w-3.5" /> Criar micro-ciclo
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ============ SEÇÃO 4 — TRIMESTRAL ============ */}
      <section id="secao-trimestral" className="mb-6">
        <SectionHeader
          icon={Trophy}
          title="Ritual Trimestral"
          badge="🏆 A cada 90 dias · Com Galdino"
        />
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="font-bold text-base">Fechamento de Ciclo</div>
          <ul className="mt-4 space-y-2">
            {TRIM.map((t, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() =>
              setModal({
                defaultAcao: "Agendar reunião",
                defaultEntrega: "Reunião com Galdino",
                presetFilters: { ciclo: "Ciclo 90 dias" },
                origem: "ritual_trimestral",
                origemLabel: "Ritual trimestral — Fechamento de Ciclo",
              })
            }
            className="mt-4 inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Criar ritual de fechamento
          </button>
        </div>
      </section>

      {modal && (
        <NovaAtividadeModal
          defaultClienteId={modal.defaultClienteId}
          defaultAcao={modal.defaultAcao}
          defaultEntrega={modal.defaultEntrega}
          defaultTitulo={modal.defaultTitulo}
          defaultTipo={modal.defaultTipo}
          presetFilters={modal.presetFilters}
          origem={modal.origem}
          origemLabel={modal.origemLabel}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
