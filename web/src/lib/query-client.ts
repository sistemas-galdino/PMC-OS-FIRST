import { QueryClient } from "@tanstack/react-query"

/**
 * QueryClient único da aplicação.
 *
 * Fica fora do main.tsx porque as mutações do CRM são funções soltas
 * (createAtividade, concluirAtividade…) chamadas de dentro de handlers,
 * não de hooks — elas precisam invalidar o cache sem acesso ao contexto do
 * React. Essa é a mesma assinatura que os componentes portados esperam.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
