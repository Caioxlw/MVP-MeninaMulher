---
name: git-branch
description: >-
  Automatiza e padroniza a criação de branches e gestão do fluxo Git hierárquico
  (EPIC -> PBI -> TASK) do projeto MVP Menina Mulher. Use esta skill sempre que o
  usuário pedir para iniciar uma tarefa, resolver uma issue, criar uma branch ou
  validar a nomenclatura de branches no repositório.
---

# Padrão e Automação de Branches (`git-branch`)

Esta skill define e executa o fluxo oficial de criação e validação de branches do projeto **MVP Menina Mulher**, garantindo que todas as branches sigam a convenção de nomenclatura e a hierarquia de entregas (**Branch Geral $\rightarrow$ Branch Específica**).

---

## 1. Regra de Nomenclatura e Validação

Toda branch (geral ou específica, exceto `main`) **DEVE** obedecer estritamente ao formato:

```text
<tipo>/<numero-da-issue>-<slug-kebab-case>
```

### Expressão Regular (Regex) de Validação
```regex
^(feat|fix|hotfix|docs|refactor|chore|ci|test)\/[0-9]+-[a-z0-9]+(-[a-z0-9]+)*$
```

### Prefixos Permitidos (`<tipo>`)
- `feat`: Nova funcionalidade ou entrega de produto (PBI/Epic/Task funcional).
- `fix`: Correção de bug identificado durante o desenvolvimento.
- `hotfix`: Correção crítica urgente diretamente em produção (`main`).
- `docs`: Alterações exclusivas de documentação (ex: `README.md`, `CONTRIBUTING.md`).
- `refactor`: Refatoração de código sem alteração de comportamento externo.
- `chore`: Configuração de ferramentas, dependências, templates ou estrutura do repositório.
- `ci`: Criação ou ajuste de workflows de integração/entrega contínua (`.github/workflows/`).
- `test`: Adição ou correção de testes automatizados.

### Regras para o `<slug-kebab-case>`
- Apenas letras minúsculas (`a-z`), números (`0-9`) e hifens (`-`).
- Sem acentos, caracteres especiais (`ç`, `~`, `/`, `_`) ou espaços.
- Curto e objetivo (3 a 5 palavras descrevendo o escopo).
- **Exemplos válidos**:
  - `chore/11-configurar-repositorio-ambiente`
  - `chore/50-padronizar-fluxo-branches`
  - `feat/20-listar-catalogo-produtos`
- **Exemplos inválidos (DEVEM SER BLOQUEADOS)**:
  - `feature/50-padronizar-branches` (prefixo `feature` inválido; usar `feat` ou `chore`)
  - `chore/issue-50-padronizar-branches` (não incluir a palavra `issue-` antes do número)
  - `chore/padronizar-branches` (ausência do número da issue)
  - `feat/20_Listar_Catalogo` (uso de `snake_case` e letras maiúsculas)

> **Regra de Bloqueio**: Caso o usuário solicite explicitamente um nome de branch fora do padrão acima, **NÃO execute o `git checkout -b`**. Alerte imediatamente sobre o formato inválido, explique qual regra foi violada e proponha o nome corrigido.

---

## 2. Fluxo Hierárquico de Criação de Branches

O repositório organiza as demandas em três níveis no GitHub: **EPIC $\rightarrow$ PBI $\rightarrow$ TASK**.
Para manter o histórico organizado e permitir revisões incrementais, toda branch específica de trabalho deve apontar para a **branch geral** da funcionalidade a que pertence.

### Passo 1: Consultar a Issue Alvo e sua Issue Pai no GitHub
Quando o usuário pedir para resolver uma issue `#<N>` (ex: *"vamos resolver a issue #50"*):

1. Consulte os detalhes da issue `#<N>` e da sua issue pai (`parent`):
   ```powershell
   Invoke-RestMethod -Uri "https://api.github.com/repos/Caioxlw/MVP-MeninaMulher/issues/<N>"
   Invoke-RestMethod -Uri "https://api.github.com/repos/Caioxlw/MVP-MeninaMulher/issues/<N>/parent"
   ```
2. Identifique os papéis na hierarquia:
   - **Caso A — A issue `#<N>` é uma `TASK` (possui um `PBI` como pai direto)**:
     - **Branch Geral (Base)**: corresponde ao **PBI pai** (ex: Issue `#11` $\rightarrow$ `chore/11-configurar-repositorio-ambiente`).
     - **Branch Específica (Trabalho)**: corresponde à **TASK `#<N>`** (ex: Issue `#50` $\rightarrow$ `chore/50-padronizar-fluxo-branches`).
   - **Caso B — A issue `#<N>` é um `PBI` sem tasks filhas (possui um `EPIC` como pai direto)**:
     - **Branch Geral (Base)**: corresponde ao **EPIC pai** (ex: Issue `#4` $\rightarrow$ `feat/4-fundacao-e-design`).
     - **Branch Específica (Trabalho)**: corresponde ao **PBI `#<N>`**.
   - **Caso C — A issue `#<N>` não possui issue pai (ou é um `hotfix` direto)**:
     - A branch base é a própria `main`, e a branch criada é `<tipo>/<N>-<slug>`.

### Passo 2: Verificar Estado do Repositório Local
1. Execute `git status` para garantir que não há alterações não commitadas que seriam levadas acidentalmente.
2. Execute `git fetch origin` para atualizar a lista de branches remotas.

### Passo 3: Verificar ou Criar a Branch Geral (PBI / EPIC)
1. Verifique se já existe uma branch (local ou em `origin`) para o número da issue pai (`#<N_PAI>`):
   ```powershell
   git branch -a --list "*/<N_PAI>-*"
   ```
2. **Se a Branch Geral NÃO existir**:
   - Atualize a `main`:
     ```powershell
     git checkout main
     git pull origin main
     ```
   - Valide o nome `<branch-geral>` na Regex e crie-a a partir da `main`:
     ```powershell
     git checkout -b <branch-geral>
     ```
   - Publique imediatamente a `<branch-geral>` no repositório remoto (`origin`) para que os Pull Requests das branches específicas possam apontar para ela no GitHub:
     ```powershell
     git push -u origin <branch-geral>
     ```
3. **Se a Branch Geral JÁ existir**:
   - Faça checkout nela e garanta que está atualizada com o `origin`:
     ```powershell
     git checkout <branch-geral>
     git pull origin <branch-geral>
     ```

### Passo 4: Criar a Branch Específica Apontando para a Branch Geral
1. Monte o nome `<branch-especifica>` para a issue `#<N>` seguindo `<tipo>/<N>-<slug-kebab-case>` e valide contra a Regex:
   `^(feat|fix|hotfix|docs|refactor|chore|ci|test)\/[0-9]+-[a-z0-9]+(-[a-z0-9]+)*$`
2. Crie a branch específica ramificando diretamente da `<branch-geral>`:
   ```powershell
   git checkout -b <branch-especifica> <branch-geral>
   ```
3. Confirme a criação exibindo ao usuário:
   - **Branch Geral (Base do PR)**: `<branch-geral>`
   - **Branch Específica (Ativa)**: `<branch-especifica>`

---

## 3. Padrão de Commits e Pull Requests

- **Mensagens de Commit**: Utilize *Conventional Commits* referenciando a issue específica:
  ```text
  <tipo>(<escopo-opcional>): <descrição curta no imperativo> (closes #<N>)
  ```
- **Envio e Pull Request**:
  - Ao finalizar o trabalho na `<branch-especifica>`, publique com:
    ```powershell
    git push -u origin <branch-especifica>
    ```
  - O Pull Request da `<branch-especifica>` no GitHub **deve ter como base (`base branch`) a `<branch-geral>`** (e não a `main`), consolidando as entregas na branch geral da funcionalidade antes da integração final na `main`.
