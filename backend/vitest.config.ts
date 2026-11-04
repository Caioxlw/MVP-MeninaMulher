import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    globalSetup: ["./src/__tests__/setup/global-setup.ts"],
    setupFiles: ["./src/__tests__/setup/setup-env.ts"],
    fileParallelism: false,
  },
});
