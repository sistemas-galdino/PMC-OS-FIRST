/**
 * Ponto de entrada da camada de dados do CS Manager.
 *
 * No sistema original este arquivo tinha 1.624 linhas e era, ao mesmo tempo,
 * o banco (localStorage), o seed de 20 clientes fictícios, a autenticação
 * (senhas em localStorage) e as regras de negócio. Aqui ele é só um barril:
 * cada responsabilidade foi para o seu módulo, e o caminho de import que os
 * 23 componentes portados usam ("@/lib/crm/storage") continua válido.
 *
 *   store.ts      → dados (Supabase + React Query) e mutações
 *   derivados.ts  → regras derivadas puras (ciclos, entregas, checkpoints)
 *   sessao.ts     → quem é a pessoa e o que ela pode ver (auth + RBAC do PMC OS)
 *   equipe.ts     → o time, vindo de `mentores`
 *   mappers.ts    → tradução entre linhas do banco e tipos de domínio
 *
 * O que desapareceu de propósito: seed(), as senhas (getPassword,
 * setPasswordFor, checkPassword, clearPassword) e recordLogin — tudo isso
 * agora é a autenticação do PMC OS.
 */

export * from "./store"
export * from "./derivados"
export * from "./sessao"
export * from "./equipe"
export { CS_LIST, PROFILE_LIST, USUARIOS_DEFAULT } from "./types"
