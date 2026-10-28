# MVP Menina Mulher 🌸

Ambiente de desenvolvimento full-stack moderno construído com **Express.js**, **React (Vite)**, **TypeScript** e **PostgreSQL** gerenciado via **Prisma ORM**.

---

## 🏛️ Estrutura do Projeto

O projeto é organizado com separação clara de responsabilidades entre frontend e backend, além de comandos integrados na raiz:

```
MVP-MeninaMulher/
├── .agents/
│   └── skills/
│       └── git-branch/        # Skill de padronização e automação de branches
├── backend/                   # API REST com Express.js e TypeScript
│   ├── prisma/
│   │   └── schema.prisma      # Modelos de dados e configuração do PostgreSQL
│   ├── src/
│   │   ├── lib/
│   │   │   └── prisma.ts      # Instância singleton do PrismaClient
│   │   └── server.ts          # Servidor Express e endpoints da API
│   ├── .env                   # Configurações locais (DATABASE_URL, PORT)
│   ├── .env.example           # Modelo de variáveis de ambiente
│   └── tsconfig.json          # Configuração TypeScript do Node
├── frontend/                  # Aplicação Web com React, Vite e TypeScript
│   ├── src/
│   │   ├── styles/
│   │   │   └── index.css      # Design System moderno, responsivo e glassmorphism
│   │   ├── App.tsx            # Dashboard de status e boas-vindas do MVP
│   │   └── main.tsx           # Ponto de entrada React
│   ├── vite.config.ts         # Configuração do Vite com proxy para /api -> :3001
│   └── index.html             # HTML com fontes Google (Plus Jakarta Sans & Outfit)
├── package.json               # Orquestrador de scripts raiz (concurrently)
├── CONTRIBUTING.md            # Guia de contribuição e fluxo de branches (Skill)
└── README.md                  # Documentação do projeto
```

---

## 🚀 Como Executar

### 1. Pré-requisitos
- **Node.js**: v18+ (testado na v24)
- **PostgreSQL**: Serviço ativo localmente (já em execução na porta `5432` no Windows)

### 2. Configurar o Banco de Dados
Abra o arquivo [`backend/.env`](file:///backend/.env) e ajuste a senha do seu usuário `postgres` local:

```env
PORT=3001
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/mvp_menina_mulher?schema=public"
```

Em seguida, crie o banco de dados e aplique as migrações iniciais do Prisma:
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

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia backend (porta 3001) e frontend (porta 5173) simultaneamente |
| `npm run dev:backend` | Inicia apenas o servidor Express com `tsx watch` |
| `npm run dev:frontend` | Inicia apenas o frontend React com `vite` |
| `npm run build` | Compila TypeScript do backend (`tsc`) e faz o build do frontend (`vite build`) |
| `npm run db:migrate` | Executa as migrações do Prisma (`prisma migrate dev`) |
| `npm run db:generate` | Regenera o cliente Prisma tipado (`prisma generate`) |
| `npm run db:studio` | Abre o painel visual do Prisma Studio no navegador |

---

## 🔌 Endpoints da API

- `GET /api/info` - Metadados e versão da API
- `GET /api/health` - Verificação de integridade da API e conectividade com o PostgreSQL
- `GET /api/users` - Exemplo de consulta com Prisma ORM

---

## 🤝 Como Contribuir e Padrão de Branches

O fluxo de criação de branches (`<tipo>/<numero>-<slug-kebab-case>`), a hierarquia **Branch Geral (PBI/Epic) $\rightarrow$ Branch Específica (Task)** e o guia de uso da skill automatizada [`git-branch`](file:///.agents/skills/git-branch/SKILL.md) estão documentados em detalhes no arquivo [CONTRIBUTING.md](file:///CONTRIBUTING.md).
