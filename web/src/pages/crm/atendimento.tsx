import { useEffect, useMemo, useRef, useState } from "react"
import { FileText, Image as ImageIcon, PanelRight, Search } from "lucide-react"
import { ChatComposer } from "@/components/crm/ChatComposer"
import { PainelAlertasCliente } from "@/components/crm/PainelAlertasCliente"
import { isCS, useClientes, useProfile } from "@/lib/crm/storage"
import { useCsList } from "@/lib/crm/equipe"
import {
  silencioDe,
  useConversas,
  useMensagens,
  type ConversaResumo,
} from "@/lib/crm/conversas"
import type { Cliente, CSName } from "@/lib/crm/types"

/**
 * Atendimento — os grupos de WhatsApp da carteira.
 *
 * A borda colorida à esquerda de cada conversa é o ponto da tela: mede o
 * silêncio em HORAS ÚTEIS desde a última mensagem do cliente, então uma
 * mensagem de sexta à noite não vira alerta vermelho no sábado de manhã.
 */

function horaCurta(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const hoje = new Date()
  if (d.toDateString() === hoje.toDateString())
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const ontem = new Date(hoje.getTime() - 86400000)
  if (d.toDateString() === ontem.toDateString()) return "ontem"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

interface Linha {
  conversa: ConversaResumo
  cliente: Cliente
  em: string
  preview: string
  autor: string
  daCS: boolean
  silencio: number
}

export default function CrmAtendimentoPage() {
  const [profile] = useProfile()
  const clientes = useClientes()
  const csList = useCsList()
  const { conversas, carregando } = useConversas()

  const [busca, setBusca] = useState("")
  const [csFiltro, setCsFiltro] = useState<CSName | "all">("all")
  const [filtro, setFiltro] = useState<"carteira" | "sem-resposta">("carteira")
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [painelAberto, setPainelAberto] = useState(true)

  // Coordenação (perfil nulo ou não-CS) escolhe a CS; uma CS vê só a dela.
  const podeFiltrarCS = !isCS(profile)

  const { linhas, semVinculo } = useMemo(() => {
    const meus = new Map(
      clientes
        .filter((c) => !isCS(profile) || c.responsavel_cs === (profile as CSName))
        .map((c) => [c.id, c]),
    )
    const out: Linha[] = []
    let orfas = 0
    for (const conv of conversas) {
      const cliente = conv.cliente_id ? meus.get(conv.cliente_id) : undefined
      if (!cliente) {
        // Grupo existe no provedor mas não está ligado a nenhum cliente da
        // carteira em foco. Some da lista, mas não some da tela: o rodapé conta.
        if (!conv.cliente_id) orfas++
        continue
      }
      const msg = conv.ultima
      if (!msg) continue
      out.push({
        conversa: conv,
        cliente,
        em: msg.em,
        preview: msg.texto || (msg.anexo ? msg.anexo.nome : ""),
        autor: msg.daCS ? "Você" : `~${msg.autor}`,
        daCS: msg.daCS,
        silencio: silencioDe(conv),
      })
    }
    out.sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime())
    return { linhas: out, semVinculo: orfas }
  }, [clientes, conversas, profile])

  const porCS = useMemo(
    () => (csFiltro === "all" ? linhas : linhas.filter((l) => l.cliente.responsavel_cs === csFiltro)),
    [linhas, csFiltro],
  )
  const semResposta = useMemo(() => porCS.filter((l) => !l.daCS), [porCS])

  const visiveis = useMemo(() => {
    const base = filtro === "sem-resposta" ? semResposta : porCS
    const q = busca.trim().toLowerCase()
    return q ? base.filter((l) => l.cliente.nome.toLowerCase().includes(q)) : base
  }, [porCS, semResposta, filtro, busca])

  const aberta = linhas.find((l) => l.conversa.id === selecionada)
  const { mensagens, carregando: carregandoMsgs } = useMensagens(aberta?.conversa.id ?? null)

  // Conversa aberta que sai da lista (troca de CS, filtro) não pode ficar
  // fantasma no painel da direita.
  useEffect(() => {
    if (selecionada && !linhas.some((l) => l.conversa.id === selecionada)) setSelecionada(null)
  }, [linhas, selecionada])

  // Conversa abre no fim, como no WhatsApp: o que interessa é a última
  // mensagem, não a primeira.
  // Mexe no scrollTop do próprio container em vez de scrollIntoView, que
  // arrastaria a página inteira (a tela vive dentro do main rolável do PMC OS).
  const fimRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = fimRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensagens])

  const arquivos = useMemo(
    () => mensagens.filter((m) => !!m.anexo).map((m) => ({ anexo: m.anexo!, em: m.em })),
    [mensagens],
  )

  return (
    <div className="p-6 space-y-4 min-h-full">
      <div>
        <h1 className="text-2xl font-bold">Atendimento</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Grupos de WhatsApp da carteira, com alerta de silêncio em horas úteis (seg–sex, 8h–18h).
        </p>
      </div>

      <div className="flex h-[calc(100vh-16rem)] min-h-[520px] overflow-hidden rounded-xl border border-border bg-background">
        {/* Lista */}
        <aside className="w-[280px] shrink-0 border-r border-border flex flex-col overflow-hidden">
          <div className="p-3 space-y-2.5 border-b border-border">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar cliente"
                className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-primary"
              />
            </div>
            {podeFiltrarCS && (
              <select
                value={csFiltro}
                onChange={(e) => setCsFiltro(e.target.value as CSName | "all")}
                className="w-full bg-card border border-border rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary"
              >
                <option value="all">Todas as CS</option>
                {csList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-1.5">
              {(
                [
                  ["carteira", `Carteira ${porCS.length}`],
                  ["sem-resposta", `Sem resposta ${semResposta.length}`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFiltro(k)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                    filtro === k
                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {carregando && (
              <div className="px-3 py-6 text-[11px] text-muted-foreground">Carregando conversas…</div>
            )}
            {!carregando && visiveis.length === 0 && (
              <div className="px-3 py-6 text-[11px] text-muted-foreground">
                {conversas.length === 0
                  ? "Nenhuma conversa. O WhatsApp ainda não está conectado a este ambiente."
                  : "Nenhuma conversa com esse filtro."}
              </div>
            )}
            {visiveis.map((l) => {
              const borda =
                l.silencio > 18
                  ? "border-l-status-red"
                  : l.silencio > 12
                    ? "border-l-status-yellow"
                    : "border-l-transparent"
              const ativo = selecionada === l.conversa.id
              return (
                <button
                  key={l.conversa.id}
                  onClick={() => setSelecionada(l.conversa.id)}
                  className={`w-full text-left border-l-2 ${borda} border-b border-border/60 px-3 py-2.5 transition-colors flex items-center gap-2.5 ${
                    ativo ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                >
                  <span className="h-8 w-8 shrink-0 rounded-full bg-card border border-border grid place-items-center text-xs font-semibold">
                    {l.cliente.nome.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 flex items-baseline gap-1.5">
                        <span className="text-xs font-semibold truncate">{l.cliente.nome}</span>
                        {podeFiltrarCS && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {l.cliente.responsavel_cs}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{horaCurta(l.em)}</span>
                    </span>
                    <span className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground truncate flex-1">
                        {l.autor}: {l.preview}
                      </span>
                      {l.conversa.naoLidas > 0 && (
                        <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-status-green text-[10px] font-semibold text-background grid place-items-center">
                          {l.conversa.naoLidas}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {semVinculo > 0 && (
            <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
              {semVinculo} {semVinculo === 1 ? "grupo sem cliente vinculado" : "grupos sem cliente vinculado"}
            </div>
          )}
        </aside>

        {/* Conversa */}
        {!aberta ? (
          <section className="flex-1 min-w-0 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Selecione uma conversa</div>
          </section>
        ) : (
          <>
            <section className="flex-1 min-w-0 flex flex-col overflow-hidden">
              <header className="h-14 shrink-0 border-b border-border px-4 flex items-center gap-3">
                <span className="h-8 w-8 shrink-0 rounded-full bg-card border border-border grid place-items-center text-xs font-semibold">
                  {aberta.cliente.nome.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{aberta.cliente.nome}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {aberta.conversa.grupo_nome}
                  </div>
                </div>
                <button
                  onClick={() => setPainelAberto((v) => !v)}
                  title="Alertas do cliente"
                  className={`ml-auto h-8 w-8 grid place-items-center rounded-lg border transition-colors ${
                    painelAberto
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <PanelRight className="h-4 w-4" />
                </button>
              </header>

              <div ref={fimRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {carregandoMsgs && (
                  <div className="text-[11px] text-muted-foreground">Carregando mensagens…</div>
                )}
                {mensagens.map((m) => (
                  <div key={m.id} className={`flex ${m.daCS ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 border ${
                        m.daCS ? "bg-primary/10 border-primary/30" : "bg-card border-border"
                      }`}
                    >
                      {!m.daCS && <div className="text-[10px] text-muted-foreground mb-0.5">~{m.autor}</div>}
                      {m.anexo && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                          {m.anexo.tipo === "imagem" ? (
                            <ImageIcon className="h-3.5 w-3.5" />
                          ) : (
                            <FileText className="h-3.5 w-3.5" />
                          )}
                          <span className="truncate">{m.anexo.nome}</span>
                        </div>
                      )}
                      {m.texto && (
                        <div className="text-xs whitespace-pre-wrap break-words">{m.texto}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground text-right mt-0.5">
                        {horaCurta(m.em)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <ChatComposer />
            </section>

            {painelAberto && <PainelAlertasCliente cliente={aberta.cliente} arquivos={arquivos} />}
          </>
        )}
      </div>
    </div>
  )
}
