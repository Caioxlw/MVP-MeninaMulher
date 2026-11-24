import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderMessageLines,
  consumeNextLocalOrderNumber,
  formatOrderCurrencyBRL,
  formatOrderNumberTag,
  INITIAL_ORDER_NUMBER,
  ORDER_NUMBER_STORAGE_KEY,
  peekNextLocalOrderNumber,
  resolveOrderNumberForCheckout,
} from "../../services/whatsappOrderMessage";
import type { CartItem } from "../../types/cart";

const MOCK_ITEMS: CartItem[] = [
  {
    id: "prod-1-var-1",
    productId: "prod-1",
    variantId: "var-1",
    name: "Conjunto Renda Aurora",
    category: "Conjuntos",
    color: "Vermelho Rubi",
    colorHex: "#9E1B46",
    size: "M",
    unitPrice: 89.9,
    quantity: 2,
    imageAlt: "Conjunto Renda Aurora",
  },
  {
    id: "prod-2-var-2",
    productId: "prod-2",
    variantId: "var-2",
    name: "Sutiã Push-Up Pérola",
    category: "Sutiãs",
    color: "Branco",
    colorHex: "#FFFFFF",
    size: "G",
    unitPrice: 59.9,
    quantity: 1,
    imageAlt: "Sutiã Push-Up Pérola",
  },
];

describe("Gerador de Mensagem Padronizada do Pedido para WhatsApp (PBI #24 — RF08, US06, US08)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("formata valores monetários em BRL e normaliza tags de número de pedido", () => {
    expect(formatOrderCurrencyBRL(89.9)).toMatch(/89,90/);
    expect(formatOrderCurrencyBRL(-10)).toMatch(/0,00/);
    expect(formatOrderNumberTag(1042)).toBe("#1042");
    expect(formatOrderNumberTag("#1055")).toBe("#1055");
    expect(formatOrderNumberTag("  2001  ")).toBe("#2001");
    expect(formatOrderNumberTag(undefined)).toBe(`#${INITIAL_ORDER_NUMBER}`);
  });

  it("gera mensagem padronizada com número do pedido, lista de itens, quantidade total (plural e singular) e valor total", () => {
    const lines = buildWhatsAppOrderMessageLines({
      orderNumber: 1042,
      items: MOCK_ITEMS,
    });

    expect(lines[0]).toBe("Olá, Menina Mulher Lingerie! Gostaria de fazer o pedido:");
    expect(lines[1]).toBe("Pedido: #1042");
    expect(lines[2]).toContain("- 2x Conjunto Renda Aurora (Vermelho Rubi, Tam M) - R$");
    expect(lines[2]).toContain("179,80");
    expect(lines[3]).toContain("- 1x Sutiã Push-Up Pérola (Branco, Tam G) - R$");
    expect(lines[3]).toContain("59,90");
    expect(lines).toContain("Quantidade total: 3 peças");
    expect(lines).toContain("Forma de envio: A definir no WhatsApp");
    expect(lines[lines.length - 1]).toContain("Total: R$");
    expect(lines[lines.length - 1]).toContain("239,70");

    // Verifica singular quando há apenas 1 peça
    const singleItemMessage = buildWhatsAppOrderMessage({
      orderNumber: 1001,
      items: [MOCK_ITEMS[1]],
    });
    expect(singleItemMessage).toContain("Pedido: #1001");
    expect(singleItemMessage).toContain("Quantidade total: 1 peça");
    expect(singleItemMessage).not.toContain("Cliente:");
    expect(singleItemMessage).not.toContain("Obs:");
  });

  it("inclui Cliente e Obs apenas quando preenchidos e omite quando vazios ou apenas espaços", () => {
    const withFields = buildWhatsAppOrderMessage({
      orderNumber: 1010,
      items: [MOCK_ITEMS[1]],
      customerName: "  Camila Ferreira  ",
      notes: "  Entregar à tarde  ",
    });

    expect(withFields).toContain("Cliente: Camila Ferreira");
    expect(withFields).toContain("Obs: Entregar à tarde");

    const blankFields = buildWhatsAppOrderMessage({
      orderNumber: 1010,
      items: [MOCK_ITEMS[1]],
      customerName: "   ",
      notes: "",
    });

    expect(blankFields).not.toContain("Cliente:");
    expect(blankFields).not.toContain("Obs:");
  });

  it("controla a sequência local de números de pedido no localStorage e integra com POST /api/orders quando disponível", async () => {
    expect(peekNextLocalOrderNumber()).toBe(1001);
    expect(consumeNextLocalOrderNumber()).toBe(1001);
    expect(localStorage.getItem(ORDER_NUMBER_STORAGE_KEY)).toBe("1001");
    expect(peekNextLocalOrderNumber()).toBe(1002);

    // 1. Quando a API POST /api/orders responde com sucesso, usa o orderNumber oficial do banco
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: "ord-1", orderNumber: 1088, status: "PENDING" }),
      })
    );

    const apiResult = await resolveOrderNumberForCheckout(MOCK_ITEMS);
    expect(apiResult).toEqual({ orderNumber: 1088, source: "api" });
    expect(peekNextLocalOrderNumber()).toBe(1089);

    // 2. Quando a API falha ou está offline, faz fallback para o próximo número sequencial local
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("Offline")));
    const localResult = await resolveOrderNumberForCheckout(MOCK_ITEMS);
    expect(localResult).toEqual({ orderNumber: 1089, source: "local" });
  });
});
