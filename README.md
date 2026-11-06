# Menina Mulher: Catálogo Online e Pedidos via WhatsApp 🌸

Projeto acadêmico de **Engenharia de Software do IFPE** desenvolvido com a finalidade de resolver um problema real da loja **Menina Mulher**, modernizando a experiência de compra das clientes e a gestão de estoque da loja.

Ambiente de desenvolvimento full-stack moderno construído com **Express.js**, **React (Vite)**, **TypeScript** e **PostgreSQL** gerenciado via **Prisma ORM**, com esteira completa de **CI/CD no GitHub Actions** e deploy automatizado na **Oracle Cloud Infrastructure (OCI)** via **Docker Compose**.

---

## 📌 Contexto e Problema

O problema central está na experiência de venda: a **Menina Mulher** não oferece às clientes um canal visual, simples e automatizado para conhecer as peças e realizar pedidos.

| Aspecto                    | Cenário Atual                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Qual é o problema?**     | A venda depende de conversa e conferência manual por mensagem. Faltam um catálogo com fotos e um pedido já organizado, limitando a experiência da cliente e a diferenciação da loja. |
| **Onde acontece?**         | No atendimento de vendas da loja, principalmente pelo WhatsApp e no contato com clientes pelo celular.                                                                               |
| **Quem é afetado?**        | A empresária, que monta e confere os pedidos manualmente, e as clientes, que têm uma jornada de compra pouco interativa.                                                             |
| **Como é resolvido hoje?** | Os pedidos são tratados por conversa e o estoque é controlado em planilhas separadas (ferramentas gratuitas testadas anteriormente apresentaram limitações).                         |
| **Consequências**          | Atendimento lento e repetitivo, risco de erro ao anotar tamanho, cor e quantidade, compra menos atrativa e falta de diferencial competitivo.                                         |

---

## 👥 Usuários e Público-Alvo

| Perfil                 | Quem é                                                 | Necessidades                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Usuário principal**  | Clientes da loja (compram principalmente pelo celular) | Ver as peças com fotos, preço, tamanhos e cores; montar o pedido com poucos toques; saber o valor total antes de enviar; falar com a loja sem precisar repetir informações.                    |
| **Usuário secundário** | Empresária, dona da loja                               | Manter o catálogo atualizado sem conhecimento técnico; receber pedidos completos e padronizados no WhatsApp; controlar o estoque no próprio sistema com baixa automática ao confirmar pedidos. |

---

## 🎯 Objetivos do Projeto

### Objetivo Geral

Desenvolver um site de catálogo (_landing page_) para a **Menina Mulher** que torne a compra mais fácil e interativa, contando com fotos, catálogo e carrinho de compras, enviando o pedido pronto para o WhatsApp da loja e integrando um controle de estoque simples no mesmo sistema.

### Objetivos Específicos

- Apresentar o catálogo com fotos, preços, tamanhos e cores de forma confortável no celular (_mobile-first_).
- Permitir que a cliente monte o pedido em um carrinho com o valor total calculado automaticamente.
- Gerar automaticamente a mensagem do pedido organizada e abrir o WhatsApp da loja com ela já preenchida.
- Oferecer à empresária um painel administrativo simples para manter produtos, fotos, preços e estoque.
- Garantir o controle de estoque no próprio sistema, realizando a baixa automática quando um pedido é confirmado, sem alterar a rotina de fechamento de vendas pelo WhatsApp.

---

## 💡 Proposta da Solução e Escopo do MVP

A solução consiste em uma vitrine online pensada primeiro para o celular, funcionando como ponto de partida da venda. A cliente navega pelo catálogo, escolhe tamanho e cor, monta o carrinho e, com um toque, abre o WhatsApp da loja com o pedido padronizado (peças, tamanhos, cores, quantidades e total). Não há pagamento online: o fechamento da venda continua na conversa com a empresária.

Por trás do site, um painel administrativo simples permite cadastrar produtos, fotos, preços e controlar o estoque de cada variação de tamanho e cor. Quando a empresária confirma no painel um pedido recebido no WhatsApp, o sistema debita as peças do estoque automaticamente e atualiza a disponibilidade exibida no site.

### Funcionalidades Indispensáveis (Dentro do Escopo)

1. **Catálogo online** com fotos, descrição, preço, tamanhos e cores.
2. **Controle de estoque por tamanho e cor**, exibindo a disponibilidade no site (_disponível_, _últimas unidades_ ou _esgotado_) e bloqueando opções esgotadas.
3. **Carrinho de compras** com adição, remoção, ajuste de quantidade e cálculo do total.
4. **Geração automática da mensagem do pedido** e redirecionamento para o WhatsApp da loja.
5. **Registro e gestão de pedidos** (número único e status), permitindo confirmação ou cancelamento pela empresária com **baixa automática no estoque**.
6. **Painel administrativo protegido por login** para cadastro, edição e ocultação de produtos, fotos, preços e estoque.
7. **Guia de medidas e tamanhos** (conteúdo estático).
8. **Página inicial (_landing page_)** com apresentação da loja e navegação por categorias em versão simplificada.

### Fora do Escopo Inicial

- Pagamento online.
- Recursos avançados de estoque (relatórios, alertas de reposição, gestão de fornecedores e custo de peças).
- Importação automática de planilhas de estoque (possível evolução futura).
- Login e cadastro de clientes.
- Cupons de desconto, avaliações de produtos, provador virtual e vídeos nos produtos.

### Tecnologias Previstas

- **Front-end**: React (Vite) com TypeScript.
- **Back-end**: Node.js com Express.js e TypeScript.
- **Banco de Dados Relacional**: PostgreSQL gerenciado via Prisma ORM.
- **Armazenamento de Mídia**: Serviço em nuvem (ex.: S3 ou Cloudinary), armazenando apenas os links no banco.
- **Integração WhatsApp**: Link de conversa (`wa.me`) com mensagem pré-preenchida.

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
├── docs/
│   ├── documento-de-projeto.md # Documento oficial de escopo, requisitos (RF/RNF) e User Stories
│   └── mer-banco-de-dados.md  # Diagrama Entidade-Relacionamento (MER) e regras do banco
├── backend/                   # API REST com Express.js, Prisma e Vitest
│   ├── prisma/
│   │   └── schema.prisma      # Modelos de dados e migrações do PostgreSQL
│   ├── src/
│   │   ├── __tests__/         # Testes unitários por camada e de integração (Supertest + Vitest)
│   │   ├── controllers/       # Camada HTTP (controllers de entrada e saída)
│   │   ├── lib/               # Utilitários e instância singleton do PrismaClient
│   │   ├── middlewares/       # Middlewares Express (ex.: requireAdminAuth)
│   │   ├── repositories/      # Camada de acesso a dados (isolamento 100% do PrismaClient)
│   │   ├── routes/            # Definição de rotas Express
│   │   ├── services/          # Camada de regras de negócio e validações de domínio
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

### 2. Configurar o Banco de Dados e Variáveis de Ambiente

Abra o arquivo [`backend/.env`](file:///backend/.env) (crie a partir de [`backend/.env.example`](file:///backend/.env.example) se necessário) e ajuste o segredo JWT e a senha do seu usuário `postgres`:

```env
PORT=3001
JWT_SECRET="troque-este-segredo-jwt-em-producao"
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

| Comando                 | Descrição                                                                      |
| ----------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`           | Inicia backend (porta 3001) e frontend (porta 5173) simultaneamente            |
| `npm run dev:backend`   | Inicia apenas o servidor Express com `tsx watch`                               |
| `npm run dev:frontend`  | Inicia apenas o frontend React com `vite`                                      |
| `npm run build`         | Compila TypeScript do backend (`tsc`) e faz o build do frontend (`vite build`) |
| `npm test`              | Executa a suíte de testes automatizados (`vitest`) no backend e no frontend    |
| `npm run test:coverage` | Executa os testes do backend gerando relatório de cobertura (`v8`)             |
| `npm run lint`          | Executa análise estática (`oxlint`) no backend e no frontend                   |
| `npm run format`        | Formata automaticamente os arquivos do repositório com Prettier                |
| `npm run format:check`  | Verifica se todos os arquivos seguem o padrão de formatação do Prettier        |
| `npm run db:migrate`    | Executa as migrações do Prisma em desenvolvimento (`prisma migrate dev`)       |
| `npm run db:deploy`     | Aplica migrações pendentes em CI/Produção (`prisma migrate deploy`)            |
| `npm run db:generate`   | Regenera o cliente Prisma tipado (`prisma generate`)                           |
| `npm run db:seed`       | Popula o banco de dados com dados iniciais idempotentes para desenvolvimento   |
| `npm run db:studio`     | Abre o painel visual do Prisma Studio no navegador                             |

---

## 🐳 Execução com Docker Compose (Produção / OCI)

Para subir toda a aplicação containerizada (PostgreSQL 18 + Backend Express + Frontend Nginx na porta `80`):

```bash
docker compose up -d --build
```

---

## 🔌 Endpoints da API

### Infraestrutura e Diagnóstico

- `GET /api/info` - Metadados e versão da API (Público)
- `GET /api/health` - Verificação de integridade da API e conectividade com o PostgreSQL (Público)

### Autenticação e Controle de Acesso (`PBI #3`)

- `POST /api/auth/login` - Autentica a empresária (`email` e `password`), valida o hash `scrypt` em tempo constante e retorna `{ token, user: { id, name, email, role } }` sem expor `passwordHash` (Público — `RF11`, `RNF05`)
- `GET /api/auth/me` - Valida o header `Authorization: Bearer <token>`, confirma que a conta segue ativa no banco e retorna os dados públicos da empresária (`ADMIN` — `RF11`)

### Categorias e Produtos (`PBI #16`)

- `GET /api/categories` - Lista todas as categorias (`id`, `name`, `slug`) ordenadas por nome para navegação no site e select no painel (Público — `RF03`, `US02`)
- `GET /api/products` - Lista **apenas produtos ativos (`active: true`)** para a vitrine pública, suportando filtros `?featured=true`, `?categoryId=` e `?category=<slug>` (Público — `RF01`, `RF02`, `RF03`, `US01`, `US07`)
- `GET /api/products/:id` - Retorna os dados de um produto **ativo (`active: true`)** ou `404 Not Found` caso não exista ou esteja oculto (Público — `RF02`, `RF04`, `US11`)
- `GET /api/admin/products` - Lista **todos os produtos (ativos e ocultos)** para gestão no painel da empresária (`ADMIN` — `RF11`, `RF12`)
- `GET /api/admin/products/:id` - Retorna os dados de qualquer produto (ativo ou oculto) para edição no painel (`ADMIN` — `RF11`, `RF12`)
- `POST /api/products` - Cadastra um novo produto validando `name` não vazio, `price >= 0` e existência de `categoryId` (`ADMIN` — `RF11`, `RF12`, `RNF09`, `US09`)
- `PATCH /api/products/:id` - Atualiza dados do produto (nome, descrição, preço, categoria, destaque) e permite ocultar (`active: false`) ou reativar (`active: true`) peças no catálogo (`ADMIN` — `RF11`, `RF12`, `US11`)
- `DELETE /api/products/:id` - Exclui fisicamente um produto sem pedidos vinculados ou retorna `409 Conflict` amigável orientando ocultá-lo (`active: false`) caso alguma variação já possua `OrderItem` registrado (`ADMIN` — `RF11`, `RF12`, `RNF09`)

### Variações de Produto e Estoque (`PBI #18`)

- `GET /api/products/:productId/variants` - Lista todas as variações (`id`, `size`, `color`, `stock`) de um produto ordenadas por tamanho e cor, ou retorna `404 Not Found` se o produto não existir (Público — `RF02`, `RF04`, `US02`, `US03`)
- `POST /api/products/:productId/variants` - Cria uma variação individual (`{ size, color, stock? }`) ou um lote atômico (`{ variants: [...] }`) em transação, padronizando `size` para `UPPERCASE`, aplicando `trim()` em `color`, validando `stock >= 0` inteiro e bloqueando colisões case-insensitive com `409 Conflict` (`ADMIN` — `RF11`, `RF12`, `RNF09`, `US09`, `US10`)
- `PATCH /api/products/:productId/variants/:variantId` - Atualiza `size`, `color` e/ou `stock` (`>= 0`) de uma variação pertencente ao produto, bloqueando colisões de combinação com `409 Conflict` (`ADMIN` — `RF11`, `RF12`, `US10`)
- `DELETE /api/products/:productId/variants/:variantId` - Remove uma variação sem histórico de vendas ou retorna `409 Conflict` amigável orientando zerar o estoque (`stock = 0`) caso já possua `OrderItem` vinculado (`ADMIN` — `RF11`, `RF12`, `RNF09`)

### Upload de Mídia (`PBI #13`)

- `POST /api/upload` - Envio de imagem de produto (JPG, PNG, WEBP até 5MB), protegido pelo middleware `requireAdminAuth` (`Authorization: Bearer <token>`) (`ADMIN` — `RF11`, `RF12`)

---

## 🤝 Como Contribuir e Padrão de Branches

O fluxo de criação de branches (`<tipo>/<numero>-<slug-kebab-case>`), a hierarquia **Branch Geral (PBI/Epic) $\rightarrow$ Branch Específica (Task)** e o guia de uso da skill automatizada [`git-branch`](file:///.agents/skills/git-branch/SKILL.md) estão documentados em detalhes no arquivo [CONTRIBUTING.md](file:///CONTRIBUTING.md).

Para consultar o levantamento completo de requisitos funcionais (`RF01–RF15`), requisitos não funcionais (`RNF01–RNF09`), personas, histórias de usuário (`US01–US12`) e matriz de riscos, acesse o [Documento de Projeto](file:///docs/documento-de-projeto.md) e a documentação do [Diagrama Entidade-Relacionamento (MER)](file:///docs/mer-banco-de-dados.md).
