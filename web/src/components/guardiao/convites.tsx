import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Building2Icon as Building2,
  GlobeIcon as Globe,
  CopyIcon as Copy,
  CheckIcon as Check,
  Trash2Icon as Trash,
  ClockIcon as Clock,
  CheckCircle2Icon as CheckCircle,
  RefreshCwIcon as RefreshCw,
} from "@/components/ui/icons"
import {
  getShareLinks,
  listarConvites,
  deletarConvite,
  type GuardiaoInvite,
} from "@/lib/guardiao/api"

interface Props {
  clientId?: string
  adminView?: boolean
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

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success("Link copiado")
  } catch {
    toast.error("Não foi possível copiar")
  }
}

/** Cartão com o link fixo e reutilizável de um tipo (padrão Typeform). */
function ShareLinkCard({
  icon,
  title,
  subtitle,
  link,
  loading,
  outline,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  link: string
  loading: boolean
  outline?: boolean
}) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    if (!link) return
    await copyText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold tracking-tight text-foreground">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>

          <div className="mt-4 flex items-center gap-2">
            <Input
              readOnly
              value={loading ? "Gerando link…" : link}
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant={outline ? "outline" : "default"}
              size="icon"
              aria-label="Copiar link"
              onClick={() => void onCopy()}
              disabled={loading || !link}
            >
              {loading ? (
                <Spinner className="size-4" />
              ) : copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Link fixo e reutilizável — qualquer pessoa que o abrir preenche uma nova avaliação.
          </p>
        </div>
      </div>
    </Card>
  )
}

export default function Convites({ clientId, adminView }: Props) {
  const [links, setLinks] = useState<{ interno: string; externo: string }>({
    interno: "",
    externo: "",
  })
  const [linksLoading, setLinksLoading] = useState(true)
  const [invites, setInvites] = useState<GuardiaoInvite[]>([])
  const [loading, setLoading] = useState(true)

  // Os links fixos são do cliente logado. No oversight admin (adminView),
  // não há sessão do cliente para resolver os links — mostramos só as respostas.
  const canManageLinks = !adminView

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setInvites(await listarConvites(clientId))
    } catch (err: any) {
      toast.error("Erro ao carregar respostas", { description: err?.message })
    } finally {
      setLoading(false)
    }
  }, [clientId])

  const loadLinks = useCallback(async () => {
    if (!canManageLinks) {
      setLinksLoading(false)
      return
    }
    setLinksLoading(true)
    try {
      setLinks(await getShareLinks())
    } catch (err: any) {
      toast.error("Erro ao carregar links", { description: err?.message })
    } finally {
      setLinksLoading(false)
    }
  }, [canManageLinks])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    void loadLinks()
  }, [loadLinks])

  async function remover(id: string) {
    try {
      await deletarConvite(id)
      setInvites((prev) => prev.filter((i) => i.id !== id))
      toast.success("Resposta removida")
    } catch (err: any) {
      toast.error("Erro ao remover resposta", { description: err?.message })
    }
  }

  return (
    <div className="space-y-8">
      {/* Links fixos por tipo (padrão Typeform) */}
      {canManageLinks && (
        <div className="grid gap-4 md:grid-cols-2">
          <ShareLinkCard
            icon={<Building2 className="size-5 text-primary" />}
            title="Colaborador interno"
            subtitle="Para quem já trabalha na empresa"
            link={links.interno}
            loading={linksLoading}
          />
          <ShareLinkCard
            icon={<Globe className="size-5 text-primary" />}
            title="Candidato externo"
            subtitle="Para candidatos de fora da empresa"
            link={links.externo}
            loading={linksLoading}
            outline
          />
        </div>
      )}

      {/* Respostas recebidas (read-only) */}
      <Card>
        <div className="flex items-center justify-between border-b border-border p-6">
          <CardTitle>Respostas recebidas</CardTitle>
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
              Nenhuma resposta recebida ainda. Compartilhe um dos links acima para começar.
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
                          {inv.candidate_name || "Sem nome"}
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
                        Recebida em {fmtDate(inv.completed_at ?? inv.created_at)}
                        {inv.candidate_email ? ` · ${inv.candidate_email}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remover resposta"
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
