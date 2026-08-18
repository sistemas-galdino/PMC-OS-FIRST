import { useEffect, useRef, useState } from "react"
import { Camera, FileText, Image, Mic, Paperclip, Send, Smile, Trash2 } from "lucide-react"
import { ENVIO_HABILITADO } from "@/lib/crm/conversas"

/**
 * Compositor de mensagem do Atendimento.
 *
 * Enquanto `ENVIO_HABILITADO` for `false` — não há provedor de WhatsApp
 * conectado — os botões existem, mas não enviam: cada um explica o porquê no
 * tooltip. Deixar o campo funcional daria a impressão de que a mensagem saiu.
 */

const TOOLTIP = "conexão do WhatsApp pendente"

export function ChatComposer() {
  const [texto, setTexto] = useState("")
  const [menuAnexo, setMenuAnexo] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!gravando) return
    setSegundos(0)
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [gravando])

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = "auto"
    const linha = 20
    el.style.height = `${Math.min(el.scrollHeight, linha * 5 + 16)}px`
  }, [texto])

  const btn =
    "h-8 w-8 shrink-0 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
  const enviar = ENVIO_HABILITADO
    ? "h-8 w-8 shrink-0 grid place-items-center rounded-full bg-primary text-primary-foreground"
    : "h-8 w-8 shrink-0 grid place-items-center rounded-full bg-primary text-primary-foreground opacity-60 cursor-not-allowed"

  if (gravando) {
    const mm = String(Math.floor(segundos / 60)).padStart(2, "0")
    const ss = String(segundos % 60).padStart(2, "0")
    return (
      <div className="border-t border-border bg-card px-3 py-2.5 flex items-center gap-3">
        <button type="button" title="Cancelar gravação" onClick={() => setGravando(false)} className={btn}>
          <Trash2 className="h-4 w-4" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-status-red animate-pulse" />
          <span className="text-xs tabular-nums text-foreground">
            {mm}:{ss}
          </span>
          <span className="text-[11px] text-muted-foreground">Gravando…</span>
        </div>
        <button type="button" title={TOOLTIP} className={enviar} onClick={(e) => e.preventDefault()}>
          <Send className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-border bg-card px-3 py-2.5">
      <div className="flex items-end gap-1.5">
        <button type="button" title={TOOLTIP} className={btn}>
          <Smile className="h-[18px] w-[18px]" />
        </button>

        <div className="relative">
          <button type="button" title="Anexar" onClick={() => setMenuAnexo((v) => !v)} className={btn}>
            <Paperclip className="h-[18px] w-[18px]" />
          </button>
          {menuAnexo && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuAnexo(false)} />
              <div className="absolute bottom-10 left-0 z-20 w-52 rounded-lg border border-border bg-card py-1">
                {[
                  [FileText, "Documento"],
                  [Image, "Fotos e vídeos"],
                  [Camera, "Câmera"],
                ].map(([Icon, label]) => {
                  const I = Icon as typeof FileText
                  return (
                    <button
                      key={label as string}
                      type="button"
                      title={TOOLTIP}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground opacity-60 cursor-not-allowed"
                    >
                      <I className="h-4 w-4" />
                      {label as string}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <textarea
          ref={areaRef}
          rows={1}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Mensagem"
          className="flex-1 resize-none bg-background border border-border rounded-lg px-3 py-2 text-xs leading-5 focus:outline-none focus:border-primary max-h-[116px]"
        />

        {texto.trim() ? (
          <button type="button" title={TOOLTIP} className={enviar}>
            <Send className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" title="Gravar áudio" onClick={() => setGravando(true)} className={btn}>
            <Mic className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </div>
  )
}
