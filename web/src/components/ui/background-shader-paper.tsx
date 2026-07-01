import { GrainGradient } from "@paper-design/shaders-react"
import { useMemo } from "react"

/**
 * Background estilo paper-design (GrainGradient): fundo preto + manchas de cor
 * nos cantos + granulado nativo. Recolorido na paleta verde/lime do sistema.
 *
 * Mesmos parâmetros do exemplo de referência, só com as 3 cores trocadas pelo
 * verde da marca (lime #dafc67 + verdes vivos).
 */
export function BackgroundShaderPaper() {
  const colors = useMemo(
    () => [
      "hsl(75, 96%, 65%)", // Neon lime (#dafc67 — cor de marca)
      "hsl(150, 70%, 40%)", // Verde vivo
      "hsl(135, 65%, 50%)", // Verde grama
    ],
    []
  )

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-background">
      <GrainGradient
        style={{ height: "100%", width: "100%" }}
        colorBack="hsl(0, 0%, 0%)"
        softness={0.76}
        intensity={0.45}
        noise={0.5}
        shape="corners"
        offsetX={0}
        offsetY={0}
        scale={1}
        rotation={0}
        speed={1}
        colors={colors}
      />
    </div>
  )
}
