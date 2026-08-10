import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Calendar, Check } from "lucide-react"
import { toast } from "sonner"
import { useClientes, useReunioes } from "@/lib/crm/storage"
import { salvarItensPreparacao, usePreparacoes } from "@/lib/crm/preparacoes"
import { criarPreparacaoPadrao } from "@/lib/crm/preparacao"
import type { CSName, ItemPreparacao, Reuniao } from "@/lib/crm/types"

/**
 * Reuniões do cliente com terceiros (consultor, Galdino, David) — a CS não
 * participa, mas prepara. A reunião em si é somente leitura (Google Calendar);
 * o que a CS edita aqui é o checklist de preparação, gravado em
 * `crm_reuniao_preparacao`.
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

function tempoRestante(start: Date, now: Date): string {
  const diff = start.getTime() - now.getTime()
  if (diff <= 0) return "agora"
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`
}

export function ReunioesClientes({ csName, day }: { csName: CSName | null; day?: Date }) {
  const reunioes = useReunioes()
  const clientes = useClientes()
  const preparacoes = usePreparacoes()
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const ref = day ?? new Date()
  const list = useMemo(() => {
    return reunioes
      .filter(
        (r) =>
          r.participacao_cs === "Nao participa" &&
          r.status !== "Cancelada" &&
          isSameLocalDay(r.data, ref),
      )
      .filter((r) => {
        if (!csName) return true
        const cliente = clientes.find((c) => c.id === r.cliente_id)
        return cliente ? cliente.responsavel_cs === csName : r.cs_responsavel === csName
      })
      .sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || ""))
  }, [reunioes, clientes, csName, ref])

  // Reunião ainda sem checklist salvo cai no modelo padrão do tipo de
  // responsável — é o que `garantirPreparacao` fazia no original.
  const itensPorReuniao = useMemo(() => {
    const m = new Map<string, ItemPreparacao[]>()
    list.forEach((r) => {
      const salvos = preparacoes.get(r.id)?.itens
      m.set(
        r.id,
        salvos && salvos.length > 0
          ? salvos
          : criarPreparacaoPadrao(r.responsavel_externo, r.numero_reuniao),
      )
    })
    return m
  }, [list, preparacoes])

  const comPendencia = list.filter((r) =>
    (itensPorReuniao.get(r.id) ?? []).some((i) => i.status !== "Confirmado"),
  ).length

  const now = new Date()

  function confirmar(r: Reuniao, item: ItemPreparacao) {
    const preparacao = (itensPorReuniao.get(r.id) ?? []).map((i) =>
      i.id === item.id
        ? { ...i, status: "Confirmado" as const, confirmado_em: new Date().toISOString() }
        : i,
    )
    void salvarItensPreparacao(r, preparacao).catch((e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar a preparação"),
    )
  }

  return (
    <section className="scroll-mt-6" style={{ marginTop: 26 }}>
      <header className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <h2 className="text-[16px] font-medium text-white">Reuniões dos seus clientes</h2>
        <span className="text-[12px] text-[#6B6B6B]">{list.length}</span>
        {comPendencia > 0 && (
          <span
            className="text-[11px] font-medium px-[6px] py-[2px] rounded-[4px]"
            style={{ background: "#3A1414", color: "#FF6B6B" }}
          >
            {comPendencia} com pendência
          </span>
        )}
      </header>
      <div style={{ height: "0.5px", background: "#2E2E2E", marginBottom: 10 }} />

      {list.length === 0 ? (
        <div className="text-[13px] text-[#6B6B6B]">Nenhuma reunião de cliente hoje.</div>
      ) : (
        <div className="space-y-[5px]">
          {list.map((r) => {
            const cliente = clientes.find((c) => c.id === r.cliente_id) ?? null
            const itens = itensPorReuniao.get(r.id) ?? []
            const pendentes = itens.filter((i) => i.status !== "Confirmado")
            const confirmados = itens.filter((i) => i.status === "Confirmado")
            const start = reuniaoStart(r)
            const faltamMs = start.getTime() - now.getTime()
            const urgente = faltamMs < 4 * 3600_000
            const nome = cliente?.nome ?? "Sem cliente"
            const cabecalho = [
              r.hora_inicio,
              nome,
              r.responsavel_externo,
              r.numero_reuniao ? `${r.numero_reuniao}ª reunião` : null,
            ]
              .filter(Boolean)
              .join(" · ")

            if (pendentes.length === 0) {
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-2 px-3"
                  style={{
                    background: "#1E1E1E",
                    borderLeft: "3px solid #4ADE80",
                    minHeight: 38,
                  }}
                >
                  <Calendar className="h-3.5 w-3.5 text-[#6B6B6B] shrink-0" />
                  <span className="text-[13px] text-white truncate">{cabecalho}</span>
                  <span className="ml-auto text-[12px] shrink-0" style={{ color: "#4ADE80" }}>
                    ✓ pronta
                  </span>
                </div>
              )
            }

            return (
              <div
                key={r.id}
                className="px-3 py-[10px]"
                style={{
                  background: "#1E1E1E",
                  borderLeft: `3px solid ${urgente ? "#EF4444" : "#F59E0B"}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[#6B6B6B] shrink-0" />
                  <span className="text-[13px] text-white truncate">{cabecalho}</span>
                  <span
                    className="ml-auto text-[12px] shrink-0"
                    style={{ color: urgente ? "#EF4444" : "#F59E0B" }}
                  >
                    em {tempoRestante(start, now)}
                  </span>
                </div>

                <div className="mt-2 space-y-[6px]">
                  {pendentes.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <AlertTriangle
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: urgente ? "#EF4444" : "#F59E0B" }}
                      />
                      <span className="text-[13px] text-[#D4D4D4] truncate">{item.descricao}</span>
                      <button
                        onClick={() => confirmar(r, item)}
                        className="ml-auto shrink-0 text-[12px] font-medium px-[10px] py-[3px] rounded-md transition-opacity hover:opacity-85"
                        style={{ background: "#DAFC67", color: "#111111" }}
                      >
                        {item.acao_label ?? "Confirmar"}
                      </button>
                    </div>
                  ))}
                  {confirmados.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#4ADE80" }} />
                      <span className="text-[13px] text-[#6B6B6B] truncate">{item.descricao}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
