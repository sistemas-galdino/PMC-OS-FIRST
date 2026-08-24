import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { Download, Inbox, Clock, Archive } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  SearchIcon as Search,
  BriefcaseIcon as Briefcase,
  CheckCircle2Icon as CheckCircle2,
  XIcon,
  CopyIcon,
  CheckIcon,
} from "@/components/ui/icons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  camposFaltando,
  LINK_REVISAO_ONBOARDING,
  type CampoObrigatorio,
} from "@/lib/onboarding-completude"
import { downloadCSV, type CSVColumn } from "@/lib/csv"
import { useAuth } from "@/lib/auth-context"

type OnboardingStatus = "enviado" | "em_andamento"

interface OnboardingRow {
  id_cliente: string
  pais: "BR" | "US" | null
  nome_completo: string | null
  genero: string | null
  email: string | null
  data_nascimento: string | null
  whatsapp: string | null
  endereco: string | null
  cep: string | null
  uf: string | null
  estado_civil: string | null
  faixa_etaria: string | null
  formacao_academica: string | null
  empresa_nome: string | null
  nicho: string | null
  descricao_negocio: string | null
  site: string | null
  instagram: string | null
  faturamento_anual: string | null
  numero_funcionarios: string | null
  numero_gestores: string | null
  desafios: string | null
  motivo_nao_superou: string | null
  referencias_posicionamento: string | null
  meta_12_meses: string | null
  expectativas: string | null
  motivo_impedimento: string | null
  como_conheceu: string | null
  motivo_entrada: string | null
  tres_entregas: string | null
  resultado_final: string | null
  expectativa_galdino: string | null
  ia_kpis: boolean | null
  ia_dashboard: boolean | null
  ia_processos: boolean | null
  ia_agentes: boolean | null
  ia_sistema: boolean | null
  ia_interesses: string[] | null
  ia_outro: string | null
  step_atual: number | null
  status: OnboardingStatus | null
  nivel_ia: number | null
  created_at: string | null
  updated_at: string | null
  enviado_em: string | null
}

interface ClienteRow {
  id_cliente: string
  id_entrada: number
  nome_cliente_formatado: string | null
  nome_empresa_formatado: string | null
  status_atual: string | null
  sc: string | null
  codigo_cliente: number | null
}

interface RespostaCompleta extends OnboardingRow {
  cliente: ClienteRow | null
}

// Formulário ANTIGO (clientes_formulario): respondido fora do PMC OS, antes do
// sistema existir. Perguntas diferentes das do wizard atual — não tem etapas,
// nem país, nem a seção de Maturidade em IA. Campos de contrato/fiscais
// (cpf, cnpj, razao_social, produto, canal_venda...) ficam de fora de propósito:
// são dados de contrato, não respostas do formulário.
interface FormularioAntigoRow {
  id_cliente: string
  nome: string | null
  genero: string | null
  email: string | null
  telefone: string | null
  data_nascimento: string | null
  estado_civil: string | null
  faixa_etaria: string | null
  formacao_academica: string | null
  nacionalidade: string | null
  profissao: string | null
  endereco: string | null
  estado: string | null
  empresa_nome: string | null
  nicho: string | null
  descricao: string | null
  site: string | null
  instagram: string[] | null
  numero_funcionarios: string | null
  cargos_gestao: string | null
  faturamento_atual: string | null
  meta_faturamento_12_meses: number | null
  referencia_posicionamento: string | null
  desafios: string | null
  motivo_impedimento: string | null
  como_conheceu: string | null
  motivo_entrada: string | null
  entregas_determinantes: string | null
  resultado_desejado: string | null
  ajuda_3_meses: string | null
  nome_empresa_formatado: string | null
  nome_cliente_formatado: string | null
  codigo_cliente: number | null
  created_at: string | null
}

interface FormularioAntigoCompleto extends FormularioAntigoRow {
  cliente: ClienteRow | null
}

type TabKey = "enviadas" | "em-andamento" | "formulario-antigo"

// Filtro de completude da aba "Enviadas": `status='enviado'` não garante
// formulário completo — a validação por etapa só entrou em 2026-07-31, então
// respostas antigas foram enviadas com perguntas em branco.
type CompletudeKey = "todas" | "incompletas" | "completas"

// Item aberto no painel lateral. As duas origens têm campos distintos, então o
// tipo discrimina qual mapa de seções usar.
type Selecionado =
  | { tipo: "novo"; row: RespostaCompleta }
  | { tipo: "antigo"; row: FormularioAntigoCompleto }

const STEP_LABELS = [
  "1. Dados do Responsável",
  "2. Dados do Negócio",
  "3. Estrutura da Empresa",
  "4. Diagnóstico Empresarial",
  "5. Expectativas no PMC",
  "6. Maturidade em IA",
] as const

// `descontinuada`: pergunta que saiu do formulário. Só aparece pra quem já
// respondeu — quem entrou depois nunca viu a pergunta, e mostrar "Não
// respondido" ali só faria o admin procurar uma lacuna que não existe.
const STEP_FIELDS: {
  label: string
  key: keyof OnboardingRow
  multiline?: boolean
  descontinuada?: boolean
}[][] = [
  [
    { label: "País", key: "pais" },
    { label: "Nome Completo", key: "nome_completo" },
    { label: "Gênero", key: "genero" },
    { label: "E-mail", key: "email" },
    { label: "Data de Nascimento", key: "data_nascimento" },
    { label: "WhatsApp / Telefone", key: "whatsapp" },
    { label: "Endereço", key: "endereco" },
    { label: "CEP / ZIP", key: "cep" },
    { label: "Estado (UF)", key: "uf" },
    { label: "Estado Civil", key: "estado_civil" },
    { label: "Faixa Etária", key: "faixa_etaria" },
    { label: "Formação Acadêmica", key: "formacao_academica" },
  ],
  [
    { label: "Empresa", key: "empresa_nome" },
    { label: "Nicho", key: "nicho" },
    { label: "Descrição do Negócio", key: "descricao_negocio", multiline: true },
    { label: "Site", key: "site" },
    { label: "Instagram", key: "instagram" },
  ],
  [
    { label: "Faturamento Anual", key: "faturamento_anual" },
    { label: "Nº de Funcionários", key: "numero_funcionarios" },
    { label: "Nº de Gestores", key: "numero_gestores" },
  ],
  [
    { label: "2 Principais Desafios", key: "desafios", multiline: true },
    { label: "Por que ainda não superou", key: "motivo_nao_superou", multiline: true },
    { label: "Referências de Posicionamento", key: "referencias_posicionamento" },
    { label: "Meta de Faturamento 12m", key: "meta_12_meses" },
  ],
  [
    { label: "Expectativas ao Entrar", key: "expectativas", multiline: true },
    { label: "Motivo que Quase Impediu", key: "motivo_impedimento", multiline: true, descontinuada: true },
    { label: "Como Conheceu o PMC", key: "como_conheceu" },
    { label: "Por que Decidiu Entrar", key: "motivo_entrada", multiline: true },
    { label: "3 Entregas Mais Importantes", key: "tres_entregas", multiline: true },
    { label: "Resultado Final Desejado", key: "resultado_final", multiline: true },
    { label: "O que Espera do Galdino (3m)", key: "expectativa_galdino", multiline: true },
  ],
  [
    { label: "Usa IA para KPIs?", key: "ia_kpis" },
    { label: "Usa IA em Dashboards?", key: "ia_dashboard" },
    { label: "Processos mapeados com IA?", key: "ia_processos" },
    { label: "Usa Agentes de IA?", key: "ia_agentes" },
    { label: "Sistemas integrados com IA?", key: "ia_sistema" },
    { label: "Conteúdos de Interesse", key: "ia_interesses" },
    { label: "Outro Interesse", key: "ia_outro", multiline: true },
  ],
]

// A base antiga guarda a data de nascimento como `date` — sem essa conversão o
// painel mostraria "1988-04-12". Fatiado na mão de propósito: `new Date()` numa
// data pura interpreta como UTC e volta um dia atrás no fuso do Brasil.
function fmtDataISOparaBR(v: unknown): unknown {
  if (typeof v !== "string") return v
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v
}

function fmtValorBRL(v: unknown): unknown {
  if (typeof v !== "number") return v
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

// Seções do formulário antigo. Mesmo formato de STEP_FIELDS, mas com título
// junto porque não há uma lista de etapas equivalente à do wizard.
const SECOES_ANTIGO: {
  titulo: string
  campos: {
    label: string
    key: keyof FormularioAntigoRow
    multiline?: boolean
    format?: (v: unknown) => unknown
  }[]
}[] = [
  {
    titulo: "Dados do Responsável",
    campos: [
      { label: "Nome", key: "nome" },
      { label: "Gênero", key: "genero" },
      { label: "E-mail", key: "email" },
      { label: "Telefone", key: "telefone" },
      { label: "Data de Nascimento", key: "data_nascimento", format: fmtDataISOparaBR },
      { label: "Estado Civil", key: "estado_civil" },
      { label: "Faixa Etária", key: "faixa_etaria" },
      { label: "Formação Acadêmica", key: "formacao_academica" },
      { label: "Nacionalidade", key: "nacionalidade" },
      { label: "Profissão", key: "profissao" },
      { label: "Endereço", key: "endereco" },
      { label: "Estado", key: "estado" },
    ],
  },
  {
    titulo: "Dados do Negócio",
    campos: [
      { label: "Empresa", key: "empresa_nome" },
      { label: "Nicho", key: "nicho" },
      { label: "Descrição do Negócio", key: "descricao", multiline: true },
      { label: "Site", key: "site" },
      { label: "Instagram", key: "instagram" },
    ],
  },
  {
    titulo: "Estrutura da Empresa",
    campos: [
      { label: "Nº de Funcionários", key: "numero_funcionarios" },
      { label: "Cargos de Gestão", key: "cargos_gestao", multiline: true },
      { label: "Faturamento Atual", key: "faturamento_atual" },
      { label: "Meta de Faturamento 12m", key: "meta_faturamento_12_meses", format: fmtValorBRL },
      { label: "Referência de Posicionamento", key: "referencia_posicionamento", multiline: true },
    ],
  },
  {
    titulo: "Diagnóstico e Expectativas",
    campos: [
      { label: "Principais Desafios", key: "desafios", multiline: true },
      { label: "Motivo que Quase Impediu", key: "motivo_impedimento", multiline: true },
      { label: "Como Conheceu o PMC", key: "como_conheceu" },
      { label: "Por que Decidiu Entrar", key: "motivo_entrada", multiline: true },
      { label: "Entregas Determinantes", key: "entregas_determinantes", multiline: true },
      { label: "Resultado Desejado", key: "resultado_desejado", multiline: true },
      { label: "Como o PMC Pode Ajudar (3m)", key: "ajuda_3_meses", multiline: true },
    ],
  },
]

// Colunas pedidas ao PostgREST — explícitas, pra não trazer cpf/cnpj/contrato.
const SELECT_ANTIGO = [
  "id_cliente",
  ...SECOES_ANTIGO.flatMap((s) => s.campos.map((c) => c.key as string)),
  "nome_empresa_formatado",
  "nome_cliente_formatado",
  "codigo_cliente",
  "created_at",
].join(", ")

// A tabela antiga tem 305 linhas, mas boa parte é cadastro só com nome (nunca
// respondeu). Só entra na aba quem tem ao menos uma resposta de verdade.
const CAMPOS_RESPOSTA_ANTIGO: (keyof FormularioAntigoRow)[] = [
  "desafios",
  "motivo_entrada",
  "resultado_desejado",
  "entregas_determinantes",
  "ajuda_3_meses",
  "motivo_impedimento",
  "como_conheceu",
]

function respondeuFormularioAntigo(r: FormularioAntigoRow): boolean {
  return CAMPOS_RESPOSTA_ANTIGO.some((k) => {
    const v = r[k]
    return v !== null && v !== undefined && String(v).trim() !== ""
  })
}

const CSV_COLUMNS: CSVColumn<RespostaCompleta>[] = [
  { key: "codigo_cliente", label: "Código Cliente", format: (r) => r.cliente?.codigo_cliente ?? "" },
  { key: "empresa_formatada", label: "Empresa (CRM)", format: (r) => r.cliente?.nome_empresa_formatado ?? "" },
  { key: "cliente_formatado", label: "Cliente (CRM)", format: (r) => r.cliente?.nome_cliente_formatado ?? "" },
  { key: "status_atual", label: "Status CRM", format: (r) => r.cliente?.status_atual ?? "" },
  { key: "sc", label: "CS Responsável", format: (r) => r.cliente?.sc ?? "" },
  { key: "status", label: "Status Onboarding" },
  { key: "step_atual", label: "Etapa Atual" },
  { key: "nivel_ia", label: "Nível IA" },
  { key: "enviado_em", label: "Enviado em" },
  { key: "created_at", label: "Criado em" },
  { key: "updated_at", label: "Atualizado em" },
  { key: "pais", label: "País" },
  { key: "nome_completo", label: "Nome Completo" },
  { key: "genero", label: "Gênero" },
  { key: "email", label: "E-mail" },
  { key: "data_nascimento", label: "Data de Nascimento" },
  { key: "whatsapp", label: "WhatsApp / Telefone" },
  { key: "endereco", label: "Endereço" },
  { key: "cep", label: "CEP / ZIP" },
  { key: "uf", label: "Estado (UF)" },
  { key: "estado_civil", label: "Estado Civil" },
  { key: "faixa_etaria", label: "Faixa Etária" },
  { key: "formacao_academica", label: "Formação Acadêmica" },
  { key: "empresa_nome", label: "Empresa - Nome" },
  { key: "nicho", label: "Nicho" },
  { key: "descricao_negocio", label: "Descrição do Negócio" },
  { key: "site", label: "Site" },
  { key: "instagram", label: "Instagram" },
  { key: "faturamento_anual", label: "Faturamento Anual" },
  { key: "numero_funcionarios", label: "Nº Funcionários" },
  { key: "numero_gestores", label: "Nº Gestores" },
  { key: "desafios", label: "Principais Desafios" },
  { key: "motivo_nao_superou", label: "Por que não superou" },
  { key: "referencias_posicionamento", label: "Referências de Posicionamento" },
  { key: "meta_12_meses", label: "Meta 12 meses" },
  { key: "expectativas", label: "Expectativas" },
  { key: "motivo_impedimento", label: "Motivo que quase impediu" },
  { key: "como_conheceu", label: "Como conheceu o PMC" },
  { key: "motivo_entrada", label: "Motivo de Entrada" },
  { key: "tres_entregas", label: "3 Entregas Mais Importantes" },
  { key: "resultado_final", label: "Resultado Final Desejado" },
  { key: "expectativa_galdino", label: "Expectativa do Galdino" },
  { key: "ia_kpis", label: "IA - KPIs" },
  { key: "ia_dashboard", label: "IA - Dashboard" },
  { key: "ia_processos", label: "IA - Processos" },
  { key: "ia_agentes", label: "IA - Agentes" },
  { key: "ia_sistema", label: "IA - Sistemas" },
  { key: "ia_interesses", label: "IA - Interesses" },
  { key: "ia_outro", label: "IA - Outro" },
]

// CSV do formulário antigo: colunas próprias (perguntas diferentes) + os dados
// do CRM, como no CSV das outras abas. Sem CPF/CNPJ/razão social.
const CSV_COLUMNS_ANTIGO: CSVColumn<FormularioAntigoCompleto>[] = [
  { key: "codigo_cliente", label: "Código Cliente", format: (r) => r.cliente?.codigo_cliente ?? r.codigo_cliente ?? "" },
  { key: "empresa_formatada", label: "Empresa (CRM)", format: (r) => r.cliente?.nome_empresa_formatado ?? r.nome_empresa_formatado ?? "" },
  { key: "cliente_formatado", label: "Cliente (CRM)", format: (r) => r.cliente?.nome_cliente_formatado ?? r.nome_cliente_formatado ?? "" },
  { key: "status_atual", label: "Status CRM", format: (r) => r.cliente?.status_atual ?? "" },
  { key: "sc", label: "CS Responsável", format: (r) => r.cliente?.sc ?? "" },
  { key: "created_at", label: "Respondido em" },
  { key: "nome", label: "Nome" },
  { key: "genero", label: "Gênero" },
  { key: "email", label: "E-mail" },
  { key: "telefone", label: "Telefone" },
  { key: "data_nascimento", label: "Data de Nascimento" },
  { key: "estado_civil", label: "Estado Civil" },
  { key: "faixa_etaria", label: "Faixa Etária" },
  { key: "formacao_academica", label: "Formação Acadêmica" },
  { key: "nacionalidade", label: "Nacionalidade" },
  { key: "profissao", label: "Profissão" },
  { key: "endereco", label: "Endereço" },
  { key: "estado", label: "Estado" },
  { key: "empresa_nome", label: "Empresa - Nome" },
  { key: "nicho", label: "Nicho" },
  { key: "descricao", label: "Descrição do Negócio" },
  { key: "site", label: "Site" },
  { key: "instagram", label: "Instagram" },
  { key: "numero_funcionarios", label: "Nº Funcionários" },
  { key: "cargos_gestao", label: "Cargos de Gestão" },
  { key: "faturamento_atual", label: "Faturamento Atual" },
  { key: "meta_faturamento_12_meses", label: "Meta 12 meses" },
  { key: "referencia_posicionamento", label: "Referências de Posicionamento" },
  { key: "desafios", label: "Principais Desafios" },
  { key: "motivo_impedimento", label: "Motivo que quase impediu" },
  { key: "como_conheceu", label: "Como conheceu o PMC" },
  { key: "motivo_entrada", label: "Motivo de Entrada" },
  { key: "entregas_determinantes", label: "Entregas Determinantes" },
  { key: "resultado_desejado", label: "Resultado Desejado" },
  { key: "ajuda_3_meses", label: "Como o PMC pode ajudar (3m)" },
]

function fmtDataBR(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function PaisBadge({ pais }: { pais: "BR" | "US" | null }) {
  if (!pais) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span>{pais === "BR" ? "🇧🇷" : "🇺🇸"}</span>
      {pais}
    </span>
  )
}

function FieldDisplay({
  label,
  value,
  multiline,
}: {
  label: string
  value: unknown
  multiline?: boolean
}) {
  let rendered: React.ReactNode
  if (value === null || value === undefined || value === "") {
    rendered = <span className="text-muted-foreground italic">Não respondido</span>
  } else if (typeof value === "boolean") {
    rendered = (
      <span
        className={
          value
            ? "inline-flex items-center gap-1.5 text-primary font-semibold"
            : "inline-flex items-center gap-1.5 text-muted-foreground"
        }
      >
        {value ? <CheckCircle2 className="size-4" /> : <XIcon className="size-4" />}
        {value ? "Sim" : "Não"}
      </span>
    )
  } else if (Array.isArray(value)) {
    rendered = (
      <div className="flex flex-wrap gap-1.5">
        {value.length === 0 ? (
          <span className="text-muted-foreground italic">Não respondido</span>
        ) : (
          value.map((v, i) => (
            <Badge key={i} variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[11px]">
              {String(v)}
            </Badge>
          ))
        )}
      </div>
    )
  } else if (multiline) {
    rendered = (
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{String(value)}</p>
    )
  } else {
    rendered = <p className="text-sm text-foreground">{String(value)}</p>
  }

  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2 border-b border-border/30 last:border-b-0">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pt-1">
        {label}
      </div>
      <div className="min-w-0">{rendered}</div>
    </div>
  )
}

// Acesso à página é controlado pelo RBAC na rota (RequireSecao
// secao="respostas-onboarding"). A exportação do CSV, por conter dados
// pessoais e financeiros de todos os clientes, é restrita a Super Admin.
export default function RespostasOnboardingPage() {
  return <RespostasOnboardingContent />
}

function RespostasOnboardingContent() {
  const { isSuperAdmin } = useAuth()
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get("tab") as TabKey | null) ?? "enviadas"
  const completude = (sp.get("completude") as CompletudeKey | null) ?? "todas"
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<RespostaCompleta[]>([])
  const [antigas, setAntigas] = useState<FormularioAntigoCompleto[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selected, setSelected] = useState<Selecionado | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  function setCompletude(k: CompletudeKey) {
    const next = new URLSearchParams(sp)
    if (k === "todas") next.delete("completude")
    else next.set("completude", k)
    setSp(next, { replace: true })
  }

  // O link é o mesmo pra todos — quem identifica o cliente é o login dele. O
  // ?revisar=1 é o que destrava o formulário pra quem já enviou (cadastro.tsx).
  const linkRevisao =
    (typeof window !== "undefined" ? window.location.origin : "") + LINK_REVISAO_ONBOARDING

  async function copiarLink(chave: string) {
    try {
      await navigator.clipboard.writeText(linkRevisao)
      setCopiado(chave)
      setTimeout(() => setCopiado((atual) => (atual === chave ? null : atual)), 2000)
    } catch {
      // Sem permissão de clipboard: o link fica visível no title do botão.
    }
  }

  function setTab(k: TabKey) {
    const next = new URLSearchParams(sp)
    next.set("tab", k)
    setSp(next, { replace: true })
    setSearchTerm("")
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [onbRes, cliRes, antRes] = await Promise.all([
        supabase
          .from("cliente_onboarding")
          .select("*")
          .order("updated_at", { ascending: false }),
        supabase
          .from("clientes_entrada_new")
          .select("id_cliente, id_entrada, nome_cliente_formatado, nome_empresa_formatado, status_atual, sc, codigo_cliente"),
        // Formulário antigo (pré-sistema). Base histórica: não muda, por isso
        // fica fora do realtime.
        supabase
          .from("clientes_formulario")
          .select(SELECT_ANTIGO)
          .order("created_at", { ascending: false }),
      ])

      if (cancelled) return

      const onboardings = (onbRes.data ?? []) as OnboardingRow[]
      const clientes = (cliRes.data ?? []) as ClienteRow[]
      const clienteByCliente = new Map<string, ClienteRow>()
      clientes.forEach((c) => {
        if (c.id_cliente) clienteByCliente.set(c.id_cliente, c)
      })

      const merged: RespostaCompleta[] = onboardings.map((o) => ({
        ...o,
        cliente: clienteByCliente.get(o.id_cliente) ?? null,
      }))

      const antigasMerged: FormularioAntigoCompleto[] = (
        (antRes.data ?? []) as unknown as FormularioAntigoRow[]
      )
        .filter(respondeuFormularioAntigo)
        .map((f) => ({ ...f, cliente: clienteByCliente.get(f.id_cliente) ?? null }))

      setRows(merged)
      setAntigas(antigasMerged)
      setLoading(false)
    }

    void load()

    const channel = supabase
      .channel("respostas-onboarding")
      .on("postgres_changes", { event: "*", schema: "public", table: "cliente_onboarding" }, () => {
        void load()
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const { enviadas, emAndamento } = useMemo(() => {
    const sent: RespostaCompleta[] = []
    const draft: RespostaCompleta[] = []
    rows.forEach((r) => {
      if (r.status === "enviado") sent.push(r)
      else if (r.status === "em_andamento") draft.push(r)
    })
    return { enviadas: sent, emAndamento: draft }
  }, [rows])

  // Perguntas obrigatórias em branco por cliente (só faz sentido pra enviadas —
  // quem está em andamento tem lacuna por definição).
  const faltandoPorCliente = useMemo(() => {
    const mapa = new Map<string, CampoObrigatorio[]>()
    enviadas.forEach((r) => mapa.set(r.id_cliente, camposFaltando(r as unknown as Record<string, unknown>)))
    return mapa
  }, [enviadas])

  const enviadasIncompletas = useMemo(
    () => enviadas.filter((r) => (faltandoPorCliente.get(r.id_cliente)?.length ?? 0) > 0),
    [enviadas, faltandoPorCliente],
  )

  const enviadasEscopo = useMemo(() => {
    if (completude === "incompletas") return enviadasIncompletas
    if (completude === "completas") {
      return enviadas.filter((r) => (faltandoPorCliente.get(r.id_cliente)?.length ?? 0) === 0)
    }
    return enviadas
  }, [enviadas, enviadasIncompletas, faltandoPorCliente, completude])

  const activeList = tab === "enviadas" ? enviadasEscopo : emAndamento

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return activeList
    return activeList.filter((r) => {
      const haystack = [
        r.cliente?.nome_empresa_formatado,
        r.cliente?.nome_cliente_formatado,
        r.empresa_nome,
        r.nome_completo,
        r.nicho,
        r.email,
        r.uf,
        r.endereco,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [activeList, searchTerm])

  const filteredAntigas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return antigas
    return antigas.filter((r) => {
      const haystack = [
        r.cliente?.nome_empresa_formatado,
        r.cliente?.nome_cliente_formatado,
        r.empresa_nome,
        r.nome,
        r.nicho,
        r.email,
        r.estado,
        r.endereco,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [antigas, searchTerm])

  // Quantas linhas o botão de exportar levaria na aba atual.
  const totalVisivel = tab === "formulario-antigo" ? filteredAntigas.length : filtered.length

  function exportCSV() {
    // O CSV leva dados pessoais e financeiros de todos os clientes — só Super Admin.
    if (!isSuperAdmin) return
    if (totalVisivel === 0) return
    const today = new Date().toISOString().slice(0, 10)
    if (tab === "formulario-antigo") {
      downloadCSV(`respostas-formulario-antigo-${today}.csv`, filteredAntigas, CSV_COLUMNS_ANTIGO)
      return
    }
    const suffix = tab === "enviadas" ? "enviadas" : "em-andamento"
    downloadCSV(`respostas-onboarding-${suffix}-${today}.csv`, filtered, CSV_COLUMNS)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-1/3 bg-card/40 rounded-xl" />
        <div className="h-[500px] w-full bg-card/40 rounded-2xl" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-10"
    >
      <div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1.5">PMC OS</div>
        <h1 className="text-4xl font-bold tracking-tight">Respostas de Onboarding</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Todas as respostas do formulário de onboarding dos clientes — as preenchidas
          dentro do PMC OS e as do formulário antigo, respondidas antes do sistema
          existir. Clique em qualquer linha pra ver as respostas completas, ou exporte
          em CSV.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-muted/10 p-6 rounded-2xl border border-border/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa, cliente, nicho, email..."
            className="pl-11 h-12 bg-background border-border focus-visible:border-primary/50 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {tab === "enviadas" && (
          <div className="w-full md:w-64">
            <Select value={completude} onValueChange={(v) => setCompletude(v as CompletudeKey)}>
              <SelectTrigger className="h-12 bg-background border-border focus:border-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as enviadas ({enviadas.length})</SelectItem>
                <SelectItem value="incompletas">
                  Com perguntas em branco ({enviadasIncompletas.length})
                </SelectItem>
                <SelectItem value="completas">
                  Completas ({enviadas.length - enviadasIncompletas.length})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          variant="outline"
          onClick={() => copiarLink("__barra__")}
          title={`Copiar o link pro cliente completar as respostas: ${linkRevisao}`}
          className="h-12 px-5 gap-2 text-xs font-bold uppercase tracking-wider"
        >
          {copiado === "__barra__" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          {copiado === "__barra__" ? "Link copiado" : "Copiar link do formulário"}
        </Button>
        <Button
          variant="outline"
          onClick={exportCSV}
          disabled={totalVisivel === 0 || !isSuperAdmin}
          title={
            isSuperAdmin
              ? "Exportar as respostas filtradas em CSV"
              : "Apenas Super Admin pode exportar as respostas"
          }
          className="h-12 px-5 gap-2 text-xs font-bold uppercase tracking-wider"
        >
          <Download className="size-4" />
          Exportar CSV ({totalVisivel})
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="w-full flex-wrap h-auto p-1">
          <TabsTrigger value="enviadas" className="flex-1 min-w-[160px]">
            <Inbox className="size-4" />
            Enviadas ({enviadas.length})
          </TabsTrigger>
          <TabsTrigger value="em-andamento" className="flex-1 min-w-[160px]">
            <Clock className="size-4" />
            Em andamento ({emAndamento.length})
          </TabsTrigger>
          <TabsTrigger value="formulario-antigo" className="flex-1 min-w-[160px]">
            <Archive className="size-4" />
            Formulário antigo ({antigas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enviadas" className="mt-6">
          <RespostasTable
            rows={filtered}
            kind="enviadas"
            onSelect={(r) => setSelected({ tipo: "novo", row: r })}
            faltandoPorCliente={faltandoPorCliente}
            copiado={copiado}
            onCopiarLink={copiarLink}
          />
        </TabsContent>

        <TabsContent value="em-andamento" className="mt-6">
          <RespostasTable
            rows={filtered}
            kind="em-andamento"
            onSelect={(r) => setSelected({ tipo: "novo", row: r })}
          />
        </TabsContent>

        <TabsContent value="formulario-antigo" className="mt-6">
          <FormularioAntigoTable
            rows={filteredAntigas}
            onSelect={(r) => setSelected({ tipo: "antigo", row: r })}
          />
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
        >
          {selected?.tipo === "novo" && (
            <>
              <SheetHeader className="border-b border-border/50 pb-4">
                <SheetTitle className="text-xl font-bold">
                  {selected.row.cliente?.nome_empresa_formatado ?? selected.row.empresa_nome ?? "—"}
                </SheetTitle>
                <SheetDescription className="flex flex-col gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selected.row.cliente?.nome_cliente_formatado ?? selected.row.nome_completo ?? "—"}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge
                      variant="outline"
                      className={
                        selected.row.status === "enviado"
                          ? "border-primary/30 text-primary bg-primary/10 text-[10px] font-bold uppercase tracking-wider"
                          : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10 text-[10px] font-bold uppercase tracking-wider"
                      }
                    >
                      {selected.row.status === "enviado" ? "Enviado" : `Em andamento — Etapa ${selected.row.step_atual ?? 1}`}
                    </Badge>
                    {selected.row.nicho && (
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                        {selected.row.nicho}
                      </Badge>
                    )}
                    <PaisBadge pais={selected.row.pais} />
                    {selected.row.cliente?.codigo_cliente != null && (
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                        Cód. {selected.row.cliente.codigo_cliente}
                      </Badge>
                    )}
                  </span>
                  {selected.row.enviado_em && (
                    <span className="text-[11px] text-muted-foreground pt-1">
                      Enviado em {fmtDataBR(selected.row.enviado_em)}
                    </span>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-6 space-y-6">
                {selected.row.status === "enviado" &&
                  (faltandoPorCliente.get(selected.row.id_cliente)?.length ?? 0) > 0 && (
                    <section className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                        {faltandoPorCliente.get(selected.row.id_cliente)!.length} pergunta(s) em branco
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {faltandoPorCliente
                          .get(selected.row.id_cliente)!
                          .map((c) => c.label)
                          .join(" · ")}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 h-9 gap-2 text-[10px] font-bold uppercase tracking-wider"
                        onClick={() => copiarLink(`sheet-${selected.row.id_cliente}`)}
                        title={linkRevisao}
                      >
                        {copiado === `sheet-${selected.row.id_cliente}` ? (
                          <CheckIcon className="size-3.5" />
                        ) : (
                          <CopyIcon className="size-3.5" />
                        )}
                        {copiado === `sheet-${selected.row.id_cliente}`
                          ? "Link copiado"
                          : "Copiar link pro cliente completar"}
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                        O link abre o formulário já preenchido e só nas etapas com pergunta em
                        aberto. Vale pra qualquer cliente — quem identifica é o login dele.
                      </p>
                    </section>
                  )}

                {STEP_LABELS.map((stepLabel, i) => (
                  <section key={stepLabel}>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">
                      {stepLabel}
                    </h3>
                    <div className="border border-border/50 rounded-xl bg-card/30 px-4">
                      {STEP_FIELDS[i]
                        .filter((field) => {
                          if (!field.descontinuada) return true
                          const v = (selected.row as RespostaCompleta)[field.key]
                          return v !== null && v !== undefined && String(v).trim() !== ""
                        })
                        .map((field) => (
                          <FieldDisplay
                            key={field.key}
                            label={
                              field.descontinuada
                                ? `${field.label} (pergunta descontinuada)`
                                : field.label
                            }
                            value={(selected.row as RespostaCompleta)[field.key]}
                            multiline={field.multiline}
                          />
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}

          {selected?.tipo === "antigo" && (
            <>
              <SheetHeader className="border-b border-border/50 pb-4">
                <SheetTitle className="text-xl font-bold">
                  {selected.row.cliente?.nome_empresa_formatado ??
                    selected.row.nome_empresa_formatado ??
                    selected.row.empresa_nome ??
                    "—"}
                </SheetTitle>
                <SheetDescription className="flex flex-col gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selected.row.cliente?.nome_cliente_formatado ??
                      selected.row.nome_cliente_formatado ??
                      selected.row.nome ??
                      "—"}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge
                      variant="outline"
                      className="border-sky-500/30 text-sky-400 bg-sky-500/10 text-[10px] font-bold uppercase tracking-wider"
                    >
                      Formulário antigo
                    </Badge>
                    {selected.row.nicho && (
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                        {selected.row.nicho}
                      </Badge>
                    )}
                    {(selected.row.cliente?.codigo_cliente ?? selected.row.codigo_cliente) != null && (
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                        Cód. {selected.row.cliente?.codigo_cliente ?? selected.row.codigo_cliente}
                      </Badge>
                    )}
                  </span>
                  <span className="text-[11px] text-muted-foreground pt-1">
                    Respondido em {fmtDataBR(selected.row.created_at)} — antes do PMC OS
                  </span>
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-6 space-y-6">
                {SECOES_ANTIGO.map((secao) => (
                  <section key={secao.titulo}>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">
                      {secao.titulo}
                    </h3>
                    <div className="border border-border/50 rounded-xl bg-card/30 px-4">
                      {secao.campos.map((field) => (
                        <FieldDisplay
                          key={field.key}
                          label={field.label}
                          value={
                            field.format
                              ? field.format((selected.row as FormularioAntigoCompleto)[field.key])
                              : (selected.row as FormularioAntigoCompleto)[field.key]
                          }
                          multiline={field.multiline}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  )
}

// Tabela do formulário antigo. Espelha RespostasTable, mas com as colunas que
// a base legada tem: não existe país nem etapa do wizard.
function FormularioAntigoTable({
  rows,
  onSelect,
}: {
  rows: FormularioAntigoCompleto[]
  onSelect: (r: FormularioAntigoCompleto) => void
}) {
  return (
    <div className="border border-border bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="border-b border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-6">
              Empresa / Cliente
            </TableHead>
            <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">
              Nicho
            </TableHead>
            <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">
              Faturamento
            </TableHead>
            <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">
              Respondido em
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-16 text-muted-foreground font-medium">
                Nenhuma resposta do formulário antigo.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow
                key={r.id_cliente}
                className="hover:bg-primary/5 border-b border-border/30 transition-colors cursor-pointer"
                onClick={() => onSelect(r)}
              >
                <TableCell className="py-5 px-6">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm text-foreground tracking-tight">
                      {r.cliente?.nome_empresa_formatado ?? r.nome_empresa_formatado ?? r.empresa_nome ?? "—"}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                      <Briefcase className="size-3 text-primary/60" />
                      {r.cliente?.nome_cliente_formatado ?? r.nome_cliente_formatado ?? r.nome ?? "—"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {r.nicho ? (
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                      {r.nicho}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-foreground font-medium">
                    {r.faturamento_atual ?? "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-foreground font-medium">
                    {fmtDataBR(r.created_at)}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// Quantas perguntas obrigatórias ficaram em branco + o link pro cliente
// completar. O link é igual pra todos (quem identifica é o login), mas o botão
// fica na linha porque é ali que o CS decide pra quem mandar.
function FaltandoCell({
  faltando,
  copiado,
  onCopiarLink,
}: {
  faltando: CampoObrigatorio[]
  copiado: boolean
  onCopiarLink?: () => void
}) {
  if (faltando.length === 0) {
    return (
      <Badge
        variant="outline"
        className="border-primary/30 text-primary bg-primary/10 text-[10px] font-bold uppercase tracking-wider"
      >
        Completo
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="border-orange-500/30 text-orange-400 bg-orange-500/10 text-[10px] font-bold uppercase tracking-wider"
        title={faltando.map((c) => c.label).join(" · ")}
      >
        {faltando.length} em branco
      </Badge>
      {onCopiarLink && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1.5 text-[10px] font-bold uppercase tracking-wider"
          title="Copiar o link pro cliente completar as respostas que faltam"
          onClick={(e) => {
            // A linha inteira abre o detalhe — copiar não deve abrir o painel.
            e.stopPropagation()
            onCopiarLink()
          }}
        >
          {copiado ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          {copiado ? "Copiado" : "Link"}
        </Button>
      )}
    </div>
  )
}

function RespostasTable({
  rows,
  kind,
  onSelect,
  faltandoPorCliente,
  copiado,
  onCopiarLink,
}: {
  rows: RespostaCompleta[]
  kind: "enviadas" | "em-andamento"
  onSelect: (r: RespostaCompleta) => void
  faltandoPorCliente?: Map<string, CampoObrigatorio[]>
  copiado?: string | null
  onCopiarLink?: (chave: string) => void
}) {
  return (
    <div className="border border-border bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="border-b border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-6">
              Empresa / Cliente
            </TableHead>
            <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">
              Nicho
            </TableHead>
            <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">
              País
            </TableHead>
            <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">
              {kind === "enviadas" ? "Enviado em" : "Etapa atual"}
            </TableHead>
            {kind === "enviadas" && (
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 pr-6">
                Respostas
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={kind === "enviadas" ? 5 : 4} className="text-center py-16 text-muted-foreground font-medium">
                {kind === "enviadas"
                  ? "Nenhuma resposta enviada ainda."
                  : "Nenhum cliente preenchendo o formulário no momento."}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow
                key={r.id_cliente}
                className="hover:bg-primary/5 border-b border-border/30 transition-colors cursor-pointer"
                onClick={() => onSelect(r)}
              >
                <TableCell className="py-5 px-6">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm text-foreground tracking-tight">
                      {r.cliente?.nome_empresa_formatado ?? r.empresa_nome ?? "—"}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                      <Briefcase className="size-3 text-primary/60" />
                      {r.cliente?.nome_cliente_formatado ?? r.nome_completo ?? "—"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {r.nicho ? (
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                      {r.nicho}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <PaisBadge pais={r.pais} />
                </TableCell>
                <TableCell>
                  {kind === "enviadas" ? (
                    <span className="text-xs text-foreground font-medium">
                      {fmtDataBR(r.enviado_em)}
                    </span>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10 text-[10px] font-bold uppercase tracking-wider"
                    >
                      Etapa {r.step_atual ?? 1} de 6
                    </Badge>
                  )}
                </TableCell>
                {kind === "enviadas" && (
                  <TableCell className="pr-6">
                    <FaltandoCell
                      faltando={faltandoPorCliente?.get(r.id_cliente) ?? []}
                      copiado={copiado === r.id_cliente}
                      onCopiarLink={onCopiarLink ? () => onCopiarLink(r.id_cliente) : undefined}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
