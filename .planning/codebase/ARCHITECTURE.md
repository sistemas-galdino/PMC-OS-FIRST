# Architecture

**Analysis Date:** 2026-03-28

## Pattern Overview

**Overall:** Client-server SPA (Single Page Application) with component-based UI and direct backend querying

**Key Characteristics:**
- Frontend-driven architecture: Business logic and data fetching reside in React components
- Supabase as backend-as-a-service providing authentication and database access
- Centralized routing through React Router at application level
- Direct SQL-like queries from components to database (no API layer)
- Role-based UI rendering (Admin vs Client differentiated at component level)

## Layers

**Presentation Layer:**
- Purpose: Handle UI rendering, animations, user interactions, and state management
- Location: `web/src/pages/`, `web/src/components/`
- Contains: Page components, UI components (cards, buttons, forms), layout wrappers
- Depends on: React, React Router, component library (shadcn), animation library (framer-motion), charting library (recharts)
- Used by: BrowserRouter and user interactions

**Component Library:**
- Purpose: Provide reusable, styled UI primitives
- Location: `web/src/components/ui/`
- Contains: Base components (Card, Button, Input, Select, Dialog, Sheet, Sidebar, Badge, etc.)
- Depends on: Tailwind CSS, Radix UI, class-variance-authority
- Used by: All pages and layout components

**Layout Layer:**
- Purpose: Wrap authenticated pages with navigation and structure
- Location: `web/src/components/layout/`
- Contains: Dashboard layout wrapper, sidebar navigation, theme providers
- Key files: `dashboard-layout.tsx` (provides SidebarProvider and navigation), `app-sidebar.tsx` (main navigation menu)
- Used by: App.tsx for authenticated routes

**Data Access Layer:**
- Purpose: Abstract Supabase client initialization
- Location: `web/src/lib/`
- Contains: Supabase client singleton (`supabase.ts`), utility functions (`utils.ts`)
- Depends on: Supabase JS SDK
- Used by: Every page component that needs data

**Utilities & Hooks:**
- Purpose: Shared helper functions and custom React hooks
- Location: `web/src/lib/utils.ts`, `web/src/hooks/`
- Contains: Class name merging (cn), responsive design hooks (useMobile)
- Used by: Components throughout the application

## Data Flow

**Authentication Flow:**

1. User lands on application → App.tsx checks session with supabase.auth.getSession()
2. If no session → redirect to /login
3. LoginPage handles email/password via supabase.auth.signInWithPassword()
4. On successful login → supabase.auth.onAuthStateChange() fires → session state updates → router navigates to /
5. Session passed as prop to DashboardLayout and pages that need it

**Admin Authorization:**

1. After session established → DashboardLayout calls supabase.from('mentores').select('id').eq('email', session.user.email)
2. If mentor record found → isAdmin state set to true
3. App.tsx conditionally renders AdminDashboard or ClientDashboard based on isAdmin flag
4. AppSidebar receives isAdmin prop and renders appropriate menu items

**Data Fetching Pattern (Client-Driven):**

1. Page component mounts → useEffect triggers
2. Component directly calls supabase.from('table_name').select().eq().maybeSingle() or similar
3. Response stored in component state (useState)
4. Component re-renders with loaded data
5. No caching or request deduplication—each component fetches independently

**State Management:**

- **Local Component State:** useState for component-specific data (loading, forms, filters)
- **Route State:** React Router params and search params for navigation state
- **Session State:** Passed through props from App.tsx down to pages/components
- **No Global State Manager:** No Redux, Zustand, or Context API for cross-component state

## Key Abstractions

**Page Components (Feature Modules):**
- Purpose: Represent major application screens/sections
- Examples: `web/src/pages/admin-dashboard.tsx`, `web/src/pages/clientes.tsx`, `web/src/pages/client-dashboard.tsx`
- Pattern: Each page is a standalone React component that handles its own data fetching, state, and rendering
- Scope: Fully encapsulated—dashboards query multiple tables, format data, and render charts/tables

**Data Query Wrappers:**
- Pattern: Page components directly write Supabase queries without abstraction layer
- Examples in `web/src/pages/admin-dashboard.tsx`:
  ```typescript
  const { data: clients } = await supabase
    .from('clientes_entrada_new')
    .select('status_atual, nicho, sc, canal_de_venda')
  ```
- Implications: Query logic scattered across pages; changes to table schemas require updates in multiple files

**UI Component Wrappers:**
- Purpose: Wrap library components (Radix UI, recharts) with project-specific styling
- Examples: `Card`, `Button`, `Badge`, `Table` in `web/src/components/ui/`
- Pattern: Components exported from individual files, used throughout application via path alias `@/components/ui/`

**Charts & Visualizations:**
- Pattern: Recharts library used directly in page components
- Examples: BarChart, PieChart in admin-dashboard, LineChart patterns in client pages
- Pattern: Data transformation happens inline in components before chart rendering

**Forms & Input Sheets:**
- Pattern: Sheet component wraps form content for modal editing
- Examples: Product form in `produtos.tsx`, meta goals in `client-dashboard.tsx`
- Pattern: Form state in useState, submission triggers Supabase insert/update/delete

## Entry Points

**Application Root:**
- Location: `web/src/main.tsx`
- Triggers: Browser loads /index.html
- Responsibilities: Mount React app to DOM

**App Component:**
- Location: `web/src/App.tsx`
- Triggers: main.tsx
- Responsibilities:
  - Initialize session with Supabase
  - Set up BrowserRouter
  - Define all routes
  - Manage session and isAdmin state
  - Provide ErrorBoundary for crash handling
  - Conditional render login vs authenticated layout

**Login Page:**
- Location: `web/src/pages/login.tsx`
- Route: /login
- Responsibilities: Email/password form, authentication call, error display

**Admin Dashboard:**
- Location: `web/src/pages/admin-dashboard.tsx`
- Route: / (when isAdmin=true)
- Responsibilities: Fetch stats from multiple tables, render summary cards, display charts (geo, niche, CS, sales channel distribution)

**Client Dashboard:**
- Location: `web/src/pages/client-dashboard.tsx`
- Route: / (when isAdmin=false)
- Responsibilities: Fetch client-specific goals/metas, render revenue/employee/action metrics

**Data Pages:**
- Locations:
  - `/clientes` → `web/src/pages/clientes.tsx` (client directory with search, status filter, engagement level)
  - `/mentores` → `web/src/pages/mentores.tsx` (meetings grouped by mentor)
  - `/produtos` → `web/src/pages/produtos.tsx` (client products with CRUD)
  - `/canais` → `web/src/pages/canais.tsx` (sales channels)
  - `/acoes` → `web/src/pages/acoes.tsx` (action tracking)
  - `/reunioes` → `web/src/pages/client-reunioes.tsx` (meetings with recordings/transcriptions)

**Client Profile:**
- Location: `web/src/pages/client-profile.tsx`
- Route: /cliente/:id
- Responsibilities: Tab-based navigation wrapper that renders different page components with clientId prop

## Error Handling

**Strategy:** Multi-layer approach combining Error Boundary, try-catch, and user feedback

**Patterns:**

1. **Global Error Boundary** (`App.tsx`):
   - Catches unhandled component crashes
   - Displays critical error UI with error details
   - Provides "Reset and Try Again" button that clears localStorage and reloads

2. **Component-level try-catch**:
   - Each data fetch wrapped in try-catch
   - Error logged to console with context
   - Component sets error state or shows fallback UI
   - Example in `login.tsx`: catches auth errors and displays in red alert

3. **Graceful Degradation**:
   - Loading states show spinners or skeleton components
   - Missing data renders empty states or fallbacks
   - Unresolved clientId or session returns null/empty

4. **User-Facing Errors**:
   - Login errors: "Erro ao fazer login" + error message
   - Form saves: catch Supabase errors, show toast or alert
   - Data loads: silent fail, render empty state

## Cross-Cutting Concerns

**Logging:**
- Approach: console.error() for errors, console.log() for debugging
- No structured logging framework or centralized logger
- Example: "APP CRASH:", "Session check error:", "Admin stats fetch error:"

**Validation:**
- Approach: HTML5 form validation (required, type="email") + React controlled inputs
- Some type-level validation through TypeScript interfaces
- Supabase handles database constraints
- No client-side schema validation library

**Authentication:**
- Approach: Supabase Auth (email/password)
- Session stored in Supabase (no JWT in localStorage)
- onAuthStateChange subscription auto-updates when auth changes
- Check on mount + on every route change via conditional render

**Authorization:**
- Approach: Role-based access control via mentor lookup
- isAdmin determined by querying 'mentores' table for matching email
- UI renders differently based on isAdmin flag (cannot be hacked from client—role is checked on every navigation)
- No fine-grained permission system; simple binary admin/client split

**Styling:**
- Approach: Tailwind CSS (inline utility classes)
- Dark theme enforced globally: document.documentElement.classList.add("dark")
- CSS variables for colors, sourced through CSS files
- Component-specific styling in individual .tsx files (no separate CSS files)

**Animation:**
- Approach: Framer Motion library for transitions
- Used in: Page load animations, component fade-ins, chart animations
- Patterns: motion.div with initial/animate/exit, transition durations typically 0.4-1.5s

---

*Architecture analysis: 2026-03-28*
