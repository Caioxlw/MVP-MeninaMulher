import fs from "fs";
import path from "path";
import { evaluateTddRun, VitestJsonReport } from "../helpers/tdd-ci";

const vitestExitCode = Number(process.argv[2] ?? "1");
const backendRoot = path.resolve(__dirname, "../../..");
const reportPath = path.join(backendRoot, "vitest-report.json");
const coverageSummaryPath = path.join(backendRoot, "coverage", "coverage-summary.json");

const report: VitestJsonReport | null = fs.existsSync(reportPath)
  ? (JSON.parse(fs.readFileSync(reportPath, "utf-8")) as VitestJsonReport)
  : null;

const result = evaluateTddRun(
  {
    commitMessage: process.env.COMMIT_MESSAGE || "",
    eventName: process.env.GITHUB_EVENT_NAME || "",
    baseRef: process.env.GITHUB_BASE_REF || "",
    refName: process.env.GITHUB_REF_NAME || "",
  },
  report,
  vitestExitCode
);

console.log(result.reason);

if (process.env.GITHUB_STEP_SUMMARY) {
  let summaryMd = `### 🧪 Resultado TDD (Backend)\n- **Modo detectado:** \`${result.mode}\`\n- **Resultado:** ${result.reason}\n`;

  if (fs.existsSync(coverageSummaryPath)) {
    const cov = JSON.parse(fs.readFileSync(coverageSummaryPath, "utf-8"));
    const total = cov?.total;
    if (total) {
      summaryMd += `\n#### 📊 Cobertura de Código (Informativa)\n`;
      summaryMd += `| Métrica | Cobertura |\n| :--- | :--- |\n`;
      summaryMd += `| **Lines** | ${total.lines?.pct ?? 0}% |\n`;
      summaryMd += `| **Statements** | ${total.statements?.pct ?? 0}% |\n`;
      summaryMd += `| **Functions** | ${total.functions?.pct ?? 0}% |\n`;
      summaryMd += `| **Branches** | ${total.branches?.pct ?? 0}% |\n`;
    }
  }

  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMd);
}

process.exit(result.allowed ? 0 : 1);
