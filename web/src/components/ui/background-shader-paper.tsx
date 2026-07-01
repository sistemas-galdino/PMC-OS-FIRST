import { GrainGradient } from "@paper-design/shaders-react"
import { useMemo } from "react"

/**
 * Background estilo paper-design (GrainGradient): fundo preto + manchas de cor
 * nos cantos, na paleta verde/lime do sistema, + uma camada de grão de filme
 * por cima cobrindo a tela inteira.
 *
 * Obs: o grão do próprio GrainGradient só aparece nas transições de cor (ele é
 * somado ao `shape`, que satura nas áreas chapadas). O granulado visível no
 * fundo todo vem da camada `feTurbulence` sobreposta — ajuste a intensidade via
 * a `opacity` dessa camada.
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

      {/* Camada de grão de filme — cobre a tela toda (o grão do shader só pega
          nas transições de cor). Suba/baixe a opacity pra mais/menos grão. */}
      <svg
        className="absolute inset-0 h-full w-full opacity-55 mix-blend-screen"
        aria-hidden="true"
      >
        <filter id="bg-film-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.4"
            numOctaves={4}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-film-grain)" />
      </svg>
    </div>
  )
}
