# Implementation Plan: Icon System Refactor to Tabler Icons (Better-Icons)

## Objective
Systematically replace all Lucide React icons with premium Tabler Icons using the `better-icons` skill across the entire application (Global Components, Feature Pages, and Shadcn UI).

## Phases & Tasks

### Phase 1: Preparation & Tool Setup [checkpoint: 4e7aa30]
- [x] Task: Research and list all current Lucide icons used in the project. bb6c1b9
- [x] Task: Activate `better-icons` skill and search for Tabler Icons equivalents for each identified icon. bb6c1b9
- [x] Task: Conductor - User Manual Verification 'Preparation & Tool Setup' (Protocol in workflow.md) 4e7aa30

### Phase 2: Global Components Refactor [checkpoint: aa882a8]
- [x] Task: Write Tests: Create a baseline test to verify presence of icons in Sidebar and Header. (Skipped: no testing framework setup) a53d5b9
- [x] Task: Implement: Replace Lucide icons in `web/src/components/layout/app-sidebar.tsx` with Tabler Icons. a53d5b9
- [x] Task: Implement: Replace Lucide icons in `web/src/components/layout/dashboard-layout.tsx` (if any). a53d5b9
- [x] Task: Conductor - User Manual Verification 'Global Components Refactor' (Protocol in workflow.md) aa882a8

### Phase 3: UI Components (Shadcn) Refactor [checkpoint: 639770f]
- [x] Task: Write Tests: Verify icons in common Shadcn components (Button, Input, Select). (Skipped: no tests) 18472f5
- [x] Task: Implement: Replace Lucide icons in `web/src/components/ui/` files where applicable (e.g., `select.tsx`, `input.tsx`). 18472f5
- [x] Task: Conductor - User Manual Verification 'UI Components (Shadcn) Refactor' (Protocol in workflow.md) 639770f

### Phase 4: Feature Pages Refactor [checkpoint: 3e801ef]
- [x] Task: Write Tests: Verify icons in key feature pages (Products, Clients, Dashboard). (Skipped: no tests) 634b543
- [x] Task: Implement: Replace icons in `web/src/pages/produtos.tsx`. 634b543
- [x] Task: Implement: Replace icons in `web/src/pages/clientes.tsx`. 634b543
- [x] Task: Implement: Replace icons in `web/src/pages/canais.tsx`. 634b543
- [x] Task: Implement: Replace icons in `web/src/pages/acoes.tsx`. 634b543
- [x] Task: Implement: Replace icons in `web/src/pages/mentores.tsx`. 634b543
- [x] Task: Implement: Replace icons in `web/src/pages/client-dashboard.tsx` and `web/src/pages/admin-dashboard.tsx`. 634b543
- [x] Task: Conductor - User Manual Verification 'Feature Pages Refactor' (Protocol in workflow.md) 3e801ef

### Phase 5: Final Cleanup & Optimization [checkpoint: 049bf30]
- [x] Task: Remove Lucide React dependency if no longer used. cbe3e86
- [x] Task: Optimize SVG delivery (ensure no redundant imports). cbe3e86
- [x] Task: Final cross-browser and mobile verification of all icons. cbe3e86
- [x] Task: Conductor - User Manual Verification 'Final Cleanup & Optimization' (Protocol in workflow.md) 049bf30

## Verification & Testing
- **Automated Tests:** Update existing tests to expect the new Tabler SVGs/components.
- **Manual Verification:** Follow the Phase Completion Verification and Checkpointing Protocol for each phase.
- **Visual Check:** Ensure icons are correctly sized, colored, and aligned in all UI states (hover, focus, disabled).
