// Trocador de empresa do painel do cliente.
//
// Aparece SÓ para quem alcança mais de uma empresa — o caso do sócio cujo e-mail
// foi liberado em `emails_multi_empresa`. Para todo mundo (a esmagadora maioria)
// o componente não renderiza nada, então nenhuma UI nova surge no caminho deles.
//
// Deixar a empresa ativa sempre visível não é enfeite: praticamente todo dado do
// painel é filtrado por meu_id_cliente() no banco, e é aqui que a pessoa confere
// em qual empresa está gravando.
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2Icon as Building, ChevronRightIcon as ChevronRight, CheckIcon as Check } from "@/components/ui/icons"
import { toast } from "sonner"

export function EmpresaSwitcher() {
  const { empresas, idCliente, trocarEmpresa } = useAuth()
  const [trocando, setTrocando] = useState(false)

  if (empresas.length <= 1) return null

  const atual = empresas.find((e) => e.id_cliente === idCliente) ?? empresas[0]

  async function selecionar(id: string) {
    if (id === idCliente || trocando) return
    setTrocando(true)
    try {
      await trocarEmpresa(id)
    } catch (e) {
      toast.error((e as Error)?.message ?? "Não foi possível trocar de empresa.")
    } finally {
      setTrocando(false)
    }
  }

  return (
    <div className="mt-3 group-data-[collapsible=icon]:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={trocando}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/10 px-2.5 py-2 text-left transition-colors hover:bg-muted/20 disabled:opacity-60"
        >
          <Building className="size-4 shrink-0 text-primary" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Empresa
            </span>
            <span className="truncate text-xs font-bold text-foreground">
              {atual?.nome_empresa ?? "—"}
            </span>
          </span>
          <ChevronRight className="ml-auto size-3.5 shrink-0 rotate-90 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Trocar de empresa
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {empresas.map((e) => {
            const ativa = e.id_cliente === idCliente
            return (
              <DropdownMenuItem
                key={e.id_cliente}
                onClick={() => selecionar(e.id_cliente)}
                className="flex items-start gap-2"
              >
                <Check className={`mt-0.5 size-3.5 shrink-0 ${ativa ? "text-primary" : "opacity-0"}`} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-bold">{e.nome_empresa ?? "—"}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {e.codigo_cliente != null ? `Cód. ${e.codigo_cliente}` : "sem código"}
                  </span>
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
