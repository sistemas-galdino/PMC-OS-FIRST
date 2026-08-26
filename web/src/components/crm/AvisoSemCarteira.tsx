// Acesso de CS que ainda não foi vinculado a uma carteira em Time & Permissões.
//
// Sem o vínculo o CRM não tem como saber de quem é a carteira. A escolha aqui é
// mostrar nada e explicar o motivo — antes o sistema chutava pelo papel e
// entregava a carteira da primeira CS em ordem alfabética para todas elas.
import { AlertCircleIcon } from "@/components/ui/icons"
import { useSessaoCrm } from "@/lib/crm/sessao"

export function AvisoSemCarteira() {
  const { semCarteira, carregando } = useSessaoCrm()
  if (carregando || !semCarteira) return null

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <AlertCircleIcon className="size-5 text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-[13px] font-bold text-foreground">
          Não identificamos a sua carteira
        </p>
        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
          O seu acesso ainda não foi vinculado a uma CS. Peça a um Super Admin para abrir
          <span className="font-semibold text-foreground"> Time &amp; Permissões</span> e
          escolher a carteira no seu cadastro — até lá o CRM não mostra clientes, para não
          exibir a carteira de outra pessoa.
        </p>
      </div>
    </div>
  )
}
