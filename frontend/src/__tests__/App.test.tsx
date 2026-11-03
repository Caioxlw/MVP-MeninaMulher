import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";

describe("App Component", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: "healthy",
          timestamp: new Date().toISOString(),
          services: {
            api: { status: "up", port: 3001 },
            database: {
              status: "connected",
              provider: "PostgreSQL",
              latencyMs: 5,
              error: null,
            },
          },
        }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deve renderizar o cabeçalho do MVP Menina Mulher e status conectado", async () => {
    render(<App />);

    expect(screen.getByText("MVP Menina Mulher")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Conectado")).toBeDefined();
    });
  });
});
