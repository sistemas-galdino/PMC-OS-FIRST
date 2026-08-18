import { useMemo, useState } from "react"
import { CalendarDays, FileText, Image as ImageIcon } from "lucide-react"
import { Badge } from "@/components/crm/Badge"
import { NovaAtividadeModal } from "@/components/crm/NovaAtividadeModal"
import { alertasEntrega } from "@/lib/crm/alertas-catalogo"
import { trimestreAtual, isPosPrograma } from "@/lib/crm/jornada"
import { useAtividades, useReunioes } from "@/lib/crm/storage"
import type { AnexoConversa } from "@/lib/crm/conversas"
import type { Cliente } from "@/lib/crm/types"

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-3 border-b border-border/60">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">{titulo}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function dataCurta(iso?: string) {
  if (!iso) return "sem data"
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "sem data" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

export function PainelAlertasCliente({
  cliente,
  arquivos,
}: {
  cliente: Cliente
  arquivos: { anexo: AnexoConversa; em: string }[]
}) {
  const atividades = useAtividades()
  const reunioes = useReunioes()
  const [novaAtiv, setNovaAtiv] = useState<{ titulo: string } | null>(null)

  const alertas = useMemo(
    () => alertasEntrega(cliente, { atividades }),
    [cliente, atividades],
  )

  const abertas = useMemo(
    () =>
      atividades
        .filter((a) => a.cliente_id === cliente.id && a.status !== "Concluída")
        .sort((a, b) => (a.data_prevista || "").localeCompare(b.data_prevista || "")),
    [atividades, cliente.id],
  )

  const proximas = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    return reunioes
      .filter((r) => r.cliente_id === cliente.id && r.status !== "Cancelada" && (r.data || "") >= hoje)
      .sort((a, b) => (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio))
  }, [reunioes, cliente.id])

  const tri = trimestreAtual(cliente)
  const pos = isPosPrograma(cliente)

  return (
    <>
      <aside className="w-[280px] shrink-0 border-l border-border bg-card overflow-y-auto">
        <div className="px-3 py-3 border-b border-border/60">
          <div className="text-sm font-semibold">{cliente.nome}</div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge value={cliente.temperatura} />
            <span className="text-[11px] text-muted-foreground">
              {pos ? "Pós-programa" : tri ? `T${tri}` : "Sem trimestre"}
            </span>
          </div>
        </div>

        {alertas.length > 0 && (
          <Secao titulo="Alertas em aberto">
            {alertas.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-background p-2.5">
                <div className="text-xs font-medium">{a.titulo}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{a.contexto}</div>
                <button
                  onClick={() => setNovaAtiv({ titulo: a.acao })}
                  className="mt-2 text-[11px] px-2 py-1 rounded-md border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Criar atividade
                </button>
              </div>
            ))}
          </Secao>
        )}

        {abertas.length > 0 && (
          <Secao titulo="Atividades abertas">
            {abertas.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-background p-2.5">
                <div className="text-xs truncate">{a.titulo}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {a.status} · {dataCurta(a.data_prevista)}
                </div>
              </div>
            ))}
          </Secao>
        )}

        {proximas.length > 0 && (
          <Secao titulo="Próximas reuniões">
            {proximas.map((r) => (
              <div key={r.id} className="flex items-start gap-2 rounded-lg border border-border bg-background p-2.5">
                <CalendarDays className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs truncate">{r.titulo}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {dataCurta(r.data)} · {r.hora_inicio}
                  </div>
                </div>
              </div>
            ))}
          </Secao>
        )}

        {arquivos.length > 0 && (
          <Secao titulo="Arquivos">
            {arquivos.map((f, i) => (
              <div key={`${f.anexo.nome}-${i}`} className="flex items-center gap-2 text-xs">
                {f.anexo.tipo === "imagem" ? (
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="truncate">{f.anexo.nome}</span>
                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{dataCurta(f.em)}</span>
              </div>
            ))}
          </Secao>
        )}
      </aside>

      {novaAtiv && (
        <NovaAtividadeModal
          defaultClienteId={cliente.id}
          defaultTitulo={novaAtiv.titulo}
          onClose={() => setNovaAtiv(null)}
        />
      )}
    </>
  )
}
