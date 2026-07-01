import { MeshGradient } from "@paper-design/shaders-react"
import { useMemo } from "react"

/**
 * Variante "paper-design" (estilo 21st.dev moazamtrade) recolorida na paleta
 * verde/lime do sistema. Mais vibrante que o BackgroundShader padrão:
 * dois MeshGradient sobrepostos + grão + ruído SVG.
 *
 * Reproduz o look "vidro/wireframe" do original sem o prop `wireframe`
 * (inexistente na @paper-design/shaders-react 0.0.72) usando um 2º gradiente
 * em mix-blend-screen com velocidade diferente (parallax).
 */
export function BackgroundShaderPaper() {
  // Camada base: preto → verde profundo → verde floresta → lime neon
  const baseColors = useMemo(
    () => ["#000000", "#0a1f14", "#1b4332", "#dafc67"],
    []
  )

  // Camada highlight: lime mais presente, extremos em preto pra dar profundidade
  const glowColors = useMemo(
    () => ["#000000", "#2d6a4f", "#dafc67", "#000000"],
    []
  )

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-background">
      {/* Camada 1 — base animada */}
      <MeshGradient
        style={{ position: "absolute", inset: 0, height: "100%", width: "100%" }}
        distortion={0.55}
        swirl={0.35}
        offsetX={0}
        offsetY={0}
        scale={1.1}
        rotation={0}
        speed={0.3}
        grainOverlay={0.12}
        colors={baseColors}
      />

      {/* Camada 2 — highlight lime, blend screen + parallax (velocidade diferente) */}
      <MeshGradient
        style={{
          position: "absolute",
          inset: 0,
          height: "100%",
          width: "100%",
          opacity: 0.5,
          mixBlendMode: "screen",
        }}
        distortion={0.4}
        swirl={0.5}
        offsetX={0}
        offsetY={0}
        scale={1.25}
        rotation={0}
        speed={0.18}
        colors={glowColors}
      />

      {/* Grão/vidro — ruído SVG sutil pra textura "paper" */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.06] mix-blend-overlay"
        aria-hidden="true"
      >
        <filter id="bg-paper-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves={2}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-paper-noise)" />
      </svg>

      {/* Vinheta/legibilidade — mais leve que o shader padrão pra deixar o verde aparecer */}
      <div className="absolute inset-0 bg-background/10 backdrop-blur-[40px]" />
    </div>
  )
}
