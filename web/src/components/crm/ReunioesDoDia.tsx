import { useEffect, useMemo, useState, Fragment } from "react"
import { MoreHorizontal, X, ExternalLink, RefreshCw } from "lucide-react"
import { openCliente, useClientes, useReunioes } from "@/lib/crm/storage"

import type { CSName, Cliente, Reuniao } from "@/lib/crm/types"

/**
 * Reuniões do dia em que a CS participa.
 *
 * Diferença central em relação ao original: a reunião agora vem do Google
 * Calendar (view `crm_reunioes_v`) e é SOMENTE LEITURA. Sumiram daqui a edição
 * de pauta/resumo, o "vincular cliente" e o bloco de transcrição por IA — não
 * há mais `upsertReuniao`, e a IA vira Edge Function numa fase posterior.
 */

function isSameLocalDay(iso: string, ref: Date) {
  const d = new Date(iso)
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  )
}

function reuniaoStart(r: Reuniao): Date {
  const d = new Date(r.data)
  const [h, m] = (r.hora_inicio || "00:00").split(":").map((x) => parseInt(x, 10) || 0)
  d.setHours(h, m, 0, 0)
  return d
}

function googleAgendaUrl(r: Reuniao): string {
  if (r.google_event_id) {
    return `https://calendar.google.com/calendar/u/0/r/eventedit/${r.google_event_id}`
  }
  const d = new Date(r.data)
  return `https://calendar.google.com/calendar/u/0/r/day/${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

export function ReunioesDoDia({ csName, day }: { csName: CSName | null; day?: Date }) {
  const reunioes = useReunioes()
  const clientes = useClientes()
  const [openId, setOpenId] = useState<string | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const ref = day ?? new Date()
  const list = useMemo(() => {
    return reunioes
      .filter((r) => r.status !== "Cancelada" && isSameLocalDay(r.data, ref))
      .filter((r) => (r.participacao_cs ?? "Participa") === "Participa")
      .filter((r) => (csName ? r.cs_responsavel === csName : true))
      .sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || ""))
  }, [reunioes, csName, ref])

  const open = openId ? reunioes.find((r) => r.id === openId) ?? null : null

  const now = new Date()
  const nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  // Determina após qual reunião o "agora" cai (para desenhar o filete).
  const nowInsertIndex = (() => {
    if (list.length === 0) return -1
    const nowMs = now.getTime()
    let idx = -1
    for (let i = 0; i < list.length; i++) {
      const s = reuniaoStart(list[i]).getTime()
      const e = s + list[i].duracao_minutos * 60_000
      if (nowMs > e) idx = i
    }
    // só mostra entre reuniões (não antes da primeira, não depois da última)
    if (idx < 0) return -1
    if (idx >= list.length - 1) return -1
    return idx
  })()

  return (
    <section className="scroll-mt-6">
      <header className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <h2 className="text-[16px] font-medium text-white">Suas reuniões</h2>
        <span className="text-[12px] text-[#6B6B6B]">{list.length}</span>
        <button
          onClick={() => setTick((n) => n + 1)}
          className="ml-auto p-1 text-[#6B6B6B] hover:text-white transition-colors"
          title="Atualizar"
          aria-label="Atualizar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </header>
      <div style={{ height: "0.5px", background: "#2E2E2E", marginBottom: 10 }} />
      {list.length === 0 ? (
        <div className="text-[13px] text-[#6B6B6B]">Nenhuma reunião hoje</div>
      ) : (
        <div className="space-y-[5px]">
          {list.map((r, i) => (
            <Fragment key={r.id}>
              <ReuniaoRow
                reuniao={r}
                cliente={clientes.find((c) => c.id === r.cliente_id) ?? null}
                onOpen={() => setOpenId(r.id)}
              />
              {i === nowInsertIndex && (
                <div className="flex items-center gap-2 py-1" aria-hidden>
                  <span className="text-[11px] text-[#DAFC67] tabular-nums" style={{ width: 42 }}>
                    {nowHM}
                  </span>
                  <span className="flex-1 h-px" style={{ background: "#DAFC67" }} />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      )}
      {open && (
        <ReuniaoPanel
          reuniao={open}
          cliente={clientes.find((c) => c.id === open.cliente_id) ?? null}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  )
}

function ReuniaoRow({
  reuniao: r,
  cliente,
  onOpen,
}: {
  reuniao: Reuniao
  cliente: Cliente | null
  onOpen: () => void
}) {
  const [menu, setMenu] = useState(false)
  const isCliente = r.tipo === "Cliente"
  const border = isCliente ? "#1D9E75" : "#7F77DD"

  const start = reuniaoStart(r)
  const now = Date.now()
  const startMs = start.getTime()
  const endMs = startMs + r.duracao_minutos * 60_000
  const minsUntil = Math.round((startMs - now) / 60_000)
  const isDuring = now >= startMs && now <= endMs

  // Sem edição de reunião, o botão contextual ou entra na sala ou abre o painel.
  const contextual: { label: string; onClick: () => void } =
    isDuring || (minsUntil <= 15 && minsUntil >= 0)
      ? {
          label: "Entrar",
          onClick: () => {
            if (r.link_reuniao) window.open(r.link_reuniao, "_blank", "noopener")
            else onOpen()
          },
        }
      : { label: "Preparar", onClick: onOpen }

  const sub = isCliente
    ? `Cliente${r.ciclo ? ` · T${r.ciclo}` : ""} · ${r.duracao_minutos} min`
    : `Time PMC · ${r.duracao_minutos} min`

  return (
    <div
      className="group relative flex items-center gap-3 cursor-pointer"
      style={{
        borderLeft: `2px solid ${border}`,
        background: "#232323",
        padding: "9px 10px",
        minHeight: 48,
      }}
      onClick={onOpen}
    >
      <div
        className="text-[13px] font-medium text-white tabular-nums shrink-0"
        style={{ width: 42 }}
      >
        {r.hora_inicio}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[14px] text-white leading-tight"
          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {r.titulo}
        </div>
        <div
          className="text-[12px] mt-0.5"
          style={{
            color: "#6B6B6B",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sub}
          {isCliente && cliente && r.materiais_pendentes && (
            <span style={{ color: "#EF9F27" }}> · material pendente</span>
          )}
          {isCliente && !cliente && <span> · sem cliente vinculado</span>}
        </div>
      </div>
      <div
        className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={contextual.onClick}
          className="h-[26px] px-3 text-[12px] rounded-md text-foreground hover:border-primary"
          style={{ border: "0.5px solid var(--border)", background: "transparent" }}
        >
          {contextual.label}
        </button>
        <div className="relative">
          <button
            onClick={() => setMenu((v) => !v)}
            className="h-[26px] w-[26px] flex items-center justify-center rounded-md hover:border-primary"
            style={{ border: "0.5px solid var(--border)", background: "transparent" }}
            aria-label="Mais ações"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg py-1 min-w-[210px] shadow-lg">
                <MenuItem
                  label="Abrir no Google Agenda"
                  onClick={() => {
                    setMenu(false)
                    window.open(googleAgendaUrl(r), "_blank", "noopener")
                  }}
                />
                <MenuItem
                  label="Abrir detalhes"
                  onClick={() => {
                    setMenu(false)
                    onOpen()
                  }}
                />
                {r.cliente_id && (
                  <MenuItem
                    label="Abrir Cliente 360"
                    onClick={() => {
                      setMenu(false)
                      openCliente(r.cliente_id!)
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MenuItem({
  label,
  onClick,
  tone,
}: {
  label: string
  onClick: () => void
  tone?: "danger"
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-background ${
        tone === "danger" ? "text-status-red" : "text-foreground"
      }`}
    >
      {label}
    </button>
  )
}

function ReuniaoPanel({
  reuniao,
  cliente,
  onClose,
}: {
  reuniao: Reuniao
  cliente: Cliente | null
  onClose: () => void
}) {
  const dataFmt =
    new Date(reuniao.data).toLocaleDateString("pt-BR") + " · " + reuniao.hora_inicio

  return (
    <div className="fixed inset-0 z-50 flex items-stretch" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full h-full bg-card overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between px-6 py-4 z-10">
          <div className="min-w-0 max-w-[900px]">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Reunião · {reuniao.status} · {reuniao.tipo}
              {reuniao.subtipo ? ` · ${reuniao.subtipo}` : ""}
            </div>
            <div className="text-lg font-bold truncate">{reuniao.titulo}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">
              {dataFmt} · {reuniao.duracao_minutos} min · {reuniao.cs_responsavel}
              {cliente ? ` · ${cliente.nome}` : ""}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-background rounded" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-w-[1100px] mx-auto space-y-5 text-sm">
          {/* Bloco somente leitura */}
          <div
            className="rounded-lg border border-border/60 p-4 space-y-3"
            style={{ background: "#1E1E1E" }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Data / Hora" value={dataFmt} />
              <Field label="Duração" value={`${reuniao.duracao_minutos} min`} />
              <Field
                label="Participantes"
                value={reuniao.cs_responsavel + (cliente ? ` · ${cliente.nome}` : "")}
              />
              <Field
                label="Tipo"
                value={reuniao.tipo + (reuniao.subtipo ? ` · ${reuniao.subtipo}` : "")}
              />
            </div>
            {reuniao.link_reuniao ? (
              <a
                href={reuniao.link_reuniao}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir link da reunião
              </a>
            ) : (
              <div className="text-[12px] text-muted-foreground">Sem link cadastrado</div>
            )}
            <div>
              <a
                href={googleAgendaUrl(reuniao)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[#6B6B6B] hover:text-white hover:underline"
              >
                Editar no Google Agenda →
              </a>
            </div>
          </div>

          {/* Pauta e resumo vêm do Google Calendar / enriquecimento: leitura. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Pauta
              </div>
              <div className="whitespace-pre-wrap text-[13px] text-foreground">
                {reuniao.pauta?.trim() || (
                  <span className="text-muted-foreground">Sem pauta registrada.</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Resumo
              </div>
              <div className="whitespace-pre-wrap text-[13px] text-foreground">
                {reuniao.resumo?.trim() || (
                  <span className="text-muted-foreground">Sem resumo registrado.</span>
                )}
              </div>
            </div>
          </div>

          {cliente && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Materiais pendentes
              </div>
              <div className="text-[13px] text-muted-foreground">
                {reuniao.materiais_pendentes
                  ? "Há material pendente vinculado a este cliente."
                  : "Sem pendências registradas."}
              </div>
            </div>
          )}

          {cliente && (
            <div className="pt-3 border-t border-border/60">
              <button
                onClick={() => {
                  openCliente(cliente.id)
                  onClose()
                }}
                className="text-[13px] text-primary hover:underline"
              >
                Abrir Cliente 360 →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-[13px] text-foreground">{value}</div>
    </div>
  )
}
