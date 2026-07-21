import { iniciais } from "@/lib/atendimentos"

// Avatar do consultor: mostra a foto (avatar_url) quando existe, com fallback pra
// inicial. O `className` carrega tamanho/rounded/text-size de cada tela, então o
// visual (quadrado arredondado, círculo, etc.) é preservado por quem usa.
export function ConsultorAvatar({
  nome,
  url,
  className = "",
}: {
  nome: string
  url?: string | null
  className?: string
}) {
  if (url) {
    return <img src={url} alt={nome} loading="lazy" className={`${className} object-cover shrink-0`} />
  }
  return (
    <div className={`${className} bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0`}>
      {iniciais(nome)}
    </div>
  )
}
