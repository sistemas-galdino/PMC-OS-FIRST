import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, LogOut, QrCode, RefreshCw, Smartphone, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import {
  emPareamento,
  useAcoesInstancia,
  useMinhaInstancia,
  type InstanciaWhatsapp,
} from "@/lib/crm/whatsapp"

/**
 * Conexão do WhatsApp da CS.
 *
 * Página própria, e não um modal dentro do Atendimento, porque o ciclo
 * (conectar → QR → conectada → caiu → reconectar) precisa ser alcançável
 * justamente quando a lista de conversas está vazia por falta de conexão.
 *
 * O QR expira em torno de 40s e a Evolution gera outro. O polling de 20s pede
 * o atual; o Realtime da instância (em useMinhaInstancia) é o que faz a tela
 * virar no segundo em que a CS escaneia.
 */

const INTERVALO_QR_MS = 20_000

function Selo({ status }: { status: InstanciaWhatsapp["status"] }) {
  const mapa: Record<InstanciaWhatsapp["status"], { texto: string; classe: string }> = {
    criada: { texto: "não conectada", classe: "bg-secondary text-muted-foreground" },
    aguardando_qr: { texto: "aguardando leitura do QR", classe: "bg-amber-500/15 text-amber-600" },
    conectando: { texto: "conectando", classe: "bg-amber-500/15 text-amber-600" },
    conectada: { texto: "conectada", classe: "bg-emerald-500/15 text-emerald-600" },
    desconectada: { texto: "desconectada", classe: "bg-destructive/15 text-destructive" },
    erro: { texto: "erro", classe: "bg-destructive/15 text-destructive" },
  }
  const m = mapa[status]
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${m.classe}`}>{m.texto}</span>
  )
}

export default function CrmWhatsappPage() {
  const { nomeMentor } = useAuth()
  const { data: instancia, isLoading } = useMinhaInstancia()
  const { conectar, atualizarQr, desconectar } = useAcoesInstancia()
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)

  const pareando = emPareamento(instancia)

  // Enquanto o pareamento não termina, pede o QR atual. Parar assim que
  // conectar importa: /instance/connect numa sessão aberta a derruba.
  useEffect(() => {
    if (!pareando) return
    const t = setInterval(() => atualizarQr.mutate(), INTERVALO_QR_MS)
    return () => clearInterval(t)
    // atualizarQr é estável o suficiente; depender dele recriaria o intervalo
    // a cada resposta e o QR nunca completaria os 20s.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pareando])

  const aoConectar = () =>
    conectar.mutate(undefined, {
      onError: (e) => toast.error((e as Error).message),
    })

  const aoDesconectar = () => {
    setConfirmandoSaida(false)
    desconectar.mutate(undefined, {
      onSuccess: () => toast.success("WhatsApp desconectado."),
      onError: (e) => toast.error((e as Error).message),
    })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Meu WhatsApp</h1>
        </div>
        <p className="text-[13px] text-muted-foreground mt-1">
          Conecte o seu número para ler e responder os grupos dos clientes direto pelo Atendimento.
          As mensagens chegam no grupo vindas de você, não de um número do sistema.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> carregando…
          </div>
        ) : !instancia ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {nomeMentor ? `${nomeMentor}, seu` : "Seu"} WhatsApp ainda não está conectado ao PMC OS.
            </div>
            <Button onClick={aoConectar} disabled={conectar.isPending}>
              {conectar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              Conectar meu WhatsApp
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{instancia.instancia}</span>
                <Selo status={instancia.status} />
              </div>
              {instancia.numero && (
                <span className="text-sm text-muted-foreground">+{instancia.numero}</span>
              )}
            </div>

            {instancia.erro && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[13px] text-destructive">
                <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
                {instancia.erro}
              </div>
            )}

            {instancia.status === "conectada" ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-[13px]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <div className="font-medium">Conectado.</div>
                    <div className="text-muted-foreground">
                      {instancia.conectado_em &&
                        `Desde ${new Date(instancia.conectado_em).toLocaleString("pt-BR")}. `}
                      {instancia.backfill_status === "rodando"
                        ? "Trazendo o histórico recente dos grupos…"
                        : instancia.backfill_status === "concluido"
                          ? "Histórico recente já carregado."
                          : instancia.backfill_status === "falhou"
                            ? "O histórico recente falhou — as mensagens novas continuam chegando."
                            : ""}
                    </div>
                  </div>
                </div>

                {confirmandoSaida ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] text-muted-foreground">
                      Desconectar para de receber e enviar mensagens pelo sistema. O histórico fica.
                    </span>
                    <Button variant="destructive" size="sm" onClick={aoDesconectar}>
                      Desconectar mesmo assim
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmandoSaida(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setConfirmandoSaida(true)}>
                    <LogOut className="h-4 w-4" />
                    Desconectar
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {instancia.ultimo_qr ? (
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    <img
                      src={instancia.ultimo_qr}
                      alt="QR code para conectar o WhatsApp"
                      className="h-56 w-56 rounded-lg border border-border bg-white p-2"
                    />
                    <ol className="text-[13px] text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li>Abra o WhatsApp no celular.</li>
                      <li>
                        Toque em <strong>Configurações › Aparelhos conectados</strong>.
                      </li>
                      <li>
                        Toque em <strong>Conectar um aparelho</strong> e aponte para este código.
                      </li>
                      <li>O código se renova sozinho a cada 20 segundos.</li>
                      {instancia.pairing_code && (
                        <li>
                          Sem câmera? Use o código de pareamento:{" "}
                          <strong className="tracking-widest">{instancia.pairing_code}</strong>
                        </li>
                      )}
                    </ol>
                  </div>
                ) : (
                  <div className="text-[13px] text-muted-foreground">
                    {instancia.status === "desconectada"
                      ? "Sessão encerrada. Gere um QR novo para reconectar."
                      : "Gerando o QR code…"}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => atualizarQr.mutate()}
                    disabled={atualizarQr.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 ${atualizarQr.isPending ? "animate-spin" : ""}`} />
                    Gerar novo QR
                  </Button>
                  {instancia.status === "desconectada" && (
                    <Button size="sm" onClick={aoConectar} disabled={conectar.isPending}>
                      <QrCode className="h-4 w-4" />
                      Reconectar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        O PMC OS não guarda a sua senha do WhatsApp. A conexão é a mesma do WhatsApp Web: você pode
        encerrá-la a qualquer momento aqui ou em Aparelhos conectados, no seu celular.
      </p>
    </div>
  )
}
