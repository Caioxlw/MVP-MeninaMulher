# MVP Menina Mulher 🌸

Ambiente de desenvolvimento full-stack moderno construído com **Express.js**, **React (Vite)**, **TypeScript** e **PostgreSQL** gerenciado via **Prisma ORM**, com esteira completa de **CI/CD no GitHub Actions** e deploy automatizado na **Oracle Cloud Infrastructure (OCI)** via **Docker Compose**.

---

## 🏛️ Estrutura do Projeto

O projeto é organizado com separação clara de responsabilidades entre frontend, backend e automação de CI/CD:

```
MVP-MeninaMulher/
├── .agents/
│   └── skills/
│       └── git-branch/        # Skill de padronização e automação de branches
├── .github/
│   ├── ISSUE_TEMPLATE/        # Templates padronizados de Epic, PBI, Task e Bug
│   ├── workflows/             # Pipelines de CI/CD (Lint, Testes, Build, SAST e Deploy OCI)
│   ├── dependabot.yml         # Monitoramento semanal de dependências
│   └── pull_request_template.md
├── .husky/                    # Git hooks (formatação automática pre-commit com lint-staged)
├── .vscode/                   # Configurações padronizadas do editor (formatOnSave)
├── backend/                   # API REST com Express.js, Prisma e Vitest
│   ├── prisma/
│   │   └── schema.prisma      # Modelos de dados e migrações do PostgreSQL
│   ├── src/
│   │   ├── __tests__/         # Testes de integração da API (Supertest + Vitest)
│   │   ├── lib/
│   │   │   └── prisma.ts      # Instância singleton do PrismaClient
│   │   └── server.ts          # Servidor Express e endpoints da API
│   ├── Dockerfile             # Build multi-stage de produção do Backend
│   └── tsconfig.json          # Configuração TypeScript do Node
├── frontend/                  # Aplicação Web com React, Vite, TypeScript e Vitest
│   ├── src/
│   │   ├── __tests__/         # Testes de componentes (React Testing Library)
│   │   ├── App.tsx            # Dashboard de status e boas-vindas do MVP
│   │   └── main.tsx           # Ponto de entrada React
│   ├── Dockerfile             # Build multi-stage com Nginx para produção
│   ├── nginx.conf             # Proxy reverso (/api -> backend:3001) e suporte SPA
│   └── vite.config.ts         # Configuração do Vite e Vitest
├── docker-compose.yml         # Orquestração de containers (PostgreSQL 18 + Backend + Frontend)
├── package.json               # Orquestrador de scripts raiz (workspaces)
├── CONTRIBUTING.md            # Guia de contribuição e fluxo hierárquico de branches
└── README.md                  # Documentação do projeto
```

---

## 🚀 Como Executar

### 1. Pré-requisitos

- **Node.js**: v18+ (recomendado v22+)
- **PostgreSQL 18**: Serviço local ativo na porta `5432` **OU** **Docker** (`docker compose up -d postgres`)

### 2. Configurar o Banco de Dados

Abra o arquivo [`backend/.env`](file:///backend/.env) (crie a partir de [`backend/.env.example`](file:///backend/.env.example) se necessário) e ajuste a senha do seu usuário `postgres`:

```env
PORT=3001
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/mvp_menina_mulher?schema=public"
```

Em seguida, aplique as migrações iniciais do Prisma:

```bash
npm run db:migrate
```

### 3. Iniciar o Ambiente de Desenvolvimento

Execute na raiz do projeto para subir simultaneamente o **Backend** e o **Frontend**:

```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **Health Check da API**: [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 📜 Scripts Disponíveis na Raiz

| Comando                | Descrição                                                                      |
| ---------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`          | Inicia backend (porta 3001) e frontend (porta 5173) simultaneamente            |
| `npm run dev:backend`  | Inicia apenas o servidor Express com `tsx watch`                               |
| `npm run dev:frontend` | Inicia apenas o frontend React com `vite`                                      |
| `npm run build`        | Compila TypeScript do backend (`tsc`) e faz o build do frontend (`vite build`) |
| `npm test`             | Executa a suíte de testes automatizados (`vitest`) no backend e no frontend    |
| `npm run lint`         | Executa análise estática (`oxlint`) no backend e no frontend                   |
| `npm run format`       | Formata automaticamente os arquivos do repositório com Prettier                |
| `npm run format:check` | Verifica se todos os arquivos seguem o padrão de formatação do Prettier        |
| `npm run db:migrate`   | Executa as migrações do Prisma em desenvolvimento (`prisma migrate dev`)       |
| `npm run db:deploy`    | Aplica migrações pendentes em CI/Produção (`prisma migrate deploy`)            |
| `npm run db:generate`  | Regenera o cliente Prisma tipado (`prisma generate`)                           |
| `npm run db:studio`    | Abre o painel visual do Prisma Studio no navegador                             |

---

## 🐳 Execução com Docker Compose (Produção / OCI)

Para subir toda a aplicação containerizada (PostgreSQL 18 + Backend Express + Frontend Nginx na porta `80`):

```bash
docker compose up -d --build
```

---

## 🔌 Endpoints da API

- `GET /api/info` - Metadados e versão da API
- `GET /api/health` - Verificação de integridade da API e conectividade com o PostgreSQL
- `GET /api/users` - Exemplo de consulta com Prisma ORM

---

## 🤝 Como Contribuir e Padrão de Branches

O fluxo de criação de branches (`<tipo>/<numero>-<slug-kebab-case>`), a hierarquia **Branch Geral (PBI/Epic) $\rightarrow$ Branch Específica (Task)** e o guia de uso da skill automatizada [`git-branch`](file:///.agents/skills/git-branch/SKILL.md) estão documentados em detalhes no arquivo [CONTRIBUTING.md](file:///CONTRIBUTING.md).
