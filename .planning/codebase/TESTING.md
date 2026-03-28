# Testing Patterns

**Analysis Date:** 2026-03-28

## Test Framework

**Status:** No testing framework currently configured

**Not Detected:**
- No Jest configuration (`jest.config.*` not present)
- No Vitest configuration (`vitest.config.*` not present)
- No test files found (no `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx` files)
- No testing libraries in `package.json` (no Jest, Vitest, Testing Library, Cypress)
- No test scripts in `package.json`

**Dependencies for Future Testing:**
- Available: `@testing-library/react` can be added
- ESLint configured to support TypeScript testing patterns once framework is added
- TypeScript strict mode (`tsconfig.app.json`) supports test type definitions

## Test File Organization

**Current State:** Not applicable - no tests present

**Recommended Structure (for future implementation):**
- Co-located tests: `__tests__/` directories alongside source files
  - Components: `src/components/__tests__/button.test.tsx`
  - Pages: `src/pages/__tests__/client-dashboard.test.tsx`
  - Hooks: `src/hooks/__tests__/use-mobile.test.ts`
  - Utils: `src/lib/__tests__/utils.test.ts`

**Alternative Structure:**
- Separate test directory: `tests/` at project root
  - Mirrors source structure: `tests/components/ui/button.test.tsx`

## Test Structure

**Recommended Pattern (not currently used):**

Based on React + TypeScript best practices with Vitest/Jest:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
  })

  it('applies variant class correctly', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button', { name: /delete/i })
    expect(button).toHaveClass('bg-destructive')
  })
})
```

## Mocking

**Framework:** Not currently configured

**Recommended Patterns for Implementation:**

**Mocking Supabase (for database operations):**
```typescript
import { vi } from 'vitest'

const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: '123', name: 'Test Client' },
          error: null
        })
      })
    })
  })
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))
```

**Mocking React Router:**
```typescript
import { MemoryRouter } from 'react-router-dom'

describe('Navigation', () => {
  it('navigates on button click', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    // Test navigation
  })
})
```

**What to Mock:**
- Supabase client calls (database, auth)
- External API calls
- Router navigation
- framer-motion animations (can use `vi.mock` or testing library utilities)

**What NOT to Mock:**
- UI component libraries (shadcn/ui)
- Utility functions like `cn()`
- React hooks (useEffect, useState) - test behavior instead
- CSS/Tailwind classes - test DOM output instead

## Fixtures and Factories

**Status:** Not currently configured

**Recommended Pattern:**

Test data factories for common data shapes:

```typescript
// tests/factories/client.factory.ts
export const createMockClient = (overrides = {}) => ({
  id_cliente: '123',
  nome_cliente_formatado: 'Test Client',
  nome_empresa_formatado: 'Test Company',
  status_atual: 'Ativo no Programa',
  nivel_engajamento: 'ativo_alto',
  ...overrides
})

export const createMockMeeting = (overrides = {}) => ({
  id_unico: 'meeting-123',
  mentor: 'John Doe',
  nome_cliente_formatado: 'Client Name',
  data_reuniao: '2026-03-28',
  cliente_compareceu: true,
  nps: 9,
  ...overrides
})
```

**Location (Recommended):**
- `tests/fixtures/` or `src/__tests__/fixtures/`
- One factory per entity type
- Import in test files as needed

## Coverage

**Requirements:** None enforced

**Current State:** No coverage tracking configured

**Recommended Setup (for future):**
```bash
npm run test -- --coverage
```

Would generate coverage in `coverage/` directory (should be `.gitignore`d)

**Coverage targets to consider:**
- Utilities: 90%+ (pure functions)
- Components: 80%+ (UI logic)
- Pages: 60%+ (integration-heavy)
- Integration/E2E: Focus on critical user paths

## Test Types

**Unit Tests (Recommended Implementation):**
- Scope: Individual components and utility functions
- Tools: Vitest + React Testing Library
- Focus areas:
  - Component rendering with different props
  - User interactions (clicks, form input)
  - Conditional rendering
  - Data formatting in utilities

**Example structure:**
```typescript
// Button unit test
describe('Button component', () => {
  it('renders with different sizes')
  it('applies correct variant styles')
  it('handles disabled state')
  it('forwards onClick handler')
})
```

**Integration Tests (Recommended Implementation):**
- Scope: Multiple components working together, with mocked Supabase
- Tools: Vitest + React Testing Library
- Focus areas:
  - Page-level component interactions
  - Form submission flows
  - Data fetching and display
  - Filtering and search functionality

**Example structure:**
```typescript
// ClientsPage integration test
describe('ClientsPage', () => {
  it('fetches and displays client list', async () => {
    render(<ClientsPage />)
    await waitFor(() => {
      expect(screen.getByText('Test Client')).toBeInTheDocument()
    })
  })

  it('filters clients by search term', async () => {
    render(<ClientsPage />)
    const input = screen.getByPlaceholderText(/search/i)
    await userEvent.type(input, 'Test')
    expect(screen.getByText('Test Client')).toBeInTheDocument()
  })
})
```

**E2E Tests (Not currently used):**
- Status: Not implemented
- Recommended tool if needed: Playwright or Cypress
- Focus: Critical user journeys (login, creating records, navigating)

## Common Patterns

**Async Testing (Pattern to implement):**

Using `waitFor` for async operations:
```typescript
import { waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('loads data on mount', async () => {
  render(<ClientDashboard />)

  await waitFor(() => {
    expect(screen.getByText(/loading/i)).not.toBeInTheDocument()
  })

  expect(screen.getByText('Client Name')).toBeInTheDocument()
})
```

Testing with `userEvent` for realistic interactions:
```typescript
it('updates value on input change', async () => {
  const user = userEvent.setup()
  render(<LoginPage />)

  const input = screen.getByLabelText(/email/i)
  await user.type(input, 'test@example.com')

  expect(input).toHaveValue('test@example.com')
})
```

**Error Testing (Pattern to implement):**

Testing error boundaries:
```typescript
it('displays error message on auth failure', async () => {
  mockSupabase.auth.signInWithPassword.mockRejectedValueOnce(
    new Error('Invalid credentials')
  )

  render(<LoginPage />)
  const button = screen.getByRole('button', { name: /login/i })
  await userEvent.click(button)

  await waitFor(() => {
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
  })
})
```

Testing error boundary component:
```typescript
it('catches rendering errors', () => {
  const ThrowError = () => {
    throw new Error('Test error')
  }

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  )

  expect(screen.getByText(/critical error/i)).toBeInTheDocument()
})
```

## Setup and Configuration Recommendations

**Framework Choice:**
- Recommended: Vitest (faster, better ESM support)
- Alternative: Jest with proper ESM configuration

**Install (example with Vitest):**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @vitest/ui  # for UI dashboard
```

**Config file (`vitest.config.ts`):**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Setup file (`src/__tests__/setup.ts`):**
```typescript
import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
```

**Scripts in `package.json`:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Critical Components for Testing

**Priority areas if testing is implemented:**

**High Priority:**
- `src/lib/supabase.ts` - Database client initialization
- `src/pages/login.tsx` - Authentication flow
- `src/pages/client-dashboard.tsx` - Complex data fetching and state
- `src/components/ui/button.tsx` - Reusable component
- Error boundary in `src/App.tsx` - Error handling

**Medium Priority:**
- `src/pages/mentores.tsx` - Complex filtering logic
- `src/pages/clientes.tsx` - Large data table operations
- `src/hooks/use-mobile.ts` - Custom hook logic
- Layout components in `src/components/layout/`

**Current Testing Gaps:**
- No error boundary tests
- No auth flow tests
- No Supabase integration tests
- No component rendering tests
- No async data fetching tests

---

*Testing analysis: 2026-03-28*
