// Banner de ambiente: alerta visual quando o app NÃO está em produção.
// Controlado por VITE_APP_ENV (definido em .env.development.local como "dev").
// Em produção a variável é ausente/"producao", então nada é renderizado.
const APP_ENV = import.meta.env.VITE_APP_ENV as string | undefined

export function AmbienteBanner() {
  if (!APP_ENV || APP_ENV === "producao" || APP_ENV === "production") return null

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-2 z-[9999] -translate-x-1/2"
      aria-hidden
    >
      <div className="flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-400/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-black shadow-lg shadow-black/30">
        <span className="size-1.5 animate-pulse rounded-full bg-black/70" />
        Ambiente {APP_ENV}
      </div>
    </div>
  )
}
