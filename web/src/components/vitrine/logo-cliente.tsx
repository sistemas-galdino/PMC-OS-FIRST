// Logo da empresa no card e na página do case. Sem logo (ou se a imagem
// quebrar), cai nas iniciais — é o fallback previsto no design original, não um
// estado de erro.
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { iniciais, urlLogo } from "@/lib/vitrine"

const BUCKET = "vitrine-logos"

type Props = {
  empresa: string
  logoPath?: string | null
  logoDisplayPath?: string | null
  className?: string
  classeIniciais?: string
}

export function LogoCliente({ empresa, logoPath, logoDisplayPath, className, classeIniciais }: Props) {
  const [quebrou, setQuebrou] = useState(false)
  const src = urlLogo(
    { logo_path: logoPath ?? null, logo_display_path: logoDisplayPath ?? null },
    (p) => supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl
  )

  if (!src || quebrou) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted font-bold tracking-tight text-muted-foreground",
          className,
          classeIniciais
        )}
        aria-label={empresa}
      >
        {iniciais(empresa)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={empresa}
      loading="lazy"
      onError={() => setQuebrou(true)}
      className={cn("rounded-lg bg-white/90 object-contain p-1", className)}
    />
  )
}
