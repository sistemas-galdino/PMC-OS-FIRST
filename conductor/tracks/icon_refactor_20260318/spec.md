# Specification: Icon System Refactor to Tabler Icons (Better-Icons)

## Overview
This track involves a comprehensive refactor of the application's icon system. Currently using Lucide React icons, the user perceives them as "too much like AI-generated" and wants to transition to a more premium, modern aesthetic using **Tabler Icons** via the `better-icons` skill.

## Functional Requirements
- **Global Replacement:** Replace all existing icons in Global Components (Sidebar, Header, etc.).
- **Page-Specific Replacement:** Update icons across all feature pages (Products, Clients, Mentors, Action Plans, etc.).
- **UI Component Update:** Refactor Shadcn/UI components (e.g., Buttons, Selects, Dialogs) to use the new icon system.
- **Consistent Style:** Ensure all icons follow the **Tabler Icons** design language.
- **Better-Icons Integration:** Use the `better-icons` skill to search and retrieve high-quality SVGs.

## Non-Functional Requirements
- **Performance:** Ensure icons are optimized (SVGs) and do not impact page load times.
- **Accessibility:** Maintain proper ARIA labels and alt text for all icons.
- **Maintainability:** Standardize the method for importing and using icons across the project.

## Acceptance Criteria
- All Lucide React icon imports are removed or replaced.
- The UI consistently uses Tabler Icons.
- The `better-icons` skill is successfully utilized to source the new icons.
- Visual consistency is maintained across all components on both desktop and mobile.

## Out of Scope
- Major layout or design system changes beyond icon replacements.
- Updating logo or branding assets (unless they are specific icons).
