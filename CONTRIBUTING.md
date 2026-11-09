# Guia de Contribuição e Fluxo de Branches 🤝

Este documento descreve o padrão oficial de nomenclatura de branches, commits e o fluxo de trabalho no Git do projeto **MVP Menina Mulher**, além de explicar como utilizar a **Skill automatizada (`git-branch`)** no Antigravity.

---

## 🌿 1. Padrão de Nomenclatura de Branches

Todas as branches do repositório (exceto `main`) devem seguir o formato:

```text
<tipo>/<numero-da-issue>-<slug-kebab-case>
```

### Prefixos Permitidos (`<tipo>`)

Utilizamos os prefixos baseados no **Conventional Commits**:

| Prefixo    | Quando utilizar                                                      | Exemplo                                    |
| ---------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `feat`     | Nova funcionalidade de produto (catálogo, carrinho, painel, estoque) | `feat/20-listar-catalogo-produtos`         |
| `fix`      | Correção de bug identificado durante o desenvolvimento               | `fix/33-corrigir-baixa-estoque-simultanea` |
| `hotfix`   | Correção urgente aplicada diretamente a partir da `main`             | `hotfix/55-corrigir-link-whatsapp`         |
| `docs`     | Criação ou atualização exclusiva de documentação                     | `docs/1-contexto-projeto-readme`           |
| `refactor` | Melhoria interna de código sem alterar comportamento externo         | `refactor/12-ajustar-relacoes-prisma`      |
| `chore`    | Configurações de projeto, pacotes, templates e tooling               | `chore/50-padronizar-fluxo-branches`       |
| `ci`       | Configuração de pipelines e GitHub Actions (`.github/workflows/`)    | `ci/47-configurar-workflow-build`          |
| `test`     | Adição ou ajuste de testes automatizados                             | `test/34-testes-fluxo-completo`            |

### Regras de Validação

- **Expressão Regular (Regex)**:
  ```regex
  ^(feat|fix|hotfix|docs|refactor|chore|ci|test)\/[0-9]+-[a-z0-9]+(-[a-z0-9]+)*$
  ```
- O `<numero-da-issue>` deve ser apenas o número (ex: `50`), **sem** o prefixo `issue-`.
- O `<slug-kebab-case>` deve conter apenas letras minúsculas sem acento, números e hifens.

---

## 🌳 2. Fluxo Hierárquico de Branches (Branch Geral $\rightarrow$ Branch Específica)

No GitHub, o backlog do projeto é estruturado em três níveis: **EPIC $\rightarrow$ PBI $\rightarrow$ TASK**.
Para manter as entregas organizadas por funcionalidade:

1. **Branch Geral da Funcionalidade (Base)**:
   - Quando você vai resolver uma **TASK** (ex: `#50`), a branch geral representa o **PBI pai** ao qual ela pertence (ex: `#11` $\rightarrow$ `chore/11-configurar-repositorio-ambiente`).
   - Quando você vai resolver um **PBI** que não possui sub-tasks, a branch geral representa o **EPIC pai** (ex: `#4` $\rightarrow$ `feat/4-fundacao-e-design`).
   - A **Branch Geral** sempre nasce a partir da `main` atualizada e é publicada imediatamente no GitHub (`git push -u origin <branch-geral>`).
2. **Branch Específica (Objetivo Específico)**:
   - Nasce a partir da **Branch Geral** (`git checkout -b <branch-especifica> <branch-geral>`).
   - Todo o desenvolvimento da tarefa ocorre nela, e o **Pull Request** deve apontar como destino (`base`) para a **Branch Geral**.

```mermaid
flowchart LR
    MAIN["main"] --> GERAL["Branch Geral (PBI / EPIC)<br/>ex: chore/11-configurar-repositorio-ambiente"]
    GERAL --> ESP1["Branch Específica (Task #50)<br/>chore/50-padronizar-fluxo-branches"]
    GERAL --> ESP2["Branch Específica (Task #43)<br/>chore/43-configurar-templates-issue"]
    ESP1 -- "Pull Request" --> GERAL
    ESP2 -- "Pull Request" --> GERAL
    GERAL -- "Pull Request Final" --> MAIN
```

---

## 🤖 3. Como Usar as Skills no Antigravity

O repositório conta com skills automatizadas em [`.agents/skills/`](file:///.agents/skills/). Nenhuma instalação manual é necessária — o Antigravity descobre as skills automaticamente ao abrir o projeto.

### 🌿 Skill `git-branch`

Automatiza a criação de branches no fluxo hierárquico (**EPIC $\rightarrow$ PBI $\rightarrow$ TASK**) com validação estrita da convenção de nomenclatura.
Configuração em [`.agents/skills/git-branch/SKILL.md`](file:///.agents/skills/git-branch/SKILL.md).

> **Exemplos de prompt:**
>
> - _"Vamos resolver a issue #50"_
> - _"/git-branch crie a branch para a issue #43"_

### 📋 Skill `pbi-manager`

Automatiza a criação, refatoração e sincronização de descrições de PBIs com o GitHub Projects e a base de requisitos em [`docs/documento-de-projeto.md`](file:///docs/documento-de-projeto.md).
Configuração em [`.agents/skills/pbi-manager/SKILL.md`](file:///.agents/skills/pbi-manager/SKILL.md).

> **Exemplos de prompt:**
>
> - _"Refatore o PBI #20 preenchendo a User Story e os requisitos"_
> - _"/pbi-manager sincronize a User Story da issue #22"_
> - _"Crie um novo PBI para a funcionalidade de carrinho de compras"_

---

## 💻 4. Executando Manualmente no Terminal (Passo a Passo)

Caso queira seguir o mesmo fluxo manualmente pelo terminal:

```bash
# 1. Buscar atualizações do repositório remoto
git fetch origin

# 2. Se a branch geral (ex: PBI #11) ainda NÃO existir:
git checkout main
git pull origin main
git checkout -b chore/11-configurar-repositorio-ambiente
git push -u origin chore/11-configurar-repositorio-ambiente

# (Se a branch geral JÁ existir, apenas mude para ela e atualize):
# git checkout chore/11-configurar-repositorio-ambiente
# git pull origin chore/11-configurar-repositorio-ambiente

# 3. Criar a branch específica da tarefa (ex: Task #50) a partir da branch geral:
git checkout -b chore/50-padronizar-fluxo-branches chore/11-configurar-repositorio-ambiente
```

---

## 📝 5. Padrão de Commits e Ciclo TDD no CI

Utilize **Conventional Commits** em português e referencie a issue:

```bash
git commit -m "chore(git): criar skill para padronizacao do fluxo de branches (closes #50)"
```

### 🧪 Suporte Nativo a TDD no GitHub Actions (`[red]`, `[green]`, `[refactor]`)

Para facilitar o desenvolvimento orientado a testes (**TDD**) sem que o GitHub bloqueie a revisão da etapa inicial de testes, o workflow de CI (`.github/workflows/tests.yml`) reconhece tags no commit:

| Tag no Commit    | Etapa TDD                                                  | Comportamento do CI (GitHub Actions)                                                                                                                   |
| :--------------- | :--------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`[red]`**      | Você escreveu o teste, mas ainda não a implementação.      | **Aprova (Verde no GitHub)** somente se a suíte executar e **houver testes falhando** (reprova se todos passarem ou se houver erro de infraestrutura). |
| **`[green]`**    | Você escreveu a implementação para fazer o teste passar.   | **Exige 100% dos testes passando.**                                                                                                                    |
| **`[refactor]`** | Você refatorou/melhorou o código mantendo o comportamento. | **Exige 100% dos testes passando.**                                                                                                                    |

> **🔒 Trava de Segurança da `main`**: Pull Requests que apontam para a branch `main` (ou pushes na `main`) **ignoram a tag `[red]`** e sempre exigem que 100% dos testes passem.

**Exemplos de commits no ciclo TDD:**

```bash
git commit -m "test(db): adicionar testes de integridade do schema [red] (closes #72)"
git commit -m "feat(db): implementar schema relacional no Prisma [green] (closes #70)"
git commit -m "refactor(api): remover rota boilerplate de usuarios [refactor] (closes #76)"
```
