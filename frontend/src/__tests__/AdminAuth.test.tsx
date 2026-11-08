import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../routes/AppRoutes";
import {
  clearAdminSession,
  getAdminSession,
  isAdminAuthenticated,
  seedDemoAdminSession,
} from "../services/authApi";

describe("Login da Empresária e Proteção das Rotas do Painel (PBI #99)", () => {
  beforeEach(() => {
    clearAdminSession();
  });

  afterEach(() => {
    cleanup();
    clearAdminSession();
  });

  it("redireciona para /painel/login ao tentar acessar rotas privadas sem estar autenticada (RF11, RNF05)", () => {
    expect(isAdminAuthenticated()).toBe(false);

    const protectedPaths = ["/painel/pedidos", "/painel/produtos", "/painel/estoque"];
    for (const path of protectedPaths) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(
        screen.getByRole("heading", { name: "Boas-vindas ao Painel de Gestão" })
      ).toBeDefined();
      expect(screen.getByText(/Autenticação necessária/i)).toBeDefined();
      unmount();
    }
  });

  it("exibe alerta de erro acessível quando e-mail ou senha são inválidos e mantém rota bloqueada", async () => {
    render(
      <MemoryRouter initialEntries={["/painel/login"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText("E-mail da Empresária");
    const passwordInput = screen.getByLabelText("Senha de Acesso");

    fireEvent.change(emailInput, { target: { value: "" } });
    fireEvent.change(passwordInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar no Painel" }));

    await waitFor(() => {
      expect(screen.getByText("E-mail e senha são obrigatórios.")).toBeDefined();
    });
    expect(isAdminAuthenticated()).toBe(false);

    // Tentativa com senha inválida
    fireEvent.change(emailInput, { target: { value: "proprietaria@meninamulher.com.br" } });
    fireEvent.change(passwordInput, { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar no Painel" }));

    await waitFor(() => {
      expect(screen.getByText("Credenciais inválidas ou conta inativa.")).toBeDefined();
    });
    expect(isAdminAuthenticated()).toBe(false);
  });

  it("autentica a empresária com credenciais válidas, armazena a sessão e redireciona para a rota solicitada", async () => {
    render(
      <MemoryRouter initialEntries={["/painel/estoque"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    // Caiu na tela de login por estar deslogada
    expect(screen.getByRole("heading", { name: "Boas-vindas ao Painel de Gestão" })).toBeDefined();

    // Alterna visualização da senha (RNF07)
    const toggleBtn = screen.getByRole("button", { name: "Mostrar senha" });
    expect(toggleBtn.className).toContain("min-h-11");
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toBeDefined();

    // Envia credenciais válidas
    fireEvent.click(screen.getByRole("button", { name: "Entrar no Painel" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Controle de Estoque" })).toBeDefined();
    });

    expect(isAdminAuthenticated()).toBe(true);
    expect(getAdminSession()?.user.email).toBe("proprietaria@meninamulher.com.br");
  });

  it("encerra a sessão ao clicar em 'Sair do Painel' e redireciona de volta para /painel/login", async () => {
    seedDemoAdminSession();
    expect(isAdminAuthenticated()).toBe(true);

    render(
      <MemoryRouter initialEntries={["/painel/pedidos"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Gestão de Pedidos" })).toBeDefined();

    const logoutBtn = screen.getByTestId("admin-sidebar-logout");
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Boas-vindas ao Painel de Gestão" })
      ).toBeDefined();
    });
    expect(isAdminAuthenticated()).toBe(false);
  });
});
