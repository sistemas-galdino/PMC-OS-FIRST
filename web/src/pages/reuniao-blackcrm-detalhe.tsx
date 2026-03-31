import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  CalendarIcon as Calendar,
  VideoIcon,
  FileTextIcon,
  ArrowLeftIcon as ArrowLeft,
  CheckIcon as ClipboardList,
} from "@/components/ui/icons"
import { motion } from "framer-motion"

interface Meeting {
  id_unico: string
  empresa: string | null
  nome_empresa_formatado: string | null
  data_reuniao: string
  horario: string | null
  tipo_reuniao: string | null
  responsavel: string | null
  nps: number | null
  transcricao: string | null
  transcricao_md: string | null
  resumo: string | null
  resumo_json: string | null
  acoes: string | null
  link_gravacao: string | null
  link_geminidoc: string | null
  observacoes: string | null
}

type Tab = "resumo" | "acoes" | "transcricao" | "gravacao"

function FormattedContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let currentBullets: string[] = []
  let key = 0

  function flushBullets() {
    if (currentBullets.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-2 pl-1 mb-5">
          {currentBullets.map((bullet, j) => (
            <li key={j} className="text-sm text-foreground/80 flex items-start gap-2.5">
              <span className="text-primary mt-0.5 shrink-0">•</span>
              <span className="leading-relaxed">{formatInline(bullet)}</span>
            </li>
          ))}
        </ul>
      )
      currentBullets = []
    }
  }

  function formatInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = []
    const regex = /\*\*(.+?)\*\*/g
    let lastIndex = 0
    let match
    let i = 0
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      parts.push(<strong key={i++} className="font-semibold text-foreground">{match[1]}</strong>)
      lastIndex = regex.lastIndex
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }
    return parts.length === 1 ? parts[0] : parts
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === '') {
      flushBullets()
      continue
    }

    const headingMatch = trimmed.match(/^\*\*(\d+\.\s*)?(.*?)\*\*$/)
    if (headingMatch) {
      flushBullets()
      const number = headingMatch[1] || ''
      const title = headingMatch[2]
      elements.push(
        <h4 key={key++} className="text-base font-bold text-foreground mt-6 mb-3 first:mt-0 flex items-center gap-2">
          {number && <span className="text-primary font-bold">{number.trim()}</span>}
          <span>{title}</span>
        </h4>
      )
      continue
    }

    const bulletMatch = trimmed.match(/^[-•]\s+(.+)$/)
    if (bulletMatch) {
      currentBullets.push(bulletMatch[1])
      continue
    }

    flushBullets()
    elements.push(
      <p key={key++} className="text-sm text-foreground/80 leading-relaxed mb-3">
        {formatInline(trimmed)}
      </p>
    )
  }

  flushBullets()
  return <>{elements}</>
}

export default function ReuniaoBlackCRMDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("resumo")

  useEffect(() => {
    async function fetchMeeting() {
      if (!id) return
      const { data, error } = await supabase
        .from('reunioes_blackcrm')
        .select('*')
        .eq('id_unico', id)
        .single()

      if (data && !error) setMeeting(data)
      setLoading(false)
    }
    fetchMeeting()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-card/40 rounded-xl" />
        <div className="h-64 bg-card/40 rounded-2xl" />
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground font-medium">Reuniao nao encontrada.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "resumo", label: "Resumo", icon: <FileTextIcon className="size-4" /> },
    { key: "acoes", label: "Acoes", icon: <ClipboardList className="size-4" /> },
    { key: "transcricao", label: "Transcricao", icon: <FileTextIcon className="size-4" /> },
    { key: "gravacao", label: "Gravacao", icon: <VideoIcon className="size-4" /> },
  ]

  const empresaName = meeting.nome_empresa_formatado || meeting.empresa || "Sem identificacao"

  return (
    <div className="space-y-8 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground gap-2 -ml-2"
        >
          <ArrowLeft className="size-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-l-4 border-primary pl-8 py-2">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                {empresaName}
              </h1>
              <Badge
                variant="outline"
                className={`uppercase font-bold text-[9px] px-2.5 py-1 rounded-lg shrink-0 ${
                  meeting.tipo_reuniao === 'tutoria'
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : "bg-primary/10 border-primary/20 text-primary"
                }`}
              >
                {meeting.tipo_reuniao === 'tutoria' ? 'Tutoria' : 'Implementacao'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary/60" />
                <span className="font-medium">
                  {(() => {
                    try {
                      const d = new Date(meeting.data_reuniao + 'T00:00:00')
                      return isNaN(d.getTime()) ? meeting.data_reuniao : d.toLocaleDateString('pt-BR')
                    } catch { return meeting.data_reuniao }
                  })()}
                </span>
              </div>
              {meeting.horario && (
                <>
                  <span className="text-border">|</span>
                  <span className="font-medium">{meeting.horario}</span>
                </>
              )}
              {meeting.responsavel && (
                <>
                  <span className="text-border">|</span>
                  <span className="font-medium">{meeting.responsavel}</span>
                </>
              )}
              {meeting.nps != null && (
                <>
                  <span className="text-border">|</span>
                  <span className="font-medium">NPS: <span className="text-primary font-bold">{meeting.nps}</span></span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex gap-2 border-b border-border/50 pb-0"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 -mb-[1px] ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </motion.div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === "resumo" && <TabResumo meeting={meeting} />}
        {activeTab === "acoes" && <TabAcoes meeting={meeting} />}
        {activeTab === "transcricao" && <TabTranscricao meeting={meeting} />}
        {activeTab === "gravacao" && <TabGravacao meeting={meeting} />}
      </motion.div>
    </div>
  )
}

function TabResumo({ meeting }: { meeting: Meeting }) {
  const content = meeting.resumo || meeting.resumo_json

  if (!content) {
    return <EmptyState text="Sem resumo disponivel para esta reuniao." />
  }

  try {
    let parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && parsed.resumo) parsed = parsed.resumo
    if (parsed && typeof parsed === 'object' && parsed.titulo && Array.isArray(parsed.topicos)) {
      return (
        <Card className="border-border bg-card/50 backdrop-blur-md">
          <CardContent className="p-6 md:p-8 space-y-6">
            <h3 className="text-lg font-bold text-foreground">{parsed.titulo}</h3>
            {parsed.topicos.map((topico: { tema: string; pontos: string[] }, i: number) => (
              <div key={i} className="space-y-2">
                <h4 className="text-sm font-bold text-foreground/90">{topico.tema}</h4>
                <ul className="space-y-1.5 pl-1">
                  {topico.pontos.map((ponto: string, j: number) => (
                    <li key={j} className="text-sm text-foreground/80 flex items-start gap-2.5">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span className="leading-relaxed">{ponto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )
    }
  } catch { /* fall through to plain text */ }

  return (
    <Card className="border-border bg-card/50 backdrop-blur-md">
      <CardContent className="p-6 md:p-8">
        <FormattedContent text={content} />
      </CardContent>
    </Card>
  )
}

function TabAcoes({ meeting }: { meeting: Meeting }) {
  if (!meeting.acoes) {
    return <EmptyState text="Sem acoes registradas para esta reuniao." />
  }

  return (
    <Card className="border-border bg-card/50 backdrop-blur-md">
      <CardContent className="p-6 md:p-8">
        <FormattedContent text={meeting.acoes} />
      </CardContent>
    </Card>
  )
}

function TabTranscricao({ meeting }: { meeting: Meeting }) {
  const content = meeting.transcricao_md || meeting.transcricao

  if (!content) {
    return <EmptyState text="Sem transcricao disponivel para esta reuniao." />
  }

  return (
    <Card className="border-border bg-card/50 backdrop-blur-md">
      <CardContent className="p-6 md:p-8">
        <FormattedContent text={content} />
      </CardContent>
    </Card>
  )
}

function TabGravacao({ meeting }: { meeting: Meeting }) {
  const hasGravacao = !!meeting.link_gravacao
  const hasDoc = !!meeting.link_geminidoc

  if (!hasGravacao && !hasDoc) {
    return <EmptyState text="Sem gravacao ou documento disponivel para esta reuniao." />
  }

  return (
    <div className="space-y-4">
      {hasGravacao && (
        <Card className="border-border bg-card/50 backdrop-blur-md hover:border-primary/20 transition-colors">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <VideoIcon className="size-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-foreground">Gravacao da Reuniao</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Assista a gravacao completa da sessao</p>
            </div>
            <a href={meeting.link_gravacao!} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="font-bold text-xs uppercase tracking-wider">
                Assistir
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {hasDoc && (
        <Card className="border-border bg-card/50 backdrop-blur-md hover:border-primary/20 transition-colors">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <FileTextIcon className="size-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-foreground">Documento da Reuniao</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Resumo e anotacoes no Google Docs</p>
            </div>
            <a href={meeting.link_geminidoc!} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="font-bold text-xs uppercase tracking-wider">
                Abrir
              </Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="border-border bg-card/50 backdrop-blur-md">
      <CardContent className="py-16 text-center">
        <p className="text-muted-foreground font-medium">{text}</p>
      </CardContent>
    </Card>
  )
}
