# Bug Fix Plan: Resolve White Screen after Etheral Shadows Integration

## Problem
The system shows a white screen (crash) after implementing the `EtheralShadow` component and removing `@paper-design/shaders-react`.

## Potential Causes
1.  **External Assets:** The component relies on image masks from Framer's CDN which might be failing or blocked.
2.  **SVG Filter IDs:** Dynamic SVG filters can sometimes cause rendering stalls in specific browser/Vite configurations.
3.  **Framer Motion Version:** Potential conflict between React 19 hooks and the provided Framer Motion code.

## Proposed Fixes

### 1. Robust Component Implementation
- Refactor `web/src/components/ui/etheral-shadow.tsx` to:
    - Use a CSS radial gradient instead of the external `maskImage` URL (self-contained).
    - Simplify the ID generation to avoid any potential React 19 / SVG conflicts.
    - Add safety checks for the `feColorMatrixRef` before updating attributes.

### 2. Debugging Steps
- If Phase 1 doesn't work, temporarily disable the `BackgroundShader` in `App.tsx` to confirm the rest of the app is intact.

## Verification
- Confirm the app loads successfully (Login/Dashboard visible).
- Confirm the shadow effect is working without external dependencies.
