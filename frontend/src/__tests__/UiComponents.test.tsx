import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Alert, Badge, Button, EmptyState, Input, Modal, ProductCard } from "../components/ui";

describe("Task #115 — Biblioteca de Componentes Base Reutilizáveis e Acessíveis", () => {
  afterEach(() => {
    cleanup();
  });

  it("Button: deve renderizar variantes primária e secundária com área de toque mínima e suportar loading/disabled", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button variant="primary" onClick={onClick}>
        Confirmar Pedido
      </Button>
    );

    const button = screen.getByRole("button", { name: "Confirmar Pedido" });
    expect(button.className).toContain("touch-target");
    expect(button.className).toContain("bg-brand-primary");

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button variant="secondary" loading onClick={onClick}>
        Salvando...
      </Button>
    );

    const loadingButton = screen.getByRole("button", { name: /Carregando/i });
    expect(loadingButton.hasAttribute("disabled")).toBe(true);
    expect(loadingButton.getAttribute("aria-busy")).toBe("true");
  });

  it("Input: deve associar rótulo ao campo, exibir texto de ajuda e sinalizar erro de validação acessível", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Input
        label="E-mail ou Usuário"
        placeholder="admin@meninamulher.com"
        helperText="Use o e-mail cadastrado da loja."
        onChange={onChange}
      />
    );

    const input = screen.getByLabelText("E-mail ou Usuário");
    expect(screen.getByText("Use o e-mail cadastrado da loja.")).toBeDefined();

    fireEvent.change(input, { target: { value: "contato@meninamulher.com" } });
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender(
      <Input
        label="E-mail ou Usuário"
        error="Informe um e-mail válido para continuar."
        rightLabel="Esqueci a senha"
      />
    );

    const invalidInput = screen.getByLabelText("E-mail ou Usuário");
    expect(invalidInput.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Informe um e-mail válido para continuar.");
    expect(screen.getByText("Esqueci a senha")).toBeDefined();
  });

  it("Badge: deve renderizar etiquetas de disponibilidade (Disponível, Últimas peças, Esgotado) com ponto indicador", () => {
    render(
      <div>
        <Badge variant="available" dot>
          Disponível
        </Badge>
        <Badge variant="lowStock" dot>
          Últimas 2 un.
        </Badge>
        <Badge variant="outOfStock" dot>
          Esgotado
        </Badge>
      </div>
    );

    expect(screen.getByText("Disponível")).toBeDefined();
    expect(screen.getByText("Últimas 2 un.")).toBeDefined();
    expect(screen.getByText("Esgotado")).toBeDefined();
  });

  it("ProductCard: deve exibir dados da peça, tamanhos, alternar favorito e desabilitar compra quando esgotado", () => {
    const onAction = vi.fn();
    const onToggleFavorite = vi.fn();

    const { rerender } = render(
      <ProductCard
        id="prod-1"
        name="Conjunto Renda Floral Rubi"
        category="Conjuntos"
        price={119.9}
        sizes={["P", "M", "G"]}
        stockStatus="available"
        onAction={onAction}
        onToggleFavorite={onToggleFavorite}
      />
    );

    expect(screen.getByText("Conjunto Renda Floral Rubi")).toBeDefined();
    expect(screen.getByText(/119,90/)).toBeDefined();
    expect(screen.getByText("Tam: P, M, G")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Comprar Agora" }));
    expect(onAction).toHaveBeenCalledWith("prod-1");

    fireEvent.click(screen.getByLabelText("Adicionar Conjunto Renda Floral Rubi aos favoritos"));
    expect(onToggleFavorite).toHaveBeenCalledWith("prod-1");

    rerender(
      <ProductCard
        id="prod-2"
        name="Sutiã Meia-Taça Cetim Rose"
        category="Sutiãs"
        price={79.9}
        sizes={["M", "G"]}
        stockStatus="out_of_stock"
        onAction={onAction}
      />
    );

    expect(screen.getByText("Esgotado")).toBeDefined();
    const unavailableButton = screen.getByRole("button", { name: "Indisponível" });
    expect(unavailableButton.hasAttribute("disabled")).toBe(true);
  });

  it("Modal: deve exibir janela de diálogo quando aberto e fechar via botão ou tecla Escape", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal
        isOpen={false}
        onClose={onClose}
        title="Guia de Medidas"
        subtitle="Encontre seu caimento ideal"
      >
        <p>Tabela de busto e quadril</p>
      </Modal>
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Guia de Medidas"
        subtitle="Encontre seu caimento ideal"
      >
        <p>Tabela de busto e quadril</p>
      </Modal>
    );

    expect(screen.getByRole("dialog", { name: "Guia de Medidas" })).toBeDefined();
    expect(screen.getByText("Tabela de busto e quadril")).toBeDefined();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Fechar janela modal"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("Alert e EmptyState: devem renderizar avisos com botão de fechar e estado vazio com ação", () => {
    const onCloseAlert = vi.fn();
    const onEmptyAction = vi.fn();

    render(
      <div>
        <Alert variant="warning" title="Estoque crítico" onClose={onCloseAlert}>
          2 peças precisam de reposição imediata.
        </Alert>
        <EmptyState
          title="Sua sacola está vazia"
          description="Explore a coleção Menina Mulher para adicionar suas peças favoritas."
          actionLabel="Explorar Coleção"
          onAction={onEmptyAction}
        />
      </div>
    );

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Estoque crítico")).toBeDefined();
    fireEvent.click(screen.getByLabelText("Fechar aviso"));
    expect(onCloseAlert).toHaveBeenCalledTimes(1);

    expect(screen.getByText("Sua sacola está vazia")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Explorar Coleção" }));
    expect(onEmptyAction).toHaveBeenCalledTimes(1);
  });
});
