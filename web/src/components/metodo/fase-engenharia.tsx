// Fase 6 — Engenharia Operacional: IA Value Score (IAVS).
// Livro-razão do valor gerado pela IA em 3 naturezas (custo evitado / tempo liberado /
// valor de decisão), com recorrência (mensal × único), método de valoração e
// custo-hora carregado por perfil (salário × 1,8 ÷ 160h).
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  Sparkles2Icon as Sparkles,
  ClockIcon as Clock,
  BanknoteIcon as Banknote,
  ZapIcon as Zap,
  TargetIcon as Target,
  LinkIcon as LinkIcon2,
  ExternalLinkIcon as ExternalLink,
  ChevronRightIcon as ChevronRight,
} from "@/components/ui/icons"
import { invokeMetodoIA, type EconomiaItemIA } from "@/lib/metodo-ia"
import { FaseHeader, VazioFase, BadgeIA } from "./compartilhados"

type Natureza = "custo_evitado" | "tempo_liberado" | "valor_decisao"
type Recorrencia = "mensal" | "unico"
type MetodoValoracao = "custo_hora" | "preco_mercado" | "horas_dev" | "decisao"

interface Economia {
  id: string
  referencia: string
  tipo: string
  horas_mes: number
  valor_mes: number
  observacao: string | null
  origem: string
  natureza: Natureza
  recorrencia: Recorrencia
  metodo_valoracao: MetodoValoracao | null
  capacidade_nova: boolean
}

interface PerfilCusto {
  id: string
  nome: string
  salario_mensal: number
  custo_hora: number
}

interface Ferramenta {
  id: string
  nome: string
  url: string | null
  para_que_serve: string | null
  categoria: string | null
}

const TIPO_LABEL: Record<string, string> = {
  copiloto: "Co-piloto",
  workflow: "Workflow",
  processo: "Processo",
  prompt: "Prompt",
  documento: "Documento",
  dashboard: "Dashboard",
  analise: "Análise",
  plano_acao: "Plano de ação",
  agente: "Agente especialista",
  sistema: "Sistema",
  decisao: "Decisão",
}

const NATUREZA_LABEL: Record<Natureza, string> = {
  custo_evitado: "Custo evitado",
  tempo_liberado: "Tempo liberado",
  valor_decisao: "Valor de decisão",
}

const METODO_LABEL: Record<MetodoValoracao, string> = {
  custo_hora: "Custo-hora carregado",
  preco_mercado: "Preço de mercado",
  horas_dev: "Horas-dev evitadas",
  decisao: "Valor de decisão",
}

// Parâmetros conservadores das estimativas automáticas (transparentes na observação).
const TAXA_DEV = 150            // R$/h de dev de mercado
const HORAS_DEV_SISTEMA = 80    // sistema simples ≈ 2 semanas de dev
const COPILOTO_HORAS_MES = 20   // ≈ 1h/dia útil liberada por co-piloto ativo
const CUSTO_HORA_PADRAO = 56    // salário R$ 5.000 × 1,8 ÷ 160h
const BI_MENSAL = 320           // Power BI Pro ≈ R$ 64/usuário × 5 usuários
const CRM_MENSAL = 400          // CRM de mercado (Pipedrive/RD Station) ≈ R$ 400/mês

// Template por tipo: classificação e calculadora padrão (o usuário pode ajustar).
const TIPO_TEMPLATE: Record<string, { natureza: Natureza; recorrencia: Recorrencia; metodo: MetodoValoracao }> = {
  copiloto: { natureza: "tempo_liberado", recorrencia: "mensal", metodo: "custo_hora" },
  workflow: { natureza: "tempo_liberado", recorrencia: "mensal", metodo: "custo_hora" },
  processo: { natureza: "tempo_liberado", recorrencia: "mensal", metodo: "custo_hora" },
  prompt: { natureza: "tempo_liberado", recorrencia: "mensal", metodo: "custo_hora" },
  documento: { natureza: "tempo_liberado", recorrencia: "mensal", metodo: "custo_hora" },
  dashboard: { natureza: "custo_evitado", recorrencia: "unico", metodo: "preco_mercado" },
  analise: { natureza: "custo_evitado", recorrencia: "unico", metodo: "preco_mercado" },
  plano_acao: { natureza: "custo_evitado", recorrencia: "unico", metodo: "preco_mercado" },
  agente: { natureza: "custo_evitado", recorrencia: "unico", metodo: "preco_mercado" },
  sistema: { natureza: "custo_evitado", recorrencia: "unico", metodo: "horas_dev" },
  decisao: { natureza: "valor_decisao", recorrencia: "unico", metodo: "decisao" },
}

const ECO_VAZIA = {
  referencia: "",
  tipo: "copiloto",
  natureza: "tempo_liberado" as Natureza,
  recorrencia: "mensal" as Recorrencia,
  metodo: "custo_hora" as MetodoValoracao,
  horas: "",
  perfil_id: "",
  horas_dev: "",
  taxa_dev: "150",
  valor: "",
  observacao: "",
  capacidade_nova: false,
}

const FERR_VAZIA = { nome: "", url: "", para_que_serve: "", categoria: "" }

const fmtBRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`

interface SistemaResumo { nome: string; categoria: string | null; descricao: string | null; status: string }

export function FaseEngenharia({ clientId }: { clientId: string }) {
  const [economias, setEconomias] = useState<Economia[]>([])
  const [perfis, setPerfis] = useState<PerfilCusto[]>([])
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([])
  const [sistemas, setSistemas] = useState<SistemaResumo[]>([])
  const [copilotosAtivos, setCopilotosAtivos] = useState<string[]>([])
  const [usaBlackCrm, setUsaBlackCrm] = useState(false)
  const [crmAtual, setCrmAtual] = useState<string | null>(null)
  const [infoIavs, setInfoIavs] = useState(false)
  const [lancando, setLancando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEco, setShowEco] = useState(false)
  const [showFerr, setShowFerr] = useState(false)
  const [formEco, setFormEco] = useState(ECO_VAZIA)
  const [formFerr, setFormFerr] = useState(FERR_VAZIA)
  const [novoPerfil, setNovoPerfil] = useState<{ nome: string; salario: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [analisando, setAnalisando] = useState(false)
  const [resumoIA, setResumoIA] = useState<string | null>(null)
  const [erroIA, setErroIA] = useState<string | null>(null)

  async function fetchTudo() {
    const [{ data: ecos }, { data: ferrs }, { data: pfs }, { data: sis }, { data: cps }, { count: crmCount }, { data: metas }] = await Promise.all([
      supabase.from("metodo_economias").select("*").eq("id_cliente", clientId).order("created_at", { ascending: false }),
      supabase.from("metodo_ferramentas").select("*").eq("id_cliente", clientId).order("created_at", { ascending: false }),
      supabase.from("metodo_perfis_custo").select("*").eq("id_cliente", clientId).order("created_at"),
      supabase.from("metodo_sistemas").select("nome, categoria, descricao, status").eq("id_cliente", clientId),
      supabase.from("metodo_copilotos").select("nome, status").eq("id_cliente", clientId),
      supabase.from("cliente_colaboradores").select("id", { count: "exact", head: true }).eq("id_cliente", clientId).eq("guardiao_crm", true),
      supabase.from("cliente_metas").select("usa_crm, crm_atual, vai_usar_black_crm").eq("id_cliente", clientId).maybeSingle(),
    ])
    setEconomias((ecos ?? []) as Economia[])
    setFerramentas(ferrs ?? [])
    setPerfis((pfs ?? []) as PerfilCusto[])
    setSistemas((sis ?? []) as SistemaResumo[])
    setCopilotosAtivos((cps ?? []).filter((c: any) => c.status === "ativo").map((c: any) => String(c.nome)))
    // Fonte primária: resposta do Mapeamento ("Vai usar a Black CRM?"); fallback: Guardião de CRM no time.
    setUsaBlackCrm(
      metas?.vai_usar_black_crm === true ? true
        : metas?.vai_usar_black_crm === false ? false
        : (crmCount ?? 0) > 0
    )
    setCrmAtual(metas?.usa_crm === true ? (metas?.crm_atual ?? null) : null)
    setLoading(false)
  }

  useEffect(() => { fetchTudo() }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Painel IAVS (capacidade nova fica fora do índice) ----
  const kpis = useMemo(() => {
    const n = (x: unknown) => Number(x || 0)
    const ok = economias.filter((e) => !e.capacidade_nova)
    const custoMes = ok.filter((e) => e.natureza === "custo_evitado" && e.recorrencia === "mensal").reduce((a, e) => a + n(e.valor_mes), 0)
    const custoUnico = ok.filter((e) => e.natureza === "custo_evitado" && e.recorrencia === "unico").reduce((a, e) => a + n(e.valor_mes), 0)
    const horasMes = ok.filter((e) => e.natureza === "tempo_liberado" && e.recorrencia === "mensal").reduce((a, e) => a + n(e.horas_mes), 0)
    const tempoMes = ok.filter((e) => e.natureza === "tempo_liberado" && e.recorrencia === "mensal").reduce((a, e) => a + n(e.valor_mes), 0)
    const tempoUnico = ok.filter((e) => e.natureza === "tempo_liberado" && e.recorrencia === "unico").reduce((a, e) => a + n(e.valor_mes), 0)
    const decisao = ok.filter((e) => e.natureza === "valor_decisao").reduce((a, e) => a + n(e.valor_mes), 0)
    const capacidadeNova = economias.filter((e) => e.capacidade_nova).reduce((a, e) => a + n(e.valor_mes), 0)
    const iavsAno = (custoMes + tempoMes) * 12 + custoUnico + tempoUnico + decisao
    return { custoMes, custoUnico, horasMes, tempoMes, tempoUnico, decisao, capacidadeNova, iavsAno, fte: horasMes / 160 }
  }, [economias])

  // ---- Estimativas automáticas: sistemas criados, co-pilotos ativos, BI e Black CRM ----
  const custoHoraBase = perfis.length
    ? perfis.reduce((a, p) => a + Number(p.custo_hora), 0) / perfis.length
    : CUSTO_HORA_PADRAO

  const autoEstimativas = useMemo(() => {
    const jaLancado = new Set(economias.map((e) => e.referencia.trim().toLowerCase()))
    const linhas: { referencia: string; tipo: string; natureza: Natureza; recorrencia: Recorrencia; metodo: MetodoValoracao; horas: number; valor: number; observacao: string }[] = []
    sistemas.filter((s) => s.status === "ativo").forEach((s) => {
      linhas.push({
        referencia: `Sistema: ${s.nome}`,
        tipo: "sistema", natureza: "custo_evitado", recorrencia: "unico", metodo: "horas_dev",
        horas: HORAS_DEV_SISTEMA, valor: HORAS_DEV_SISTEMA * TAXA_DEV,
        observacao: `${HORAS_DEV_SISTEMA}h-dev × R$ ${TAXA_DEV}/h — o que um dev cobraria por um sistema simples (estimativa conservadora)`,
      })
    })
    copilotosAtivos.forEach((nome) => {
      linhas.push({
        referencia: `Co-piloto: ${nome}`,
        tipo: "copiloto", natureza: "tempo_liberado", recorrencia: "mensal", metodo: "custo_hora",
        horas: COPILOTO_HORAS_MES, valor: Math.round(COPILOTO_HORAS_MES * custoHoraBase),
        observacao: `${COPILOTO_HORAS_MES}h/mês (≈1h/dia útil) × R$ ${custoHoraBase.toFixed(0)}/h`,
      })
    })
    const temDashboard = sistemas.some((s) => /dash|painel|\bbi\b/i.test(`${s.nome} ${s.categoria ?? ""} ${s.descricao ?? ""}`))
    if (temDashboard) {
      linhas.push({
        referencia: "Ferramenta de BI evitada (Power BI)",
        tipo: "dashboard", natureza: "custo_evitado", recorrencia: "mensal", metodo: "preco_mercado",
        horas: 0, valor: BI_MENSAL,
        observacao: "Power BI Pro ≈ R$ 64/usuário × 5 usuários — dashboards feitos com IA dispensam a licença",
      })
    }
    if (usaBlackCrm) {
      linhas.push({
        referencia: "Black CRM — assinatura de CRM de mercado evitada",
        tipo: "sistema", natureza: "custo_evitado", recorrencia: "mensal", metodo: "preco_mercado",
        horas: 0, valor: CRM_MENSAL,
        observacao: crmAtual
          ? `substitui o ${crmAtual} ≈ R$ ${CRM_MENSAL}/mês`
          : `CRM de mercado (Pipedrive/RD Station) ≈ R$ ${CRM_MENSAL}/mês`,
      })
    }
    return linhas.filter((l) => !jaLancado.has(l.referencia.trim().toLowerCase()))
  }, [sistemas, copilotosAtivos, usaBlackCrm, crmAtual, custoHoraBase, economias])

  const autoSubtotal = useMemo(() => ({
    mensal: autoEstimativas.filter((l) => l.recorrencia === "mensal").reduce((a, l) => a + l.valor, 0),
    unico: autoEstimativas.filter((l) => l.recorrencia === "unico").reduce((a, l) => a + l.valor, 0),
  }), [autoEstimativas])

  async function lancarAutoEstimativas() {
    if (autoEstimativas.length === 0) return
    setLancando(true)
    const { error } = await supabase.from("metodo_economias").insert(
      autoEstimativas.map((l) => ({
        id_cliente: clientId,
        referencia: l.referencia,
        tipo: l.tipo,
        natureza: l.natureza,
        recorrencia: l.recorrencia,
        metodo_valoracao: l.metodo,
        horas_mes: l.horas,
        valor_mes: l.valor,
        observacao: l.observacao,
        origem: "auto",
      }))
    )
    setLancando(false)
    if (!error) fetchTudo()
  }

  // ---- Calculadora do formulário ----
  const perfilSel = perfis.find((p) => p.id === formEco.perfil_id)
  const valorCalculado = useMemo(() => {
    if (formEco.metodo === "custo_hora") return (Number(formEco.horas) || 0) * (perfilSel?.custo_hora ?? 0)
    if (formEco.metodo === "horas_dev") return (Number(formEco.horas_dev) || 0) * (Number(formEco.taxa_dev) || 0)
    return Number(formEco.valor) || 0
  }, [formEco, perfilSel])

  const formulaLegivel = useMemo(() => {
    if (formEco.metodo === "custo_hora" && perfilSel && Number(formEco.horas) > 0)
      return `${formEco.horas}h × R$ ${perfilSel.custo_hora.toLocaleString("pt-BR")}/h (${perfilSel.nome}) = ${fmtBRL(valorCalculado)}${formEco.recorrencia === "mensal" ? "/mês" : ""}`
    if (formEco.metodo === "horas_dev" && Number(formEco.horas_dev) > 0)
      return `${formEco.horas_dev}h-dev × R$ ${Number(formEco.taxa_dev).toLocaleString("pt-BR")}/h = ${fmtBRL(valorCalculado)} (único)`
    return null
  }, [formEco, perfilSel, valorCalculado])

  function trocarTipo(tipo: string) {
    const t = TIPO_TEMPLATE[tipo] ?? TIPO_TEMPLATE.copiloto
    setFormEco((p) => ({ ...p, tipo, natureza: t.natureza, recorrencia: t.recorrencia, metodo: t.metodo }))
  }

  const decisaoSemBaseline = formEco.natureza === "valor_decisao" && !formEco.observacao.trim()

  async function salvarPerfil() {
    if (!novoPerfil?.nome.trim() || !Number(novoPerfil.salario)) return
    const { data } = await supabase
      .from("metodo_perfis_custo")
      .insert({ id_cliente: clientId, nome: novoPerfil.nome.trim(), salario_mensal: Number(novoPerfil.salario) })
      .select()
      .single()
    if (data) {
      setPerfis((prev) => [...prev, data as PerfilCusto])
      setFormEco((p) => ({ ...p, perfil_id: (data as PerfilCusto).id }))
      setNovoPerfil(null)
    }
  }

  async function salvarEconomia() {
    if (!formEco.referencia.trim() || decisaoSemBaseline) return
    setSalvando(true)
    const horas = formEco.metodo === "custo_hora" ? Number(formEco.horas) || 0
      : formEco.metodo === "horas_dev" ? Number(formEco.horas_dev) || 0
      : 0
    const valorFinal = Number(formEco.valor) || valorCalculado
    const { error } = await supabase.from("metodo_economias").insert({
      id_cliente: clientId,
      referencia: formEco.referencia.trim(),
      tipo: formEco.tipo,
      natureza: formEco.natureza,
      recorrencia: formEco.recorrencia,
      metodo_valoracao: formEco.metodo,
      capacidade_nova: formEco.capacidade_nova,
      horas_mes: horas,
      valor_mes: valorFinal,
      observacao: formEco.observacao.trim() || null,
    })
    setSalvando(false)
    if (!error) {
      setShowEco(false)
      setFormEco(ECO_VAZIA)
      fetchTudo()
    }
  }

  async function salvarFerramenta() {
    if (!formFerr.nome.trim()) return
    setSalvando(true)
    const { error } = await supabase.from("metodo_ferramentas").insert({
      id_cliente: clientId,
      nome: formFerr.nome.trim(),
      url: formFerr.url.trim() || null,
      para_que_serve: formFerr.para_que_serve.trim() || null,
      categoria: formFerr.categoria.trim() || null,
    })
    setSalvando(false)
    if (!error) {
      setShowFerr(false)
      setFormFerr(FERR_VAZIA)
      fetchTudo()
    }
  }

  async function excluirEconomia(id: string) {
    await supabase.from("metodo_economias").delete().eq("id", id)
    fetchTudo()
  }

  async function excluirFerramenta(id: string) {
    await supabase.from("metodo_ferramentas").delete().eq("id", id)
    fetchTudo()
  }

  async function analisarComIA() {
    setAnalisando(true)
    setErroIA(null)
    try {
      const [{ data: sistemas }, { data: copilotos }, { data: gargalos }] = await Promise.all([
        supabase.from("metodo_sistemas").select("nome, descricao, status").eq("id_cliente", clientId),
        supabase.from("metodo_copilotos").select("nome, funcao, status, colaborador_nome").eq("id_cliente", clientId),
        supabase.from("metodo_gargalos").select("processo, horas_mes, status").eq("id_cliente", clientId).eq("status", "resolvido"),
      ])
      const res = await invokeMetodoIA<{ itens: EconomiaItemIA[]; resumo: string }>("economia_analise", {
        sistemas: sistemas ?? [],
        copilotos: (copilotos ?? []).filter((c: any) => c.status === "ativo"),
        gargalos_resolvidos: gargalos ?? [],
        perfis_custo: perfis.map((p) => ({ nome: p.nome, custo_hora: p.custo_hora })),
      })
      const itens = Array.isArray(res.itens) ? res.itens : []
      if (itens.length > 0) {
        await supabase.from("metodo_economias").insert(
          itens.map((i) => ({
            id_cliente: clientId,
            referencia: i.referencia,
            tipo: Object.keys(TIPO_LABEL).includes(i.tipo) ? i.tipo : "sistema",
            natureza: (["custo_evitado", "tempo_liberado", "valor_decisao"] as string[]).includes(i.natureza) ? i.natureza : "tempo_liberado",
            recorrencia: i.recorrencia === "unico" ? "unico" : "mensal",
            metodo_valoracao: (["custo_hora", "preco_mercado", "horas_dev", "decisao"] as string[]).includes(i.metodo_valoracao) ? i.metodo_valoracao : null,
            horas_mes: Number(i.horas_mes) || 0,
            valor_mes: Number(i.valor_mes) || 0,
            observacao: i.observacao || null,
            origem: "ia",
          }))
        )
      }
      setResumoIA(res.resumo || null)
      fetchTudo()
    } catch (e: any) {
      setErroIA(e.message || "Erro na análise de valor.")
    } finally {
      setAnalisando(false)
    }
  }

  return (
    <div className="space-y-6">
      <FaseHeader numero={6} titulo="Engenharia Operacional" subtitulo="IA Value Score — quanto valor a IA já gerou">
        <Button
          variant="outline"
          disabled={analisando}
          className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
          onClick={analisarComIA}
        >
          <Sparkles className="size-4" />
          {analisando ? "Analisando..." : "Analisar valor com IA"}
        </Button>
        <Button className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={() => setShowEco(true)}>
          <Plus className="size-4" />
          Registrar Valor
        </Button>
      </FaseHeader>

      <p className="text-[15px] font-medium text-muted-foreground leading-relaxed max-w-3xl">
        O sistema calcula sozinho o valor dos seus sistemas criados, co-pilotos ativos e ferramentas
        substituídas (BI, CRM) — você só lança no livro-razão com um clique. E, se quiser, registra
        manualmente qualquer outro valor com a calculadora.
      </p>

      {/* O que é o IAVS */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setInfoIavs((v) => !v)}
          className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-primary hover:opacity-80 transition-opacity"
        >
          <ChevronRight className={`size-4 transition-transform duration-200 ${infoIavs ? "rotate-90" : ""}`} />
          O que é o IAVS?
        </button>
        {infoIavs && (
          <Card className="border-border bg-card/40">
            <CardContent className="p-5 space-y-4">
              <p className="text-[14px] font-medium text-foreground leading-relaxed">
                O <strong>IA Value Score (IAVS)</strong> é o placar financeiro da IA na sua empresa.
                Em vez de contar "quantas automações foram criadas", ele responde à pergunta que importa:
                <strong className="text-primary"> quanto dinheiro a IA já gerou ou economizou?</strong>
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Custo evitado</p>
                  <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">
                    Dinheiro que não saiu do caixa: o dev que você não contratou, a licença de BI/CRM que não paga,
                    a consultoria que não precisou. Só entra o que a empresa gastaria de qualquer jeito.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Tempo liberado</p>
                  <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">
                    Horas que voltam para o time (co-pilotos, workflows), valoradas pelo custo-hora carregado
                    (salário × 1,8 ÷ 160h). Só vira dinheiro de verdade se a hora for realocada.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Valor de decisão</p>
                  <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">
                    O que a IA gerou ou protegeu numa decisão (ex.: evitou um erro de 10% num investimento de
                    R$ 500k = R$ 50k). É o valor mais alto — por isso é contado à parte, sem inflar o resto.
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                <p className="text-[13px] font-bold text-primary">
                  IAVS do ano = (valores mensais × 12) + valores únicos + valor de decisão
                </p>
                <p className="text-[11px] font-medium text-muted-foreground mt-1">
                  Número conservador ganha de número inflado toda vez que tem alguém inteligente na sala —
                  cada registro mostra a conta de como chegou no valor.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Painel IAVS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Custo evitado</CardTitle>
            <div className="bg-primary/10 p-2.5 rounded-xl"><Banknote className="size-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{fmtBRL(kpis.custoMes)}<span className="text-base text-muted-foreground font-semibold">/mês</span></div>
            {kpis.custoUnico > 0 && (
              <p className="text-[11px] font-bold text-primary mt-1">+ {fmtBRL(kpis.custoUnico)} único</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Horas liberadas</CardTitle>
            <div className="bg-primary/10 p-2.5 rounded-xl"><Clock className="size-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{kpis.horasMes.toLocaleString("pt-BR")}h<span className="text-base text-muted-foreground font-semibold">/mês</span></div>
            <p className="text-[11px] font-bold text-primary mt-1">
              ≈ {kpis.fte.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} FTE · {fmtBRL(kpis.tempoMes)}/mês
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Valor de decisão</CardTitle>
            <div className="bg-primary/10 p-2.5 rounded-xl"><Target className="size-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{fmtBRL(kpis.decisao)}</div>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">contado à parte, sem inflar</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-primary">IAVS · ano</CardTitle>
            <div className="bg-primary/15 p-2.5 rounded-xl"><Zap className="size-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-primary">{fmtBRL(kpis.iavsAno)}</div>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              {kpis.capacidadeNova > 0
                ? `+ ${fmtBRL(kpis.capacidadeNova)} em capacidade nova (fora do índice)`
                : "mensais ×12 + únicos + decisão"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estimativas automáticas pendentes de lançamento */}
      {!loading && autoEstimativas.length > 0 && (
        <Card className="border-primary/30">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Zap className="size-4 text-primary" />
                  Valor detectado automaticamente
                  <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-2 py-0 text-[10px] font-bold">
                    {autoEstimativas.length}
                  </Badge>
                </p>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                  Calculado dos seus sistemas, co-pilotos e ferramentas substituídas — estimativas conservadoras, ajuste depois se quiser.
                </p>
              </div>
              <Button
                disabled={lancando}
                className="h-9 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider shrink-0"
                onClick={lancarAutoEstimativas}
              >
                {lancando ? "Lançando..." : `Lançar no livro-razão (${[autoSubtotal.mensal > 0 ? `${fmtBRL(autoSubtotal.mensal)}/mês` : "", autoSubtotal.unico > 0 ? `${fmtBRL(autoSubtotal.unico)} único` : ""].filter(Boolean).join(" + ")})`}
              </Button>
            </div>
            <div className="space-y-1.5">
              {autoEstimativas.map((l) => (
                <div key={l.referencia} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/10">
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-foreground truncate">{l.referencia}</p>
                    <p className="text-[11px] font-medium text-muted-foreground truncate">{l.observacao}</p>
                  </div>
                  <p className="text-[12px] font-bold text-primary shrink-0">
                    {fmtBRL(l.valor)}{l.recorrencia === "mensal" ? "/mês" : " único"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {erroIA && <p className="text-[12px] font-medium text-destructive">{erroIA}</p>}
      {resumoIA && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 space-y-2">
            <BadgeIA />
            <p className="text-[13px] font-medium text-foreground leading-relaxed">{resumoIA}</p>
          </CardContent>
        </Card>
      )}

      {/* Livro-razão */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Livro-razão de valor (IAVS)</p>
        {loading ? (
          <div className="h-24 rounded-2xl bg-card/40 animate-pulse" />
        ) : economias.length === 0 ? (
          <VazioFase>
            Nada registrado ainda. Cada co-piloto, sistema, dashboard ou decisão apoiada pela IA gera valor —
            registre com a calculadora ou clique em "Analisar valor com IA".
          </VazioFase>
        ) : (
          <div className="space-y-2">
            {economias.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 p-4 rounded-xl bg-muted/20 border border-transparent hover:border-border transition-all group">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold tracking-tight text-foreground truncate">
                    {e.referencia}
                    {e.origem === "ia" && <span className="ml-2 text-[10px] font-bold text-primary">IA</span>}
                    {e.origem === "auto" && <span className="ml-2 text-[10px] font-bold text-primary">AUTO</span>}
                  </p>
                  {e.observacao && <p className="text-[11px] font-medium text-muted-foreground truncate">{e.observacao}</p>}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[9px] font-bold uppercase">
                      {TIPO_LABEL[e.tipo] ?? e.tipo}
                    </Badge>
                    <Badge variant="outline" className="rounded-lg border-primary/30 text-primary px-2 py-0 text-[9px] font-bold uppercase">
                      {NATUREZA_LABEL[e.natureza] ?? e.natureza}
                    </Badge>
                    <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[9px] font-bold uppercase">
                      {e.recorrencia === "unico" ? "Único" : "Mensal"}
                    </Badge>
                    {e.metodo_valoracao && (
                      <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[9px] font-bold uppercase">
                        {METODO_LABEL[e.metodo_valoracao]}
                      </Badge>
                    )}
                    {e.capacidade_nova && (
                      <Badge variant="outline" className="rounded-lg border-amber-500/40 text-amber-500 px-2 py-0 text-[9px] font-bold uppercase">
                        Capacidade nova
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    {Number(e.horas_mes) > 0 && (
                      <p className="text-[13px] font-bold text-foreground">
                        {Number(e.horas_mes).toLocaleString("pt-BR")}h{e.recorrencia === "mensal" ? "/mês" : ""}
                      </p>
                    )}
                    <p className="text-[11px] font-bold text-primary">
                      {fmtBRL(Number(e.valor_mes))}{e.recorrencia === "mensal" ? "/mês" : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    className="size-8 p-0 rounded-lg text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-destructive"
                    onClick={() => excluirEconomia(e.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ferramentas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Inventário de ferramentas{ferramentas.length > 0 ? ` (${ferramentas.length})` : ""}
          </p>
          <Button
            variant="outline" size="sm"
            className="h-9 gap-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
            onClick={() => setShowFerr(true)}
          >
            <Plus className="size-3.5" />
            Adicionar Ferramenta
          </Button>
        </div>
        {ferramentas.length === 0 ? (
          <VazioFase>
            Liste as ferramentas que a empresa usa e para quê — ex.: NotebookLM para processos,
            Claude para co-pilotos e sistemas, Supabase para banco de dados.
          </VazioFase>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ferramentas.map((f) => (
              <Card key={f.id} className="group">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="bg-primary/10 p-1.5 rounded-lg shrink-0">
                        <LinkIcon2 className="size-3.5 text-primary" />
                      </div>
                      <p className="text-[13px] font-bold tracking-tight text-foreground truncate">{f.nome}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {f.url && (
                        <Button variant="ghost" size="sm" className="size-7 p-0 rounded-lg" onClick={() => window.open(f.url!, "_blank")}>
                          <ExternalLink className="size-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="size-7 p-0 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => excluirFerramenta(f.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  {f.para_que_serve && <p className="text-[11px] font-medium text-muted-foreground line-clamp-2">{f.para_que_serve}</p>}
                  {f.categoria && (
                    <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[10px] font-bold uppercase">
                      {f.categoria}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>


      {/* Registrar valor (IAVS) */}
      <Dialog open={showEco} onOpenChange={setShowEco}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Registrar Valor (IAVS)</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">O que gerou o valor *</Label>
              <Input className="h-11 rounded-xl" placeholder="Ex.: Copiloto de Propostas" value={formEco.referencia} onChange={(e) => setFormEco((p) => ({ ...p, referencia: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de entrega</Label>
                <Select value={formEco.tipo} onValueChange={trocarTipo}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Natureza</Label>
                <Select value={formEco.natureza} onValueChange={(v) => setFormEco((p) => ({ ...p, natureza: v as Natureza }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(NATUREZA_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recorrência</Label>
                <Select value={formEco.recorrencia} onValueChange={(v) => setFormEco((p) => ({ ...p, recorrencia: v as Recorrencia }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal (rende todo mês)</SelectItem>
                    <SelectItem value="unico">Único (uma vez)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Método de valoração</Label>
                <Select value={formEco.metodo} onValueChange={(v) => setFormEco((p) => ({ ...p, metodo: v as MetodoValoracao }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(METODO_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Calculadora por método */}
            {formEco.metodo === "custo_hora" && (
              <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Calculadora: horas × custo-hora carregado</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Horas{formEco.recorrencia === "mensal" ? "/mês" : ""}
                    </Label>
                    <Input type="number" className="h-11 rounded-xl" placeholder="Ex.: 66" value={formEco.horas} onChange={(e) => setFormEco((p) => ({ ...p, horas: e.target.value, valor: "" }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Perfil de custo</Label>
                    <Select value={formEco.perfil_id} onValueChange={(v) => v === "__novo" ? setNovoPerfil({ nome: "", salario: "" }) : setFormEco((p) => ({ ...p, perfil_id: v, valor: "" }))}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Quem faria isso?" /></SelectTrigger>
                      <SelectContent>
                        {perfis.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.nome} — R$ {p.custo_hora.toLocaleString("pt-BR")}/h</SelectItem>
                        ))}
                        <SelectItem value="__novo">+ Novo perfil...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {novoPerfil && (
                  <div className="rounded-lg border border-dashed border-primary/40 p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Novo perfil (custo-hora = salário × 1,8 ÷ 160h)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input className="h-10 rounded-lg" placeholder="Ex.: Analista" value={novoPerfil.nome} onChange={(e) => setNovoPerfil((p) => p && { ...p, nome: e.target.value })} />
                      <Input type="number" className="h-10 rounded-lg" placeholder="Salário: 5000" value={novoPerfil.salario} onChange={(e) => setNovoPerfil((p) => p && { ...p, salario: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="h-8 rounded-lg text-[10px] font-bold uppercase" onClick={salvarPerfil} disabled={!novoPerfil.nome.trim() || !Number(novoPerfil.salario)}>
                        Salvar perfil{Number(novoPerfil.salario) > 0 ? ` (R$ ${(Number(novoPerfil.salario) * 1.8 / 160).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}/h)` : ""}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg text-[10px] font-bold uppercase text-muted-foreground" onClick={() => setNovoPerfil(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {formEco.metodo === "horas_dev" && (
              <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Calculadora: horas-dev × taxa de mercado</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Horas de dev evitadas</Label>
                    <Input type="number" className="h-11 rounded-xl" placeholder="Ex.: 80" value={formEco.horas_dev} onChange={(e) => setFormEco((p) => ({ ...p, horas_dev: e.target.value, valor: "" }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taxa R$/h</Label>
                    <Input type="number" className="h-11 rounded-xl" value={formEco.taxa_dev} onChange={(e) => setFormEco((p) => ({ ...p, taxa_dev: e.target.value, valor: "" }))} />
                  </div>
                </div>
              </div>
            )}

            {(formEco.metodo === "preco_mercado" || formEco.metodo === "decisao") && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {formEco.metodo === "decisao" ? "Valor gerado/protegido (R$)" : "Preço de reposição de mercado (R$)"}
                </Label>
                <Input type="number" className="h-11 rounded-xl" placeholder={formEco.metodo === "decisao" ? "Ex.: 50000" : "Ex.: 8000"} value={formEco.valor} onChange={(e) => setFormEco((p) => ({ ...p, valor: e.target.value }))} />
              </div>
            )}

            {/* Conta ao vivo */}
            {formulaLegivel && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                <p className="text-[13px] font-bold text-primary">{formulaLegivel}</p>
              </div>
            )}
            {(formEco.metodo === "custo_hora" || formEco.metodo === "horas_dev") && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ajustar valor final (opcional)</Label>
                <Input type="number" className="h-11 rounded-xl" placeholder={valorCalculado > 0 ? `Calculado: ${valorCalculado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "Deixe vazio para usar o cálculo"} value={formEco.valor} onChange={(e) => setFormEco((p) => ({ ...p, valor: e.target.value }))} />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Como chegou nesse número{formEco.natureza === "valor_decisao" ? " *" : ""}
              </Label>
              <Input className="h-11 rounded-xl" placeholder={formEco.natureza === "valor_decisao" ? "Obrigatório para decisão — ex.: evitou erro de 10% em investimento de R$ 500k" : "Baseline — ex.: 3h/dia × 22 dias, hora realocada p/ prospecção"} value={formEco.observacao} onChange={(e) => setFormEco((p) => ({ ...p, observacao: e.target.value }))} />
            </div>

            {formEco.natureza === "custo_evitado" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-[var(--color-primary)] size-4"
                  checked={formEco.capacidade_nova}
                  onChange={(e) => setFormEco((p) => ({ ...p, capacidade_nova: e.target.checked }))}
                />
                <span className="text-[13px] font-medium text-foreground">
                  Capacidade nova <span className="text-muted-foreground">(a empresa não gastaria isso de qualquer jeito — fica fora do índice)</span>
                </span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={salvando || !formEco.referencia.trim() || decisaoSemBaseline || (Number(formEco.valor) || valorCalculado) <= 0}
              className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs"
              onClick={salvarEconomia}
            >
              {salvando ? "Salvando..." : `Registrar ${(Number(formEco.valor) || valorCalculado) > 0 ? fmtBRL(Number(formEco.valor) || valorCalculado) : "Valor"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova ferramenta */}
      <Dialog open={showFerr} onOpenChange={setShowFerr}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Ferramenta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome *</Label>
                <Input className="h-11 rounded-xl" placeholder="Ex.: NotebookLM" value={formFerr.nome} onChange={(e) => setFormFerr((p) => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                <Input className="h-11 rounded-xl" placeholder="Ex.: Processos" value={formFerr.categoria} onChange={(e) => setFormFerr((p) => ({ ...p, categoria: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Link</Label>
              <Input className="h-11 rounded-xl" placeholder="https://..." value={formFerr.url} onChange={(e) => setFormFerr((p) => ({ ...p, url: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Para que serve</Label>
              <Input className="h-11 rounded-xl" placeholder="Ex.: Documentar e consultar processos internos" value={formFerr.para_que_serve} onChange={(e) => setFormFerr((p) => ({ ...p, para_que_serve: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={salvando || !formFerr.nome.trim()} className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs" onClick={salvarFerramenta}>
              {salvando ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
