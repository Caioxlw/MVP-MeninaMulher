import type { CartItem } from "../types/cart";

export const ORDER_NUMBER_STORAGE_KEY = "menina-mulher:last-order-number";
export const INITIAL_ORDER_NUMBER = 1001;
export const DEFAULT_STORE_WHATSAPP_NUMBER = "5511987654321";

export interface WhatsAppOrderMessageInput {
  orderNumber?: number | string;
  items: CartItem[];
  totalAmount?: number;
  totalCount?: number;
  customerName?: string;
  notes?: string;
  shippingLabel?: string;
}

export interface WhatsAppCheckoutUrlInput extends WhatsAppOrderMessageInput {
  phone?: string | null;
}

export interface CheckoutOrderNumberResult {
  orderNumber: number;
  source: "api" | "local";
}

/**
 * Sanitiza um número de telefone para o padrão internacional do WhatsApp (`wa.me`),
 * mantendo apenas dígitos e prefixando `55` quando informado apenas DDD + número (10 ou 11 dígitos).
 */
export function sanitizeWhatsAppPhone(rawPhone?: string | null): string {
  if (!rawPhone || typeof rawPhone !== "string") {
    return "";
  }
  const digits = rawPhone.replace(/\D+/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits.length >= 12 ? digits : "";
}

/**
 * Resolve o número de WhatsApp da loja a partir de um override explícito, da variável
 * de ambiente `VITE_STORE_WHATSAPP_NUMBER` (em desenvolvimento/produção) ou do fallback padrão.
 */
export function resolveStoreWhatsAppNumber(overridePhone?: string | null): string {
  const sanitizedOverride = sanitizeWhatsAppPhone(overridePhone);
  if (sanitizedOverride) {
    return sanitizedOverride;
  }

  const envMode = import.meta.env?.MODE;
  const rawEnvPhone =
    envMode !== "test"
      ? (import.meta.env?.VITE_STORE_WHATSAPP_NUMBER as string | undefined)
      : undefined;
  const sanitizedEnv = sanitizeWhatsAppPhone(rawEnvPhone);
  return sanitizedEnv || DEFAULT_STORE_WHATSAPP_NUMBER;
}

/**
 * Formata um valor numérico como moeda brasileira (`R$ XX,XX`).
 */
export function formatOrderCurrencyBRL(value: number): string {
  const safeValue = Number.isFinite(value) && value >= 0 ? value : 0;
  return safeValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Normaliza o identificador numérico do pedido (ex.: `1001` -> `"#1001"`).
 */
export function formatOrderNumberTag(orderNumber?: number | string): string {
  if (typeof orderNumber === "number" && Number.isInteger(orderNumber) && orderNumber > 0) {
    return `#${orderNumber}`;
  }
  if (typeof orderNumber === "string" && orderNumber.trim().length > 0) {
    const cleaned = orderNumber.trim().replace(/^#+/, "");
    return `#${cleaned}`;
  }
  return `#${INITIAL_ORDER_NUMBER}`;
}

/**
 * Consulta o próximo número sequencial local de pedido sem avançar o contador no `localStorage`.
 */
export function peekNextLocalOrderNumber(
  storage: Storage | undefined = globalThis.localStorage
): number {
  try {
    const raw = storage?.getItem(ORDER_NUMBER_STORAGE_KEY);
    if (!raw) {
      return INITIAL_ORDER_NUMBER;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed < INITIAL_ORDER_NUMBER) {
      return INITIAL_ORDER_NUMBER;
    }
    return parsed + 1;
  } catch {
    return INITIAL_ORDER_NUMBER;
  }
}

/**
 * Avança e persiste o contador sequencial local de pedidos no `localStorage`.
 */
export function consumeNextLocalOrderNumber(
  storage: Storage | undefined = globalThis.localStorage
): number {
  const nextNumber = peekNextLocalOrderNumber(storage);
  try {
    storage?.setItem(ORDER_NUMBER_STORAGE_KEY, String(nextNumber));
  } catch {
    // Ignora falha de escrita em ambientes com storage restrito
  }
  return nextNumber;
}

/**
 * Registra o pedido em `POST /api/orders` (quando o endpoint estiver disponível) ou
 * utiliza o gerador sequencial local como fallback resiliente (`PBI #24` / `PBI #26`).
 */
export async function resolveOrderNumberForCheckout(
  items: CartItem[],
  storage: Storage | undefined = globalThis.localStorage
): Promise<CheckoutOrderNumberResult> {
  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      }),
    });

    if (response.ok) {
      const data: unknown = await response.json();
      if (
        data &&
        typeof data === "object" &&
        "orderNumber" in data &&
        typeof (data as { orderNumber?: unknown }).orderNumber === "number"
      ) {
        const apiOrderNumber = (data as { orderNumber: number }).orderNumber;
        try {
          storage?.setItem(ORDER_NUMBER_STORAGE_KEY, String(apiOrderNumber));
        } catch {
          // Ignora falha de storage
        }
        return {
          orderNumber: apiOrderNumber,
          source: "api",
        };
      }
    }
  } catch {
    // Fallback para sequência local quando offline ou endpoint ainda não publicado
  }

  return {
    orderNumber: consumeNextLocalOrderNumber(storage),
    source: "local",
  };
}

/**
 * Constrói as linhas da mensagem padronizada do pedido para o WhatsApp (`PBI #24` — `RF08`, `US06`, `US08`).
 */
export function buildWhatsAppOrderMessageLines(input: WhatsAppOrderMessageInput): string[] {
  const items = Array.isArray(input.items) ? input.items : [];
  const calculatedTotalCount =
    typeof input.totalCount === "number"
      ? input.totalCount
      : items.reduce((sum, item) => sum + item.quantity, 0);
  const calculatedTotalAmount =
    typeof input.totalAmount === "number"
      ? input.totalAmount
      : items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const orderTag = formatOrderNumberTag(input.orderNumber);
  const totalPiecesLabel = calculatedTotalCount === 1 ? "1 peça" : `${calculatedTotalCount} peças`;
  const shippingText = input.shippingLabel?.trim() || "A definir no WhatsApp";
  const trimmedCustomer = input.customerName?.trim() || "";
  const trimmedNotes = input.notes?.trim() || "";

  const lines: Array<string | null> = [
    "Olá, Menina Mulher Lingerie! Gostaria de fazer o pedido:",
    `Pedido: ${orderTag}`,
    ...items.map(
      (item) =>
        `- ${item.quantity}x ${item.name} (${item.color}, Tam ${item.size}) - ${formatOrderCurrencyBRL(
          item.unitPrice * item.quantity
        )}`
    ),
    `Quantidade total: ${totalPiecesLabel}`,
    `Forma de envio: ${shippingText}`,
    trimmedCustomer ? `Cliente: ${trimmedCustomer}` : null,
    trimmedNotes ? `Obs: ${trimmedNotes}` : null,
    `Total: ${formatOrderCurrencyBRL(calculatedTotalAmount)}`,
  ];

  return lines.filter((line): line is string => Boolean(line));
}

/**
 * Constrói o texto completo da mensagem padronizada do pedido separado por quebras de linha (`\n`).
 */
export function buildWhatsAppOrderMessage(input: WhatsAppOrderMessageInput): string {
  return buildWhatsAppOrderMessageLines(input).join("\n");
}

/**
 * Constrói a URL oficial de redirecionamento para o WhatsApp (`https://wa.me/<phone>?text=<encoded>`)
 * com a mensagem padronizada do pedido pré-preenchida (`PBI #25` — `RF09`, `RNF03`, `US06`).
 */
export function buildWhatsAppCheckoutUrl(input: WhatsAppCheckoutUrlInput): string {
  const phone = resolveStoreWhatsAppNumber(input.phone);
  const message = buildWhatsAppOrderMessage(input);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
