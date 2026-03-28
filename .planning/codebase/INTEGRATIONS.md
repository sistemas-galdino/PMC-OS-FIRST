# External Integrations

**Analysis Date:** 2026-03-28

## APIs & External Services

**Supabase:**
- Backend platform for database, authentication, and real-time services
  - SDK/Client: `@supabase/supabase-js` v2.99.2
  - URL: `https://hqczwextifessaztyyyk.supabase.co`
  - Auth method: JWT tokens via Supabase Auth
  - Client location: `/Users/davidabn/PMC-OS-FIRST/web/src/lib/supabase.ts`

**n8n (External Workflow Automation):**
- WhatsApp Agent integration for automated client communications
  - Workflow file: `/Users/davidabn/PMC-OS-FIRST/n8n-workflows/whatsapp-agent-pmc.json`
  - Evolution API webhook integration for WhatsApp messaging
  - Data sync between Google Forms/Sheets and Supabase

**Google Services:**
- Google Forms - Client enrollment and data collection
- Google Sheets - Intermediate data source (forms responses)
- Google Calendar - Meeting scheduling (synced via n8n)
- Google Drive - Document storage (not directly in app)

## Data Storage

**Databases:**
- PostgreSQL (via Supabase)
  - Connection: `VITE_SUPABASE_URL` environment variable
  - Client: `@supabase/supabase-js` (JavaScript/TypeScript client)
  - Migrations location: `/Users/davidabn/PMC-OS-FIRST/supabase-migrations/`
  - Key tables:
    - `clientes_formulario` - Raw form submission data
    - `clientes_entrada_new` - Structured operational client data
    - `reunioes_mentoria_new` - Meeting records with transcription/summaries
    - `mentores` - Mentor/admin user table

**File Storage:**
- Local filesystem only - No external file storage (S3, etc.)
- Supabase Storage not currently enabled

**Caching:**
- None detected - No Redis or CDN caching implemented
- Browser caching via HTTP headers
- React component state management (no external cache store)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: Email + password authentication
  - JWT token-based (not API keys)
  - Admin role determination via mentores table lookup
  - Session persistence via browser storage
  - Sign-out support: `supabase.auth.signOut()`
  - Session listener: `supabase.auth.onAuthStateChange()`
  - Implementation file: `/Users/davidabn/PMC-OS-FIRST/web/src/App.tsx` (lines 70-107)
  - Login page: `/Users/davidabn/PMC-OS-FIRST/web/src/pages/login.tsx`

**Authorization:**
- Row Level Security (RLS) at database level
- Admin detection via email lookup in `mentores` table
- No permission groups or role-based access control (RBAC) in app layer

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Datadog, or similar service
- Client-side error boundary: `/Users/davidabn/PMC-OS-FIRST/web/src/App.tsx` (ErrorBoundary component)
- Console logging for critical errors only

**Logs:**
- Browser console only
- No centralized logging service (CloudWatch, Stackdriver, etc.)
- Error messages logged to console during session initialization
- Application crash logging via Error Boundary

## CI/CD & Deployment

**Hosting:**
- Vercel - Static site deployment with CI/CD enabled
- Build command: `tsc -b && vite build`
- Output directory: `/Users/davidabn/PMC-OS-FIRST/web/dist/`
- Preview mode: `vite preview`

**CI Pipeline:**
- Vercel automatic deployments (git-based)
- Type checking: TypeScript compilation (`tsc -b`)
- Linting: ESLint checks via `npm run lint`
- No explicit test pipeline (no test framework in package.json)

**Source Control:**
- Git repository at `/Users/davidabn/PMC-OS-FIRST/.git`
- Main branch deployment target (inferred from GSD context)

## Environment Configuration

**Required env vars (Client-side):**
- `VITE_SUPABASE_URL` - Supabase project base URL
- `VITE_SUPABASE_ANON_KEY` - Public Supabase anonymous key (safe for client)

**Location of current config:**
- `.env.local` file (local development): `/Users/davidabn/PMC-OS-FIRST/web/.env.local`
- Vercel environment variables (production) - Not visible in repo

**Secrets location:**
- `.env.local` - Local development only
- Vercel dashboard - Production secrets management

## Webhooks & Callbacks

**Incoming:**
- Evolution API webhook from n8n
  - Endpoint path: `/whatsapp-agent`
  - Trigger: WhatsApp messages received
  - Handler: n8n workflow (not in this app)

**Outgoing:**
- None detected in application code
- n8n handles outgoing integrations (Google Sheets updates, Supabase inserts)

## Real-Time Capabilities

**Supabase Real-Time:**
- Capabilities available but not explicitly used in current implementation
- Authentication state changes monitored: `supabase.auth.onAuthStateChange()`
- Potential for future PostgreSQL LISTEN/NOTIFY integration

## Data Import/Export

**Import Sources:**
- Google Forms → Google Sheets → n8n → Supabase
- CSV file processing via Node.js scripts: `/Users/davidabn/PMC-OS-FIRST/scripts/fix-canal-de-venda.mjs`

**Export Patterns:**
- CSV exports: `/Users/davidabn/PMC-OS-FIRST/reunioes_2025.csv`, `/reunioes_2026.csv`
- Supabase query results to browser (via @supabase/supabase-js)

---

*Integration audit: 2026-03-28*
