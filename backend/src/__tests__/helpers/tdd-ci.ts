export type TddMode = "red" | "green" | "refactor" | "standard";

export interface TddContext {
  commitMessage: string;
  eventName: string;
  baseRef?: string;
  refName?: string;
}

export interface VitestJsonReport {
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  success: boolean;
}

export interface TddEvaluationResult {
  allowed: boolean;
  mode: TddMode;
  forcedGreenOnMain: boolean;
  reason: string;
}

/**
 * Identifica o modo TDD a partir da mensagem de commit e do contexto do Git/GitHub.
 * Trava de segurança: PRs apontando para `main` ou pushes na `main` SEMPRE exigem verde.
 */
export function resolveTddMode(ctx: TddContext): {
  mode: TddMode;
  forcedGreenOnMain: boolean;
} {
  const isTargetingMain =
    ctx.baseRef === "main" || (ctx.eventName === "push" && ctx.refName === "main");

  // Analisa apenas o título (primeira linha) para evitar falsos positivos com o corpo de squash merges
  const subject = (ctx.commitMessage || "").split(/\r?\n/)[0] ?? "";
  const hasRedTag = /\[red\]/i.test(subject);
  const hasGreenTag = /\[green\]/i.test(subject);
  const hasRefactorTag = /\[refactor\]/i.test(subject);

  if (isTargetingMain) {
    return {
      mode: hasGreenTag ? "green" : hasRefactorTag ? "refactor" : "standard",
      forcedGreenOnMain: hasRedTag,
    };
  }

  if (hasRedTag) {
    return { mode: "red", forcedGreenOnMain: false };
  }
  if (hasGreenTag) {
    return { mode: "green", forcedGreenOnMain: false };
  }
  if (hasRefactorTag) {
    return { mode: "refactor", forcedGreenOnMain: false };
  }

  return { mode: "standard", forcedGreenOnMain: false };
}

/**
 * Avalia o resultado da execução do Vitest de acordo com o modo TDD resolvido.
 */
export function evaluateTddRun(
  ctx: TddContext,
  report: VitestJsonReport | null,
  vitestExitCode: number
): TddEvaluationResult {
  const { mode, forcedGreenOnMain } = resolveTddMode(ctx);

  if (forcedGreenOnMain) {
    return {
      allowed: false,
      mode,
      forcedGreenOnMain: true,
      reason:
        "TRAVA DE SEGURANÇA (main): Commits com tag [red] não são permitidos em Pull Requests ou pushes para a branch 'main'. Todos os testes devem passar.",
    };
  }

  if (!report || typeof report.numTotalTests !== "number" || report.numTotalTests === 0) {
    return {
      allowed: false,
      mode,
      forcedGreenOnMain: false,
      reason:
        "ERRO DE INFRAESTRUTURA: O relatório de testes não foi gerado ou nenhum teste foi executado (possível falha de conexão com banco ou erro de sintaxe global).",
    };
  }

  if (mode === "red") {
    if (report.numFailedTests > 0) {
      return {
        allowed: true,
        mode: "red",
        forcedGreenOnMain: false,
        reason: `🔴 [TDD RED] Validado com sucesso: ${report.numFailedTests} de ${report.numTotalTests} teste(s) falharam conforme esperado antes da implementação.`,
      };
    }

    return {
      allowed: false,
      mode: "red",
      forcedGreenOnMain: false,
      reason:
        "❌ [TDD RED] O commit possui a tag [red], porém todos os testes passaram! Na etapa Red do TDD, deve haver ao menos um teste falhando.",
    };
  }

  const allPassed = vitestExitCode === 0 && report.numFailedTests === 0 && report.success;
  const label =
    mode === "green"
      ? "🟢 [TDD GREEN]"
      : mode === "refactor"
        ? "🔵 [TDD REFACTOR]"
        : "✅ [STANDARD]";

  if (allPassed) {
    return {
      allowed: true,
      mode,
      forcedGreenOnMain: false,
      reason: `${label} Todos os ${report.numPassedTests} teste(s) passaram com sucesso.`,
    };
  }

  return {
    allowed: false,
    mode,
    forcedGreenOnMain: false,
    reason: `❌ ${label} Falha na suíte: ${report.numFailedTests} de ${report.numTotalTests} teste(s) falharam.`,
  };
}
