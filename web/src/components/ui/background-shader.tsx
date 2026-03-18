import { MeshGradient } from "@paper-design/shaders-react"
import { useMemo } from "react"

export function BackgroundShader() {
  // Brand colors extracted from system design
  // 1. Black (Dark base)
  // 2. Deep Forest Green (Dark contrast)
  // 3. Mid Green (Transition)
  // 4. Neon Lime (Highlight)
  const colors = useMemo(() => [
    "#000000", 
    "#121212", 
    "#1b4332", 
    "#dafc67"
  ], [])

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-background">
      <MeshGradient
        style={{ height: "100vh", width: "100vw", opacity: 0.6 }}
        distortion={0.3} // Subtle
        swirl={0.15}    // Calm
        offsetX={0}
        offsetY={0}
        scale={1.2}      // Slight zoom to avoid edges
        rotation={0}
        speed={0.2}     // Slow and relaxing
        colors={colors}
      />
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[100px]" />
    </div>
  )
}
