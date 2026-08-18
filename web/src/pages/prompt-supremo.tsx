import { PageHeader } from "@/components/layout/page-header"
import { GeradorPromptSupremo } from "@/components/ferramentas/gerador-prompt-supremo"

export default function PromptSupremoPage() {
  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Prompt Supremo"
        description="Responda 3 perguntas e gere o prompt de elite (método Gauntlet-Loop) pronto para colar no Claude Code — fan out de subagentes, /loop e crítico implacável até ficar triplo A."
      />
      <GeradorPromptSupremo />
    </div>
  )
}
