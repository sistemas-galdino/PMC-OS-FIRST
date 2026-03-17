# Black Eagle — Backlog de Tasks

## Sprint 1: Fundação, Auth e Schema (V2)
- [x] **Task 1.1:** Setup do projeto React + Vite + TypeScript.
- [x] **Task 1.2:** Configuração do Shadcn/UI e definição do tema "Black Eagle Neon" (CSS Variables).
- [x] **Task 1.3:** Setup do Supabase Client e implementação do Fluxo de Login.
- [x] **Task 1.4:** Aplicação de Migrations para as novas tabelas de autogestão no Supabase V2 (`cliente_produtos`, `cliente_canais`, `cliente_metas`).
- [x] **Task 1.5:** Configuração de RLS (Row Level Security) para garantir isolamento de dados entre clientes.

## Sprint 2: PMC OS — Painel Interno
- [x] **Task 2.1:** Implementação do Layout Principal (Sidebar Dark + Área de Conteúdo).
- [x] **Task 2.2:** Dashboard Principal: Cards de métricas (consumindo `entrada_clientes`).
- [x] **Task 2.3:** Tela de Mentores: Grid de "Clientes Atendidos" com status de comparecimento (referência `reunia-mentores.png`).
- [x] **Task 2.4:** Filtros Operacionais: Busca por cliente, empresa, estado e CS responsável.

## Sprint 3: Portal do Cliente — Dashboard de Gestão
- [x] **Task 3.1:** Dashboard de Faturamento: Gráfico circular de progresso da meta (referência `dashboard-principal-métricas.png`).
- [x] **Task 3.2:** Módulo de Produtos: Listagem e Cadastro de produtos com badges de recorrência (referência `cadastro-produtos.png`).
- [x] **Task 3.3:** Módulo de Canais: Grids de Canais Pagos vs Orgânicos (referência `canais-aquisicao-metricas.png`).
- [x] **Task 3.4:** Checklist de Ações: Sincronização automática das tarefas geradas nas reuniões de mentoria.

## Sprint 4: Refinamento e Delivery
- [ ] **Task 4.1:** Polimento de UI: Micro-animações de entrada e transições de página (Skill Frontend Design).
- [ ] **Task 4.2:** Responsividade: Ajuste do portal para acesso mobile (opcional, conforme demanda).
- [ ] **Task 4.3:** Pipeline Vercel: Configuração de Deploy Automático e variáveis de ambiente (URL Supabase, Anon Key).
- [ ] **Task 4.4:** Documentação Final: Guia de uso para mentores e onboarding de clientes.
