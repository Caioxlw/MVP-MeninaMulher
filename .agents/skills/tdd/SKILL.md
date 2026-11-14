---
name: tdd
description: >-
  Orquestra o ciclo de TDD do projeto MVP Menina Mulher (Red [red] -> Green
  [green] -> Refactor -> Review com Gemini 4 Argon Medium) em modo Rápido ou
  Completo. Ative SOMENTE quando o usuário pedir explicitamente `/tdd`,
  "em TDD" ou "fluxo TDD" — não ative em tarefas comuns que apenas mencionem
  testes.
---

# Fluxo TDD com Review Automatizada (`tdd`)

Esta skill padroniza o ciclo **Red $\rightarrow$ Green $\rightarrow$ Refactor $\rightarrow$ Review** no repositório **MVP Menina Mulher**, integrando as tags de CI do [`CONTRIBUTING.md`](file:///CONTRIBUTING.md) com dois modos de execução para não engessar tarefas simples.

---

## Escolha do Modo (Antes de Começar)

Avalie o escopo da tarefa (ou siga se o usuário especificar `"rápido"` ou `"completo"`):

| Critério | **Modo Rápido** | **Modo Completo** |
| :--- | :--- | :--- |
| **Quando usar** | Ajustes pontuais, 1–2 arquivos ou lógica simples | Features completas, regras de negócio críticas, banco/API, segurança ou 3+ arquivos |
| **Commits no CI** | Pode consolidar em um único commit `[green]` ou `[refactor]` ao final | Commits separados por etapa (`[red]`, `[green]`, `[refactor]`) |
| **Review final** | **Self-review rápido** na própria sessão (sem `swarm`) | **Worker `tdd-reviewer`** via `swarm` usando `gemini-4-argon-medium` |

> Se houver dúvida sobre o porte da tarefa, comece no **Modo Rápido** e só escale para o `tdd-reviewer` se a mudança crescer ou tocar pontos críticos.

---

## 1. Etapa RED (`[red]`)

1. Escreva os testes automatizados cobrindo os critérios de aceitação e casos de borda da tarefa.
2. Execute a suíte de testes para confirmar que os novos testes **falham** pelo motivo esperado (não por erro de sintaxe ou infraestrutura).
3. *(Modo Completo)* Quando commitar esta etapa, utilize Conventional Commits em português com a tag `[red]`:
   ```bash
   git commit -m "test(<escopo>): <descricao dos testes> [red] (closes #<issue>)"
   ```
   > **Nota:** Conforme o `CONTRIBUTING.md`, o CI aprova `[red]` em branches de tarefa quando há testes falhando, mas `main` sempre exige 100% dos testes passando.

---

## 2. Etapa GREEN (`[green]`)

1. Implemente o código mínimo e limpo necessário para fazer todos os testes passarem.
2. Execute a suíte de testes e garanta **100% de aprovação**.
3. *(Modo Completo)* Quando commitar esta etapa, utilize a tag `[green]`:
   ```bash
   git commit -m "feat(<escopo>): <descricao da implementacao> [green] (closes #<issue>)"
   ```

---

## 3. Etapa REFACTOR (Pré-commit `[refactor]`)

1. Refatore o código produzido (eliminando duplicações, melhorando nomes, extraindo helpers, mantendo funções coesas e rasas) sem alterar o comportamento externo.
2. Execute novamente a suíte de testes e confirme **100% dos testes passando** (e lint/typecheck, se aplicável no projeto).
3. **No Modo Rápido:** faça um self-review rápido do diff, atualize `graphify update .` (se `graphify-out/` existir) e vá direto para a **Etapa 6 (Notificação)**.
4. **No Modo Completo:** não faça o commit/push de `[refactor]` ainda — siga para a **Etapa 4 (Review)**.

---

## 4. Etapa REVIEW com Gemini 4 Argon (Medium) *(Modo Completo)*

Com o código refatorado e os testes 100% verdes, delegue a revisão de código para um worker dedicado no modelo `gemini-4-argon-medium` usando a ferramenta `swarm`:

1. Chame `swarm` com:
   - `action`: `"add"`
   - `name`: `"tdd-reviewer"`
   - `model`: `"gemini-4-argon-medium"`
   - `workspace`: `"inherit"`
   - `brief`: Instrua o revisor a atuar em **modo somente leitura** e revisar **todo o diff da tarefa/branch** (`git diff` das alterações não commitadas + commits da tarefa em relação à branch base), verificando obrigatoriamente:
     1. **Bugs e lógica:** casos de borda, condições de corrida, tratamento de erros e estados inválidos.
     2. **Segurança:** validação de entrada, exposição de dados sensíveis, permissões e injeções.
     3. **Aderência aos testes e requisitos:** se os testes realmente validam o comportamento esperado (sem falsos positivos ou asserts frouxos).
     4. **Duplicação e qualidade de código:** código duplicado, funções longas, acoplamento desnecessário e legibilidade.
     5. **Saída esperada:** lista objetiva separada em **Críticos / Bugs óbvios** (bloqueantes) e **Sugestões / Melhorias menores**, citando arquivo e linha.

2. Aguarde a resposta do `tdd-reviewer` no board.
3. Após receber o relatório do `tdd-reviewer`, encerre o worker com `swarm(action="kill", name="tdd-reviewer")`.

---

## 5. Correções Automáticas e Revalidação *(Modo Completo)*

1. Analise os apontamentos do `tdd-reviewer`:
   - **Se houver problemas críticos ou bugs óbvios:** corrija-os automaticamente no código/testes.
   - **Se houver apenas sugestões menores/cosméticas:** avalie se vale aplicar rapidamente ou apenas reportar ao usuário.
2. Se qualquer arquivo de código tiver sido modificado após a review:
   - Re-execute a suíte completa de testes para garantir **100% dos testes passando**.
   - Se o projeto possuir `graphify-out/`, execute `graphify update .` conforme a regra do repositório.

---

## 6. Notificação Final ao Usuário

Ao concluir (com 100% dos testes verdes após eventuais correções), **avise o usuário** apresentando um resumo claro e objetivo contendo:
- **Modo executado:** Rápido ou Completo (`Gemini 4 Argon (Medium)`).
- **Status dos testes:** resultado da última execução completa após todas as edições.
- **Resultado da Review e correções:** pontos encontrados e ajustes aplicados (se aplicável).
- **Próximo passo:** informar que as alterações estão prontas para o commit/push final com a tag `[refactor]` (ou `[green]`/`[refactor]` no modo rápido):
  ```bash
  git commit -m "refactor(<escopo>): <descricao> [refactor] (closes #<issue>)"
  ```
