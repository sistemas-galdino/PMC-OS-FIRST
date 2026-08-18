// Tela cheia nativa do browser (Fullscreen API) para o modo apresentação.
//
// Escutar 'fullscreenchange' não é detalhe: o usuário sai da tela cheia pelo Esc
// do próprio browser, sem passar por este código. Sem o listener, o ícone do
// botão passa a mentir sobre o estado.
import { useCallback, useEffect, useState } from "react"

type ElementoComPrefixo = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}
type DocumentoComPrefixo = Document & {
  webkitExitFullscreen?: () => Promise<void> | void
  webkitFullscreenElement?: Element | null
}

function estaCheia(): boolean {
  const d = document as DocumentoComPrefixo
  return Boolean(d.fullscreenElement ?? d.webkitFullscreenElement)
}

export function useTelaCheia(): { cheia: boolean; alternar: () => void } {
  const [cheia, setCheia] = useState(estaCheia)

  useEffect(() => {
    const sincronizar = () => setCheia(estaCheia())
    document.addEventListener("fullscreenchange", sincronizar)
    document.addEventListener("webkitfullscreenchange", sincronizar)
    return () => {
      document.removeEventListener("fullscreenchange", sincronizar)
      document.removeEventListener("webkitfullscreenchange", sincronizar)
    }
  }, [])

  // requestFullscreen rejeita se não vier de um gesto do usuário — chamar só a
  // partir de um onClick, e engolir a rejeição: perder a tela cheia é aceitável,
  // quebrar a apresentação no meio de uma reunião não.
  const alternar = useCallback(() => {
    const d = document as DocumentoComPrefixo
    const el = document.documentElement as ElementoComPrefixo
    // A recusa pode vir como exceção OU como Promise rejeitada, então trata as
    // duas: um try/catch sozinho deixaria passar um unhandled rejection.
    try {
      const r = estaCheia()
        ? (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.())
        : (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())
      if (r && typeof (r as Promise<void>).catch === "function") {
        void (r as Promise<void>).catch(() => {})
      }
    } catch {
      /* browser recusou a tela cheia — segue sem ela */
    }
  }, [])

  return { cheia, alternar }
}
