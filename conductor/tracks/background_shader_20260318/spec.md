# Specification: Global Mesh Gradient Background

## Overview
Implement a high-performance, animated mesh gradient background across the entire application using the `@paper-design/shaders-react` library. The background will replace the current static background with a dynamic, premium aesthetic that aligns with the system's "Neon Lime" and "Dark" brand identity.

## Functional Requirements
- **Global Integration:** The background must be visible on all pages, typically integrated into the root layout (`DashboardLayout`).
- **Animated Mesh Gradient:** Use `MeshGradient` component from `@paper-design/shaders-react`.
- **Custom Color Palette:** 
    - Dark mode compatible: Deep forest greens, charcoal, and Neon Lime (#DAFC67 / oklch(0.91 0.18 135)).
    - The colors must be derived from the system's design system.
- **Subtle Animation:** Configure speed and distortion for a calm, non-distracting user experience.
- **Performance:** Ensure the shader is hardware-accelerated and does not degrade UI responsiveness.

## Non-Functional Requirements
- **Accessibility:** Text contrast must be maintained over the dynamic background.
- **Responsiveness:** The gradient must cover the full viewport (100vw, 100vh) and adapt to window resizing.
- **Maintainability:** Created as a reusable UI component in `web/src/components/ui/background-shader.tsx`.

## Acceptance Criteria
- `@paper-design/shaders-react` is installed and functioning.
- `BackgroundShader` component is implemented with custom green/lime colors.
- Background is applied globally to the `DashboardLayout`.
- UI elements (sidebar, cards, text) remain readable and correctly layered (z-index).

## Out of Scope
- Interactive elements within the background (e.g., mouse-follow).
- Page-specific background variations.
