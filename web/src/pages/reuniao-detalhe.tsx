import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  mentor: string
  nome_cliente_formatado: string
  nome_empresa_formatado: string
  data_reuniao: string
  cliente_compareceu: boolean | null
  resumo: string | null
  acoes_cliente: string | Array<{ acao: string; prazo: string; status: string }> | null
  nps: number | null
  transcricao: string | null
  link_gravacao: string | null
  link_geminidoc: string | null
}

type Tab = "resumo" | "acoes" | "transcricao" | "gravacao"

export default function ReuniaoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("resumo")

  useEffect(() => {
    async function fetchMeeting() {
      if (!id) return
      const { data, error } = await supabase
        .from('reunioes_mentoria_new')
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
        <p className="text-muted-foreground font-medium">Reunião não encontrada.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "resumo", label: "Resumo", icon: <FileTextIcon className="size-4" /> },
    { key: "acoes", label: "Ações", icon: <ClipboardList className="size-4" /> },
    { key: "transcricao", label: "Transcrição", icon: <FileTextIcon className="size-4" /> },
    { key: "gravacao", label: "Gravação", icon: <VideoIcon className="size-4" /> },
  ]

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
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
                {meeting.nome_cliente_formatado || meeting.mentor}
              </h1>
              <Badge
                variant="outline"
                className={`uppercase font-bold text-[9px] px-2.5 py-1 rounded-lg shrink-0 ${
                  meeting.cliente_compareceu === false
                    ? "bg-destructive/10 border-destructive/20 text-destructive"
                    : "bg-primary/10 border-primary/20 text-primary"
                }`}
              >
                {meeting.cliente_compareceu === false ? "Faltou" : "Realizada"}
              </Badge>
            </div>
            {meeting.nome_empresa_formatado && (
              <p className="text-sm text-muted-foreground font-medium">{meeting.nome_empresa_formatado}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary/60" />
                <span className="font-medium">{new Date(meeting.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
              <span className="text-border">|</span>
              <span className="font-medium">Mentor: {meeting.mentor}</span>
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

      {/* Tabs */}
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

      {/* Tab Content */}
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
  if (!meeting.resumo) {
    return <EmptyState text="Sem resumo disponível para esta reunião." />
  }

  try {
    let parsed = JSON.parse(meeting.resumo)
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
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{meeting.resumo}</p>
      </CardContent>
    </Card>
  )
}

function TabAcoes({ meeting }: { meeting: Meeting }) {
  if (!meeting.acoes_cliente) {
    return <EmptyState text="Sem ações registradas para esta reunião." />
  }

  const acoes = Array.isArray(meeting.acoes_cliente) ? meeting.acoes_cliente : null

  if (!acoes) {
    return (
      <Card className="border-border bg-card/50 backdrop-blur-md">
        <CardContent className="p-6 md:p-8">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {meeting.acoes_cliente as string}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {acoes.map((item, i) => {
        const acao = typeof item === 'string' ? item : item.acao
        const prazo = typeof item === 'string' ? null : item.prazo
        const status = typeof item === 'string' ? null : item.status
        const isDone = status?.toLowerCase() === 'concluída' || status?.toLowerCase() === 'concluida' || status?.toLowerCase() === 'done'

        return (
          <Card key={i} className="border-border bg-card/50 backdrop-blur-md hover:border-primary/20 transition-colors">
            <CardContent className="p-5 flex items-start gap-4">
              <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isDone ? 'bg-primary/10 text-primary' : 'bg-muted/20 text-muted-foreground'}`}>
                <span className="text-sm font-bold">{i + 1}</span>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">{acao}</p>
                <div className="flex items-center gap-3">
                  {prazo && (
                    <span className="text-xs text-muted-foreground">
                      <Calendar className="size-3 inline mr-1" />
                      Prazo: {prazo}
                    </span>
                  )}
                  {status && (
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold uppercase ${
                        isDone
                          ? 'bg-primary/10 border-primary/20 text-primary'
                          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {status}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function TabTranscricao({ meeting }: { meeting: Meeting }) {
  if (!meeting.transcricao) {
    return <EmptyState text="Sem transcrição disponível para esta reunião." />
  }

  return (
    <Card className="border-border bg-card/50 backdrop-blur-md">
      <CardContent className="p-6 md:p-8">
        <ScrollArea className="max-h-[60vh]">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pr-4">
            {meeting.transcricao}
          </p>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function TabGravacao({ meeting }: { meeting: Meeting }) {
  const hasGravacao = !!meeting.link_gravacao
  const hasDoc = !!meeting.link_geminidoc

  if (!hasGravacao && !hasDoc) {
    return <EmptyState text="Sem gravação ou documento disponível para esta reunião." />
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
              <h4 className="text-sm font-bold text-foreground">Gravação da Reunião</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Assista a gravação completa da sessão</p>
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
              <h4 className="text-sm font-bold text-foreground">Documento da Reunião</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Resumo e anotações no Google Docs</p>
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
