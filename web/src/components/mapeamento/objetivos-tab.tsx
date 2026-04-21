import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sparkles2Icon as Sparkles,
  TrendingUpIcon as TrendingUp,
  ZapIcon as Zap,
  TrendingDownIcon as TrendingDown,
  AwardIcon as Award,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"

type Prioridade = 'alta' | 'media' | 'baixa' | 'nao_prioridade'

interface ObjetivoRecord {
  objetivo_key: string
  prioridade: Prioridade
  observacoes: string | null
}

interface ObjetivoDef {
  key: string
  titulo: string
  descricao: string
  icon: React.ElementType
  accent: string
}

const OBJETIVOS: ObjetivoDef[] = [
  {
    key: 'ia_negocio',
    titulo: 'IA Dentro do seu Negócio',
    descricao: 'Aproveite o poder da IA pra automatizar processos, reduzir custos e tomar decisões mais inteligentes.',
    icon: Sparkles,
    accent: 'text-primary',
  },
  {
    key: 'aumento_receita',
    titulo: 'Aumento de Receita',
    descricao: 'Estruture a operação pra escalar o faturamento de forma consistente e previsível.',
    icon: TrendingUp,
    accent: 'text-emerald-400',
  },
  {
    key: 'eficiencia_operacional',
    titulo: 'Eficiência Operacional',
    descricao: 'Mapeie processos, identifique gargalos e otimize a operação do dia-a-dia da empresa.',
    icon: Zap,
    accent: 'text-amber-400',
  },
  {
    key: 'otimizacao_custos',
    titulo: 'Otimização de Custos',
    descricao: 'Enxugue a estrutura, renegocie contratos e aumente a margem líquida do negócio.',
    icon: TrendingDown,
    accent: 'text-red-400',
  },
  {
    key: 'posicionamento',
    titulo: 'Posicionamento',
    descricao: 'Construa transformações culturais na sua empresa, alinhando time e cultura ao posicionamento.',
    icon: Award,
    accent: 'text-violet-400',
  },
]

const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  alta: 'Alta prioridade',
  media: 'Média prioridade',
  baixa: 'Baixa prioridade',
  nao_prioridade: 'Não é prioridade',
}

interface Props {
  session?: Session
  clientId?: string
}

export default function ObjetivosTab({ session, clientId }: Props) {
  const resolvedClientId = clientId || session?.user?.id
  const [records, setRecords] = useState<Record<string, ObjetivoRecord>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    if (!resolvedClientId) { setLoading(false); return }
    async function fetchObjetivos() {
      const { data } = await supabase
        .from('cliente_objetivos_programa')
        .select('objetivo_key, prioridade, observacoes')
        .eq('id_cliente', resolvedClientId)
      const map: Record<string, ObjetivoRecord> = {}
      if (data) {
        for (const row of data) {
          map[row.objetivo_key] = row as ObjetivoRecord
        }
      }
      setRecords(map)
      setLoading(false)
    }
    fetchObjetivos()
  }, [resolvedClientId])

  async function persist(key: string, patch: Partial<ObjetivoRecord>) {
    if (!resolvedClientId) return
    const current = records[key] || { objetivo_key: key, prioridade: 'nao_prioridade' as Prioridade, observacoes: '' }
    const next: ObjetivoRecord = { ...current, ...patch }
    setRecords(prev => ({ ...prev, [key]: next }))
    setSavingKey(key)
    await supabase
      .from('cliente_objetivos_programa')
      .upsert(
        {
          id_cliente: resolvedClientId,
          objetivo_key: key,
          prioridade: next.prioridade,
          observacoes: next.observacoes,
        },
        { onConflict: 'id_cliente,objetivo_key' }
      )
    setSavingKey(null)
  }

  function getPrioridade(key: string): Prioridade {
    return records[key]?.prioridade ?? 'nao_prioridade'
  }

  function getObservacoes(key: string): string {
    return records[key]?.observacoes ?? ''
  }

  function prioridadeBorder(p: Prioridade): string {
    if (p === 'alta') return 'border-l-4 border-l-red-400'
    if (p === 'media') return 'border-l-4 border-l-amber-400'
    if (p === 'baixa') return 'border-l-4 border-l-emerald-400'
    return 'border-l-4 border-l-border'
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1,2,3,4,5,6].map(i => <Card key={i} className="h-64 animate-pulse bg-card/40" />)}
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="border-l-4 border-primary pl-6 py-2">
        <h2 className="text-2xl font-bold tracking-tight">Objetivos do Programa</h2>
        <p className="text-muted-foreground font-medium text-sm mt-1">
          Defina a prioridade de cada objetivo pra direcionar suas ações estratégicas.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {OBJETIVOS.map((obj, i) => {
          const Icon = obj.icon
          const prio = getPrioridade(obj.key)
          return (
            <motion.div
              key={obj.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Card className={`h-full transition-all ${prioridadeBorder(prio)} ${prio === 'alta' ? 'bg-red-500/5' : prio === 'media' ? 'bg-amber-500/5' : prio === 'baixa' ? 'bg-emerald-500/5' : ''}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className={`bg-muted/30 p-2.5 rounded-xl ${obj.accent}`}>
                      <Icon className="size-5" />
                    </div>
                    {savingKey === obj.key && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Salvando...</span>
                    )}
                  </div>
                  <CardTitle className="text-lg font-bold tracking-tight mt-4">{obj.titulo}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{obj.descricao}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prioridade</Label>
                    <Select
                      value={prio}
                      onValueChange={(v) => persist(obj.key, { prioridade: v as Prioridade })}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-border bg-background w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao_prioridade">{PRIORIDADE_LABELS.nao_prioridade}</SelectItem>
                        <SelectItem value="baixa">{PRIORIDADE_LABELS.baixa}</SelectItem>
                        <SelectItem value="media">{PRIORIDADE_LABELS.media}</SelectItem>
                        <SelectItem value="alta">{PRIORIDADE_LABELS.alta}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações</Label>
                    <Textarea
                      className="min-h-[80px] text-sm"
                      placeholder="Adicione detalhes sobre esse objetivo..."
                      value={getObservacoes(obj.key)}
                      onChange={(e) => setRecords(prev => ({ ...prev, [obj.key]: { ...(prev[obj.key] || { objetivo_key: obj.key, prioridade: 'nao_prioridade' as Prioridade, observacoes: '' }), observacoes: e.target.value } }))}
                      onBlur={(e) => persist(obj.key, { observacoes: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
