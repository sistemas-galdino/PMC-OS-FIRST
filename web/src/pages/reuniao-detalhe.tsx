import { useEffect, useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CalendarIcon as Calendar,
  VideoIcon,
  FileTextIcon,
  ArrowLeftIcon as ArrowLeft,
  CheckIcon as ClipboardList,
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  ChevronDownIcon as ChevronDown,
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
  acoes_cliente: string | Array<{ acao: string; prazo?: string; status?: string; observacao?: string }> | null
  nps: number | null
  transcricao: string | null
  link_gravacao: string | null
  link_geminidoc: string | null
}

type Tab = "resumo" | "acoes" | "transcricao" | "gravacao"

export default function ReuniaoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const initialTab = (searchParams.get('tab') as Tab) || "resumo"
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [isAdmin, setIsAdmin] = useState(false)

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

    // Check admin
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        supabase.from('mentores').select('id').eq('email', session.user.email).maybeSingle()
          .then(({ data }) => setIsAdmin(!!data))
      }
    })
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
              <span className="font-medium">Consultor: {meeting.mentor}</span>
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
        {activeTab === "acoes" && <TabAcoes meeting={meeting} isAdmin={isAdmin} onUpdate={setMeeting} />}
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

const STATUS_OPTIONS = [
  { value: 'nao_iniciado', label: 'Não Iniciado', color: 'bg-muted/20 border-border text-muted-foreground' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  { value: 'concluido', label: 'Concluído', color: 'bg-primary/10 border-primary/20 text-primary' },
  { value: 'impedido', label: 'Impedido', color: 'bg-destructive/10 border-destructive/20 text-destructive' },
] as const

function normalizeStatus(s: string | null | undefined): string {
  if (!s) return 'nao_iniciado'
  const lower = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (lower.includes('conclu') || lower === 'done') return 'concluido'
  if (lower.includes('andamento') || lower.includes('progress')) return 'em_andamento'
  if (lower.includes('impedid') || lower.includes('block')) return 'impedido'
  if (lower.includes('a fazer') || lower.includes('nao inic') || lower.includes('pendente')) return 'nao_iniciado'
  return 'nao_iniciado'
}

function getStatusStyle(value: string) {
  return STATUS_OPTIONS.find(s => s.value === value)?.color || STATUS_OPTIONS[0].color
}

function TabAcoes({ meeting, isAdmin, onUpdate }: { meeting: Meeting; isAdmin: boolean; onUpdate: (m: Meeting) => void }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [newAcao, setNewAcao] = useState("")

  const acoes: Array<{ acao: string; prazo?: string; status?: string; observacao?: string }> =
    Array.isArray(meeting.acoes_cliente)
      ? meeting.acoes_cliente.map((item: any) =>
          typeof item === 'string'
            ? { acao: item, status: 'nao_iniciado', observacao: '' }
            : { ...item, status: normalizeStatus(item.status), observacao: item.observacao || '' }
        )
      : []

  async function saveAcoes(updated: typeof acoes) {
    setSaving(true)
    const { error } = await supabase
      .from('reunioes_mentoria_new')
      .update({ acoes_cliente: updated })
      .eq('id_unico', meeting.id_unico)

    if (!error) {
      onUpdate({ ...meeting, acoes_cliente: updated })
    }
    setSaving(false)
  }

  function handleStatusChange(index: number, newStatus: string) {
    const updated = [...acoes]
    updated[index] = { ...updated[index], status: newStatus }
    saveAcoes(updated)
  }

  function handleObsChange(index: number, obs: string) {
    const updated = [...acoes]
    updated[index] = { ...updated[index], observacao: obs }
    saveAcoes(updated)
  }

  function handleDelete(index: number) {
    const updated = acoes.filter((_, i) => i !== index)
    saveAcoes(updated)
    setExpandedIndex(null)
  }

  function handleAdd() {
    if (!newAcao.trim()) return
    const updated = [...acoes, { acao: newAcao.trim(), status: 'nao_iniciado', observacao: '' }]
    saveAcoes(updated)
    setNewAcao("")
  }

  if (acoes.length === 0 && !isAdmin) {
    return <EmptyState text="Sem ações registradas para esta reunião." />
  }

  return (
    <div className="space-y-3">
      {acoes.map((item, i) => {
        const statusValue = normalizeStatus(item.status)
        const isExpanded = expandedIndex === i

        return (
          <Card key={i} className="border-border bg-card/50 backdrop-blur-md hover:border-primary/20 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-4">
                <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${statusValue === 'concluido' ? 'bg-primary/10 text-primary' : 'bg-muted/20 text-muted-foreground'}`}>
                  <span className="text-sm font-bold">{i + 1}</span>
                </div>
                <div className="flex-1 space-y-2">
                  <p className={`text-sm font-medium text-foreground ${statusValue === 'concluido' ? 'line-through opacity-60' : ''}`}>{item.acao}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {item.prazo && (
                      <span className="text-xs text-muted-foreground">
                        <Calendar className="size-3 inline mr-1" />
                        Prazo: {item.prazo}
                      </span>
                    )}
                    <Select value={statusValue} onValueChange={(v) => handleStatusChange(i, v)} disabled={saving}>
                      <SelectTrigger className={`h-7 w-auto min-w-[140px] rounded-lg border text-[10px] font-bold uppercase tracking-wider px-2.5 ${getStatusStyle(statusValue)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-card/95 backdrop-blur-xl border-border">
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value} className="rounded-lg text-xs font-bold uppercase tracking-wider">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <ChevronDown className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {isExpanded && (
                <div className="pl-12 space-y-3 pt-2 border-t border-border/30">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Observações</label>
                    <textarea
                      value={item.observacao || ''}
                      onChange={(e) => {
                        // Update local state immediately
                        const updated = [...acoes]
                        updated[i] = { ...updated[i], observacao: e.target.value }
                        onUpdate({ ...meeting, acoes_cliente: updated })
                      }}
                      onBlur={(e) => handleObsChange(i, e.target.value)}
                      placeholder="Adicionar observação..."
                      rows={2}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                    />
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-bold uppercase tracking-wider gap-2"
                      onClick={() => handleDelete(i)}
                      disabled={saving}
                    >
                      <Trash2 className="size-3.5" />
                      Excluir Ação
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {isAdmin && (
        <Card className="border-dashed border-2 border-border/50 bg-card/30">
          <CardContent className="p-4 flex gap-3">
            <Input
              value={newAcao}
              onChange={(e) => setNewAcao(e.target.value)}
              placeholder="Adicionar nova ação..."
              className="h-10 rounded-xl border-border bg-background flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button
              onClick={handleAdd}
              disabled={saving || !newAcao.trim()}
              size="sm"
              className="h-10 rounded-xl px-4 font-bold text-xs uppercase tracking-wider gap-2"
            >
              <Plus className="size-4" />
              Adicionar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TabTranscricao({ meeting }: { meeting: Meeting }) {
  const [copied, setCopied] = useState(false)

  if (!meeting.transcricao) {
    return <EmptyState text="Sem transcrição disponível para esta reunião." />
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(meeting.transcricao!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-border bg-card/50 backdrop-blur-md">
      <CardContent className="p-6 md:p-8 space-y-4">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="font-bold text-xs uppercase tracking-wider gap-2"
          >
            {copied ? <ClipboardList className="size-4" /> : <FileTextIcon className="size-4" />}
            {copied ? "Copiado!" : "Copiar Transcrição"}
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto rounded-lg">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pr-4">
            {meeting.transcricao}
          </p>
        </div>
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
