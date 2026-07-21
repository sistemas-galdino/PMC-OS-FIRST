import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LinkIcon, CopyIcon, CheckIcon, ExternalLinkIcon } from "@/components/ui/icons"
import { ConsultorAvatar } from "@/components/consultor-avatar"
import type { Consultor } from "@/lib/atendimentos"

interface Props {
  consultores: Consultor[]
}

export function LinkPublico({ consultores }: Props) {
  const [copiado, setCopiado] = useState<string | null>(null)
  const origin = typeof window !== "undefined" ? window.location.origin : ""

  function copiar(url: string, key: string) {
    navigator.clipboard.writeText(url)
    setCopiado(key)
    setTimeout(() => setCopiado(null), 1800)
  }

  const linkGeral = `${origin}/atendimento`

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <LinkIcon className="size-4 text-primary" />
                <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">Página geral de agendamento</h3>
              </div>
              <p className="text-xs text-muted-foreground">Cliente vê o grid com todos os consultores ativos e escolhe um.</p>
              <code className="block text-xs font-mono bg-background/70 border border-border rounded-lg px-3 py-2 text-foreground break-all">
                {linkGeral}
              </code>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => copiar(linkGeral, "geral")} className="gap-2">
                {copiado === "geral" ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                {copiado === "geral" ? "Copiado" : "Copiar"}
              </Button>
              <a href={linkGeral} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" className="gap-2 w-full">
                  <ExternalLinkIcon className="size-3.5" />
                  Abrir
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold tracking-tight text-foreground">Link direto por consultor</h3>
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold bg-muted/20 border-border text-muted-foreground">
            {consultores.length} ativo{consultores.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {consultores.map(c => {
            const url = `${origin}/atendimento/${c.slug}`
            return (
              <Card key={c.id} className="hover:border-primary/30 transition-all">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <ConsultorAvatar nome={c.nome} url={c.avatar_url} className="size-11 rounded-xl text-sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-foreground truncate">{c.nome}</div>
                      {c.especialidade && (
                        <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider truncate">
                          {c.especialidade}
                        </div>
                      )}
                    </div>
                  </div>
                  <code className="block text-[11px] font-mono bg-muted/20 border border-border/60 rounded-lg px-3 py-2 text-muted-foreground break-all">
                    {url}
                  </code>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => copiar(url, c.id)} className="gap-2 flex-1">
                      {copiado === c.id ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                      {copiado === c.id ? "Copiado" : "Copiar link"}
                    </Button>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost">
                        <ExternalLinkIcon className="size-3.5" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {consultores.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum consultor ativo. Ative pelo menos um na aba Disponibilidade.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
