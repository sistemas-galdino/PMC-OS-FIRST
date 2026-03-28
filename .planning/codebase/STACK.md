# Technology Stack

**Analysis Date:** 2026-03-28

## Languages

**Primary:**
- TypeScript 5.6.2 - Full application frontend, strict type safety
- JavaScript (ES2023) - Vite build target, utility scripts (Node.js)

**Secondary:**
- SQL - Supabase database migrations and queries
- CSS - Tailwind CSS 4.0.0 with component styling

## Runtime

**Environment:**
- Node.js 22.10.2 (via @types/node) - Development and build
- Vite 6.0.0 - Development server and bundler
- React 19.2.4 - Runtime

**Package Manager:**
- npm (npm 10+) - Primary dependency management
- Lockfile: `package-lock.json` present (`/Users/davidabn/PMC-OS-FIRST/web/package-lock.json`)

## Frameworks

**Core:**
- React 19.2.4 - UI framework, server-side rendering not used
- Vite 6.0.0 - Module bundler and dev server
- React Router 7.13.1 - Client-side routing and navigation

**Styling:**
- Tailwind CSS 4.0.0 - Utility-first CSS framework
- Shadcn/UI 4.0.8 - Pre-built component library
- Radix UI 1.4.3 - Unstyled UI primitive components
- Tailwind Animate 1.4.0 - CSS animation utilities
- Tailwind Merge 3.5.0 - Merge class conflicts

**UI & Animation:**
- Framer Motion 12.38.0 - Advanced animations and transitions
- Lucide React - Icon library (via icons.tsx component wrapper)
- @fontsource-variable/Geist 5.2.8 - Google Font implementation
- @paper-design/shaders-react 0.0.72 - Visual shader effects

**Data Visualization:**
- Recharts 3.8.0 - Chart and graph components

**Testing:**
- ESLint 9.17.0 - Code linting and style enforcement
- TypeScript ESLint 8.18.0 - TypeScript-specific linting
- ESLint React Hooks Plugin 5.0.0 - React hooks rule enforcement
- ESLint React Refresh Plugin 0.4.16 - Vite hot module reload

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.99.2 - Supabase client for database, auth, real-time updates
- react-router-dom 7.13.1 - Application routing (not API routing)
- tailwindcss 4.0.0 - Styling framework (required for dev builds)

**Infrastructure:**
- vite 6.0.0 - Build tooling and dev server
- typescript 5.6.2 - Type checking and compilation
- @vitejs/plugin-react 4.3.4 - JSX and React Fast Refresh support
- @tailwindcss/vite 4.2.1 - Tailwind CSS Vite integration
- postcss 8.4.49 - CSS transformation pipeline
- autoprefixer 10.4.20 - Browser vendor prefixing

**Utilities:**
- clsx 2.1.1 - Conditional className builder
- class-variance-authority 0.7.1 - Component variant management
- globals 15.14.0 - ESLint globals configuration

## Configuration

**Environment:**
- Configuration file: `/Users/davidabn/PMC-OS-FIRST/web/.env.local`
- Required environment variables:
  - `VITE_SUPABASE_URL` - Supabase project URL (hqczwextifessaztyyyk.supabase.co)
  - `VITE_SUPABASE_ANON_KEY` - Public Supabase API key for client-side auth

**Build:**
- `tsconfig.json` - Base TypeScript configuration with path aliases
- `tsconfig.app.json` - Application-specific settings (target: ES2023, strict mode)
- `tsconfig.node.json` - Build tool TypeScript settings
- `vite.config.ts` - Vite build configuration
- `eslint.config.js` - Unified ESLint configuration (ESLint 9.x flat config)
- `components.json` - Shadcn/UI component CLI configuration

## Platform Requirements

**Development:**
- Node.js 22.10.2+
- npm 10.0.0+ (verified with lockfile)
- TypeScript 5.6.2 (installed in devDependencies)
- Tailwind CSS 4.0.0 (CSS engine)

**Production:**
- Deployment: Vercel (CI/CD enabled)
- Output: Static site (SPA) built by Vite to `/dist` directory
- ES2023 JavaScript for modern browsers
- No backend runtime required (client-side only)

---

*Stack analysis: 2026-03-28*
