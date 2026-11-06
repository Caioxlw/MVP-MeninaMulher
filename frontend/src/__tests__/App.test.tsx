import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { AppRoutes } from "../routes/AppRoutes";
import { ROUTES } from "../routes/routes.config";
import { theme } from "../styles/theme";

describe("Task #113 — Tema Menina Mulher e Estrutura de Rotas (Loja e Painel)", () => {
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

  it("deve definir em um só lugar os tokens de cores, tipografia e acessibilidade da marca", () => {
    expect(theme.colors.brand.primary).toBe("#D1025A");
    expect(theme.colors.brand.plum).toBe("#520139");
    expect(theme.colors.brand.blush).toBe("#F5CCD0");
    expect(theme.colors.brand.surface).toBe("#FFFFFF");
    expect(theme.colors.brand.muted).toBe("#6F4F64");
    expect(theme.accessibility.minTouchTargetPx).toBeGreaterThanOrEqual(44);
    expect(theme.accessibility.minContrastRatio).toBeGreaterThanOrEqual(4.5);
    expect(theme.accessibility.minViewportWidthPx).toBe(360);
  });

  it("deve renderizar o cabeçalho do MVP Menina Mulher e status conectado na rota inicial (/)", async () => {
    render(<App />);

    expect(screen.getByText("MVP Menina Mulher")).toBeDefined();
    expect(screen.getByText("Início — Boutique Menina Mulher")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Conectado")).toBeDefined();
    });
  });

  it("deve renderizar as rotas públicas da loja (Catálogo, Produto, Sacola, Favoritos, Perfil e Guia de Medidas)", () => {
    const storeCases = [
      { path: ROUTES.store.catalog, expectedHeading: "Catálogo Exclusivo" },
      { path: "/categoria/partes-de-cima", expectedHeading: "Coleção por Categoria" },
      { path: "/produto/sutia-renda-noir", expectedHeading: "Detalhes da Peça" },
      { path: ROUTES.store.bag, expectedHeading: "Sacola de Compras" },
      { path: ROUTES.store.favorites, expectedHeading: "Meus Favoritos" },
      { path: ROUTES.store.profile, expectedHeading: "Perfil da Cliente" },
      { path: ROUTES.store.sizeGuide, expectedHeading: "Guia de Medidas e Tamanhos" },
    ];

    for (const testCase of storeCases) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[testCase.path]}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(screen.getByText(testCase.expectedHeading)).toBeDefined();
      unmount();
    }
  });

  it("deve manter o painel da empresária em endereço separado (/painel/*) com suas rotas administrativas", () => {
    expect(ROUTES.admin.root.startsWith("/painel")).toBe(true);

    const adminCases = [
      { path: ROUTES.admin.root, expectedHeading: "Gestão de Pedidos" },
      { path: ROUTES.admin.login, expectedHeading: "Boas-vindas ao Painel de Gestão" },
      { path: ROUTES.admin.orders, expectedHeading: "Gestão de Pedidos" },
      { path: ROUTES.admin.products, expectedHeading: "Catálogo e Cadastro de Produtos" },
      { path: ROUTES.admin.newProduct, expectedHeading: "Novo Produto" },
      { path: "/painel/produtos/1042/editar", expectedHeading: "Editar Produto" },
      { path: ROUTES.admin.stock, expectedHeading: "Controle de Estoque" },
    ];

    for (const testCase of adminCases) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[testCase.path]}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(screen.getByText(testCase.expectedHeading)).toBeDefined();
      expect(screen.getByText("Menina Mulher • Painel de Gestão Exclusiva")).toBeDefined();
      unmount();
    }
  });
});
