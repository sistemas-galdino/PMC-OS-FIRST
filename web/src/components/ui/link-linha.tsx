import { Link } from "react-router-dom"

/**
 * Link que só "vale" no clique modificado.
 *
 * Serve para dar "abrir em nova guia" (botão direito, Cmd/Ctrl+clique, clique
 * do meio) a um texto dentro de uma linha de tabela cujo clique esquerdo tem
 * outro dono — normalmente a própria linha, que abre uma gaveta. No clique
 * simples ele cancela a navegação e deixa o evento subir para o container.
 */
export function LinkLinha({
  to,
  className,
  children,
}: {
  to: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={className}
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) e.preventDefault()
      }}
    >
      {children}
    </Link>
  )
}

/**
 * Vira <Link> quando existe destino e <div> quando não existe, mantendo as
 * mesmas classes. Serve para lista/card cujo item pode não ter para onde ir
 * (ex.: cliente sem id_cliente) — antes esses casos eram button disabled.
 */
export function LinkOuDiv({
  to,
  className,
  children,
}: {
  to: string | null | undefined
  className?: string
  children: React.ReactNode
}) {
  if (!to) return <div className={className}>{children}</div>
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  )
}

/**
 * Link invisível que cobre o container inteiro — que precisa ser `relative`.
 * Dá href de verdade (e portanto "abrir em nova guia") a um card que já navega
 * pelo onClick, sem reestruturar o JSX nem aninhar <a> em volta de conteúdo
 * que possa ter outros elementos interativos.
 */
export function LinkCobrindo({ to, label }: { to: string; label: string }) {
  return <Link to={to} aria-label={label} className="absolute inset-0 z-10 rounded-[inherit]" />
}
