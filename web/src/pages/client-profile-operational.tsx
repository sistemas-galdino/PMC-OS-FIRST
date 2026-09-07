// Visão Operacional: o painel do cliente, visto pelo admin, dentro de /cliente/:id.
//
// A lista de abas NÃO é escrita aqui. Ela vem de secoes_cliente_catalogo — a
// mesma tabela que alimenta a aba Time & Permissões do dono. Toda seção nova do
// painel é obrigada a nascer lá (senão o dono não consegue liberá-la), então
// ancorar nela é o que impede esta tela de envelhecer: por três meses ela foi
// uma lista fixa de 14 abas enquanto o painel passava para 28.
//
// O que esta tela precisa manter à mão é só o mapa chave -> componente (REGISTRO).
// Chave sem componente aparece como aba com aviso, em vez de sumir calada.
import { lazy, Suspense, useMemo, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

const InicioPage = lazy(() => import("@/pages/inicio"))
const InformacoesEmpresaPage = lazy(() => import("@/pages/informacoes-empresa"))
const MapeamentoPage = lazy(() => import("@/pages/mapeamento"))
const IndicadoresPage = lazy(() => import("@/pages/indicadores"))
const MetodoPage = lazy(() => import("@/pages/metodo"))
const AcoesPage = lazy(() => import("@/pages/acoes"))
const MeuTimePage = lazy(() => import("@/pages/meu-time"))
const GuardiaoPage = lazy(() => import("@/pages/guardiao"))
const MeuDiaPage = lazy(() => import("@/pages/meu-dia"))
const RotinasPage = lazy(() => import("@/pages/rotinas"))
const TarefasPage = lazy(() => import("@/pages/tarefas"))
const BalancoPage = lazy(() => import("@/pages/balanco"))
const NiveisPage = lazy(() => import("@/pages/niveis"))
const VitoriasPage = lazy(() => import("@/pages/vitorias"))
const ClientReunioesPage = lazy(() => import("@/pages/client-reunioes"))
const ReunioesGaldinoPage = lazy(() => import("@/pages/reunioes-galdino"))
const ReunioesBlackCRMPage = lazy(() => import("@/pages/reunioes-blackcrm"))
const NovidadesPage = lazy(() => import("@/pages/novidades"))
const RankingGuardioesPage = lazy(() => import("@/pages/ranking-guardioes"))
const TrilhasPage = lazy(() => import("@/pages/trilhas"))
const EstudosCasoPage = lazy(() => import("@/pages/estudos-caso"))
const MultiplicadoresPage = lazy(() => import("@/pages/multiplicadores"))
const SkillsPage = lazy(() => import("@/pages/skills"))
const CalendarioEncontrosPage = lazy(() => import("@/pages/calendario-encontros"))
const RecursosPage = lazy(() => import("@/pages/recursos"))
const FerramentasPage = lazy(() => import("@/pages/ferramentas"))
const PromptSupremoPage = lazy(() => import("@/pages/prompt-supremo"))

interface Secao {
  chave: string
  label: string
  grupo: string | null
  ordem: number
}

/** Seções do catálogo que não fazem sentido para o admin. */
const FORA_DA_VISAO = new Set([
  // get_meus_acessos_empresa() resolve a empresa por meu_id_cliente() e recusa
  // quem não é dono: para o admin é erro garantido. A gestão dele é /acessos.
  "acessos-empresa",
])

type Ctx = { clientId: string; isAdmin: boolean }

// Escopo: sempre clientId explícito. As páginas fazem `clientId || session.user.id`
// e o admin não tem meu_id_cliente() — sem a prop elas cairiam no login DELE.
//
// `visaoAdmin` é separado de propósito e NÃO se deduz de clientId: o portal do
// cliente também recebe clientId (App.tsx passa clientId={cid}). Ele marca as
// páginas cuja escrita/leitura sai por auth.uid() — curtida, comentário, view,
// streak, conquista — que aqui sairiam no nome do admin.
const REGISTRO: Record<string, (c: Ctx) => ReactNode> = {
  "inicio":              ({ clientId }) => <InicioPage clientId={clientId} />,
  "informacoes-empresa": ({ clientId }) => <InformacoesEmpresaPage clientId={clientId} />,
  "mapeamento":          ({ clientId }) => <MapeamentoPage clientId={clientId} />,
  "indicadores":         ({ clientId }) => <IndicadoresPage clientId={clientId} />,
  "metodo":              ({ clientId }) => <MetodoPage clientId={clientId} />,
  "acoes":               ({ clientId }) => <AcoesPage clientId={clientId} />,
  "meu-time":            ({ clientId }) => <MeuTimePage clientId={clientId} />,
  // adminView desliga a criação de convite, que roda por auth.uid() e cairia na
  // "empresa" do admin. Sem hideTabList a página mostra as próprias abas.
  "guardiao":            ({ clientId }) => <GuardiaoPage clientId={clientId} adminView />,
  "meu-dia":             ({ clientId }) => <MeuDiaPage clientId={clientId} visaoAdmin />,
  "rotinas":             ({ clientId }) => <RotinasPage clientId={clientId} />,
  "tarefas":             ({ clientId }) => <TarefasPage clientId={clientId} />,
  "balanco":             ({ clientId }) => <BalancoPage clientId={clientId} />,
  "niveis":              ({ clientId }) => <NiveisPage clientId={clientId} visaoAdmin />,
  "vitorias":            ({ clientId }) => <VitoriasPage clientId={clientId} />,
  "reunioes":            ({ clientId }) => <ClientReunioesPage clientId={clientId} />,
  // isAdmin libera o toggle de presença, igual à rota real de admin.
  "reunioes-galdino":    ({ clientId, isAdmin }) => <ReunioesGaldinoPage clientId={clientId} isAdmin={isAdmin} />,
  "reunioes-blackcrm":   ({ clientId, isAdmin }) => <ReunioesBlackCRMPage clientId={clientId} isAdmin={isAdmin} />,
  "novidades":           ({ clientId }) => <NovidadesPage clientId={clientId} visaoAdmin />,
  "ranking-guardioes":   ({ clientId }) => <RankingGuardioesPage clientId={clientId} visaoAdmin />,
  "trilhas":             ({ clientId }) => <TrilhasPage clientId={clientId} embedded />,
  "estudos-caso":        ({ clientId }) => <EstudosCasoPage clientId={clientId} visaoAdmin />,
  // Catálogos globais: iguais para todo cliente, não recebem id.
  "multiplicadores":     () => <MultiplicadoresPage />,
  "skills":              () => <SkillsPage />,
  "prompt-supremo":      () => <PromptSupremoPage />,
  "calendario":          ({ isAdmin }) => <CalendarioEncontrosPage isAdmin={isAdmin} />,
  "recursos":            ({ clientId }) => <RecursosPage clientId={clientId} forceAdmin />,
  "ferramentas":         () => <FerramentasPage forceAdmin />,
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6">
      <p className="text-sm font-medium text-muted-foreground">{children}</p>
    </div>
  )
}

export default function ClientProfileOperational({ clientId }: { clientId: string }) {
  const { isAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: secoes, isLoading, isError } = useQuery({
    queryKey: ["secoes-cliente-catalogo"],
    staleTime: 30 * 60 * 1000,   // catálogo praticamente estático
    queryFn: async (): Promise<Secao[]> => {
      const { data, error } = await supabase
        .from("secoes_cliente_catalogo")
        .select("chave, label, grupo, ordem")
        .order("ordem")
      if (error) throw error
      return ((data ?? []) as Secao[]).filter((s) => !FORA_DA_VISAO.has(s.chave))
    },
  })

  // Agrupado preservando a ordem do catálogo — o `ordem` já vem em blocos por
  // grupo (100s Meu Negócio, 200s Execução...), então a 1ª aparição manda.
  const grupos = useMemo(() => {
    const out: { nome: string; itens: Secao[] }[] = []
    for (const s of secoes ?? []) {
      const nome = s.grupo ?? ""
      const g = out.find((x) => x.nome === nome)
      if (g) g.itens.push(s)
      else out.push({ nome, itens: [s] })
    }
    return out
  }, [secoes])

  // ?op= e não ?aba=: a Visão Admin usa ?aba= na mesma URL e tem chaves
  // homônimas (vitorias, balanco) — compartilhar o parâmetro faria uma visão
  // sequestrar a aba da outra ao alternar o modo.
  const raw = searchParams.get("op")
  const ativa = (secoes ?? []).some((s) => s.chave === raw) ? raw! : (secoes?.[0]?.chave ?? "")

  const trocar = (chave: string) => {
    const p = new URLSearchParams(searchParams)
    p.set("op", chave)
    setSearchParams(p, { replace: true })
  }

  if (isLoading) return <div className="h-24 animate-pulse rounded-xl bg-card/40" />
  if (isError || !secoes?.length) {
    return <Aviso>Não consegui carregar as seções do painel do cliente. Recarregue a página.</Aviso>
  }

  const render = REGISTRO[ativa]

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        {grupos.map((g) => (
          <div key={g.nome} className="flex flex-wrap items-center gap-2">
            {g.nome && (
              <span className="w-full shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:w-36">
                {g.nome}
              </span>
            )}
            {g.itens.map((s) => (
              <Button
                key={s.chave}
                variant={ativa === s.chave ? "default" : "outline"}
                size="sm"
                className="h-9 px-4 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all"
                onClick={() => trocar(s.chave)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        ))}
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-card/40" />}>
        {render
          ? render({ clientId, isAdmin })
          : <Aviso>Esta seção existe no painel do cliente, mas ainda não tem uma tela nesta visão.</Aviso>}
      </Suspense>
    </div>
  )
}
