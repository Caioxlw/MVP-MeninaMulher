import { describe, expect, it } from "vitest";
import { evaluateTddRun, resolveTddMode, VitestJsonReport } from "./helpers/tdd-ci";

const passingReport: VitestJsonReport = {
  numTotalTestSuites: 2,
  numPassedTestSuites: 2,
  numFailedTestSuites: 0,
  numTotalTests: 8,
  numPassedTests: 8,
  numFailedTests: 0,
  success: true,
};

const failingReport: VitestJsonReport = {
  numTotalTestSuites: 2,
  numPassedTestSuites: 1,
  numFailedTestSuites: 1,
  numTotalTests: 8,
  numPassedTests: 5,
  numFailedTests: 3,
  success: false,
};

describe("Avaliador do Ciclo TDD no CI ([red], [green], [refactor])", () => {
  it("deve aprovar commit [red] quando houver testes falhando em branch de feature/PBI", () => {
    const result = evaluateTddRun(
      {
        commitMessage: "test(db): adicionar testes do schema relacional [red] (closes #72)",
        eventName: "pull_request",
        baseRef: "feat/12-modelar-banco-relacional",
      },
      failingReport,
      1
    );

    expect(result.mode).toBe("red");
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("[TDD RED]");
  });

  it("deve reprovar commit [red] caso todos os testes passem (falso red)", () => {
    const result = evaluateTddRun(
      {
        commitMessage: "test(db): adicionar testes [red]",
        eventName: "pull_request",
        baseRef: "feat/12-modelar-banco-relacional",
      },
      passingReport,
      0
    );

    expect(result.mode).toBe("red");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("todos os testes passaram");
  });

  it("deve reprovar commit [red] caso ocorra falha de infraestrutura (relatório nulo ou 0 testes)", () => {
    const result = evaluateTddRun(
      {
        commitMessage: "test(db): adicionar testes [red]",
        eventName: "pull_request",
        baseRef: "feat/12-modelar-banco-relacional",
      },
      null,
      1
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("ERRO DE INFRAESTRUTURA");
  });

  it("deve bloquear commit [red] quando o PR apontar para a main ou em push na main", () => {
    const prToMain = evaluateTddRun(
      {
        commitMessage: "test(db): testes ainda falhando [red]",
        eventName: "pull_request",
        baseRef: "main",
      },
      failingReport,
      1
    );

    expect(prToMain.forcedGreenOnMain).toBe(true);
    expect(prToMain.allowed).toBe(false);
    expect(prToMain.reason).toContain("TRAVA DE SEGURANÇA (main)");

    const pushToMain = resolveTddMode({
      commitMessage: "test(db): [red]",
      eventName: "push",
      refName: "main",
    });
    expect(pushToMain.forcedGreenOnMain).toBe(true);
    expect(pushToMain.mode).not.toBe("red");
  });

  it("deve exigir todos os testes passando para [green], [refactor] ou commits sem tag", () => {
    const greenPass = evaluateTddRun(
      {
        commitMessage: "feat(db): implementar schema relacional [green] (closes #70)",
        eventName: "pull_request",
        baseRef: "feat/12-modelar-banco-relacional",
      },
      passingReport,
      0
    );
    expect(greenPass.mode).toBe("green");
    expect(greenPass.allowed).toBe(true);

    const greenFail = evaluateTddRun(
      {
        commitMessage: "feat(db): implementar schema relacional [green]",
        eventName: "pull_request",
        baseRef: "feat/12-modelar-banco-relacional",
      },
      failingReport,
      1
    );
    expect(greenFail.allowed).toBe(false);

    const refactorPass = evaluateTddRun(
      {
        commitMessage: "refactor(api): remover rota boilerplate [refactor]",
        eventName: "pull_request",
        baseRef: "feat/12-modelar-banco-relacional",
      },
      passingReport,
      0
    );
    expect(refactorPass.mode).toBe("refactor");
    expect(refactorPass.allowed).toBe(true);
  });
});
