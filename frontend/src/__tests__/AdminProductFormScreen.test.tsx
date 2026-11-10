import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../routes/AppRoutes";
import { clearAdminSession, seedDemoAdminSession } from "../services/authApi";
import { resetDemoProductsStore } from "../services/productsApi";

function renderAdminProductFormPage(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe("AdminProductFormScreen - Formulário de Criação e Edição (PBI #92 / Task #151)", () => {
  beforeEach(() => {
    seedDemoAdminSession();
    resetDemoProductsStore();
  });

  afterEach(() => {
    cleanup();
    clearAdminSession();
    resetDemoProductsStore();
  });

  it("renderiza o formulário de novo produto em branco com valores padrão e opções de categoria", async () => {
    renderAdminProductFormPage(["/painel/produtos/novo"]);

    expect(await screen.findByRole("heading", { name: "Novo Produto" })).toBeDefined();

    const nameInput = screen.getByLabelText(/Nome da Peça/i) as HTMLInputElement;
    const priceInput = screen.getByLabelText(/Preço de Venda \(R\$\)/i) as HTMLInputElement;
    const categorySelect = screen.getByLabelText(/Categoria da Peça/i) as HTMLSelectElement;
    const activeCheckbox = screen.getByLabelText(
      /Visível na Vitrine \(Ativo\)/i
    ) as HTMLInputElement;
    const featuredCheckbox = screen.getByLabelText(
      /Destacar na Página Inicial/i
    ) as HTMLInputElement;

    expect(nameInput.value).toBe("");
    expect(priceInput.value).toBe("");
    expect(categorySelect.value).toBeDefined();
    expect(activeCheckbox.checked).toBe(true);
    expect(featuredCheckbox.checked).toBe(false);

    // Botões de ação com alvos acessíveis >= 44px
    const submitBtn = screen.getByRole("button", { name: /Cadastrar Produto/i });
    expect(submitBtn.className).toContain("touch-target");
  });

  it("valida campos obrigatórios impedindo submissão de nome vazio e preço inválido", async () => {
    renderAdminProductFormPage(["/painel/produtos/novo"]);

    const submitBtn = await screen.findByRole("button", { name: /Cadastrar Produto/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("O nome do produto é obrigatório.")).toBeDefined();
    expect(
      screen.getByText("Informe um preço válido maior ou igual a zero (ex.: 119,90).")
    ).toBeDefined();

    // Preenche preço inválido negativo
    const priceInput = screen.getByLabelText(/Preço de Venda \(R\$\)/i);
    fireEvent.change(priceInput, { target: { value: "-15,00" } });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText("Informe um preço válido maior ou igual a zero (ex.: 119,90).")
    ).toBeDefined();
  });

  it("cadastra um novo produto com sucesso e redireciona para a listagem com mensagem flash", async () => {
    renderAdminProductFormPage(["/painel/produtos/novo"]);

    await screen.findByRole("heading", { name: "Novo Produto" });

    // Aguarda o select de categoria ser preenchido
    const categorySelect = (await screen.findByLabelText(
      /Categoria da Peça/i
    )) as HTMLSelectElement;
    await waitFor(() => {
      expect(categorySelect.value).not.toBe("");
    });

    fireEvent.change(screen.getByLabelText(/Nome da Peça/i), {
      target: { value: "Top Renda Bralette" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        /Descreva o caimento, composição da renda, microfibra ou algodão.../i
      ),
      {
        target: { value: "Top confortável sem aro com renda floral macia." },
      }
    );
    fireEvent.change(screen.getByLabelText(/Preço de Venda \(R\$\)/i), {
      target: { value: "69,90" },
    });
    fireEvent.click(screen.getByLabelText(/Destacar na Página Inicial/i));

    const submitBtn = screen.getByRole("button", { name: /Cadastrar Produto/i });
    fireEvent.click(submitBtn);

    // Redireciona para /painel/produtos exibindo mensagem flash e o novo produto na listagem
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Catálogo e Cadastro de Produtos" })
      ).toBeDefined();
      expect(
        screen.getByText(/Produto "Top Renda Bralette" cadastrado com sucesso!/i)
      ).toBeDefined();
      expect(screen.getByText("Top Renda Bralette")).toBeDefined();
    });
  });

  it("carrega dados de produto existente na rota de edição e permite atualizar com sucesso", async () => {
    // "demo-sutia-renda-noir" é o ID mockado do "Sutiã Renda Noir"
    renderAdminProductFormPage(["/painel/produtos/demo-sutia-renda-noir/editar"]);

    expect(await screen.findByRole("heading", { name: "Editar Produto" })).toBeDefined();

    const nameInput = (await screen.findByLabelText(/Nome da Peça/i)) as HTMLInputElement;
    const priceInput = screen.getByLabelText(/Preço de Venda \(R\$\)/i) as HTMLInputElement;

    await waitFor(() => {
      expect(nameInput.value).toBe("Sutiã Renda Noir");
      expect(priceInput.value).toBe("119,90");
    });

    // Modifica nome e preço
    fireEvent.change(nameInput, { target: { value: "Sutiã Renda Noir Premium" } });
    fireEvent.change(priceInput, { target: { value: "129,90" } });

    const saveBtn = screen.getByRole("button", { name: /Salvar Alterações/i });
    fireEvent.click(saveBtn);

    // Redireciona e exibe dados atualizados
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Catálogo e Cadastro de Produtos" })
      ).toBeDefined();
      expect(
        screen.getByText(/Produto "Sutiã Renda Noir Premium" atualizado com sucesso!/i)
      ).toBeDefined();
      expect(screen.getByText("Sutiã Renda Noir Premium")).toBeDefined();
    });
  });

  it("exibe mensagem amigável caso o produto solicitado para edição não seja encontrado", async () => {
    renderAdminProductFormPage(["/painel/produtos/id-inexistente-1234/editar"]);

    expect(await screen.findByText(/Produto não encontrado\./i)).toBeDefined();

    const backBtn = screen.getByRole("button", { name: /Voltar ao Catálogo/i });
    expect(backBtn).toBeDefined();
  });
});
