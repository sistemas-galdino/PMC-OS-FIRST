# Specification: Frontend Refactor to 2026 Premium Design

## Context
The current frontend uses a Neobrutalism design style. The goal is to refactor all UI components and pages to match the newly defined **2026 Premium Design System** (Founder OS inspired) with fluid animations, while strictly preserving all existing backend logic and Supabase integrations.

## Goals
- Replace Neobrutalism aesthetics with a Dark Mode/Neon Lime premium feel.
- Implement staggered loading animations for all dashboard elements.
- Implement chart animations and count-up numbers for metrics.
- Ensure all hover and sidebar transitions are fluid and elastic.
- Maintain full functionality of the PMC OS (Admin) and Portal do Cliente (Client).

## Technical Requirements
- **Styling:** Tailwind CSS 4 + Shadcn/UI (customized with Neon Lime).
- **Animations:** Framer Motion (recommended for staggered loads and elastic transitions).
- **Charts:** Recharts with Neon Lime gradients.
- **Components:** Update all `@/components/ui` to match the new style.
- **Pages:** Refactor all layouts and individual pages in `web/src/pages/`.

## Key Screens
1. **Login:** Premium entrance with subtle animations.
2. **PMC OS Dashboard:** Global metrics with cascading entry.
3. **Client Dashboard:** Revenue tracking and action plans with fluid transitions.
4. **Sidebar:** Elastic toggle and minimal Lucide icons.

## Constraints
- **NO BACKEND CHANGES:** Do not modify Supabase calls, n8n integrations, or database schema.
- **NO LOGIC CHANGES:** Preserve existing data flows and business rules.
- **Responsive:** Must be mobile-ready as per product guidelines.
