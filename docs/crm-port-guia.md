# Guia de port — "PMC · CS Manager" para o painel admin do PMC OS

Referência única para portar as telas do sistema da Mayara. **Leia antes de mexer
em qualquer arquivo.**

- **Origem:** `/Users/davidabn/pmc-crm/Gestão de Clientes - PMC/src/`
  (app TanStack Start, feito no Lovable, 100% localStorage)
- **Destino:** `/Users/davidabn/pmc-crm/web/src/` (PMC OS: React 19 + Vite +
  react-router 7 + Supabase + Tailwind v4)

## Princípio

**Preservar a UI e a lógica dela; trocar só a plataforma.** O desenho de produto
foi validado com o time de CS numa reunião — não redesenhe telas, não renomeie
rótulos, não "melhore" fluxos por conta própria. Se algo parecer errado,
implemente como está e sinalize no relatório final.

O JSX e as classes Tailwind devem ser copiados o mais literalmente possível.

## A camada de dados já existe

`web/src/lib/crm/` já está pronta e testada contra o banco. **Não a reescreva.**
Os imports continuam idênticos aos do original:

```ts
import { useClientes, useAtividades, createAtividade, cicloDoCliente } from "@/lib/crm/storage"
import { CS_LIST, type Cliente } from "@/lib/crm/types"
import { formatBR } from "@/lib/crm/format"
import { alertasEntrega } from "@/lib/crm/alertas-catalogo"
```

Módulos disponíveis: `storage` (barril), `store`, `derivados`, `sessao`,
`equipe`, `mappers`, `types`, `jornada`, `alertas-catalogo`, `alertas-marcacoes`,
`ciclo-entregas`, `fechamento-ciclo`, `preparacao`, `format`, `frases`, `saudacoes`.

## Diferenças que EXIGEM adaptação

### 1. Roteamento: TanStack Router → react-router 7

| Origem | Destino |
| --- | --- |
| `createFileRoute("/x")({ component })` | `export default function XPage()` — a rota já está registrada em `App.tsx` |
| `<AppShell>{...}</AppShell>` | **remover**: o `DashboardLayout` do PMC OS já envolve a página |
| `useSearch()` / `validateSearch` | `useSearchParams()` de `react-router-dom` |
| `useNavigate()` do TanStack | `useNavigate()` de `react-router-dom` (assinatura diferente: `navigate("/crm/atividades?aba=rotinas")`) |
| `<Link to="/x" search={{...}}>` | `<Link to="/x?...">` de `react-router-dom` |
| `head: () => ({ meta })` | remover (o PMC OS não usa) |
| `useServerFn(fn)` | remover a chamada de IA por enquanto; deixe um TODO e um fallback estático |

A página exportada deve ser `export default`, porque `App.tsx` faz
`lazy(() => import("@/pages/crm/<slug>"))`.

### 2. As páginas já existem como stub

Em `web/src/pages/crm/` há um arquivo por aba com um placeholder. **Substitua o
conteúdo**, mantendo o nome do arquivo e o `export default`.

### 3. Mutações agora são assíncronas

No original tudo era síncrono sobre localStorage. Agora `createAtividade`,
`concluirAtividade`, `updateCliente` etc. retornam `Promise`.

- Chame com `await` dentro de handlers `async`, ou `void fn().catch(...)`.
- **Não** precisa atualizar estado local depois: a mutação invalida o cache do
  React Query e os hooks re-renderizam sozinhos.
- Em erro, mostre `toast.error(...)` — `import { toast } from "sonner"`
  (o `<Toaster>` já está montado globalmente).

### 4. `CS_LIST` / `PROFILE_LIST` / `USUARIOS_DEFAULT` chegam vazios no 1º render

Vêm da tabela `mentores` de forma assíncrona. Trate lista vazia sem quebrar
(nada de `CS_LIST[0].nome`). Não é preciso spinner: preenche no render seguinte.

### 5. Perfil e permissões

- `useProfile()` continua existindo: devolve `[csEmFoco, setCs, montado]`.
  Para uma CS é ela mesma; para a coordenação é a CS que ela escolheu ver.
- `isCS`, `getRole`, `isAdmin`, `canSee` continuam funcionando, mas agora leem
  o RBAC real do PMC OS.
- **Remova qualquer UI de senha, "trocar usuário", "sair" ou seleção de perfil
  na entrada** — isso é da sessão do PMC OS.
- O seletor de CS da coordenação (ver a visão de outra pessoa) **permanece**.

### 6. Identidade visual

Os tokens (`--primary`, `--status-*`, `bg-card`, `text-muted-foreground`) são os
mesmos nos dois projetos: **classes de cor não mudam**. Ajuste só:

- **Raio:** o original usa `rounded-[10px]` / `rounded-xl` fixos. Use as classes
  de raio do PMC OS (`rounded-lg`, `rounded-xl`), que herdam `--radius`.
- **Fonte:** não declare família; o PMC OS já aplica Geist globalmente.
- Mantenha o idioma visual do PMC OS onde for natural: cabeçalhos com
  `text-[11px] font-bold uppercase tracking-[0.25em] text-primary`.

### 7. Ícones

O original importa de `lucide-react`, que **está instalado** no PMC OS — pode
manter. (`@/components/ui/icons` é um pacote SVG próprio usado pela sidebar;
não é obrigatório aqui.)

### 8. Componentes de UI

O CRM quase não usa `@/components/ui`. Se precisar de algo que não existe em
`web/src/components/ui/`, prefira replicar com Tailwind a instalar dependência.
`Badge` e `Filters` já foram portados para `web/src/components/crm/`.

## Regras rígidas

1. **Não** invente dado nem valor default que mascare ausência de informação.
   Campo vazio mostra vazio ou "—".
2. **Não** reintroduza `localStorage` para dado de negócio.
3. **Não** mexa em `web/src/lib/crm/**` — se faltar algo lá, relate em vez de
   contornar na tela.
4. Ao terminar, `npx tsc --noEmit -p tsconfig.app.json` (rodando em `web/`) tem
   que passar limpo.
5. Comentários em português, explicando **por que**, não o que o código faz.

## Ambiente

- DEV: `npm run dev` em `web/` já aponta para o Supabase de desenvolvimento.
- Login de teste: `dono@rafaelgaldino.com.br` / `dev123456` (super admin).
- O DEV está semeado: 41 clientes cobrindo os 4 trimestres, pós-programa,
  pré-jornada e 3 sem data de entrada; 200 atividades em todos os status;
  gargalos, projetos e manual. Ver `scripts/seed-crm-dev.sql`.
