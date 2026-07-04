import { useStore } from "@/lib/guardiao"
import { PageHeader, StatCard } from "@/components/guardiao/ui-kit"

// Painel de Controle do Guardião (versão núcleo — prova a camada de dados ponta a ponta).
// Será expandido no port completo (Fase 1).
export default function Painel() {
  const setores = useStore((s) => s.setores)
  const projetos = useStore((s) => s.projetos)
  const tarefas = useStore((s) => s.tarefas)
  const gargalos = useStore((s) => s.gargalos)
  const vitorias = useStore((s) => s.vitorias)
  const evidencias = useStore((s) => s.evidencias)
  const jornada = useStore((s) => s.jornada)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel de Controle do Guardião"
        subtitle="Visão geral da sua implementação de IA na empresa."
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Setores" value={setores.length} />
        <StatCard label="Projetos" value={projetos.length} />
        <StatCard label="Tarefas" value={tarefas.length} />
        <StatCard label="Gargalos" value={gargalos.length} />
        <StatCard label="Vitórias" value={vitorias.length} />
        <StatCard label="Evidências" value={evidencias.length} />
        <StatCard label="Fase atual" value={jornada.faseAtual} />
      </div>
    </div>
  )
}
