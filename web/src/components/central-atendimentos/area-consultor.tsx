import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CalendarIcon,
  ClockIcon,
  Building2Icon,
  VideoIcon,
  FileTextIcon,
  ExternalLinkIcon,
  UserCheckIcon,
} from "@/components/ui/icons"
import { iniciais, statusEfetivo, nomesDoConsultor, STATUS_EFETIVO_BADGE, STATUS_EFETIVO_LABEL } from "@/lib/atendimentos"
import type { Consultor, AgendamentoCentral } from "@/lib/atendimentos"

interface Props {
  consultores: Consultor[]
  agendamentos: AgendamentoCentral[]
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function descricaoConsultor(c: Consultor): string {
  if (c.especialidade) return c.especialidade
  if (c.tipo_reuniao === "tutoria") return "Tutoria"
  if (c.tipo_reuniao === "implementacao") return "Implementação"
  return "Consultor"
}

export function AreaConsultor({ consultores, agendamentos }: Props) {
  const [sp, setSp] = useSearchParams()
  const slugParam = sp.get("consultor")

  const selecionado = useMemo<Consultor | null>(() => {
    if (consultores.length === 0) return null
    if (slugParam) {
      const found = consultores.find(c => c.slug === slugParam)
      if (found) return found
    }
    return consultores[0]
  }, [consultores, slugParam])

  function setConsultor(slug: string) {
    const next = new URLSearchParams(sp)
    next.set("consultor", slug)
    setSp(next, { replace: true })
  }

  const meusAgendamentos = useMemo(() => {
    if (!selecionado) return [] as AgendamentoCentral[]
    const nomes = nomesDoConsultor(selecionado)
    return agendamentos.filter(a => a.consultor_nome != null && nomes.includes(a.consultor_nome))
  }, [agendamentos, selecionado])

  const stats = useMemo(() => {
    const h = hojeIso()
    let hoje = 0
    let proximas = 0
    let realizadas = 0
    for (const a of meusAgendamentos) {
      const st = statusEfetivo(a)
      if (st === "cancelado") continue
      if (a.data_reuniao === h) {
        hoje++
        continue
      }
      if (st === "agendada") proximas++
      else if (st === "realizada") realizadas++
    }
    return { hoje, proximas, realizadas }
  }, [meusAgendamentos])

  const proximasList = useMemo(() => {
    return meusAgendamentos
      .filter(a => statusEfetivo(a) === "agendada")
      .sort((a, b) => {
        const dc = (a.data_reuniao ?? "").localeCompare(b.data_reuniao ?? "")
        if (dc !== 0) return dc
        return (a.horario ?? "").localeCompare(b.horario ?? "")
      })
  }, [meusAgendamentos])

  const historico = useMemo(() => {
    return meusAgendamentos
      .filter(a => {
        const st = statusEfetivo(a)
        return st === "realizada" || st === "faltou"
      })
      .sort((a, b) => {
        const dc = (b.data_reuniao ?? "").localeCompare(a.data_reuniao ?? "")
        if (dc !== 0) return dc
        return (b.horario ?? "").localeCompare(a.horario ?? "")
      })
  }, [meusAgendamentos])

  if (consultores.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Cadastre um consultor na aba “Disponibilidade” pra começar.
        </CardContent>
      </Card>
    )
  }

  if (!selecionado) return null

  const primeiroNome = selecionado.nome.split(/\s+/)[0]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs uppercase font-bold tracking-widest text-primary">Área do Consultor</div>
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Minhas reuniões</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Acesse seus agendamentos sem precisar abrir o e-mail compartilhado.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="size-12 rounded-xl bg-primary/15 text-primary font-bold text-sm flex items-center justify-center shrink-0">
              {iniciais(selecionado.nome)}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-foreground truncate">{selecionado.nome}</div>
              <div className="text-xs text-primary/80 font-medium truncate">{descricaoConsultor(selecionado)}</div>
            </div>
          </div>
          <Select value={selecionado.slug} onValueChange={setConsultor}>
            <SelectTrigger className="w-full sm:w-64 h-11 bg-muted/10 border-border rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card/95 backdrop-blur-xl border-border">
              {consultores.map(c => (
                <SelectItem key={c.id} value={c.slug} className="rounded-lg font-medium">
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Hoje" value={stats.hoje} />
        <StatCard label="Próximas" value={stats.proximas} />
        <StatCard label="Realizadas" value={stats.realizadas} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="font-bold text-foreground">Próximas reuniões de {primeiroNome}</div>
            <div className="text-xs text-muted-foreground">
              {proximasList.length} {proximasList.length === 1 ? "reunião futura" : "reuniões futuras"}
            </div>
          </div>
          {proximasList.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-2">
              <div className="mx-auto size-12 rounded-2xl bg-muted/20 flex items-center justify-center">
                <CalendarIcon className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma reunião futura para {primeiroNome}.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {proximasList.map(a => (
                <MeetingRow key={a.id_unico} ag={a} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="font-bold text-foreground">Histórico</div>
            <div className="text-xs text-muted-foreground">
              {historico.length} {historico.length === 1 ? "reunião" : "reuniões"}
            </div>
          </div>
          {historico.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-2">
              <div className="mx-auto size-12 rounded-2xl bg-muted/20 flex items-center justify-center">
                <CalendarIcon className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma reunião no histórico de {primeiroNome}.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-[480px] overflow-y-auto">
              {historico.map(a => (
                <MeetingRow key={a.id_unico} ag={a} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground">{label}</div>
        <div className="text-3xl font-bold tracking-tight text-foreground mt-2">{value}</div>
      </CardContent>
    </Card>
  )
}

function DateBlock({ dataISO }: { dataISO: string }) {
  const d = new Date(dataISO + "T00:00:00")
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase()
  const dia = d.getDate()
  const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase()
  return (
    <div className="size-16 rounded-xl bg-muted/20 border border-border flex flex-col items-center justify-center shrink-0">
      <div className="text-[10px] font-bold text-muted-foreground tracking-wider">{weekday}</div>
      <div className="text-xl font-bold text-foreground leading-none">{dia}</div>
      <div className="text-[10px] font-bold text-muted-foreground tracking-wider">{mes}</div>
    </div>
  )
}

function MeetingRow({ ag }: { ag: AgendamentoCentral }) {
  const status = statusEfetivo(ag)
  return (
    <li className="px-6 py-4 flex items-center gap-4 hover:bg-muted/10 transition-colors">
      {ag.data_reuniao ? <DateBlock dataISO={ag.data_reuniao} /> : <div className="size-16 shrink-0" />}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Building2Icon className="size-4 text-muted-foreground shrink-0" />
          <span className="font-bold text-foreground truncate">{ag.empresa ?? "—"}</span>
          <Badge variant="outline" className={`uppercase font-bold text-[9px] px-2 ${STATUS_EFETIVO_BADGE[status]}`}>
            {STATUS_EFETIVO_LABEL[status]}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground truncate">{ag.cliente_nome ?? ag.cliente_email ?? "Cliente"}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClockIcon className="size-3.5" />
          <span>{(ag.horario ?? "").slice(0, 5) || "—"}</span>
        </div>
      </div>
      <div className="shrink-0">
        {status === "agendada" ? (
          ag.link_meet ? (
            <Button
              onClick={() => window.open(ag.link_meet!, "_blank", "noopener,noreferrer")}
              className="font-bold"
            >
              <VideoIcon className="size-4" />
              Entrar no Meet
              <ExternalLinkIcon className="size-3.5" />
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground italic">Aguardando link</span>
          )
        ) : (
          <div className="flex items-center gap-2">
            {ag.link_gravacao && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(ag.link_gravacao!, "_blank", "noopener,noreferrer")}
                className="font-bold text-xs"
              >
                <VideoIcon className="size-3.5" />
                Gravação
              </Button>
            )}
            {ag.link_geminidoc && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(ag.link_geminidoc!, "_blank", "noopener,noreferrer")}
                className="font-bold text-xs"
              >
                <FileTextIcon className="size-3.5" />
                Doc
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

export { UserCheckIcon as AreaConsultorTabIcon }
