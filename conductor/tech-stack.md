# Black Eagle — Tech Stack

## 1. Frontend
*   **Framework:** React 19 (Vite)
*   **Language:** TypeScript
*   **Routing:** React Router 7
*   **Styling:** 
    *   Tailwind CSS 4 (Styling utility)
    *   Shadcn/UI (Component base)
    *   Radix UI (Primitives)
    *   Lucide React (Icons)
*   **Data Visualization:** Recharts
*   **Animations:** 
    *   Framer Motion or Tailwind-animate (Cascading effects & transitions)

## 2. Backend & Infrastructure
*   **Platform:** Supabase
    *   **Database:** PostgreSQL
    *   **Authentication:** Supabase Auth (JWT)
    *   **Security:** Row Level Security (RLS)
*   **Automations:** n8n (External workflows & data synchronization)

## 3. Database Schema (Existing)
*   `clientes_formulario`: Raw entry data.
*   `clientes_entrada`: Structured operational data.
*   `reunioes_mentoria`: Session logs and action items.

## 4. Development & Deployment
*   **Deployment:** Vercel (CI/CD)
*   **Package Manager:** npm
