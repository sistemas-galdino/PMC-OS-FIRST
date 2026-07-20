import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { celebrarPontosMC } from "@/components/pontos-mc-splash"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MapIcon as Map,
  TrendingUpIcon as TrendingUp,
  SaveIcon as Save,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { useClienteMoeda } from "@/hooks/use-cliente-moeda"
import { currencySymbol } from "@/lib/format-currency"

interface CenariosForm {
  faturamento_anual_objetivo: number
  numero_funcionarios: number
  numero_gestores: number
  principais_desafios: string
  meta_2026: number
  como_ajudar: string
  resultados_esperados: string
  entregas_decisivas: string
  usa_crm: '' | 'sim' | 'nao'
  crm_atual: string
  vai_usar_black_crm: '' | 'sim' | 'nao'
}

const EMPTY: CenariosForm = {
  faturamento_anual_objetivo: 0,
  numero_funcionarios: 0,
  numero_gestores: 0,
  principais_desafios: '',
  meta_2026: 0,
  como_ajudar: '',
  resultados_esperados: '',
  entregas_decisivas: '',
  usa_crm: '',
  crm_atual: '',
  vai_usar_black_crm: '',
}

// boolean|null (banco) <-> '' | 'sim' | 'nao' (form)
const boolToOpt = (v: boolean | null | undefined): '' | 'sim' | 'nao' => (v === true ? 'sim' : v === false ? 'nao' : '')
const optToBool = (v: '' | 'sim' | 'nao'): boolean | null => (v === 'sim' ? true : v === 'nao' ? false : null)

interface Props {
  session?: Session
  clientId?: string
}

export default function CenariosTab({ session, clientId }: Props) {
  const resolvedClientId = clientId || session?.user?.id
  // Só o admin (perfil completo da empresa) recebe clientId por prop; o cliente vê via session.
  // As perguntas "Como podemos ajudar / Resultados esperados / Entregas decisivas" ficam
  // ocultas para o cliente e visíveis apenas nessa visão do admin.
  const isAdminView = Boolean(clientId)
  const moeda = useClienteMoeda(resolvedClientId)
  const moedaSym = currencySymbol(moeda)
  const [form, setForm] = useState<CenariosForm>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // Se já havia metas gravadas, a área já pontuou — o splash é só na primeira vez.
  const [tinhaMetas, setTinhaMetas] = useState(false)

  useEffect(() => {
    if (!resolvedClientId) { setLoading(false); return }
    async function fetchMetas() {
      const { data } = await supabase
        .from('cliente_metas')
        .select('faturamento_anual_objetivo, numero_funcionarios, numero_gestores, principais_desafios, meta_2026, como_ajudar, resultados_esperados, entregas_decisivas, usa_crm, crm_atual, vai_usar_black_crm')
        .eq('id_cliente', resolvedClientId)
        .maybeSingle()
      if (data) {
        setTinhaMetas(true)
        setForm({
          faturamento_anual_objetivo: data.faturamento_anual_objetivo ?? 0,
          numero_funcionarios: data.numero_funcionarios ?? 0,
          numero_gestores: data.numero_gestores ?? 0,
          principais_desafios: data.principais_desafios ?? '',
          meta_2026: data.meta_2026 ?? 0,
          como_ajudar: data.como_ajudar ?? '',
          resultados_esperados: data.resultados_esperados ?? '',
          entregas_decisivas: data.entregas_decisivas ?? '',
          usa_crm: boolToOpt(data.usa_crm),
          crm_atual: data.crm_atual ?? '',
          vai_usar_black_crm: boolToOpt(data.vai_usar_black_crm),
        })
      }
      setLoading(false)
    }
    fetchMetas()
  }, [resolvedClientId])

  async function handleSave() {
    if (!resolvedClientId) return
    setSaving(true)
    setSaved(false)
    const colaboradores_total = (form.numero_funcionarios || 0) + (form.numero_gestores || 0)
    const { usa_crm, crm_atual, vai_usar_black_crm, ...resto } = form
    const { error } = await supabase
      .from('cliente_metas')
      .upsert(
        {
          id_cliente: resolvedClientId,
          ...resto,
          colaboradores_total,
          usa_crm: optToBool(usa_crm),
          crm_atual: usa_crm === 'sim' ? crm_atual.trim() || null : null,
          vai_usar_black_crm: optToBool(vai_usar_black_crm),
        },
        { onConflict: 'id_cliente' }
      )
    setSaving(false)
    if (!error) {
      if (!isAdminView && !tinhaMetas) celebrarPontosMC(25, 'Mapeamento · Cenários & Metas preenchido')
      setTinhaMetas(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      window.dispatchEvent(new CustomEvent('cliente-metas-updated'))
    }
  }

  if (loading) {
    return (
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="h-[550px] animate-pulse bg-card/40" />
        <Card className="h-[550px] animate-pulse bg-card/40" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative"
    >
      <div className="grid gap-8 lg:grid-cols-2 pb-24">
        {/* Cenário Atual */}
        <Card className="border-border">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="bg-muted/30 p-2.5 rounded-xl">
                <Map className="size-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">Cenário Atual</CardTitle>
                <CardDescription className="text-sm mt-1">Situação atual da empresa</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Faturamento Anual Médio ({moedaSym})</Label>
              <Input
                type="number"
                className="h-11 rounded-xl"
                placeholder="0"
                value={form.faturamento_anual_objetivo || ''}
                onChange={(e) => setForm(prev => ({ ...prev, faturamento_anual_objetivo: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Funcionários</Label>
                <Input
                  type="number"
                  className="h-11 rounded-xl"
                  placeholder="0"
                  value={form.numero_funcionarios || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, numero_funcionarios: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gestores</Label>
                <Input
                  type="number"
                  className="h-11 rounded-xl"
                  placeholder="0"
                  value={form.numero_gestores || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, numero_gestores: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Já usa CRM?</Label>
                <Select
                  value={form.usa_crm}
                  onValueChange={(v) => setForm(prev => ({ ...prev, usa_crm: v as 'sim' | 'nao', crm_atual: v === 'sim' ? prev.crm_atual : '' }))}
                >
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.usa_crm === 'sim' && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Qual CRM?</Label>
                  <Input
                    className="h-11 rounded-xl"
                    placeholder="Ex.: Pipedrive, RD Station"
                    value={form.crm_atual}
                    onChange={(e) => setForm(prev => ({ ...prev, crm_atual: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vai usar a Black CRM?</Label>
              <Select
                value={form.vai_usar_black_crm}
                onValueChange={(v) => setForm(prev => ({ ...prev, vai_usar_black_crm: v as 'sim' | 'nao' }))}
              >
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Principais Desafios</Label>
              <Textarea
                className="min-h-[120px]"
                placeholder="Quais são os 2 principais desafios que você enfrenta hoje?"
                value={form.principais_desafios}
                onChange={(e) => setForm(prev => ({ ...prev, principais_desafios: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cenário Desejado */}
        <Card className="border-border">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <TrendingUp className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">Cenário Desejado</CardTitle>
                <CardDescription className="text-sm mt-1">Metas e objetivos futuros</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meta de Faturamento (próx. 12 meses)</Label>
              <Input
                type="number"
                className="h-11 rounded-xl"
                placeholder="0"
                value={form.meta_2026 || ''}
                onChange={(e) => setForm(prev => ({ ...prev, meta_2026: Number(e.target.value) || 0 }))}
              />
            </div>
            {isAdminView && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Como podemos ajudar?</Label>
                  <Textarea
                    className="min-h-[100px]"
                    placeholder="O que você acredita que podemos te ajudar nos próximos 3 meses?"
                    value={form.como_ajudar}
                    onChange={(e) => setForm(prev => ({ ...prev, como_ajudar: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resultados Esperados</Label>
                  <Textarea
                    className="min-h-[100px]"
                    placeholder="Qual resultado você gostaria de alcançar?"
                    value={form.resultados_esperados}
                    onChange={(e) => setForm(prev => ({ ...prev, resultados_esperados: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Entregas Decisivas</Label>
                  <Textarea
                    className="min-h-[100px]"
                    placeholder="Quais foram as entregas mais determinantes?"
                    value={form.entregas_decisivas}
                    onChange={(e) => setForm(prev => ({ ...prev, entregas_decisivas: e.target.value }))}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Botão salvar sticky */}
      <div className="fixed bottom-8 right-8 z-20">
        <Button
          size="lg"
          disabled={saving}
          onClick={handleSave}
          className="h-12 gap-2 rounded-xl px-8 shadow-2xl shadow-primary/20"
        >
          <Save className="size-5" />
          <span className="font-bold uppercase tracking-wider text-[12px]">
            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Cenários'}
          </span>
        </Button>
      </div>
    </motion.div>
  )
}
