// "Vendo: todas as CS / Bruna / Francielly…" — o recorte de carteira da
// coordenação, fixo no topo enquanto se navega pelo CRM.
//
// O mecanismo (`visaoCs` em lib/crm/sessao.ts) já existia, mas só era acionado
// clicando numa CS na Visão Geral e sumia no refresh, sem nada na tela dizendo
// qual visão estava ativa. Aqui ele vira um controle explícito e persistente.
//
// Some para quem é CS: a visão dela é a carteira dela, não uma escolha.
import { useSessaoCrm } from "@/lib/crm/sessao"
import { useCsList } from "@/lib/crm/equipe"
import type { CSName } from "@/lib/crm/types"

export function SeletorVisaoCs() {
  const { isCoordenacao, csEmFoco, setVisaoCs, carregando } = useSessaoCrm()
  const csList = useCsList()

  if (!isCoordenacao || carregando || csList.length === 0) return null

  return (
    <select
      value={csEmFoco ?? ""}
      onChange={(e) => setVisaoCs((e.target.value || null) as CSName | null)}
      title="Recorte de carteira: vale para todas as abas do CRM"
      className="rounded-lg bg-background/20 backdrop-blur-md border border-border/50 px-3 py-1.5 text-[12px] font-semibold text-foreground shadow-lg"
    >
      <option value="">Vendo: todas as CS</option>
      {csList.map((cs) => (
        <option key={cs} value={cs}>
          Vendo: {cs}
        </option>
      ))}
    </select>
  )
}
