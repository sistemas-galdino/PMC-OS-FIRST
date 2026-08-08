import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CalendarIcon as Calendar,
  CheckCircle2Icon as CheckCircle2,
  ChevronRightIcon as ChevronRight,
  CircleIcon as Circle,
  ClockIcon as Clock,
  ExternalLinkIcon as ExternalLink,
  MessageCircleIcon as MessageCircle,
  PlayCircleIcon as PlayCircle,
  ShieldCheckIcon as ShieldCheck,
  TargetIcon as Target,
  TrendingUpIcon as TrendingUp,
  UsersIcon as Users,
  VideoIcon as Video,
  UserCheckIcon as UserCheck,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { ETAPAS_METODO, type SinalEtapa } from "@/data/etapas-metodo"
import { calcularNivel, faixaPorPontos, NIVEIS } from "@/lib/nivel-pmc"
import { contarSemanasPerfeitas } from "@/lib/guardiao/meu-dia"
import { celebrarPontosMC } from "@/components/pontos-mc-splash"
import { conselhoAleatorio } from "@/data/conselhos-galdino"
import { GraficoFaturamentoMensal } from "@/components/dashboard/grafico-faturamento-mensal"
import { useClienteMoeda } from "@/hooks/use-cliente-moeda"
import { currencySymbol } from "@/lib/format-currency"
import { useConquistas } from "@/hooks/use-conquistas"
import { arquetipoDaBadge, iconeDaBadge, RARIDADE } from "@/data/badges-mc"

interface InicioPageProps {
  session?: Session
  clientId?: string
}

interface Encontro {
  id_unico: string
  tipo_encontro: string
  titulo_formatado: string
  data_encontro: string
  data_hora_inicio_iso: string
  horario_inicio: string
  horario_fim: string
  link_google_meet: string | null
  link_gravacao: string | null
  status: string
}

interface ReuniaoRealizada {
  id_unico: string
  mentor: string | null
  data_reuniao: string
  cliente_compareceu: boolean | null
}

// Ação pendente extraída do array acoes_cliente de uma reunião (Galdino/consultor).
interface AcaoReuniao {
  id_reuniao: string
  origem: "galdino" | "consultor"
  fonte: string          // "Galdino" ou nome do consultor
  data_reuniao: string
  indice: number         // posição no array acoes_cliente (para gravar de volta)
  acao: string
  prazo: string | null
  acoes_cliente: any[]    // array completo (para persistir a mudança de status)
}

interface GuardiaoIA {
  nome: string
  cargo: string | null
  telefone: string | null
}

const TIPO_LABELS: Record<string, string> = {
  multiplica_time_nivel_1: "Multiplica Time – Nível 01",
  multiplica_time_nivel_2: "Multiplica Time – Nível 02",
  multiplica_dono: "Multiplica Dono",
  multiplica_case: "Multiplica Case",
  encontro_guardiao_ia: "Encontro dos Guardiões",
  implementation_day: "Implementation Day",
  tutoria: "Tutoria",
}

const TIPO_DOTS: Record<string, string> = {
  multiplica_time_nivel_1: "bg-primary",
  multiplica_time_nivel_2: "bg-blue-400",
  multiplica_dono: "bg-amber-400",
  multiplica_case: "bg-purple-400",
  implementation_day: "bg-emerald-400",
  encontro_guardiao_ia: "bg-rose-400",
  tutoria: "bg-cyan-400",
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

function parseDataBr(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number)
  return new Date(year, month - 1, day)
}

// Aceita "DD/MM/YYYY", "YYYY-MM-DD" ou timestamp ISO (campo `data` é text no banco).
function parseDataFlexivel(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]))
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function saudacao(): string {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

// "fernanda" → "Fernanda"; "atendimento_01@pmc.com" → "Atendimento 01"
function nomeCs(sc: string): string {
  return sc
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function whatsappUrl(telefone: string): string {
  return `https://wa.me/${telefone.replace(/\D/g, "")}`
}

// Uma ação de reunião está concluída? (aceita variações de status usadas no sistema)
function acaoConcluida(status: unknown): boolean {
  const s = String(status ?? "").toLowerCase()
  return s.includes("conclu") || s === "done" || s === "feito"
}

function CountUp({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 1500
    const increment = value / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(start)
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  return <span>{prefix}{displayValue.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{suffix}</span>
}

function scaleCurrency(value: number): { value: number; suffix: string } {
  if (value >= 1_000_000) return { value: value / 1_000_000, suffix: ' mi' }
  return { value: value / 1000, suffix: ' K' }
}

export default function InicioPage({ session, clientId }: InicioPageProps) {
  const navigate = useNavigate()
  const resolvedClientId = clientId || session?.user?.id
  const [loading, setLoading] = useState(true)
  const [nomeCliente, setNomeCliente] = useState<string | null>(null)
  const [nomeEmpresa, setNomeEmpresa] = useState<string | null>(null)
  const [clientSc, setClientSc] = useState<string | null>(null)
  const [dataEntrada, setDataEntrada] = useState<Date | null>(null)
  const [guardiao, setGuardiao] = useState<GuardiaoIA | null>(null)
  const [linkGrupoWhatsapp, setLinkGrupoWhatsapp] = useState<string | null>(null)
  const [quickLinks, setQuickLinks] = useState<Record<string, string>>({})
  const [encontros, setEncontros] = useState<Encontro[]>([])
  const [reunioesRealizadas, setReunioesRealizadas] = useState<ReuniaoRealizada[]>([])
  const [reunioesCount, setReunioesCount] = useState({ galdino: 0, consultores: 0, blackcrm: 0 })
  const [etapasConcluidas, setEtapasConcluidas] = useState<Set<number>>(new Set())
  const [sinais, setSinais] = useState<Set<SinalEtapa>>(new Set())
  const [vitoriasCount, setVitoriasCount] = useState(0)
  const [mapeamentoCount, setMapeamentoCount] = useState(0)
  const [guardOps, setGuardOps] = useState({ convites: 0, candidatos: 0, contratado: 0, tarefas: 0, dias: 0, semanas: 0 })
  const [unicaCoisa, setUnicaCoisa] = useState<{ texto: string; mes: number; ano: number; area: string | null } | null>(null)
  const [valorAno, setValorAno] = useState(0) // IAVS — mesmo cálculo da Fase 6/Relatório
  const [acoesReuniao, setAcoesReuniao] = useState<AcaoReuniao[]>([])
  const [salvandoAcao, setSalvandoAcao] = useState<string | null>(null)
  const { isAdmin } = useAuth()
  const [savingEtapa, setSavingEtapa] = useState<number | null>(null)
  const [metas, setMetas] = useState({ faturamento_anual: 0, meta_2026: 0, receita_mensal: 0, colaboradores: 0 })
  const [conselho, setConselho] = useState(() => conselhoAleatorio())
  const moeda = useClienteMoeda(resolvedClientId)
  const moedaPrefix = `${currencySymbol(moeda)} `
  // Conquistas: avalia/concede badges no load do portal (silencioso — o sino
  // avisa; a página Meu Nível celebra). Só na visão do próprio cliente.
  const conquistas = useConquistas(!clientId && !!resolvedClientId, false)
  const badgesRecentes = useMemo(() => {
    const porSlug = new Map(conquistas.catalogo.map((b) => [b.slug, b]))
    return [...conquistas.ganhas.entries()]
      .sort((a, b) => b[1].localeCompare(a[1]))
      .slice(0, 3)
      .map(([slug]) => porSlug.get(slug))
      .filter(Boolean) as typeof conquistas.catalogo
  }, [conquistas.ganhas, conquistas.catalogo])

  const hoje = new Date()

  useEffect(() => {
    if (!resolvedClientId) return
    let cancelled = false

    async function fetchAll() {
      const hojeIso = hoje.toISOString().slice(0, 10)

      const [clienteRes, linksRes, encontrosRes, reunioesRes, etapasRes, metasRes, galdinoCountRes, consultoresCountRes, blackcrmCountRes] = await Promise.all([
        supabase
          .from("clientes_entrada_new")
          .select("nome_cliente_formatado, nome_empresa_formatado, sc, data, created_at, tem_guardiao_ia, guardiao_ia_nome, guardiao_ia_cargo, guardiao_ia_telefone, link_grupo_whatsapp")
          .eq("id_cliente", resolvedClientId)
          .maybeSingle(),
        supabase.from("configuracoes_links").select("chave, url").eq("ativo", true),
        supabase
          .from("encontros_ao_vivo")
          .select("id_unico, tipo_encontro, titulo_formatado, data_encontro, data_hora_inicio_iso, horario_inicio, horario_fim, link_google_meet, link_gravacao, status")
          .neq("status", "cancelado")
          .order("data_hora_inicio_iso", { ascending: true }),
        supabase
          .from("reunioes_mentoria_new")
          .select("id_unico, mentor, data_reuniao, cliente_compareceu")
          .eq("id_cliente", resolvedClientId)
          .lte("data_reuniao", hojeIso)
          .order("data_reuniao", { ascending: false })
          .limit(6),
        supabase
          .from("cliente_etapas_metodo")
          .select("etapa, concluida")
          .eq("id_cliente", resolvedClientId),
        supabase
          .from("cliente_metas")
          .select("faturamento_anual_objetivo, faturamento_mensal_objetivo, meta_2026, numero_funcionarios, numero_gestores, colaboradores_total")
          .eq("id_cliente", resolvedClientId)
          .maybeSingle(),
        supabase.from("reunioes_galdino").select("id_unico", { count: "exact", head: true }).eq("id_cliente", resolvedClientId),
        supabase.from("reunioes_mentoria_new").select("id_unico", { count: "exact", head: true }).eq("id_cliente", resolvedClientId),
        supabase.from("reunioes_blackcrm").select("id_unico", { count: "exact", head: true }).eq("id_cliente", resolvedClientId),
      ])

      if (cancelled) return

      if (clienteRes.data) {
        const c = clienteRes.data
        setNomeCliente(c.nome_cliente_formatado ?? null)
        setNomeEmpresa(c.nome_empresa_formatado ?? null)
        setClientSc(c.sc ?? null)
        setDataEntrada(parseDataFlexivel(c.data) ?? parseDataFlexivel(c.created_at))
        setLinkGrupoWhatsapp(c.link_grupo_whatsapp ?? null)
        if (c.guardiao_ia_nome) {
          setGuardiao({ nome: c.guardiao_ia_nome, cargo: c.guardiao_ia_cargo, telefone: c.guardiao_ia_telefone })
        } else {
          // Fallback: colaborador marcado como Guardião da IA em "Meu Time"
          const { data: colab } = await supabase
            .from("cliente_colaboradores")
            .select("nome, cargo, whatsapp")
            .eq("id_cliente", resolvedClientId)
            .eq("guardiao_ia", true)
            .limit(1)
            .maybeSingle()
          if (!cancelled && colab) {
            setGuardiao({ nome: colab.nome, cargo: colab.cargo, telefone: colab.whatsapp })
          }
        }
      }

      if (linksRes.data) {
        const map: Record<string, string> = {}
        linksRes.data.forEach((l) => { map[l.chave] = l.url })
        setQuickLinks(map)
      }

      setEncontros(encontrosRes.data ?? [])
      setReunioesRealizadas((reunioesRes.data ?? []).filter((r) => r.cliente_compareceu !== false))
      setReunioesCount({
        galdino: galdinoCountRes.count ?? 0,
        consultores: consultoresCountRes.count ?? 0,
        blackcrm: blackcrmCountRes.count ?? 0,
      })

      const done = new Set<number>()
      ;(etapasRes.data ?? []).forEach((r: { etapa: number; concluida: boolean }) => {
        if (r.concluida) done.add(r.etapa)
      })
      setEtapasConcluidas(done)

      const goals = metasRes.data
      const numFunc = goals?.numero_funcionarios ?? 0
      const numGest = goals?.numero_gestores ?? 0
      setMetas({
        faturamento_anual: goals?.faturamento_anual_objetivo ?? 0,
        meta_2026: goals?.meta_2026 ?? 0,
        receita_mensal: goals?.faturamento_mensal_objetivo ?? 0,
        colaboradores: (numFunc || numGest) ? numFunc + numGest : goals?.colaboradores_total ?? 0,
      })

      // Sinais de conclusão automática: uma etapa fica concluída quando o
      // cliente já tem dados na fase correspondente do Método (ou reuniões).
      const cnt = (tabela: string) =>
        supabase.from(tabela).select("id", { count: "exact", head: true }).eq("id_cliente", resolvedClientId)
      // Mapeamento (id_cliente porque cliente_objetivos_programa não tem coluna id)
      const cntMap = (tabela: string) =>
        supabase.from(tabela).select("id_cliente", { count: "exact", head: true }).eq("id_cliente", resolvedClientId)
      const [g, a, ga, cp, si, ec, vit, ecoRes, ucRes, mMetas, mProd, mCanais, mObj, gConv, gCand, gContr, tOk, diasRes] = await Promise.all([
        cnt("metodo_guardioes"), cnt("metodo_areas"), cnt("metodo_gargalos"),
        cnt("metodo_copilotos"), cnt("metodo_sistemas"), cnt("metodo_economias"),
        cnt("cliente_vitorias"),
        supabase
          .from("metodo_economias")
          .select("valor_mes, natureza, recorrencia, capacidade_nova")
          .eq("id_cliente", resolvedClientId),
        // Única Coisa mais recente (Fase 2) — o foco do mês na home
        supabase
          .from("metodo_area_ciclos")
          .select("receita_conteudo, mes, ano, metodo_areas(nome)")
          .eq("id_cliente", resolvedClientId)
          .not("receita_conteudo", "is", null)
          .order("ano", { ascending: false })
          .order("mes", { ascending: false })
          .limit(1)
          .maybeSingle(),
        cntMap("cliente_metas"), cntMap("cliente_produtos"),
        cntMap("cliente_canais"), cntMap("cliente_objetivos_programa"),
        // Guardião de IA — pontuam a jornada de seleção + operação
        cnt("guardiao_invites"),
        supabase.from("guardiao_invites").select("id", { count: "exact", head: true }).eq("id_cliente", resolvedClientId).eq("status", "concluido"),
        supabase.from("guardiao_invites").select("id", { count: "exact", head: true }).eq("id_cliente", resolvedClientId).eq("stage", "contratado_guardiao"),
        supabase.from("metodo_tarefas").select("id", { count: "exact", head: true }).eq("id_cliente", resolvedClientId).eq("status", "concluido"),
        supabase.from("metodo_dia_fechamentos").select("data").eq("id_cliente", resolvedClientId).not("fechado_em", "is", null),
      ])
      if (!cancelled) {
        const s = new Set<SinalEtapa>()
        if ((g.count ?? 0) > 0) s.add("guardiao")
        if ((a.count ?? 0) > 0) s.add("areas")
        if ((ga.count ?? 0) > 0) s.add("gargalos")
        if ((cp.count ?? 0) > 0) s.add("copilotos")
        if ((si.count ?? 0) > 0) s.add("sistemas")
        if ((ec.count ?? 0) > 0) s.add("economias")
        const totalReunioes = (galdinoCountRes.count ?? 0) + (consultoresCountRes.count ?? 0) + (blackcrmCountRes.count ?? 0)
        if (totalReunioes > 0) s.add("reunioes")
        setSinais(s)
        setVitoriasCount(vit.count ?? 0)
        setMapeamentoCount([mMetas, mProd, mCanais, mObj].filter((r) => (r.count ?? 0) > 0).length)
        const diasFech = ((diasRes.data ?? []) as { data: string }[]).map((x) => x.data)
        setGuardOps({
          convites: gConv.count ?? 0, candidatos: gCand.count ?? 0,
          contratado: gContr.count ?? 0, tarefas: tOk.count ?? 0,
          dias: diasFech.length, semanas: contarSemanasPerfeitas(diasFech),
        })
        // Valor gerado no ano (IAVS) — mesma fórmula da Fase 6/Relatório.
        const nEco = (x: unknown) => Number(x || 0)
        const okEco = (ecoRes.data ?? []).filter((e: any) => !e.capacidade_nova)
        const somaEco = (fn: (e: any) => boolean) => okEco.filter(fn).reduce((acc: number, e: any) => acc + nEco(e.valor_mes), 0)
        const mensalEco = somaEco((e) => (e.natureza === "custo_evitado" || e.natureza === "tempo_liberado") && e.recorrencia === "mensal")
        const unicoEco = somaEco((e) => (e.natureza === "custo_evitado" || e.natureza === "tempo_liberado") && e.recorrencia === "unico")
        const decisaoEco = somaEco((e) => e.natureza === "valor_decisao")
        setValorAno(mensalEco * 12 + unicoEco + decisaoEco)
        const uc: any = ucRes.data
        if (uc?.receita_conteudo?.trim()) {
          setUnicaCoisa({
            texto: uc.receita_conteudo.trim(),
            mes: uc.mes,
            ano: uc.ano,
            area: uc.metodo_areas?.nome ?? null,
          })
        }
      }

      // Ações pendentes das reuniões (Galdino + consultores) para o card de foco.
      const [acGaldino, acConsult] = await Promise.all([
        supabase.from("reunioes_galdino").select("id_unico, data_reuniao, acoes_cliente").eq("id_cliente", resolvedClientId).order("data_reuniao", { ascending: false }),
        supabase.from("reunioes_mentoria_new").select("id_unico, data_reuniao, mentor, acoes_cliente").eq("id_cliente", resolvedClientId).order("data_reuniao", { ascending: false }),
      ])
      if (!cancelled) {
        const extrair = (rows: any[], origem: "galdino" | "consultor"): AcaoReuniao[] =>
          (rows ?? []).flatMap((r) => {
            const arr = Array.isArray(r.acoes_cliente) ? r.acoes_cliente : []
            return arr
              .map((it: any, indice: number) => ({ it, indice }))
              .filter(({ it }: any) => typeof it === "object" && it?.acao && !acaoConcluida(it.status))
              .map(({ it, indice }: any) => ({
                id_reuniao: r.id_unico,
                origem,
                fonte: origem === "galdino" ? "Galdino" : (r.mentor || "Consultor"),
                data_reuniao: r.data_reuniao,
                indice,
                acao: it.acao,
                prazo: it.prazo || null,
                acoes_cliente: arr,
              }))
          })
        const todas = [...extrair(acGaldino.data ?? [], "galdino"), ...extrair(acConsult.data ?? [], "consultor")]
        // Ordena por prazo (as com prazo primeiro, mais próximas no topo), depois por data da reunião.
        todas.sort((a, b) => {
          if (a.prazo && b.prazo) return a.prazo.localeCompare(b.prazo)
          if (a.prazo) return -1
          if (b.prazo) return 1
          return (b.data_reuniao || "").localeCompare(a.data_reuniao || "")
        })
        setAcoesReuniao(todas)
      }

      setLoading(false)
    }

    fetchAll()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedClientId])

  const suporteUrl = clientSc
    ? quickLinks[`suporte_${clientSc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`] || ""
    : ""
  const csNome = clientSc ? nomeCs(clientSc) : null

  const semanaPrograma = useMemo(() => {
    if (!dataEntrada) return null
    const diffMs = hoje.getTime() - dataEntrada.getTime()
    if (diffMs < 0) return 1
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
  }, [dataEntrada]) // eslint-disable-line react-hooks/exhaustive-deps

  const encontrosPorDia = useMemo(() => {
    const map = new Map<string, Encontro[]>()
    encontros.forEach((e) => {
      const list = map.get(e.data_encontro) ?? []
      list.push(e)
      map.set(e.data_encontro, list)
    })
    return Array.from(map.entries())
  }, [encontros])

  async function toggleEtapa(etapa: number) {
    if (!isAdmin || !resolvedClientId || savingEtapa !== null) return
    const concluida = !etapasConcluidas.has(etapa)
    setSavingEtapa(etapa)
    const { error } = await supabase
      .from("cliente_etapas_metodo")
      .upsert(
        {
          id_cliente: resolvedClientId,
          etapa,
          concluida,
          concluida_em: concluida ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id_cliente,etapa" }
      )
    if (!error) {
      setEtapasConcluidas((prev) => {
        const next = new Set(prev)
        if (concluida) next.add(etapa)
        else next.delete(etapa)
        return next
      })
    }
    setSavingEtapa(null)
  }

  // Marca uma ação de reunião como concluída — grava o array inteiro de volta
  // na reunião de origem (mesmo modelo da tela de detalhe) e remove da lista.
  async function concluirAcao(a: AcaoReuniao) {
    if (salvandoAcao) return
    const chave = `${a.id_reuniao}:${a.indice}`
    setSalvandoAcao(chave)
    const atualizado = a.acoes_cliente.map((it: any, i: number) =>
      i === a.indice ? { ...(typeof it === "object" ? it : { acao: it }), status: "concluido" } : it
    )
    const tabela = a.origem === "galdino" ? "reunioes_galdino" : "reunioes_mentoria_new"
    const { error } = await supabase.from(tabela).update({ acoes_cliente: atualizado }).eq("id_unico", a.id_reuniao)
    if (!error) {
      setAcoesReuniao((prev) => prev.filter((x) => !(x.id_reuniao === a.id_reuniao && x.indice === a.indice)))
    }
    setSalvandoAcao(null)
  }

  // Uma etapa está concluída se o admin marcou manualmente OU se o cliente já
  // tem dados na fase correspondente (conclusão automática por uso real).
  const etapaConcluida = (e: (typeof ETAPAS_METODO)[number]) =>
    etapasConcluidas.has(e.numero) || sinais.has(e.sinal)
  const totalConcluidas = ETAPAS_METODO.filter(etapaConcluida).length
  const pctConcluido = Math.round((totalConcluidas / ETAPAS_METODO.length) * 100)
  // Etapa atual = primeira não concluída (guia o "continuar de onde parou").
  const etapaAtual = ETAPAS_METODO.find((e) => !etapaConcluida(e))?.numero ?? null
  // Próximo encontro ao vivo (lista já vem sem cancelados, em ordem por data_hora_inicio_iso).
  // data_encontro é texto DD/MM/YYYY — a comparação de "futuro" precisa usar o campo ISO.
  const proximoEncontro = encontros.find((e) => new Date(e.data_hora_inicio_iso) >= hoje) ?? null
  // Nível PMC — gamificação unificada (jornada + fases + reuniões + vitórias).
  const totalReunioes = reunioesCount.galdino + reunioesCount.consultores + reunioesCount.blackcrm
  const fasesComDados = [...sinais].filter((s) => s !== "reunioes").length
  const nivel = calcularNivel({ etapas: totalConcluidas, fases: fasesComDados, mapeamento: mapeamentoCount, reunioes: totalReunioes, vitorias: vitoriasCount, convites: guardOps.convites, candidatos: guardOps.candidatos, guardiaoContratado: guardOps.contratado, tarefas: guardOps.tarefas, diasFechados: guardOps.dias, semanasPerfeitas: guardOps.semanas })

  // Splash de boas-vindas: se os Pontos MC subiram desde a última visita (deste
  // aparelho), celebra a diferença — e, se cruzou de nível, mostra o level-up.
  // Não dispara na visão do admin (clientId por prop) nem na primeira visita.
  // IMPORTANTE: estes hooks precisam vir ANTES do return de loading (ordem de hooks).
  const splashDisparado = useRef(false)
  useEffect(() => {
    if (loading || splashDisparado.current || clientId || !resolvedClientId) return
    splashDisparado.current = true
    const chave = `pmc:pontos-vistos:${resolvedClientId}`
    const guardado = localStorage.getItem(chave)
    if (guardado !== null) {
      const anterior = Number(guardado)
      if (Number.isFinite(anterior) && nivel.pontos > anterior) {
        const idxNovo = faixaPorPontos(nivel.pontos).indice
        const subiuNivel = idxNovo > faixaPorPontos(anterior).indice
        celebrarPontosMC(nivel.pontos - anterior, "desde a sua última visita", subiuNivel ? NIVEIS[idxNovo].nome : undefined)
      }
    }
    localStorage.setItem(chave, String(nivel.pontos))
  }, [loading, nivel.pontos, clientId, resolvedClientId])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 w-2/3 bg-card/40 rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-[420px] lg:col-span-2 bg-card/40 rounded-2xl" />
          <div className="h-[420px] bg-card/40 rounded-2xl" />
        </div>
        <div className="h-64 bg-card/40 rounded-2xl" />
      </div>
    )
  }

  const grupoWhatsappUrl = linkGrupoWhatsapp || quickLinks.grupo_avisos

  const contatos = [
    {
      label: csNome ? `Sua CS — ${csNome}` : "Sua Gestora de Sucesso",
      desc: "WhatsApp direto com sua CS",
      icon: UserCheck,
      url: suporteUrl,
    },
    {
      label: "Grupo de avisos",
      desc: linkGrupoWhatsapp ? "Grupo exclusivo da sua empresa" : "Avisos do Programa",
      icon: Users,
      url: grupoWhatsappUrl,
    },
  ].filter((c) => c.url)

  const reunioes = [
    {
      label: "Reunião com Consultores",
      desc: "Agende com seu consultor",
      icon: Calendar,
      url: "/atendimento",
      internal: false,
    },
    {
      label: "Reunião com Galdino",
      desc: "Agenda direta do Galdino",
      icon: Video,
      url: quickLinks.agenda_galdino,
      internal: false,
    },
  ].filter((r) => r.url)

  const nivelFaixa = NIVEIS[nivel.indice]

  return (
    <div className="space-y-6">
      {/* Saudação compacta */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="border-l-4 border-primary pl-5 py-1"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {WEEKDAYS[hoje.getDay()]}, {hoje.getDate()} de {MONTHS[hoje.getMonth()]} de {hoje.getFullYear()}
        </p>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground mt-1">
          {saudacao()}{nomeEmpresa ? `, ${nomeEmpresa}` : nomeCliente ? `, ${nomeCliente.split(" ")[0]}` : ""}! 👋
        </h1>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {semanaPrograma !== null && (
            <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-2.5 py-0.5 text-[10px] font-bold">
              SEMANA {semanaPrograma} DO PROGRAMA
            </Badge>
          )}
          <span className="text-[12px] text-muted-foreground font-medium">
            Sua central do Programa Multiplicador de Crescimento.
          </span>
        </div>
      </motion.div>

      {/* Layout de duas colunas: conteúdo principal + trilho lateral */}
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        {/* ============ COLUNA PRINCIPAL ============ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seu foco de hoje — Única Coisa + próximo passo */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Seu foco de hoje</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Única Coisa do mês (Fase 2) */}
              {unicaCoisa ? (
                <Card
                  className="border-primary/40 bg-primary/[0.06] cursor-pointer hover:border-primary/60 transition-colors"
                  onClick={() => navigate("/metodo?fase=2")}
                  title="Abrir a Fase 2 — Inteligência Empresarial"
                >
                  <CardContent className="p-5 flex flex-col gap-2 h-full">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/15 p-2 rounded-lg shrink-0">
                        <Target className="size-4 text-primary" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary leading-tight">
                        Sua Única Coisa · {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][unicaCoisa.mes - 1]}/{unicaCoisa.ano}
                        {unicaCoisa.area ? ` · ${unicaCoisa.area}` : ""}
                      </p>
                    </div>
                    <p className="text-[14px] font-medium text-foreground leading-relaxed line-clamp-4">
                      {unicaCoisa.texto.replace(/[#*_>`-]/g, "").slice(0, 220)}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate("/metodo?fase=2")}>
                  <CardContent className="p-5 flex flex-col gap-2 h-full">
                    <div className="flex items-center gap-2">
                      <div className="bg-muted/40 p-2 rounded-lg shrink-0">
                        <Target className="size-4 text-muted-foreground" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sua Única Coisa</p>
                    </div>
                    <p className="text-[13px] font-medium text-muted-foreground leading-relaxed">
                      Rode o ciclo do mês na Fase 2 para definir a alavanca do seu negócio.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Próximo passo da jornada */}
              <Card
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => navigate(etapaAtual ? ETAPAS_METODO[etapaAtual - 1].rota : "/relatorio")}
              >
                <CardContent className="p-5 flex flex-col gap-2 h-full">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                      <CheckCircle2 className="size-4 text-primary" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Próximo passo da jornada</p>
                  </div>
                  {etapaAtual ? (
                    <>
                      <p className="text-[15px] font-bold text-foreground leading-snug">
                        {String(etapaAtual).padStart(2, "0")} · {ETAPAS_METODO[etapaAtual - 1].titulo}
                      </p>
                      <p className="text-[12px] font-medium text-muted-foreground leading-relaxed line-clamp-2">
                        {ETAPAS_METODO[etapaAtual - 1].objetivo}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-primary mt-auto pt-1">
                        Continuar <ChevronRight className="size-3.5" />
                      </span>
                    </>
                  ) : (
                    <p className="text-[14px] font-medium text-primary">Jornada completa — veja seu relatório 🎉</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Suas ações das reuniões — pendentes (Galdino + consultores) */}
          {acoesReuniao.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.03 }}>
              <Card>
                <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Suas ações das reuniões</CardTitle>
                    <CardDescription className="text-[11px] font-medium">
                      {acoesReuniao.length} tarefa{acoesReuniao.length === 1 ? "" : "s"} combinada{acoesReuniao.length === 1 ? "" : "s"} com o Galdino e os consultores
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/5"
                    onClick={() => navigate("/acoes")}
                  >
                    Ver todas
                  </Button>
                </CardHeader>
                <CardContent className="pt-4 space-y-1.5">
                  {acoesReuniao.slice(0, 5).map((a) => {
                    const chave = `${a.id_reuniao}:${a.indice}`
                    const salvando = salvandoAcao === chave
                    const rota = a.origem === "galdino" ? `/reuniao-galdino/${a.id_reuniao}` : `/reuniao/${a.id_reuniao}?tab=acoes`
                    const prazoVencido = a.prazo ? a.prazo < hoje.toISOString().slice(0, 10) : false
                    return (
                      <div key={chave} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-muted/20 transition-colors">
                        <button
                          type="button"
                          onClick={() => concluirAcao(a)}
                          disabled={salvando}
                          title="Marcar como concluída"
                          className="shrink-0 mt-0.5 text-muted-foreground/40 hover:text-primary transition-colors disabled:opacity-40"
                        >
                          <Circle className="size-5" />
                        </button>
                        <button type="button" onClick={() => navigate(rota)} className="min-w-0 flex-1 text-left">
                          <p className="text-[13px] font-medium text-foreground leading-snug">{a.acao}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {a.origem === "galdino" ? <Video className="size-3" /> : <MessageCircle className="size-3" />}
                              {a.fonte}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground/60">
                              {new Date(a.data_reuniao + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            </span>
                            {a.prazo && (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${prazoVencido ? "text-rose-400" : "text-primary"}`}>
                                <Clock className="size-3" />
                                {new Date(a.prazo + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    )
                  })}
                  {acoesReuniao.length > 5 && (
                    <button
                      type="button"
                      onClick={() => navigate("/acoes")}
                      className="w-full pt-1 text-[12px] font-bold text-primary hover:underline"
                    >
                      + {acoesReuniao.length - 5} outra{acoesReuniao.length - 5 === 1 ? "" : "s"} ação{acoesReuniao.length - 5 === 1 ? "" : "ões"}
                    </button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Jornada das 7 etapas — densa */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
            <Card>
              <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">Jornada do Método PMC</CardTitle>
                  <CardDescription className="text-[11px] font-medium">
                    {totalConcluidas} de {ETAPAS_METODO.length} etapas concluídas
                  </CardDescription>
                </div>
                <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-3 py-1 text-[10px] font-bold">
                  {pctConcluido}% DA JORNADA
                </Badge>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="h-2 w-full rounded-full bg-muted/30 mb-5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctConcluido}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  {ETAPAS_METODO.map((etapa) => {
                    const done = etapaConcluida(etapa)
                    const atual = etapa.numero === etapaAtual
                    return (
                      <div
                        key={etapa.numero}
                        className={`flex items-center gap-3 rounded-xl border transition-all ${
                          atual && !done
                            ? "bg-primary/[0.07] border-primary/40 ring-1 ring-primary/20 p-3.5"
                            : done
                            ? "bg-primary/[0.04] border-primary/15 p-2.5"
                            : "bg-muted/20 border-transparent hover:border-border/60 p-2.5"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleEtapa(etapa.numero)}
                          disabled={!isAdmin}
                          title={isAdmin ? "Marcar/desmarcar (admin)" : undefined}
                          className={`rounded-full p-0.5 shrink-0 transition-colors ${isAdmin ? "cursor-pointer hover:bg-primary/10" : "cursor-default"}`}
                        >
                          {done
                            ? <CheckCircle2 className="size-5 text-primary" />
                            : <Circle className={`size-5 ${atual ? "text-primary/50" : "text-muted-foreground/30"}`} />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold tracking-tight text-foreground flex items-center gap-2">
                            <span className="text-muted-foreground/50 font-mono text-[11px]">0{etapa.numero}</span>
                            <span className="truncate">{etapa.titulo}</span>
                            {atual && !done && (
                              <Badge className="px-1.5 py-0 rounded-md bg-primary/15 text-primary border-primary/30 font-bold text-[9px] shrink-0">
                                VOCÊ ESTÁ AQUI
                              </Badge>
                            )}
                          </p>
                          {atual && !done && (
                            <p className="text-[12px] font-medium text-muted-foreground leading-relaxed mt-1">
                              {etapa.objetivo}
                            </p>
                          )}
                        </div>
                        <Button
                          variant={atual && !done ? "default" : "ghost"}
                          size="sm"
                          onClick={() => navigate(etapa.rota)}
                          className={`shrink-0 h-8 gap-1 rounded-lg font-bold text-[11px] uppercase tracking-wider ${atual && !done ? "" : "text-muted-foreground hover:text-primary px-2"}`}
                        >
                          {done ? "Rever" : atual ? "Continuar" : etapa.cta}
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Cronograma do mês */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
            <Card className="flex flex-col">
              <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">Cronograma de {MONTHS[hoje.getMonth()]}</CardTitle>
                  <CardDescription className="text-[11px] font-medium">
                    Eventos ao vivo da agenda do PMC neste mês
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/5"
                  onClick={() => navigate("/calendario")}
                >
                  Calendário Completo
                </Button>
              </CardHeader>
              <CardContent className="pt-5 space-y-5 flex-1 max-h-[460px] overflow-y-auto scrollbar-hide">
                {encontrosPorDia.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                    <Calendar className="size-8 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">Nenhum evento agendado para este mês.</p>
                  </div>
                )}
                {encontrosPorDia.map(([dia, lista]) => {
                  const data = parseDataBr(dia)
                  const isToday =
                    data.getDate() === hoje.getDate() &&
                    data.getMonth() === hoje.getMonth() &&
                    data.getFullYear() === hoje.getFullYear()
                  const isPast = !isToday && data < hoje
                  return (
                    <div key={dia} className={isPast ? "opacity-50" : ""}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-bold tracking-tight text-foreground">
                          {String(data.getDate()).padStart(2, "0")} — {WEEKDAYS[data.getDay()]}
                        </span>
                        {isToday && (
                          <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-2 py-0.5 text-[10px] font-bold">
                            HOJE
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        {lista.map((e) => (
                          <div
                            key={e.id_unico}
                            className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/30 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`size-2 rounded-full shrink-0 ${TIPO_DOTS[e.tipo_encontro] ?? "bg-muted-foreground"}`} />
                              <div className="min-w-0">
                                <p className="text-[13px] font-bold tracking-tight text-foreground truncate">
                                  {e.titulo_formatado || TIPO_LABELS[e.tipo_encontro] || e.tipo_encontro}
                                </p>
                                <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                                  <Clock className="size-3" />
                                  {e.horario_inicio} – {e.horario_fim}
                                  <span className="text-muted-foreground/50">·</span>
                                  {TIPO_LABELS[e.tipo_encontro] ?? "Encontro"}
                                </p>
                              </div>
                            </div>
                            {e.status === "realizado" && e.link_gravacao ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 rounded-lg text-xs font-bold text-primary hover:text-primary hover:bg-primary/5 shrink-0"
                                onClick={() => window.open(e.link_gravacao!, "_blank")}
                              >
                                <PlayCircle className="size-3.5" />
                                Gravação
                              </Button>
                            ) : e.link_google_meet ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 rounded-lg text-xs font-bold text-primary hover:text-primary hover:bg-primary/5 shrink-0"
                                onClick={() => window.open(e.link_google_meet!, "_blank")}
                              >
                                <Video className="size-3.5" />
                                Entrar
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* Reuniões realizadas */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.15 }}>
            <Card>
              <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">Reuniões realizadas</CardTitle>
                  <CardDescription className="text-[11px] font-medium">
                    {(reunioesCount.galdino + reunioesCount.consultores + reunioesCount.blackcrm)} no total · Galdino {reunioesCount.galdino} · Consultores {reunioesCount.consultores}{reunioesCount.blackcrm > 0 ? ` · BlackCRM ${reunioesCount.blackcrm}` : ""}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/5"
                  onClick={() => navigate("/reunioes")}
                >
                  Ver Todas
                </Button>
              </CardHeader>
              <CardContent className="pt-5 space-y-2">
                {reunioesRealizadas.length === 0 && (
                  <p className="text-sm font-medium text-muted-foreground text-center py-6">
                    Nenhuma reunião realizada ainda.
                  </p>
                )}
                {reunioesRealizadas.map((r) => (
                  <div
                    key={r.id_unico}
                    className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/30 transition-all cursor-pointer"
                    onClick={() => navigate(`/reuniao/${r.id_unico}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-primary/10 rounded-full p-1 shrink-0">
                        <CheckCircle2 className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold tracking-tight text-foreground truncate">
                          {r.mentor || "Consultor PMC"}
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {new Date(r.data_reuniao + "T00:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ============ TRILHO LATERAL (sticky) ============ */}
        <div className="space-y-5 lg:sticky lg:top-6">
          {/* Nível PMC compacto com arquétipo */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
            <Card
              onClick={() => navigate("/niveis")}
              title="Como funciona o nível PMC"
              className="cursor-pointer hover:border-primary/40 transition-colors border-primary/20 overflow-hidden"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="size-14 rounded-2xl overflow-hidden border border-primary/25 bg-primary/5 shrink-0 flex items-center justify-center">
                    <img
                      src={nivelFaixa.imagem}
                      alt=""
                      className="size-full object-cover"
                      onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = "none" }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seu nível no PMC</p>
                    <p className="text-lg font-bold tracking-tight text-foreground leading-tight">{nivel.nome}</p>
                    <p className="text-[12px] font-bold text-primary tabular-nums">{nivel.pontos.toLocaleString("pt-BR")} pts MC</p>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden mt-3">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${nivel.pctProximo}%` }} />
                </div>
                {nivel.proximoEm != null && (
                  <p className="text-[11px] font-medium text-muted-foreground mt-1.5">+{nivel.proximoEm} Pontos MC para o próximo nível</p>
                )}
                {badgesRecentes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conquistas</span>
                    <div className="flex items-center gap-1.5">
                      {badgesRecentes.map((b) => {
                        const arq = arquetipoDaBadge(b.icone)
                        const Icone = iconeDaBadge(b.icone)
                        const rar = RARIDADE[b.raridade] ?? RARIDADE.bronze
                        return (
                          <div key={b.slug} title={b.nome} className="relative size-8 shrink-0">
                            <img src={rar.medalha} alt="" className="size-full object-contain" />
                            <div className="absolute inset-0 flex items-center justify-center pt-0.5">
                              {arq
                                ? <img src={arq} alt="" className="size-3.5 rounded-full object-cover" />
                                : <Icone className={`size-3 ${rar.texto}`} />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <span className="ml-auto text-[10px] font-bold text-primary">{conquistas.ganhas.size} 🏅</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Próximo encontro ao vivo */}
          {proximoEncontro && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
              <Card className="border-primary/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                      <Video className="size-4 text-primary" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Próximo encontro ao vivo</p>
                  </div>
                  <p className="text-[14px] font-bold text-foreground leading-snug line-clamp-2">{proximoEncontro.titulo_formatado}</p>
                  <p className="text-[12px] font-medium text-muted-foreground mt-0.5">
                    {proximoEncontro.data_encontro.split("/").slice(0, 2).join("/")} · {(proximoEncontro.horario_inicio ?? "").slice(0, 5)}
                  </p>
                  <Button
                    size="sm"
                    className="h-9 w-full gap-1.5 rounded-lg font-bold text-[11px] uppercase tracking-wider mt-3"
                    onClick={() => proximoEncontro.link_google_meet ? window.open(proximoEncontro.link_google_meet, "_blank") : navigate("/calendario")}
                  >
                    {proximoEncontro.link_google_meet ? "Entrar no encontro" : "Ver agenda"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Valor gerado (IAVS) — compacto */}
          {valorAno > 0 && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
              <Card
                className="border-primary/40 bg-primary/[0.06] cursor-pointer hover:border-primary/60 transition-colors"
                onClick={() => navigate("/relatorio")}
                title="Ver meu relatório"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="bg-primary/15 p-2 rounded-lg shrink-0">
                      <TrendingUp className="size-4 text-primary" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary leading-tight">O método já gerou</p>
                  </div>
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    {valorAno.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[11px] font-bold text-muted-foreground">para a sua empresa no último ano</p>
                  <span className="inline-flex items-center gap-1 text-[12px] font-bold text-primary mt-2">
                    Ver meu relatório <ChevronRight className="size-3.5" />
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Atalhos — contatos + marcar reunião */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.15 }}>
            <Card>
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-base font-semibold">Atalhos</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                {[...contatos, ...reunioes].map((a: any) => (
                  <Button
                    key={a.label}
                    variant="outline"
                    className="w-full justify-between h-[58px] rounded-xl hover:border-primary/30 hover:bg-primary/5 group"
                    onClick={() => (a.internal ? navigate(a.url) : window.open(a.url, "_blank"))}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <a.icon className="size-4" />
                      </div>
                      <div className="flex flex-col items-start gap-0.5 min-w-0">
                        <span className="font-bold text-[13px] tracking-tight truncate max-w-[150px]">{a.label}</span>
                        <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[150px]">{a.desc}</span>
                      </div>
                    </div>
                    <ExternalLink className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                  </Button>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Seu Guardião da IA */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.2 }}>
            <Card>
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-base font-semibold">Seu Guardião da IA</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {guardiao ? (
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                      <ShieldCheck className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold tracking-tight text-foreground">{guardiao.nome}</p>
                      {guardiao.cargo && (
                        <p className="text-[11px] font-medium text-muted-foreground">{guardiao.cargo}</p>
                      )}
                      {guardiao.telefone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 h-9 w-full gap-2 rounded-xl text-xs font-bold hover:border-primary/30 hover:bg-primary/5"
                          onClick={() => window.open(whatsappUrl(guardiao.telefone!), "_blank")}
                        >
                          <MessageCircle className="size-3.5" />
                          Chamar no WhatsApp
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">
                    Seu Guardião da IA ainda não foi definido. Fale com sua CS para indicar quem será o responsável pela implementação de IA na sua empresa.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* O Conselho do Galdino — compacto */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.25 }}>
            <Card className="border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src="/galdino-foto.png"
                    alt="Galdino Rodrigues"
                    className="size-12 rounded-full object-cover object-top ring-2 ring-primary/30 shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                  />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">O Conselho do Galdino</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{conselho.tema}</p>
                  </div>
                </div>
                <blockquote className="text-[15px] font-bold tracking-tight text-foreground leading-snug">
                  “{conselho.frase}”
                </blockquote>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-2 mt-2 gap-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/5"
                  onClick={() => setConselho(conselhoAleatorio())}
                >
                  Próximo conselho
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Resultados do negócio — indicadores + gráfico (largura total) */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Resultados do seu negócio</p>
        <Card>
          <CardContent className="p-5 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Faturamento anual</p>
              <p className="text-xl font-bold tracking-tight text-foreground mt-1">
                {(() => { const s = scaleCurrency(metas.faturamento_anual); return <CountUp value={s.value} prefix={moedaPrefix} suffix={s.suffix} /> })()}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Meta 2026</p>
              <p className="text-xl font-bold tracking-tight text-foreground mt-1">
                {(() => { const s = scaleCurrency(metas.meta_2026); return <CountUp value={s.value} prefix={moedaPrefix} suffix={s.suffix} /> })()}
              </p>
              {metas.meta_2026 > 0 && (
                <p className="text-[10px] font-bold text-primary mt-0.5">
                  Faltam {(100 - (Math.round((metas.faturamento_anual / metas.meta_2026) * 100) || 0)).toFixed(1)}%
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Receita mensal</p>
              <p className="text-xl font-bold tracking-tight text-foreground mt-1">
                {(() => { const s = scaleCurrency(metas.receita_mensal); return <CountUp value={s.value} prefix={moedaPrefix} suffix={s.suffix} /> })()}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Colaboradores</p>
              <p className="text-xl font-bold tracking-tight text-foreground mt-1"><CountUp value={metas.colaboradores} /></p>
            </div>
          </CardContent>
        </Card>
        <GraficoFaturamentoMensal clientId={resolvedClientId} />
      </motion.div>
    </div>
  )
}
