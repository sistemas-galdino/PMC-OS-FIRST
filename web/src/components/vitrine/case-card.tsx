// Card do case na vitrine.
//
// A hierarquia de leitura foi validada com a usuária no sistema original e não
// deve ser reordenada sem pedido explícito:
//   1. nicho do cliente (maior destaque editorial)
//   2. imagem/print do case
//   3. área impactada + uso de IA (informação secundária)
//   4. headline da transformação
//   5. empresa e cliente
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Sparkles2Icon as Sparkles, ArrowUpRightIcon as ArrowUpRight } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { exibivel, nomeEmpresa, type ShowcaseCase } from "@/lib/vitrine"
import { LogoCliente } from "./logo-cliente"

type Props = {
  c: ShowcaseCase
  className?: string
  /** Destino do card. O modo apresentação usa /vitrine/apresentar/:caseId. */
  to?: string
}

export function CaseCard({ c, className, to }: Props) {
  const nicho = exibivel(c.nicho)
  const area = exibivel(c.categoria)
  const ferramenta = exibivel(c.ferramenta_card)
  const headline = exibivel(c.headline_vitrine) || exibivel(c.headline_impacto)
  const pessoa = exibivel(c.cliente_nome)

  return (
    <Link
      to={to ?? `/vitrine/case/${encodeURIComponent(c.case_id)}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all",
        "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
        className
      )}
    >
      {/* 1. nicho do cliente — bloco de maior destaque */}
      <div className="bg-primary px-4 py-2.5">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground">
          {nicho ?? "Nicho a definir"}
        </span>
      </div>

      {/* 2. imagem/print do case */}
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-muted/40">
        {c.capa_url ? (
          <img
            src={c.capa_url}
            alt={headline ?? c.empresa_nome}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <LogoCliente
            empresa={c.empresa_nome}
            logoPath={c.logo_path}
            logoDisplayPath={c.logo_display_path}
            className="size-24"
            classeIniciais="text-3xl"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* 3. área impactada + IA (secundários) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {area && (
            <Badge variant="outline" className="text-[10px] font-medium">
              Área: {area}
            </Badge>
          )}
          {c.foco_ia && (
            <Badge variant="outline" className="gap-1 border-primary/40 text-[10px] font-medium text-primary">
              <Sparkles className="size-3" />
              IA
            </Badge>
          )}
          {ferramenta && (
            <Badge variant="secondary" className="text-[10px] font-medium">
              {ferramenta}
            </Badge>
          )}
        </div>

        {/* 4. transformação */}
        <p className="flex-1 text-sm font-semibold leading-snug text-foreground">
          {headline ?? "Transformação em validação"}
        </p>

        {/* 5. empresa e cliente */}
        <div className="flex items-center gap-2.5 border-t border-border pt-3">
          <LogoCliente
            empresa={c.empresa_nome}
            logoPath={c.logo_path}
            logoDisplayPath={c.logo_display_path}
            className="size-8 shrink-0"
            classeIniciais="text-[10px]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold tracking-wide text-foreground">
              {nomeEmpresa(c.empresa_nome)}
            </p>
            {pessoa && <p className="truncate text-[11px] text-muted-foreground">{pessoa}</p>}
          </div>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
        </div>
      </div>
    </Link>
  )
}
