import { PageHeader, EmptyState } from "@/components/guardiao/ui-kit"

// Stub — será substituído pelo port real na Fase 1.
export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tarefas" subtitle="Em construção — portado na Fase 1." />
      <EmptyState title="Em construção" hint="Esta aba será portada em breve." />
    </div>
  )
}
