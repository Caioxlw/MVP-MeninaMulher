import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../routes/AppRoutes";
import {
  getProductColorsAvailability,
  getSizesAvailabilityForColor,
  resolveProductOverallAvailability,
  resolveVariationAvailability,
  STORE_PRODUCT_VARIANTS_MAP,
} from "../services/availability";

function renderProductDetail(productId = "sutia-renda-noir") {
  return render(
    <MemoryRouter initialEntries={[`/produto/${productId}`]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe("Etiquetas de Disponibilidade e Bloqueio de Variações Esgotadas (PBI #97)", () => {
  afterEach(() => {
    cleanup();
  });

  it("calcula corretamente o status e as etiquetas textuais ('Disponível', 'Últimas unidades', 'Esgotado') (RF05, RNF07)", () => {
    expect(resolveVariationAvailability(5)).toEqual({
      status: "available",
      label: "Disponível",
      badgeVariant: "available",
      available: true,
      stock: 5,
    });

    expect(resolveVariationAvailability(3)).toEqual({
      status: "low_stock",
      label: "Últimas unidades",
      badgeVariant: "lowStock",
      available: true,
      stock: 3,
    });

    expect(resolveVariationAvailability(2)).toEqual({
      status: "low_stock",
      label: "Últimas unidades",
      badgeVariant: "lowStock",
      available: true,
      stock: 2,
    });

    expect(resolveVariationAvailability(0)).toEqual({
      status: "out_of_stock",
      label: "Esgotado",
      badgeVariant: "outOfStock",
      available: false,
      stock: 0,
    });

    const noirVariants = STORE_PRODUCT_VARIANTS_MAP["sutia-renda-noir"];
    const colors = getProductColorsAvailability(noirVariants);
    expect(colors.find((c) => c.color === "Preto")?.availability.label).toBe("Disponível");
    expect(colors.find((c) => c.color === "Rosé")?.availability.label).toBe("Esgotado");

    const pretoSizes = getSizesAvailabilityForColor(noirVariants, "Preto");
    expect(pretoSizes.find((s) => s.size === "P")?.availability.label).toBe("Disponível");
    expect(pretoSizes.find((s) => s.size === "M")?.availability.label).toBe("Últimas unidades");
    expect(pretoSizes.find((s) => s.size === "G")?.availability.label).toBe("Esgotado");

    const bodyOverall = resolveProductOverallAvailability(
      STORE_PRODUCT_VARIANTS_MAP["body-renda-floral"]
    );
    expect(bodyOverall.label).toBe("Esgotado");
    expect(bodyOverall.available).toBe(false);
  });

  it("exibe etiquetas textuais de disponibilidade em cada cor e tamanho e bloqueia opções esgotadas (RF04, RF05, RNF07)", () => {
    renderProductDetail("sutia-renda-noir");

    const sizeP = screen.getByTestId("size-option-P");
    const sizeM = screen.getByTestId("size-option-M");
    const sizeG = screen.getByTestId("size-option-G");

    // Etiquetas textuais explícitas dentro de cada botão de tamanho
    expect(within(sizeP).getByText("Disponível")).toBeDefined();
    expect(within(sizeM).getByText("Últimas unidades")).toBeDefined();
    expect(within(sizeG).getByText("Esgotado")).toBeDefined();

    // Tamanho G (0 un.) deve estar desabilitado e não pode ser selecionado
    expect(sizeG.hasAttribute("disabled")).toBe(true);
    expect(sizeG.getAttribute("aria-disabled")).toBe("true");
    expect(sizeP.className).toContain("min-h-11");

    // Cor Rosé (0 un. totais) deve estar desabilitada com etiqueta "Esgotado"
    const roseColorBtn = screen.getByRole("button", { name: /Cor Rosé - Esgotado/i });
    expect(roseColorBtn.hasAttribute("disabled")).toBe(true);
    expect(roseColorBtn.getAttribute("aria-disabled")).toBe("true");
  });

  it("atualiza os tamanhos disponíveis ao trocar de cor e limita a quantidade selecionável ao estoque da variação", () => {
    renderProductDetail("sutia-renda-noir");

    // Seleciona tamanho M na cor Preto (estoque = 2 unidades -> Últimas unidades)
    const sizeM = screen.getByTestId("size-option-M");
    fireEvent.click(sizeM);

    const statusBanner = screen.getByTestId("selected-variation-status");
    expect(within(statusBanner).getByText("Últimas unidades")).toBeDefined();

    const increaseQtyBtn = screen.getByRole("button", { name: "Aumentar quantidade" });
    const qtyDisplay = screen.getByTestId("detail-selected-qty");
    expect(qtyDisplay.textContent).toBe("1");

    fireEvent.click(increaseQtyBtn);
    expect(qtyDisplay.textContent).toBe("2");
    // Ao atingir o limite do estoque da variação (2 un.), o botão "+" fica desabilitado
    expect(increaseQtyBtn.hasAttribute("disabled")).toBe(true);

    // Troca para a cor Grafite (onde P é Esgotado, M tem 3 un. e G tem 1 un.)
    const grafiteBtn = screen.getByRole("button", { name: /Cor Grafite - Disponível/i });
    fireEvent.click(grafiteBtn);

    const sizePGrafite = screen.getByTestId("size-option-P");
    const sizeGGrafite = screen.getByTestId("size-option-G");
    expect(sizePGrafite.hasAttribute("disabled")).toBe(true);
    expect(sizeGGrafite.hasAttribute("disabled")).toBe(false);
    expect(within(sizeGGrafite).getByText("Últimas unidades")).toBeDefined();
  });

  it("bloqueia o botão 'Adicionar à sacola' quando todas as variações da peça estão esgotadas (RF05)", () => {
    renderProductDetail("body-renda-floral");

    const addBtn = screen.getByRole("button", {
      name: /Variação Esgotada — Indisponível/i,
    });
    expect(addBtn.hasAttribute("disabled")).toBe(true);

    const qtyDisplay = screen.getByTestId("detail-selected-qty");
    expect(qtyDisplay.textContent).toBe("0");
  });
});
