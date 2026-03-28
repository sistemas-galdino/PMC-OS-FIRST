# Codebase Structure

**Analysis Date:** 2026-03-28

## Directory Layout

```
web/
├── src/
│   ├── main.tsx                    # React app entry point (DOM mount)
│   ├── App.tsx                     # Root component (routing, auth, layout)
│   ├── App.css                     # Global styles
│   ├── index.css                   # Tailwind/global CSS
│   ├── components/
│   │   ├── layout/
│   │   │   ├── dashboard-layout.tsx    # Authenticated pages wrapper (sidebar, layout)
│   │   │   └── app-sidebar.tsx         # Navigation menu (admin/client variants)
│   │   └── ui/                         # Reusable UI components (Card, Button, Input, etc.)
│   ├── pages/                      # Feature pages (dashboards, data tables, forms)
│   ├── lib/                        # Utilities and SDK clients
│   │   ├── supabase.ts             # Supabase client singleton
│   │   └── utils.ts                # Helper functions (cn for class merging)
│   ├── hooks/                      # Custom React hooks
│   │   └── use-mobile.ts           # Responsive breakpoint hook
│   └── assets/                     # Images, icons, static files
├── public/                         # Static files served as-is
├── vite.config.ts                  # Vite bundler config
├── tsconfig.json                   # TypeScript paths config (@ alias)
├── package.json                    # Dependencies
└── index.html                      # HTML entry point
```

## Directory Purposes

**`web/src/`:**
- Purpose: All source code for the frontend application
- Contains: TypeScript/TSX React components, styles, utilities, configurations
- Key files: `main.tsx` (bootstrap), `App.tsx` (routing), `index.css` (global styles)

**`web/src/components/`:**
- Purpose: Reusable React components
- Contains: Two subdirectories: layout (page structure) and ui (primitives)

**`web/src/components/layout/`:**
- Purpose: Layout wrapper components that structure pages
- Contains:
  - `dashboard-layout.tsx`: Wraps authenticated pages with sidebar provider, header, and main content area
  - `app-sidebar.tsx`: Renders navigation menu with different items based on admin/client role
- Key detail: Every authenticated page is wrapped by DashboardLayout which provides navigation context

**`web/src/components/ui/`:**
- Purpose: Styled UI primitives from shadcn library
- Contains: Card, Button, Input, Label, Select, Sheet, Dialog, Sidebar, Table, Badge, Avatar, Skeleton, Tooltip, ScrollArea, DropdownMenu, Separator
- Pattern: Each component is a single file exporting a React component with Tailwind styling
- Usage: Imported via path alias `@/components/ui/card`, `@/components/ui/button`, etc.
- Note: All UI components use Tailwind CSS classes—no separate CSS files

**`web/src/pages/`:**
- Purpose: Feature-specific page components, each representing a major application section
- Contains: 11 page components (see below)

**`web/src/lib/`:**
- Purpose: Core libraries and utility functions
- Contains:
  - `supabase.ts`: Initializes and exports Supabase client with environment variables
  - `utils.ts`: Helper function `cn()` for merging Tailwind class names safely

**`web/src/hooks/`:**
- Purpose: Custom React hooks for reusable logic
- Contains:
  - `use-mobile.ts`: Hook for detecting mobile breakpoints

**`web/src/assets/`:**
- Purpose: Static images, icons, fonts
- Contains: Images used in pages/components
- Note: Also imports @fontsource-variable/geist for typography

**`web/public/`:**
- Purpose: Static files served as-is by Vite
- Contains: favicon, robots.txt, or other assets

## Key File Locations

**Entry Points:**
- `web/src/main.tsx`: Mounts React app to `#root` element in index.html
- `web/src/App.tsx`: Root component that sets up routing, auth, and error boundary
- `web/index.html`: HTML template with root div

**Configuration:**
- `web/package.json`: Dependencies (React, React Router, Supabase, Tailwind, Framer Motion, Recharts, shadcn, etc.)
- `web/tsconfig.json`: TypeScript configuration with @ path alias pointing to `./src/*`
- `web/vite.config.ts`: Vite bundler with React plugin and Tailwind CSS Vite plugin
- `web/.env.local`: Environment variables (Supabase URL and anonymous key)

**Core Logic:**
- `web/src/App.tsx`: Session management, routing definition, admin/client detection, error boundary
- `web/src/components/layout/dashboard-layout.tsx`: Layout wrapper for authenticated pages
- `web/src/components/layout/app-sidebar.tsx`: Navigation menu logic

**Pages - Admin:**
- `web/src/pages/admin-dashboard.tsx`: Admin overview with stats cards and charts (geo, niche, CS, sales channel distribution)
- `web/src/pages/clientes.tsx`: Client directory table with search, status filter, engagement level badge, action menu
- `web/src/pages/mentores.tsx`: Meetings grouped by mentor with search, filters, and meeting detail panel

**Pages - Client/Shared:**
- `web/src/pages/client-dashboard.tsx`: Client-specific dashboard with revenue/employee metrics and action items
- `web/src/pages/client-reunioes.tsx`: Meetings list with recording links, transcriptions, filters
- `web/src/pages/client-profile.tsx`: Tab wrapper for viewing client details from admin perspective (dashboard, products, channels, reuniões, ações)
- `web/src/pages/produtos.tsx`: Product catalog for a client with CRUD operations (add, edit, delete)
- `web/src/pages/canais.tsx`: Sales channels configuration
- `web/src/pages/acoes.tsx`: Action/task tracking
- `web/src/pages/onboarding.tsx`: Pending onboarding clients
- `web/src/pages/login.tsx`: Authentication form

**Styling:**
- `web/src/App.css`: App-level CSS (minimal)
- `web/src/index.css`: Global Tailwind imports and CSS variables
- Individual component styling: Inline Tailwind classes in component JSX

**Testing:**
- Not detected in codebase

## Naming Conventions

**Files:**
- **Page components:** kebab-case with descriptive names
  - Examples: `admin-dashboard.tsx`, `client-profile.tsx`, `client-reunioes.tsx`
  - Corresponds to route: /admin-dashboard → admin-dashboard.tsx (though routes use kebab and files use kebab)

- **Component files:** kebab-case for multi-word, descriptive names
  - Examples: `dashboard-layout.tsx`, `app-sidebar.tsx`, `background-shader.tsx`
  - Pattern: layout components, specialized UI components in kebab-case

- **UI primitives:** kebab-case, name reflects the component type
  - Examples: `card.tsx`, `button.tsx`, `dropdown-menu.tsx`, `scroll-area.tsx`, `select.tsx`

- **Utility/library files:** kebab-case
  - Examples: `use-mobile.ts`, `supabase.ts`, `utils.ts`

**Directories:**
- **Feature directories:** lowercase, descriptive
  - `components/`, `pages/`, `lib/`, `hooks/`, `assets/`
  - Subdirectories: `components/ui/`, `components/layout/`

- **Route-based:** Pages in `pages/` directory map 1:1 to routes (mostly)
  - `/` → `admin-dashboard.tsx` or `client-dashboard.tsx`
  - `/clientes` → `clientes.tsx`
  - `/cliente/:id` → `client-profile.tsx`
  - `/reunioes` → `client-reunioes.tsx`

**Components:**
- **Function names:** PascalCase for components exported as defaults or named exports
  - Examples: `AdminDashboard`, `LoginPage`, `AppSidebar`, `DashboardLayout`
  - Exported as default or named export

- **Props interfaces:** PascalCase + "Props"
  - Examples: `AppSidebarProps`, `DashboardLayoutProps`, `ClientDashboardProps`
  - Convention: Props interface follows component definition

- **Type/interface names:** PascalCase
  - Examples: `Client`, `Product`, `Meeting`, `NivelEngajamento`, `Session`

- **State variables:** camelCase
  - Examples: `session`, `loading`, `isAdmin`, `searchTerm`, `showSheet`

- **Event handlers:** camelCase with "handle" prefix
  - Examples: `handleLogin`, `handleSave`, `handleDelete`, `handleChange`

- **Supabase table references:** Snake_case (as-is from database)
  - Examples: `.from('clientes_entrada_new')`, `.from('reunioes_mentoria_new')`, `.from('cliente_metas')`

## Where to Add New Code

**New Feature (Page with Data & UI):**
- Primary code: `web/src/pages/{feature-name}.tsx`
  - File should be a default export of a React functional component
  - Include data fetching in useEffect
  - Handle loading/error states
  - Import UI components from `@/components/ui/`

- Tests: Not established; create `web/src/pages/{feature-name}.test.tsx` if adding tests

**New Reusable Component/Module:**
- If pure UI (no data fetching): `web/src/components/ui/{component-name}.tsx`
  - Export as default or named export
  - Apply Tailwind classes for styling
  - Use TypeScript interfaces for props

- If layout or page structure: `web/src/components/layout/{component-name}.tsx`
  - Similar pattern to UI components but for structural wrappers

**Utilities/Helpers:**
- Shared utility functions: `web/src/lib/utils.ts` (add new export)
  - Currently contains only `cn()` function; expand as needed

- Custom hooks: `web/src/hooks/{hook-name}.ts`
  - File: `use-{feature}.ts` in kebab-case
  - Export custom hook function

**Database queries:**
- Approach: Write Supabase queries inline in page components
- Pattern:
  ```typescript
  const { data, error } = await supabase
    .from('table_name')
    .select('column1, column2')
    .eq('id', value)
    .single()
  ```
- Location: Inside useEffect in page component
- Convention: Assign to useState after successful fetch

## Special Directories

**`web/src/assets/`:**
- Purpose: Static images and icons
- Generated: No (hand-added files)
- Committed: Yes

**`web/node_modules/`:**
- Purpose: NPM dependencies
- Generated: Yes (from package.json)
- Committed: No (in .gitignore)

**`web/dist/`:**
- Purpose: Built/transpiled output
- Generated: Yes (by Vite during build)
- Committed: No (in .gitignore)

**`.env.local`:**
- Purpose: Local environment configuration
- Contains: Supabase credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Committed: No (in .gitignore)
- Note: Vite exposes variables with VITE_ prefix to client

## Import Path Aliases

**`@/` → `./src/`**
- Configured in `tsconfig.json` and `vite.config.ts`
- Usage: `import Button from '@/components/ui/button'`
- Benefit: Absolute paths avoid relative path traversal (`../../../`)

## Route Definition Pattern

**Routes defined in `App.tsx`:**
```typescript
<Routes>
  <Route path="/login" element={...} />
  <Route path="/*" element={
    <DashboardLayout>
      <Routes>
        <Route path="/" element={isAdmin ? <AdminDashboard /> : <ClientDashboard />} />
        <Route path="/mentores" element={<MentoresPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/cliente/:id" element={<ClientProfilePage />} />
        {/* etc */}
      </Routes>
    </DashboardLayout>
  } />
</Routes>
```

**Pattern:**
- Login route outside authenticated layout
- All other routes wrapped in DashboardLayout (provides sidebar, header)
- Nested routes for organization
- Dynamic segments use `:param` syntax

---

*Structure analysis: 2026-03-28*
