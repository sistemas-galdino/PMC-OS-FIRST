import { Component, lazy, Suspense } from "react"
import type { ReactNode } from "react"
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { BackgroundShaderPaper } from "@/components/ui/background-shader-paper"

const LoginPage = lazy(() => import("@/pages/login"))
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"))
const MentoresPage = lazy(() => import("@/pages/mentores"))
const ClientesPage = lazy(() => import("@/pages/clientes"))
const AcessosPage = lazy(() => import("@/pages/acessos"))
const MapeamentoPage = lazy(() => import("@/pages/mapeamento"))
const IndicadoresPage = lazy(() => import("@/pages/indicadores"))
const AcoesPage = lazy(() => import("@/pages/acoes"))
const OnboardingPage = lazy(() => import("@/pages/onboarding"))
const ClientProfilePage = lazy(() => import("@/pages/client-profile"))
const ClientReunioesPage = lazy(() => import("@/pages/client-reunioes"))
const DefinirSenhaPage = lazy(() => import("@/pages/definir-senha"))
const AtivarContaPage = lazy(() => import("@/pages/ativar-conta"))
const RecuperarSenhaPage = lazy(() => import("@/pages/recuperar-senha"))
const TrocarSenhaPage = lazy(() => import("@/pages/trocar-senha"))
const CadastroPage = lazy(() => import("@/pages/cadastro"))
const ReuniaoDetalhePage = lazy(() => import("@/pages/reuniao-detalhe"))
const ReunioesGaldinoPage = lazy(() => import("@/pages/reunioes-galdino"))
const ReuniaoGaldinoDetalhePage = lazy(() => import("@/pages/reuniao-galdino-detalhe"))
const ReunioesBlackCRMPage = lazy(() => import("@/pages/reunioes-blackcrm"))
const ReuniaoBlackCRMDetalhePage = lazy(() => import("@/pages/reuniao-blackcrm-detalhe"))
const RecursosPage = lazy(() => import("@/pages/recursos"))
const FerramentasPage = lazy(() => import("@/pages/ferramentas"))
const PromptSupremoPage = lazy(() => import("@/pages/prompt-supremo"))
const CalendarioEncontrosPage = lazy(() => import("@/pages/calendario-encontros"))
const ConfiguracoesPage = lazy(() => import("@/pages/configuracoes"))
const AgendarPage = lazy(() => import("@/pages/agendar"))
const InicioPage = lazy(() => import("@/pages/inicio"))
const BalancoPage = lazy(() => import("@/pages/balanco"))
const RadarRenovacaoPage = lazy(() => import("@/pages/radar-renovacao"))
const NiveisPage = lazy(() => import("@/pages/niveis"))
const MetodoPage = lazy(() => import("@/pages/metodo"))
const RotinasPage = lazy(() => import("@/pages/rotinas"))
const NotificacoesPage = lazy(() => import("@/pages/notificacoes"))
const MeuDiaPage = lazy(() => import("@/pages/meu-dia"))
const MensagensPage = lazy(() => import("@/pages/mensagens"))
const TarefasPage = lazy(() => import("@/pages/tarefas"))
const NovidadesPage = lazy(() => import("@/pages/novidades"))
const RankingGuardioesPage = lazy(() => import("@/pages/ranking-guardioes"))
const LogsDownloadPage = lazy(() => import("@/pages/logs-download"))
const NovidadesAdminPage = lazy(() => import("@/pages/novidades-admin"))
const EstudosCasoPage = lazy(() => import("@/pages/estudos-caso"))
const EstudosCasoAdminPage = lazy(() => import("@/pages/estudos-caso-admin"))
const CanaisVendasPage = lazy(() => import("@/pages/canais-vendas"))
const MultiplicadoresPage = lazy(() => import("@/pages/multiplicadores"))
const MultiplicadoresAdminPage = lazy(() => import("@/pages/multiplicadores-admin"))
const SkillsPage = lazy(() => import("@/pages/skills"))
const SkillsAdminPage = lazy(() => import("@/pages/skills-admin"))
const RepositorioVitoriasPage = lazy(() => import("@/pages/repositorio-vitorias"))
const VitrinePage = lazy(() => import("@/pages/vitrine"))
const VitrineApresentarPage = lazy(() => import("@/pages/vitrine-apresentar"))
const VitrineCasePage = lazy(() => import("@/pages/vitrine-case"))
const VitrineCasesPage = lazy(() => import("@/pages/vitrine-cases"))
const VitrineClientesPage = lazy(() => import("@/pages/vitrine-clientes"))
const VitrineEvidenciasPage = lazy(() => import("@/pages/vitrine-evidencias"))
const VitrineOportunidadesPage = lazy(() => import("@/pages/vitrine-oportunidades"))
const VitoriasPage = lazy(() => import("@/pages/vitorias"))
const MeuTimePage = lazy(() => import("@/pages/meu-time"))
const TrilhasPage = lazy(() => import("@/pages/trilhas"))
const TrilhaEvidenciasPage = lazy(() => import("@/pages/trilha-evidencias"))
const InformacoesEmpresaPage = lazy(() => import("@/pages/informacoes-empresa"))
const RoadmapSistemasPage = lazy(() => import("@/pages/roadmap-sistemas"))
const CentralAtendimentosPage = lazy(() => import("@/pages/central-atendimentos"))
const CentralSucessoClientePage = lazy(() => import("@/pages/central-sucesso-cliente"))
const AtendimentoPublicoPage = lazy(() => import("@/pages/atendimento-publico"))
const FunisPage = lazy(() => import("@/pages/funis"))
const RespostasOnboardingPage = lazy(() => import("@/pages/respostas-onboarding"))
// CRM · CS Manager (port do sistema da Mayara) — uma aba por rota.
const CrmMeuDiaPage = lazy(() => import("@/pages/crm/meu-dia"))
const CrmAtividadesPage = lazy(() => import("@/pages/crm/atividades"))
const CrmClientesPage = lazy(() => import("@/pages/crm/clientes"))
const CrmAlertasPage = lazy(() => import("@/pages/crm/alertas"))
const CrmAtendimentoPage = lazy(() => import("@/pages/crm/atendimento"))
const CrmProjetosPage = lazy(() => import("@/pages/crm/projetos"))
const CrmVisaoGeralPage = lazy(() => import("@/pages/crm/visao-geral"))
const CrmTimePage = lazy(() => import("@/pages/crm/time"))
const CrmAcompanhamentoPage = lazy(() => import("@/pages/crm/acompanhamento"))
const CrmManualPage = lazy(() => import("@/pages/crm/manual"))
const AgentePage = lazy(() => import("@/pages/agente"))
const GuardiaoPage = lazy(() => import("@/pages/guardiao"))
const GuardiaoResponderPage = lazy(() => import("@/pages/guardiao-responder"))
const GuardiaoAdminPage = lazy(() => import("@/pages/guardiao-admin"))
const TimePermissoesPage = lazy(() => import("@/pages/time-permissoes"))
const InteligenciaNichoPage = lazy(() => import("@/pages/inteligencia-nicho"))

// Um deploy novo troca os hashes dos chunks JS e apaga os antigos do servidor.
// Se o navegador já tinha a página aberta de antes do deploy, o import()
// dinâmico de uma rota lazy tenta buscar um arquivo que não existe mais e
// rejeita — isso não é um bug de verdade, só uma sessão desatualizada.
const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed/i
const CHUNK_RELOAD_KEY = "pmc-chunk-reload"

// Error Boundary to catch any component crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidMount() {
    // Chegou até aqui sem erro: os chunks da sessão atual estão bons, então o
    // próximo erro de chunk (se vier) é um problema de verdade, não este aqui.
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("APP CRASH:", error, errorInfo)
    const msg = String(error?.message ?? error ?? "")
    if (CHUNK_ERROR_RE.test(msg) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "1")
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      const msg = String(this.state.error?.message ?? this.state.error ?? "")
      if (CHUNK_ERROR_RE.test(msg)) {
        // window.location.reload() já foi disparado no componentDidCatch — evita
        // piscar a tela de "CRITICAL ERROR" durante o instante até a página recarregar.
        return <PmcSpinner />
      }
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-10 text-center">
          <div className="size-20 bg-destructive/10 rounded-2xl flex items-center justify-center mb-8 border border-destructive/20">
            <h1 className="text-4xl font-bold text-destructive">!</h1>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">CRITICAL ERROR</h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto font-medium">Ocorreu um erro inesperado no sistema. Os detalhes técnicos foram registrados para nossa equipe.</p>
          <pre className="bg-muted/30 p-6 rounded-2xl border border-border text-muted-foreground text-xs overflow-auto max-w-2xl text-left mb-10 w-full">
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
          >
            Resetar e Tentar Novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function PmcSpinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="size-16 relative">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="font-bold tracking-[0.4em] text-sm text-foreground uppercase animate-pulse">
          PMC OS
        </div>
      </div>
    </div>
  )
}

// Guarda por seção (RBAC): precisa ser time E ter a seção liberada no papel.
function RequireSecao({ secao, children }: { secao: string; children: ReactNode }) {
  const { isAdmin, can } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return can(secao) ? <>{children}</> : <Navigate to="/" replace />
}

// /atendimento e /atendimento/:slug renderizam o MESMO componente, na mesma
// posição da árvore — o React reconcilia por tipo + posição, então trocar de
// consultor NÃO desmontava nada e o estado do wizard sobrevivia à navegação
// (inclusive o `sucesso`, que jogava a pessoa direto na tela de "agendamento
// confirmado" do agendamento anterior). A key força a remontagem: cada
// consultor começa o fluxo do zero.
function AtendimentoPublicoRota() {
  const { slug } = useParams<{ slug?: string }>()
  return <AtendimentoPublicoPage key={slug ?? "__lista__"} />
}

function AppRoutes() {
  const { session, isAdmin, needsPassword, needsOnboarding, loading, idCliente, papelEmpresa } = useAuth()
  // Portal do cliente: resolve a empresa (cliente legado OU 2º usuário vinculado).
  // Só passa quando NÃO é admin (admin usa clientId por rota/params). undefined
  // deixa a página cair no session.user.id (comportamento legado).
  const cid = !isAdmin && idCliente ? idCliente : undefined

  if (loading) return <PmcSpinner />

  return (
    <BrowserRouter>
      <Suspense fallback={<PmcSpinner />}>
        <Routes>
          <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" replace />} />
          <Route path="/definir-senha" element={<DefinirSenhaPage />} />
          <Route path="/ativar-conta" element={<AtivarContaPage />} />
          <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
          <Route path="/cadastro" element={session ? <CadastroPage session={session} /> : <Navigate to="/login" replace />} />
          <Route path="/atendimento" element={<AtendimentoPublicoRota />} />
          <Route path="/atendimento/:slug" element={<AtendimentoPublicoRota />} />
          <Route path="/guardiao/r/:token" element={<GuardiaoResponderPage />} />

          {/* Modo apresentação: FORA do DashboardLayout de propósito — sem menu,
              sem cabeçalho e sem o container max-w-7xl, porque esta tela é
              projetada ao vivo em reunião. Como o bloco externo não passa pelos
              guards implícitos do catch-all, o `session` vai explícito aqui. */}
          <Route
            path="/vitrine/apresentar"
            element={
              session ? (
                <RequireSecao secao="vitrine">
                  <VitrineApresentarPage />
                </RequireSecao>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/vitrine/apresentar/:caseId"
            element={
              session ? (
                <RequireSecao secao="vitrine">
                  <VitrineApresentarPage />
                </RequireSecao>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/*"
            element={session ? (
              (!isAdmin && needsPassword) ? <Navigate to="/definir-senha" replace /> :
              (!isAdmin && needsOnboarding) ? <Navigate to="/cadastro" replace /> : (
                <DashboardLayout isAdmin={isAdmin}>
                  <Routes>
                    {/* Home por pessoa: o Guardião opera o dia, o dono acompanha a jornada.
                        Cadências diferentes pedem portas de entrada diferentes. */}
                    <Route path="/" element={
                      isAdmin ? <AdminDashboard />
                        : <Navigate to={papelEmpresa === "guardiao" ? "/meu-dia" : "/inicio"} replace />
                    } />
                    <Route path="/inicio" element={<InicioPage session={session} clientId={cid} />} />
                    <Route path="/relatorio" element={<Navigate to="/balanco" replace />} />
                    <Route path="/balanco" element={<BalancoPage session={session} clientId={cid} />} />
                    <Route path="/niveis" element={<NiveisPage session={session} clientId={cid} />} />
                    <Route path="/metodo" element={<MetodoPage session={session} clientId={cid} />} />
                    <Route path="/meu-dia" element={<MeuDiaPage session={session} clientId={cid} />} />
                    <Route path="/rotinas" element={<RotinasPage session={session} clientId={cid} />} />
                    <Route path="/notificacoes" element={<NotificacoesPage session={session} clientId={cid} />} />
                    <Route path="/tarefas" element={<TarefasPage session={session} clientId={cid} />} />
                    <Route path="/novidades" element={<NovidadesPage session={session} clientId={cid} />} />
                    <Route path="/ranking-guardioes" element={<RankingGuardioesPage clientId={cid} />} />
                    <Route path="/novidades-admin" element={<RequireSecao secao="novidades-admin"><NovidadesAdminPage /></RequireSecao>} />
                    <Route path="/logs-download" element={<RequireSecao secao="logs-download"><LogsDownloadPage /></RequireSecao>} />
                    <Route path="/mensagens" element={<RequireSecao secao="mensagens"><MensagensPage /></RequireSecao>} />
                    <Route path="/inteligencia-nicho" element={<RequireSecao secao="inteligencia-nicho"><InteligenciaNichoPage /></RequireSecao>} />
                    <Route path="/estudos-caso" element={<EstudosCasoPage session={session} clientId={cid} />} />
                    <Route path="/estudos-caso-admin" element={<RequireSecao secao="estudos-caso-admin"><EstudosCasoAdminPage /></RequireSecao>} />
                    <Route path="/dashboard-2" element={<Navigate to="/" replace />} />
                    <Route path="/canais-vendas" element={<RequireSecao secao="canais-vendas"><CanaisVendasPage /></RequireSecao>} />
                    <Route path="/multiplicadores" element={<MultiplicadoresPage />} />
                    <Route path="/multiplicadores-admin" element={<RequireSecao secao="multiplicadores-admin"><MultiplicadoresAdminPage /></RequireSecao>} />
                    <Route path="/skills" element={<SkillsPage />} />
                    <Route path="/skills-admin" element={<RequireSecao secao="skills-admin"><SkillsAdminPage /></RequireSecao>} />
                    <Route path="/repositorio-vitorias" element={<RequireSecao secao="repositorio-vitorias"><RepositorioVitoriasPage /></RequireSecao>} />
                    <Route path="/vitrine" element={<RequireSecao secao="vitrine"><VitrinePage /></RequireSecao>} />
                    <Route path="/vitrine/case/:caseId" element={<RequireSecao secao="vitrine"><VitrineCasePage /></RequireSecao>} />
                    <Route path="/vitrine-cases" element={<RequireSecao secao="vitrine-cases"><VitrineCasesPage /></RequireSecao>} />
                    <Route path="/vitrine-clientes" element={<RequireSecao secao="vitrine-clientes"><VitrineClientesPage /></RequireSecao>} />
                    <Route path="/vitrine-evidencias" element={<RequireSecao secao="vitrine-evidencias"><VitrineEvidenciasPage /></RequireSecao>} />
                    <Route path="/vitrine-oportunidades" element={<RequireSecao secao="vitrine-oportunidades"><VitrineOportunidadesPage /></RequireSecao>} />
                    <Route path="/mentores" element={<RequireSecao secao="consultores"><MentoresPage isAdmin={isAdmin} /></RequireSecao>} />
                    <Route path="/clientes" element={<RequireSecao secao="clientes"><ClientesPage /></RequireSecao>} />
                    <Route path="/radar-renovacao" element={<RequireSecao secao="radar-renovacao"><RadarRenovacaoPage /></RequireSecao>} />
                    <Route path="/acessos" element={<RequireSecao secao="acessos"><AcessosPage /></RequireSecao>} />
                    <Route path="/mapeamento" element={<MapeamentoPage session={session} clientId={cid} />} />
                    <Route path="/produtos" element={<Navigate to="/mapeamento?tab=produtos" replace />} />
                    <Route path="/canais" element={<Navigate to="/mapeamento?tab=canais" replace />} />
                    <Route path="/indicadores" element={<IndicadoresPage session={session} clientId={cid} />} />
                    <Route path="/acoes" element={<AcoesPage session={session} clientId={cid} />} />
                    <Route path="/reunioes" element={<ClientReunioesPage session={session} clientId={cid} />} />
                    <Route path="/cliente/:id" element={<RequireSecao secao="clientes"><ClientProfilePage /></RequireSecao>} />
                    <Route path="/reuniao/:id" element={<ReuniaoDetalhePage isAdmin={isAdmin} />} />
                    <Route path="/reunioes-galdino" element={<ReunioesGaldinoPage session={session} isAdmin={isAdmin} />} />
                    <Route path="/reuniao-galdino/:id" element={<ReuniaoGaldinoDetalhePage isAdmin={isAdmin} />} />
                    <Route path="/reunioes-blackcrm" element={<ReunioesBlackCRMPage session={session} isAdmin={isAdmin} />} />
                    <Route path="/reuniao-blackcrm/:id" element={<ReuniaoBlackCRMDetalhePage isAdmin={isAdmin} />} />
                    <Route path="/recursos" element={<RecursosPage session={session} clientId={cid} />} />
                    <Route path="/ferramentas" element={<FerramentasPage session={session} forceAdmin={isAdmin} />} />
                    <Route path="/prompt-supremo" element={<PromptSupremoPage />} />
                    <Route path="/calendario" element={<CalendarioEncontrosPage isAdmin={isAdmin} />} />
                    <Route path="/onboarding" element={<RequireSecao secao="onboarding"><OnboardingPage /></RequireSecao>} />
                    <Route path="/configuracoes" element={<RequireSecao secao="configuracoes"><ConfiguracoesPage /></RequireSecao>} />
                    <Route path="/time-permissoes" element={<RequireSecao secao="permissoes"><TimePermissoesPage /></RequireSecao>} />
                    <Route path="/trocar-senha" element={<TrocarSenhaPage />} />
                    <Route path="/agendar" element={<AgendarPage />} />
                    <Route path="/vitorias" element={<VitoriasPage session={session} clientId={cid} />} />
                    <Route path="/meu-time" element={<MeuTimePage session={session} clientId={cid} />} />
                    <Route path="/trilhas" element={<TrilhasPage session={session} clientId={cid} />} />
                    <Route path="/trilhas/evidencias" element={<TrilhaEvidenciasPage session={session} clientId={cid} />} />
                    <Route path="/informacoes-empresa" element={<InformacoesEmpresaPage session={session} clientId={cid} />} />
                    <Route path="/roadmap-sistemas" element={<RequireSecao secao="roadmap-sistemas"><RoadmapSistemasPage /></RequireSecao>} />
                    <Route path="/central-atendimentos" element={<RequireSecao secao="central-atendimentos"><CentralAtendimentosPage /></RequireSecao>} />
                    <Route path="/central-sucesso-cliente" element={<RequireSecao secao="central-sucesso-cliente"><CentralSucessoClientePage /></RequireSecao>} />
                    <Route path="/funis" element={<RequireSecao secao="funis"><FunisPage /></RequireSecao>} />
                    <Route path="/respostas-onboarding" element={<RequireSecao secao="respostas-onboarding"><RespostasOnboardingPage /></RequireSecao>} />
                    {/* A aba única /crm foi substituída pelas 10 rotas abaixo. */}
                    <Route path="/crm" element={<Navigate to="/crm/meu-dia" replace />} />
                    <Route path="/crm/meu-dia" element={<RequireSecao secao="crm/meu-dia"><CrmMeuDiaPage /></RequireSecao>} />
                    <Route path="/crm/atividades" element={<RequireSecao secao="crm/atividades"><CrmAtividadesPage /></RequireSecao>} />
                    <Route path="/crm/clientes" element={<RequireSecao secao="crm/clientes"><CrmClientesPage /></RequireSecao>} />
                    <Route path="/crm/alertas" element={<RequireSecao secao="crm/alertas"><CrmAlertasPage /></RequireSecao>} />
                    <Route path="/crm/atendimento" element={<RequireSecao secao="crm/atendimento"><CrmAtendimentoPage /></RequireSecao>} />
                    <Route path="/crm/projetos" element={<RequireSecao secao="crm/projetos"><CrmProjetosPage /></RequireSecao>} />
                    <Route path="/crm/visao-geral" element={<RequireSecao secao="crm/visao-geral"><CrmVisaoGeralPage /></RequireSecao>} />
                    <Route path="/crm/time" element={<RequireSecao secao="crm/time"><CrmTimePage /></RequireSecao>} />
                    <Route path="/crm/acompanhamento" element={<RequireSecao secao="crm/acompanhamento"><CrmAcompanhamentoPage /></RequireSecao>} />
                    <Route path="/crm/manual" element={<RequireSecao secao="crm/manual"><CrmManualPage /></RequireSecao>} />
                    <Route path="/agente" element={<RequireSecao secao="agente"><AgentePage /></RequireSecao>} />
                    <Route path="/guardiao" element={<GuardiaoPage session={session} clientId={cid} hideTabList />} />
                    <Route path="/guardiao-admin" element={<RequireSecao secao="guardiao-admin"><GuardiaoAdminPage /></RequireSecao>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </DashboardLayout>
              )
            ) : <Navigate to="/login" replace />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BackgroundShaderPaper />
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
