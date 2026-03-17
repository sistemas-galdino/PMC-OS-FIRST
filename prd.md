# Black Eagle — PMC OS & Portal do Cliente (PRD)

---

## 1. Visão Geral
Sistema dual para gestão do Programa Multiplicador de Crescimento (PMC). 
*   **PMC OS:** Painel administrativo para a Black Eagle gerenciar clientes, mentores e métricas globais.
*   **Portal do Cliente:** Dashboard de autogestão para o empresário monitorar faturamento, produtos, canais e planos de ação.

## 2. Objetivos Estratégicos
*   Centralizar a "Fonte da Verdade" no Supabase (Projeto: **PMC-OS-V2**).
*   Proporcionar transparência para o cliente sobre sua evolução, faturamento e tarefas (Planos de Ação).
*   Automatizar a visualização de indicadores estratégicos que hoje dependem de processamento manual ou automações isoladas.

## 3. Personas
*   **Admin/Mentor (Black Eagle):** Visualiza a saúde da base de clientes (Churn, NPS), reuniões pendentes e performance por Mentor/CS.
*   **Cliente (Empresário):** Gerencia seu próprio negócio dentro do portal, cadastrando produtos, canais de aquisição e acompanhando metas.

## 4. Requisitos Funcionais

### 4.1 PMC OS (Sistema Interno)
*   **Dashboard Global:** Cards com métricas críticas: Total de Clientes, Clientes Ativos, Churn Rate e NPS Médio.
*   **Visão Operacional:** Listagem de "Pendentes Onboarding", Turmas por Estado e Início 2026.
*   **Gestão de Mentores:** Visualização centralizada de reuniões por mentor, taxa de comparecimento e NPS individual por mentor.
*   **Performance por CS:** Ranking de performance e micro-indicadores por responsável (Geovana, Gabriela, Fernanda, Francielly).
*   **Análise de Dados:** Gráficos de distribuição por Estado, Nicho e motivos de Cancelamento.

### 4.2 Portal do Cliente (Dashboard Externo)
*   **Métricas de Faturamento:** Visualização de Faturamento Anual vs Meta 2026, Receita Mensal e número de Colaboradores.
*   **Gestão de Produtos:** Interface para cadastrar e editar catálogo de produtos (Valor, Tipo de Recorrência, Volume de Vendas).
*   **Canais de Aquisição:** Gestão de canais de tráfego (Orgânico vs Pago) com métricas de investimento.
*   **Plano de Ação:** Checklist de tarefas geradas a partir das reuniões de mentoria (puxando da coluna `acoes_cliente` da tabela `reunioes_mentoria`).
*   **Progresso da Jornada:** Indicador visual de evolução (ex: Multiplicador 30K -> 70K).

## 5. Arquitetura de Dados (V2)
Utilizaremos o projeto `hqczwextifessaztyyyk` no Supabase.

### Tabelas Existentes (Base):
*   `clientes_formulario`: Dados brutos de entrada.
*   `entrada_clientes`: Operação estruturada.
*   `reunioes_mentoria`: Histórico de encontros e ações.
*   `mentores`: Cadastro da equipe de mentoria.

### Novas Tabelas Necessárias (Autogestão):
1.  `cliente_produtos`: Cadastro de ofertas do empresário.
2.  `cliente_canais`: Fontes de tráfego e investimento.
3.  `cliente_metas`: Definição de objetivos financeiros por cliente.
4.  `cliente_acoes`: Extensão do checklist de ações das reuniões.

## 6. Stack Técnica e Design
*   **Frontend:** React (Vite) + TypeScript.
*   **UI/Components:** Shadcn/UI (Estética Premium: Dark Sidebar, Neon Green accents).
*   **Estilização:** CSS Vanilla para refinamento estético de alta fidelidade.
*   **Auth:** Supabase Auth com RLS (Row Level Security) rigoroso.
*   **Deploy:** Vercel (Configurado para CI/CD).
*   **Design Flow:** Baseado nos prints de referência (Alta fidelidade, menos "cara de IA").
