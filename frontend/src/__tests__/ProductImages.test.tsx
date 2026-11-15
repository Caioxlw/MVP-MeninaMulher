import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../routes/AppRoutes";
import { clearAdminSession, seedDemoAdminSession } from "../services/authApi";
import {
  MAX_IMAGE_FILE_SIZE_BYTES,
  ProductsApiError,
  addProductImageByUrl,
  deleteProductImage,
  resetDemoProductsStore,
  updateProductImage,
  uploadProductImageFile,
  validateProductImageFile,
} from "../services/productsApi";

function renderApp(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe("Envio e Gerenciamento de Fotos Otimizadas no Painel (PBI #17 / Task #207)", () => {
  beforeEach(() => {
    seedDemoAdminSession();
    resetDemoProductsStore();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    clearAdminSession();
    resetDemoProductsStore();
  });

  describe("Validação e Cliente HTTP de Fotos (productsApi.ts)", () => {
    it("aceita imagens JPG, PNG e WEBP de até 10 MB e rejeita formatos inválidos ou arquivos > 10 MB", () => {
      expect(MAX_IMAGE_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);

      const validFile = new File(["conteudo"], "peca.webp", { type: "image/webp" });
      expect(() => validateProductImageFile(validFile)).not.toThrow();

      const invalidFormat = new File(["conteudo"], "documento.pdf", { type: "application/pdf" });
      expect(() => validateProductImageFile(invalidFormat)).toThrowError(
        /Apenas JPG, PNG e WEBP são permitidos/i
      );

      const oversizedFile = {
        name: "foto-grande.jpg",
        type: "image/jpeg",
        size: MAX_IMAGE_FILE_SIZE_BYTES + 1,
      };
      expect(() => validateProductImageFile(oversizedFile)).toThrowError(/10 MB/i);
    });

    it("envia upload multipart, adiciona por URL, promove foto de capa e remove via API", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: "img-upload-1",
              url: "http://localhost:3001/uploads/foto1.webp",
              altText: "Sutiã Renda Noir",
              position: 0,
            }),
            { status: 201, headers: { "Content-Type": "application/json" } }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: "img-url-2",
              url: "https://cdn.meninamulher.com/foto2.webp",
              altText: "Costas",
              position: 1,
            }),
            { status: 201, headers: { "Content-Type": "application/json" } }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: "img-url-2",
              url: "https://cdn.meninamulher.com/foto2.webp",
              altText: "Costas",
              position: 0,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: "Foto removida com sucesso." }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

      vi.stubGlobal("fetch", fetchMock);

      const file = new File(["bytes"], "foto1.webp", { type: "image/webp" });
      const uploaded = await uploadProductImageFile("p1", file, {
        altText: "Sutiã Renda Noir",
        isPrimary: true,
      });
      expect(uploaded.id).toBe("img-upload-1");
      expect(fetchMock.mock.calls[0][0]).toBe("/api/products/p1/images");
      expect(fetchMock.mock.calls[0][1].method).toBe("POST");
      expect(fetchMock.mock.calls[0][1].body).toBeInstanceOf(FormData);

      const addedByUrl = await addProductImageByUrl("p1", {
        url: "https://cdn.meninamulher.com/foto2.webp",
        altText: "Costas",
      });
      expect(addedByUrl.id).toBe("img-url-2");

      const updated = await updateProductImage("p1", "img-url-2", { position: 0, isPrimary: true });
      expect(updated.position).toBe(0);

      await deleteProductImage("p1", "img-url-2");
      expect(fetchMock.mock.calls[3][0]).toBe("/api/products/p1/images/img-url-2");
      expect(fetchMock.mock.calls[3][1].method).toBe("DELETE");
    });
  });

  describe("Interface de Galeria de Fotos no Formulário e Miniatura na Listagem", () => {
    it("bloqueia arquivo maior que 10 MB ou formato inválido exibindo alerta de erro no formulário", async () => {
      renderApp(["/painel/produtos/demo-sutia-renda-noir/editar"]);

      await screen.findByRole("heading", { name: "Editar Produto" });

      const fileInput = screen.getByLabelText("Selecionar arquivo de foto") as HTMLInputElement;

      const oversizedFile = new File(["a"], "gigante.png", { type: "image/png" });
      Object.defineProperty(oversizedFile, "size", { value: MAX_IMAGE_FILE_SIZE_BYTES + 500 });

      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      expect(
        await screen.findByText(/O arquivo excede o tamanho máximo permitido de 10 MB\./i)
      ).toBeDefined();
    });

    it("adiciona fotos por arquivo e por URL, alterna a Foto Principal (Capa), remove foto e exibe miniatura na listagem", async () => {
      renderApp(["/painel/produtos/demo-sutia-renda-noir/editar"]);

      await screen.findByRole("heading", { name: "Editar Produto" });

      const nameInput = (await screen.findByLabelText(/Nome da Peça/i)) as HTMLInputElement;
      await waitFor(() => {
        expect(nameInput.value).toBe("Sutiã Renda Noir");
      });

      // 1. Envia primeira foto por arquivo (vira Foto Principal / Capa)
      const fileInput = screen.getByLabelText("Selecionar arquivo de foto");
      const validFile = new File(["conteudo-imagem"], "sutia-frente.webp", {
        type: "image/webp",
      });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      expect(
        await screen.findByText(/Foto "sutia-frente\.webp" adicionada à galeria com sucesso\./i)
      ).toBeDefined();

      const firstCard = screen.getByTestId("product-image-card-0");
      expect(within(firstCard).getByText("Foto Principal (Capa)")).toBeDefined();

      // 2. Adiciona segunda foto por Link (URL) e texto alternativo personalizado
      fireEvent.change(screen.getByLabelText(/Link \(URL\) da Foto/i), {
        target: { value: "https://cdn.meninamulher.com/sutia-costas.webp" },
      });
      fireEvent.change(screen.getByLabelText(/Texto Alternativo \(Acessibilidade\)/i), {
        target: { value: "Sutiã Renda Noir Costas" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Adicionar Foto" }));

      expect(await screen.findByText("Sutiã Renda Noir Costas")).toBeDefined();
      const secondCard = screen.getByTestId("product-image-card-1");
      expect(within(secondCard).getByText("Foto #2")).toBeDefined();

      // 3. Promove a Foto #2 como Capa Principal (alvos >= 44px — RNF07)
      const setPrimaryBtn = screen.getByRole("button", { name: "Definir foto 2 como capa" });
      expect(setPrimaryBtn.className).toContain("min-h-11");
      fireEvent.click(setPrimaryBtn);

      await waitFor(() => {
        const updatedPrimaryCard = screen.getByTestId("product-image-card-0");
        expect(within(updatedPrimaryCard).getByText("Sutiã Renda Noir Costas")).toBeDefined();
        expect(within(updatedPrimaryCard).getByText("Foto Principal (Capa)")).toBeDefined();
      });

      // 4. Remove a segunda foto
      const removeBtn = screen.getByRole("button", { name: "Remover foto 2" });
      expect(removeBtn.className).toContain("min-h-11");
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("product-image-card-1")).toBeNull();
      });

      // 5. Salva alterações e verifica se a miniatura da foto principal aparece na listagem (/painel/produtos)
      fireEvent.click(screen.getByRole("button", { name: /Salvar Alterações/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Catálogo e Cadastro de Produtos" })
        ).toBeDefined();
      });

      const productRow = screen.getByTestId("product-row-demo-sutia-renda-noir");
      const thumbnailImg = (await within(productRow).findByRole("img", {
        name: "Sutiã Renda Noir Costas",
      })) as HTMLImageElement;
      expect(thumbnailImg).toBeDefined();
      expect(thumbnailImg.src).toContain("https://cdn.meninamulher.com/sutia-costas.webp");
    });

    it("permite preparar fotos durante o cadastro de um novo produto e persiste ao salvar", async () => {
      renderApp(["/painel/produtos/novo"]);

      await screen.findByRole("heading", { name: "Novo Produto" });

      fireEvent.change(screen.getByLabelText(/Nome da Peça/i), {
        target: { value: "Body Renda Rubi" },
      });
      fireEvent.change(screen.getByLabelText(/Preço de Venda \(R\$\)/i), {
        target: { value: "159,90" },
      });

      fireEvent.change(screen.getByLabelText(/Link \(URL\) da Foto/i), {
        target: { value: "https://cdn.meninamulher.com/body-rubi.webp" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Adicionar Foto" }));

      expect(await screen.findByTestId("product-image-card-0")).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: /Cadastrar Produto/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Catálogo e Cadastro de Produtos" })
        ).toBeDefined();
        expect(screen.getByText("Body Renda Rubi")).toBeDefined();
      });

      const newThumbnail = (await screen.findByRole("img", {
        name: "Body Renda Rubi",
      })) as HTMLImageElement;
      expect(newThumbnail.src).toContain("https://cdn.meninamulher.com/body-rubi.webp");
      expect(ProductsApiError).toBeDefined();
    });
  });
});
