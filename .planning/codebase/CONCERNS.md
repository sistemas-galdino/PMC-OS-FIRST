# Codebase Concerns

**Analysis Date:** 2026-03-28

## Tech Debt

**Missing Input Validation:**
- Issue: User inputs in forms are not validated before submission to Supabase
- Files: `web/src/pages/client-dashboard.tsx` (lines 450-493), `web/src/pages/produtos.tsx` (lines 97-123), `web/src/pages/canais.tsx`, `web/src/pages/acoes.tsx`
- Impact: Invalid data (negative numbers, empty strings, malformed values) can be saved to database; no client-side feedback on validation errors
- Fix approach: Add form validation library (Zod/Yup) with feedback UI; validate before upsert operations

**Untyped Component State with `any`:**
- Issue: Multiple components use `any` type for complex state objects
- Files: `web/src/pages/client-dashboard.tsx` (lines 65-71: `useState<any>`), `web/src/pages/admin-dashboard.tsx` (lines 59-62: multiple `any[]` states)
- Impact: Loss of type safety, runtime errors possible, refactoring risk
- Fix approach: Define explicit TypeScript interfaces for all state objects; replace `any` with proper types

**Missing Error Handling in Data Mutations:**
- Issue: Supabase errors on upsert/update/delete operations are not always handled or shown to users
- Files: `web/src/pages/client-dashboard.tsx` (lines 502-510), `web/src/pages/productos.tsx` (lines 101-120), `web/src/pages/clientes.tsx` (lines 177-197)
- Impact: Silent failures when data operations fail; user has no feedback that action failed
- Fix approach: Add explicit error state + toast notifications for failed mutations; show user-friendly error messages

**Sidebar Cookie Vulnerability:**
- Issue: Sidebar state stored in plain-text document.cookie with no encoding
- Files: `web/src/components/ui/sidebar.tsx` (line 85)
- Impact: Low security risk, but sidebar state could be manipulated via console; session state mixing
- Fix approach: Use sessionStorage instead of cookies for UI state; or sign the cookie value

**Missing Session/Auth Checks in Data Fetches:**
- Issue: Many data fetches use session user ID without verifying it matches the requested resource
- Files: `web/src/pages/client-dashboard.tsx` (line 64), `web/src/pages/produtos.tsx` (line 50), `web/src/pages/canais.tsx`, `web/src/pages/acoes.tsx`
- Impact: Relies entirely on Supabase RLS; if RLS is misconfigured, users could access other clients' data
- Fix approach: Add defensive checks on frontend; verify resolvedClientId exists in auth session

## Known Bugs

**Potential Race Condition in Auth Detection:**
- Symptoms: Admin dashboard may briefly show for non-admin users before role check completes
- Files: `web/src/App.tsx` (lines 97-108)
- Trigger: User loads page with slow network; `isAdmin` state updates asynchronously
- Workaround: Add loading state during admin check; use isAdmin in conditional rendering of route

**Undefined Page Error in Client Profile:**
- Symptoms: `ClientProfilePage` returns `null` if ID param missing (line 26)
- Files: `web/src/pages/client-profile.tsx` (lines 26)
- Trigger: Navigate directly to `/cliente/` without ID
- Workaround: Route guard in App.tsx should prevent invalid params; add fallback UI

**Memory Leak in CountUp Animation:**
- Symptoms: Multiple intervals may not clear if component unmounts during counting
- Files: `web/src/pages/client-dashboard.tsx` (lines 39-61), `web/src/pages/admin-dashboard.tsx` (lines 28-50)
- Trigger: Rapidly navigate away from dashboard components
- Workaround: Already has cleanup in useEffect return, but verify no duplicate intervals with multiple <CountUp/> instances

**Division by Zero in Dashboard Charts:**
- Symptoms: Chart shows 0% progress if `meta_2026` is 0 or null
- Files: `web/src/pages/client-dashboard.tsx` (line 152)
- Trigger: Client with no 2026 meta set
- Workaround: Currently handled by `|| 0` fallback, but null values from database could cause NaN

**Data Not Refetched on Update:**
- Symptoms: User edits metas in client-dashboard.tsx, state updates but related pages (products, channels) don't refresh
- Files: `web/src/pages/client-dashboard.tsx` (lines 513-521)
- Trigger: User saves metas, navigates to `/produtos` - shows stale data
- Workaround: Implement cache invalidation or query key management

## Security Considerations

**Supabase RLS Dependency:**
- Risk: All data filtering relies on Supabase RLS policies; no backend-enforced authorization
- Files: All data fetch operations throughout codebase
- Current mitigation: Assuming RLS is properly configured on Supabase; auth uses Supabase JWT
- Recommendations:
  - Document RLS policy requirements clearly
  - Add audit logging in Supabase for all mutations
  - Verify RLS prevents cross-client data access
  - Consider server-side API layer to enforce authorization at application level

**Exposed Supabase Keys in Client Code:**
- Risk: Supabase anon key visible in source; frontend-only auth means any user can attempt API calls
- Files: `web/src/lib/supabase.ts` (lines 3-4)
- Current mitigation: Using anon key with restricted RLS; Supabase auth validates JWT
- Recommendations:
  - Review Supabase RLS policies for each table
  - Consider rate-limiting on Supabase side
  - Document that this is client-only app; add admin API later if needed
  - Monitor for abuse of credential updates

**No CSRF Protection on Form Submissions:**
- Risk: Forms submit directly to Supabase without CSRF tokens
- Files: All form submissions in client-dashboard.tsx, clientes.tsx, produtos.tsx, etc.
- Current mitigation: Supabase handles auth; client-side origin validation via CORS
- Recommendations: Not critical for SPA, but add X-Requested-With header if needed

**Session State in localStorage (Error Boundary):**
- Risk: Error boundary clears all localStorage on reset (line 48 of App.tsx)
- Files: `web/src/App.tsx` (line 48)
- Current mitigation: Only clears on critical error
- Recommendations: Be selective about what gets cleared; don't lose necessary user preferences

## Performance Bottlenecks

**Full Table Fetches Without Pagination:**
- Problem: Several pages fetch entire tables then filter client-side
- Files: `web/src/pages/mentores.tsx` (lines 53-71), `web/src/pages/clientes.tsx` (lines 150-161), `web/src/pages/admin-dashboard.tsx` (lines 69-87)
- Cause: No server-side pagination, limits, or filtering in Supabase queries
- Improvement path:
  - Mentores: Likely 1000+ meetings; implement pagination or date range limits
  - Clientes: May work now, but add offset/limit
  - Admin: Fetches 4 separate tables without pagination

**Heavy Render in Mentores Page:**
- Problem: `mentores.tsx` renders all filtered meetings + nested meeting details
- Files: `web/src/pages/mentores.tsx` (entire file)
- Cause: No virtualization; renders entire meeting grid + accordion details
- Improvement path: Add React.memo for meeting cards; implement virtualization if >500 meetings

**Inefficient Filtering Logic:**
- Problem: `admin-dashboard.tsx` processes all clients into multiple maps (niches, CS, canals) on every render
- Files: `web/src/pages/admin-dashboard.tsx` (lines 106-140)
- Cause: No memoization; creates new objects on every useEffect
- Improvement path: Memoize aggregation with useMemo; precompute on database side

**No Query Debouncing:**
- Problem: Search input triggers refetch on every keystroke (mentores.tsx, clientes.tsx)
- Files: `web/src/pages/mentores.tsx` (lines 44, 82-103), `web/src/pages/clientes.tsx` (lines 200-210)
- Cause: Search is client-side on full data, but should be debounced for future server filtering
- Improvement path: Add 300ms debounce to search inputs

## Fragile Areas

**Client Dashboard Data Loading State:**
- Files: `web/src/pages/client-dashboard.tsx`
- Why fragile:
  - Fetches from 3 tables (clientes_entrada_new, cliente_metas, reunioes_mentoria_new) with no transaction/batch
  - If any fetch fails silently, dashboard shows partial/stale data
  - Fallback data (lines 128-140) provides dummy data that masks missing real data
- Safe modification:
  - Always check all 3 responses before rendering
  - Add explicit error state separate from loading state
  - Show error UI if any query fails
- Test coverage: No tests for failure scenarios

**Admin Dashboard Statistics:**
- Files: `web/src/pages/admin-dashboard.tsx` (lines 65-103)
- Why fragile:
  - Calculation logic mixes filters and calculations (e.g., NPS average)
  - Relies on specific data types (e.g., `status_atual` must be exact case)
  - No validation that data exists before aggregation
- Safe modification:
  - Extract calculations to pure functions with unit tests
  - Add defensive checks for null/undefined before calculations
  - Use lowercase comparisons for status filters
- Test coverage: None

**Sidebar State Management:**
- Files: `web/src/components/ui/sidebar.tsx` (lines 55-149)
- Why fragile:
  - Complex state with both prop-controlled and internal state (line 73)
  - Multiple sources of truth: `openProp` vs `_open` vs `openMobile`
  - Context updates happen on every state change with useMemo dependency array including functions
- Safe modification:
  - Simplify to either controlled or uncontrolled pattern (not both)
  - Memoize context value more carefully
- Test coverage: None (UI component)

**Meeting Data Parsing:**
- Files: `web/src/pages/mentores.tsx` (lines 32-38, multiple usages of `acoes_cliente`, `acoes_mentor`)
- Why fragile:
  - Data can be string OR array of objects (line 32 union type)
  - Frontend tries to render both without checking type (line 374: `.map()`)
  - No null safety on nested properties like `topicos.pontos`
- Safe modification:
  - Standardize API data format (always array)
  - Add type guards before rendering
  - Use optional chaining and nullish coalescing
- Test coverage: None

## Scaling Limits

**Database Query Performance:**
- Current capacity: Works fine for ~100-500 clients
- Limit: Once >1000 meetings or >500 clients, full table fetches will slow significantly
- Scaling path:
  - Implement server pagination on backend
  - Add database indexes on common filter columns (mentor, cliente, data)
  - Consider query caching strategy

**Sidebar Component Overhead:**
- Current capacity: Works fine with <20 menu items
- Limit: Context updates on every state change; frequent re-renders if many sidebar subscribers
- Scaling path:
  - Use zustand/jotai instead of Context for shared state
  - Add React.memo to sidebar sub-components
  - Batch state updates

## Dependencies at Risk

**Framer Motion:**
- Risk: Complex animations throughout UI (CountUp, motion.div); version `^12.38.0` is recent
- Impact: Version bumps could break animation timings; large bundle size (~100kb)
- Migration plan: Can be replaced with CSS animations for simpler effects; keep for complex orchestrated animations

**Recharts:**
- Risk: Chart data transformations are brittle; version `^3.8.0`
- Impact: Chart rendering issues if data format changes; no TypeScript types for custom elements
- Migration plan: Could migrate to Visx or D3 for more control, but recharts is stable

**Supabase JS Client:**
- Risk: Client-side-only auth; missing critical features would require rebuilding auth flow
- Impact: Major version bump could break RLS assumptions or auth patterns
- Migration plan: Lock to `^2.99.2` until thorough testing; pin exact version for production

**React 19:**
- Risk: Very recent version; some libraries may not be fully compatible
- Impact: Potential issues with third-party integrations
- Migration plan: Monitor React ecosystem; test all dependencies after updates

## Missing Critical Features

**No Offline Support:**
- Problem: App requires constant network connection; any disconnection breaks functionality
- Blocks: Mobile usage, unreliable networks
- Recommendation: Add service worker + local storage caching for critical data reads

**No Undo/Redo for Data Changes:**
- Problem: User cannot undo accidental edits to client data, metas, products, etc.
- Blocks: Data integrity for non-technical users
- Recommendation: Implement change history; add soft deletes to backend

**No Bulk Operations:**
- Problem: Managers cannot bulk-update client status, SC assignment, or engagement level
- Blocks: Admin efficiency for >50 clients
- Recommendation: Add bulk edit UI to clientes.tsx

**No Export/Reporting:**
- Problem: Cannot export client data, meeting summaries, or performance reports
- Blocks: Stakeholder reporting
- Recommendation: Add CSV export for clientes and mentores pages

**No Real-Time Updates:**
- Problem: Multiple users editing same client data see stale info; no live collaboration
- Blocks: Team coordination
- Recommendation: Add Supabase real-time subscriptions if team needs sync

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested: Any business logic functions
- Files: All
- Risk: Refactoring introduces bugs undetected
- Priority: HIGH

**No Integration Tests:**
- What's not tested: Supabase mutations (create, update, delete) with actual database state
- Files: All pages with CRUD operations
- Risk: Silent data corruption if RLS policies are wrong or schema changes
- Priority: HIGH

**No E2E Tests:**
- What's not tested: Critical user flows (login → view dashboard → edit metas → see updates)
- Files: Entire app
- Risk: Shipping regressions; can't verify auth flow works
- Priority: MEDIUM

**No Component Tests:**
- What's not tested: UI components render correctly with different props
- Files: `web/src/components/` (especially sidebar, modals, forms)
- Risk: UI breaks silently; hard to debug styling issues
- Priority: MEDIUM

---

*Concerns audit: 2026-03-28*
