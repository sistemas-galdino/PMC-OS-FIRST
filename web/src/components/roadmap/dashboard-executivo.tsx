import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Edit3Icon,
  ClockIcon,
  FileTextIcon,
  TargetIcon,
  FlagIcon,
  BarChart3Icon,
  PackageIcon,
} from "@/components/ui/icons"
import { STATUS_GERAL } from "@/lib/roadmap"
import type { RoadmapProjeto, RoadmapItem, StatusGeral } from "@/lib/roadmap"
import { GraficoProjetosFase } from "./grafico-projetos-fase"
import { GraficoValorNegocio } from "./grafico-valor-negocio"

interface Props {
  projeto: RoadmapProjeto
  itens: RoadmapItem[]
  onUpdateProjeto: (patch: Partial<RoadmapProjeto>) => void
}

const cardTitleCls = "flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function MetaTextCard({
  icon,
  title,
  value,
  placeholder,
  onSave,
}: {
  icon: React.ReactNode
  title: string
  value: string
  placeholder: string
  onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function start() {
    setDraft(value)
    setEditing(true)
  }
  function commit() {
    onSave(draft.trim())
    setEditing(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={cardTitleCls}>
            {icon}
            {title}
          </CardTitle>
          {!editing && (
            <button
              type="button"
              onClick={start}
              className="text-muted-foreground transition-colors hover:text-primary"
              aria-label={`Editar ${title}`}
            >
              <Edit3Icon className="size-3.5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={commit}>
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {value || <span className="italic">{placeholder}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ProximaEntregaCard({
  projeto,
  onUpdateProjeto,
}: {
  projeto: RoadmapProjeto
  onUpdateProjeto: (patch: Partial<RoadmapProjeto>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [data, setData] = useState(projeto.proxima_entrega_data ?? "")
  const [desc, setDesc] = useState(projeto.proxima_entrega_descricao ?? "")

  function start() {
    setData(projeto.proxima_entrega_data ?? "")
    setDesc(projeto.proxima_entrega_descricao ?? "")
    setEditing(true)
  }
  function commit() {
    onUpdateProjeto({
      proxima_entrega_data: data || null,
      proxima_entrega_descricao: desc.trim() || null,
    })
    setEditing(false)
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={cardTitleCls}>
            <FlagIcon className="size-3.5" />
            Próxima Grande Entrega
          </CardTitle>
          {!editing && (
            <button
              type="button"
              onClick={start}
              className="text-muted-foreground transition-colors hover:text-primary"
              aria-label="Editar próxima entrega"
            >
              <Edit3Icon className="size-3.5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="flex flex-col gap-2">
            <DatePicker value={data} onChange={setData} placeholder="Data da entrega" />
            <Input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Descrição da entrega"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={commit}>
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {projeto.proxima_entrega_data
                ? formatDate(projeto.proxima_entrega_data)
                : "—"}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {projeto.proxima_entrega_descricao || (
                <span className="italic">Defina a próxima entrega do roadmap.</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardExecutivo({ projeto, itens, onUpdateProjeto }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
            Roadmap de Sistemas PMC
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Painel executivo de acompanhamento
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Status Geral
            </span>
            <Select
              value={projeto.status_geral}
              onValueChange={v => onUpdateProjeto({ status_geral: v as StatusGeral })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_GERAL.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <ClockIcon className="size-3" />
            Última atualização: {formatDateTime(projeto.updated_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetaTextCard
          icon={<FileTextIcon className="size-3.5" />}
          title="Visão Geral do Projeto"
          value={projeto.visao_geral ?? ""}
          placeholder="Descreva a visão geral do projeto."
          onSave={v => onUpdateProjeto({ visao_geral: v || null })}
        />
        <MetaTextCard
          icon={<TargetIcon className="size-3.5" />}
          title="Objetivo Estratégico"
          value={projeto.objetivo_estrategico ?? ""}
          placeholder="Descreva o objetivo estratégico."
          onSave={v => onUpdateProjeto({ objetivo_estrategico: v || null })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ProximaEntregaCard projeto={projeto} onUpdateProjeto={onUpdateProjeto} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={cardTitleCls}>
              <BarChart3Icon className="size-3.5" />
              Projetos por Fase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoProjetosFase itens={itens} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={cardTitleCls}>
              <PackageIcon className="size-3.5" />
              Valor para o Negócio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoValorNegocio itens={itens} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
