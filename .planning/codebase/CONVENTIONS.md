# Coding Conventions

**Analysis Date:** 2026-03-28

## Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (e.g., `button.tsx`, `dashboard-layout.tsx`)
- Pages: kebab-case with `.tsx` extension (e.g., `client-dashboard.tsx`, `admin-dashboard.tsx`)
- Utilities: kebab-case with `.ts` extension (e.g., `use-mobile.ts`)
- Hooks: kebab-case prefixed with `use-` (e.g., `use-mobile.ts`, `useIsMobile()`)

**Functions:**
- React components: PascalCase (e.g., `function LoginPage()`, `function Card()`)
- Regular functions: camelCase (e.g., `handleLogin`, `fetchMeetings`)
- Hook functions: camelCase starting with `use` (e.g., `useIsMobile()`)
- Handler functions: `handle{Action}` pattern (e.g., `handleLogin`, `handleSave`)
- Async functions: camelCase, typically wrapped in `async function` (e.g., `async function initialize()`)

**Variables:**
- React state: camelCase (e.g., `session`, `loading`, `searchTerm`)
- Constants: SCREAMING_SNAKE_CASE for immutable values (e.g., `MOBILE_BREAKPOINT`, `MULTIPLICADOR_LEVELS`)
- Type discriminator objects: Record<EnumType, string> mapping (e.g., `ENGAGEMENT_LABELS`, `ENGAGEMENT_CLASSES`)
- Props/parameters: camelCase (e.g., `className`, `isAdmin`, `session`)

**Types:**
- Interfaces: PascalCase with no prefix (e.g., `interface DashboardLayoutProps`, `interface Meeting`)
- Type discriminator unions: camelCase values in literal unions (e.g., `'cliente_novo' | 'ativo_alto'`)
- Enum-like unions: PascalCase values or lowercase values depending on context (see `NivelEngajamento`)
- Generic type params: Single uppercase letter or PascalCase (e.g., `Record<string, T>`)

## Code Style

**Formatting:**
- Indentation: 2 spaces (enforced by project setup)
- Line length: No strict limit, but lines are typically under 100 characters
- Quotes: Double quotes for strings throughout (e.g., `"client-dashboard"`)
- Semicolons: Required at end of statements
- Trailing commas: Used in multi-line objects and arrays

**Example formatting from `button.tsx`:**
```typescript
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-border bg-background hover:bg-muted",
      },
    },
  }
)
```

**Linting:**
- Tool: ESLint with TypeScript support
- Config: `eslint.config.js` (flat config format)
- Rules enforced:
  - Recommended rules from `@eslint/js`
  - Recommended rules from `typescript-eslint`
  - React hooks best practices via `eslint-plugin-react-hooks`
  - React refresh best practices via `eslint-plugin-react-refresh`

**Command:** `npm run lint` lints all TypeScript and TSX files

## Import Organization

**Order:**
1. React and core library imports (e.g., `import { useEffect, useState } from "react"`)
2. Third-party libraries (e.g., `import { supabase } from "@supabase/supabase-js"`)
3. Type imports (e.g., `import type { Session } from "@supabase/supabase-js"`)
4. Internal absolute imports (e.g., `import { supabase } from "@/lib/supabase"`)
5. Internal component imports (e.g., `import { Card, CardContent } from "@/components/ui/card"`)
6. Internal utility imports (e.g., `import { cn } from "@/lib/utils"`)
7. Icon imports organized by source (e.g., grouped imports from icons)

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Always use `@/` prefix for internal imports, never relative paths like `../../`

**Example import pattern from `mentores.tsx`:**
```typescript
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CalendarIcon as Calendar,
  SearchIcon as Search,
  FilterIcon as Filter,
} from "@/components/ui/icons"
import { motion } from "framer-motion"
```

## Error Handling

**Patterns:**
- Try-catch blocks for async operations with proper error propagation
- Errors from database operations checked via `if (error) throw error` pattern
- Console.error for logging errors before state update in catch blocks
- Error messages displayed to users through state (e.g., `setError(err.message)`)
- Optional chaining for safe property access (e.g., `session?.user?.email`)

**Example from `login.tsx`:**
```typescript
try {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
} catch (err: any) {
  setError(err.message || "Erro ao fazer login")
} finally {
  setLoading(false)
}
```

**Example from `client-dashboard.tsx`:**
```typescript
const { data: clientEntry, error: clientError } = await supabase
  .from('clientes_entrada_new')
  .select('id_cliente')
  .eq('id_cliente', resolvedClientId)
  .maybeSingle()

if (clientError) throw clientError
```

## Logging

**Framework:** `console` object directly

**Patterns:**
- `console.error()` for errors (e.g., `console.error("Session check error:", err)`)
- `console.error()` for lifecycle events in error boundaries (e.g., `console.error("APP CRASH:", error, errorInfo)`)
- No info/debug/warning logs found in codebase
- Errors typically logged in catch blocks before state updates

## Comments

**When to Comment:**
- Comments are minimal throughout codebase
- JSDoc/TSDoc not actively used in production code
- Comments used for:
  - Error boundary explanation (e.g., `// Error Boundary to catch any component crashes`)
  - Complex filtering logic or business rules
  - Non-obvious state management patterns

## Function Design

**Size:** Functions vary in size, with page components being larger (200-400 lines) and utility functions small

**Parameters:**
- Props passed as single object with destructuring (e.g., `{ className, variant, size, asChild }`)
- Component props follow interface definition pattern (e.g., `interface DashboardLayoutProps`)
- Async function parameters typed explicitly

**Return Values:**
- React components: JSX.Element (implicit)
- Hooks: Typed return values (e.g., `useIsMobile()` returns `boolean`)
- Regular functions: Explicit return type annotations in TypeScript

## Module Design

**Exports:**
- Named exports for UI components and utilities (e.g., `export { Button, buttonVariants }`)
- Default exports for page components (e.g., `export default function MentoresPage()`)
- Type exports using `type` keyword (e.g., `export type { Session }`)

**Barrel Files:**
- Not extensively used in this codebase
- Direct imports from component files preferred

**Component Structure:**
- shadcn components composed of sub-components (Card, CardHeader, CardContent, CardFooter)
- Each sub-component is a separate exported function in same file
- Variants handled via CVA (class-variance-authority) for Tailwind composition

**Example from `card.tsx`:**
```typescript
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
```

## Type Safety

**Strict Mode:** Enabled in `tsconfig.app.json`
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedSideEffectImports: true`

**Type Usage:**
- Interface for component props (e.g., `interface DashboardLayoutProps`)
- Type unions for discriminated unions (e.g., `type NivelEngajamento = 'cliente_novo' | 'ativo_alto'`)
- `any` avoided in favor of explicit typing
- Type imports use `import type` syntax (e.g., `import type { Session }`)

## Props Spreading and Data Attributes

**Data Attributes:**
- Components use `data-slot` attribute for internal styling/selection (e.g., `data-slot="button"`, `data-slot="card"`)
- Variant attributes also stored as data attributes (e.g., `data-variant={variant}`, `data-size={size}`)
- Enables component theming without class name conflicts

**Example from `button.tsx`:**
```typescript
<Comp
  data-slot="button"
  data-variant={variant}
  data-size={size}
  className={cn(buttonVariants({ variant, size, className }))}
  {...props}
/>
```

---

*Convention analysis: 2026-03-28*
