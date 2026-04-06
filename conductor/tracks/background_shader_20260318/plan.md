2

## Objective
Integrate an animated mesh gradient background globally into the PMC OS and Portal do Cliente systems, using `@paper-design/shaders-react` with a custom "Neon Lime" and "Dark" brand palette.

## Phases & Tasks

### Phase 1: Environment Setup & Research
- [x] Task: Install NPM dependencies: `@paper-design/shaders-react`.
- [x] Task: Research and extract specific hex/hsl values for the "Neon Lime" and "Dark" brand colors from `index.css`.
- [x] Task: Conductor - User Manual Verification 'Environment Setup & Research' (Protocol in workflow.md)

### Phase 2: Component Creation
- [x] Task: Write Tests: Verify `BackgroundShader` component presence and default props (Mocking shader if needed).
- [x] Task: Implement: Create `web/src/components/ui/background-shader.tsx` using `@paper-design/shaders-react`.
- [x] Task: Implement: Configure the component with `Subtle & Calm` animation settings and custom colors.
- [x] Task: Conductor - User Manual Verification 'Component Creation' (Protocol in workflow.md)

### Phase 3: Global Layout Integration
- [x] Task: Implement: Update `web/src/components/layout/dashboard-layout.tsx` to include `BackgroundShader` as a fixed, background layer (z-index).
- [x] Task: Implement: Update global background styles in `index.css` to ensure transparency where needed for the shader.
- [x] Task: Conductor - User Manual Verification 'Global Layout Integration' (Protocol in workflow.md)

### Phase 4: Final Polishing & Verification
- [x] Task: Final Check: Ensure text readability and contrast across different dashboard sections.
- [x] Task: Final Check: Verify responsive behavior on mobile and desktop viewports.
- [x] Task: Conductor - User Manual Verification 'Final Polishing & Verification' (Protocol in workflow.md)

## Verification & Testing
- **Automated Tests:** Verify component existence and correct props passing.
- **Manual Verification:** 
  1. Start the dev server.
  2. Confirm the background is visible on the login page and dashboard.
  3. Ensure sidebar and cards remain clear and readable.
  4. Verify mobile responsiveness.
