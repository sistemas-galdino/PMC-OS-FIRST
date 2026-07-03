import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Building2Icon as Building2,
  GlobeIcon as Globe,
  LinkIcon as LinkIco,
  CopyIcon as Copy,
  CheckIcon as Check,
  Trash2Icon as Trash,
  ClockIcon as Clock,
  CheckCircle2Icon as CheckCircle,
  RefreshCwIcon as RefreshCw,
} from "@/components/ui/icons"
import {
  criarConvite,
  listarConvites,
  deletarConvite,
  type AssessmentType,
  type GuardiaoInvite,
} from "@/lib/guardiao/api"

interface Props {
  clientId?: string
  adminView?: boolean
}

/** Monta o link público do respondente a partir do token. */
function linkFor(token?: string): string {
  if (!token) return ""
  return `${window.location.origin}/guardiao/r/${token}`
}

function fmtDate(iso?: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success("Link copiado")
  } catch {
    toast.error("Não foi possível copiar")
  }
}

export default function Convites({ clientId }: Props) {
  const [invites, setInvites] = useState<GuardiaoInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<AssessmentType | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setInvites(await listarConvites(clientId))
    } catch (err: any) {
      toast.error("Erro ao carregar convites", { description: err?.message })
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function gerar(type: AssessmentType) {
    setGenerating(type)
    try {
      const { token } = await criarConvite(type)
      const url = linkFor(token)
      await navigator.clipboard.writeText(url).catch(() => {})
      toast.success(
        type === "interno"
          ? "Link para colaborador interno gerado e copiado"
          : "Link para candidato externo gerado e copiado",
      )
      await refresh()
    } catch (err: any) {
      toast.error("Erro ao gerar link", { description: err?.message })
    } finally {
      setGenerating(null)
    }
  }

  async function remover(id: string) {
    try {
      await deletarConvite(id)
      setInvites((prev) => prev.filter((i) => i.id !== id))
      toast.success("Convite removido")
    } catch (err: any) {
      toast.error("Erro ao remover convite", { description: err?.message })
    }
  }

  async function copyRow(inv: GuardiaoInvite) {
    const url = linkFor(inv.token)
    if (!url) {
      toast.error("Convite sem link disponível")
      return
    }
    await copy(url)
    setCopiedId(inv.id)
    setTimeout(() => setCopiedId((c) => (c === inv.id ? null : c)), 1800)
  }

  return (
    <div className="space-y-8">
      {/* Geradores de link */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
              <Building2 className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold tracking-tight text-foreground">Colaborador interno</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Para quem já trabalha na empresa
              </p>
              <Button
                className="mt-4 w-full"
                onClick={() => gerar("interno")}
                disabled={generating !== null}
              >
                {generating === "interno" ? <Spinner className="size-4" /> : <LinkIco className="size-4" />}
                Gerar link — Colaborador interno
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
              <Globe className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold tracking-tight text-foreground">Candidato externo</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Para candidatos de fora da empresa
              </p>
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => gerar("externo")}
                disabled={generating !== null}
              >
                {generating === "externo" ? <Spinner className="size-4" /> : <LinkIco className="size-4" />}
                Gerar link — Candidato externo
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de convites */}
      <Card>
        <div className="flex items-center justify-between border-b border-border p-6">
          <CardTitle>Convites gerados</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className="size-4" />
            Atualizar
          </Button>
        </div>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="size-6" />
            </div>
          ) : invites.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhum convite gerado ainda. Gere um link acima para começar.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {invites.map((inv) => {
                const concluido = inv.status === "concluido" || !!inv.completed_at
                const tipo = inv.guardiao_assessments?.type ?? inv.guardiao_assessments?.title
                return (
                  <li
                    key={inv.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold tracking-tight text-foreground">
                          {inv.candidate_name || "Aguardando respondente"}
                        </span>
                        {tipo && (
                          <Badge variant="outline" className="capitalize">
                            {tipo}
                          </Badge>
                        )}
                        {concluido ? (
                          <Badge>
                            <CheckCircle className="size-3" />
                            Concluído
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="size-3" />
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        Criado em {fmtDate(inv.created_at)}
                        {inv.candidate_email ? ` · ${inv.candidate_email}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => void copyRow(inv)}>
                        {copiedId === inv.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                        {copiedId === inv.id ? "Copiado" : "Copiar link"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remover convite"
                        onClick={() => void remover(inv.id)}
                      >
                        <Trash className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
