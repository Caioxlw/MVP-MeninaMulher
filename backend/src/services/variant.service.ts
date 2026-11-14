import type { ProductVariant } from "@prisma/client";
import { type VariantWithAvailability, withVariantAvailability } from "../lib/availability";
import { ProductRepository } from "../repositories/product.repository";
import {
  type CreateVariantData,
  type UpdateVariantData,
  VariantRepository,
} from "../repositories/variant.repository";

export class VariantError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "VariantError";
    this.statusCode = statusCode;
  }
}

export interface VariantInputItem {
  size?: unknown;
  color?: unknown;
  stock?: unknown;
}

export type UpdateVariantInput = VariantInputItem;

export interface StockAdjustmentPayload {
  stock: number;
}

export type CreateVariantsPayload =
  | VariantInputItem
  | {
      variants?: VariantInputItem[];
    };

export interface VariantServicePort {
  listByProduct: (productId: string) => Promise<VariantWithAvailability<ProductVariant>[]>;
  createVariants: (
    productId: string,
    payload: CreateVariantsPayload
  ) => Promise<VariantWithAvailability<ProductVariant> | VariantWithAvailability<ProductVariant>[]>;
  updateVariant: (
    productId: string,
    variantId: string,
    input: UpdateVariantInput,
    actorId?: string
  ) => Promise<VariantWithAvailability<ProductVariant>>;
  deleteVariant: (productId: string, variantId: string) => Promise<void>;
  validateCartAvailability: (
    productId: string,
    variantId: string,
    quantity?: unknown
  ) => Promise<VariantWithAvailability<ProductVariant>>;
}

export interface VariantRepositoryPort {
  findByProductId: (productId: string) => Promise<ProductVariant[]>;
  findById: (id: string) => Promise<ProductVariant | null>;
  findByProductSizeColorInsensitive: (
    productId: string,
    size: string,
    color: string,
    excludeVariantId?: string
  ) => Promise<ProductVariant | null>;
  create: (data: CreateVariantData) => Promise<ProductVariant>;
  createManyAtomic: (items: CreateVariantData[]) => Promise<ProductVariant[]>;
  update: (id: string, data: UpdateVariantData) => Promise<ProductVariant>;
  delete: (id: string) => Promise<ProductVariant>;
  hasOrderItems: (variantId: string) => Promise<boolean>;
}

export interface ProductExistsPort {
  findById?: (id: string) => Promise<{ id: string } | null>;
  findAdminById?: (id: string) => Promise<{ id: string } | null>;
}

export interface StockAdjustmentLogEntry {
  event: "STOCK_ADJUSTMENT";
  productId: string;
  variantId: string;
  previousStock: number;
  newStock: number;
  delta: number;
  actorId?: string;
  timestamp: string;
}

export type StockAdjustmentLogger = (entry: StockAdjustmentLogEntry) => void;

const defaultStockLogger: StockAdjustmentLogger = (entry) => {
  console.info(JSON.stringify(entry));
};

export class VariantService implements VariantServicePort {
  private readonly variantRepository: VariantRepositoryPort;
  private readonly productRepository: ProductExistsPort;
  private readonly stockLogger: StockAdjustmentLogger;

  constructor(
    variantRepository: VariantRepositoryPort = new VariantRepository(),
    productRepository: ProductExistsPort = new ProductRepository(),
    stockLogger: StockAdjustmentLogger = defaultStockLogger
  ) {
    this.variantRepository = variantRepository;
    this.productRepository = productRepository;
    this.stockLogger = stockLogger;
  }

  private async ensureProductExists(productId: string): Promise<void> {
    if (!productId || typeof productId !== "string" || !productId.trim()) {
      throw new VariantError("ID do produto inválido.", 400);
    }
    const lookup =
      this.productRepository.findById?.bind(this.productRepository) ??
      this.productRepository.findAdminById?.bind(this.productRepository);
    const product = lookup ? await lookup(productId) : null;
    if (!product) {
      throw new VariantError("Produto não encontrado.", 404);
    }
  }

  private normalizeSize(rawSize: unknown): string {
    if (typeof rawSize !== "string" || !rawSize.trim()) {
      throw new VariantError("O tamanho (size) da variação é obrigatório.", 400);
    }
    return rawSize.trim().toUpperCase();
  }

  private normalizeColor(rawColor: unknown): string {
    if (typeof rawColor !== "string" || !rawColor.trim()) {
      throw new VariantError("A cor (color) da variação é obrigatória.", 400);
    }
    return rawColor.trim();
  }

  private normalizeStock(rawStock: unknown, defaultIfUndefined = true): number {
    if (rawStock === undefined) {
      if (defaultIfUndefined) {
        return 0;
      }
      throw new VariantError("Estoque (stock) inválido.", 400);
    }
    if (typeof rawStock !== "number" || !Number.isInteger(rawStock) || rawStock < 0) {
      throw new VariantError(
        "O estoque (stock) deve ser um número inteiro maior ou igual a zero.",
        400
      );
    }
    return rawStock;
  }

  private async findOwnedVariantOrThrow(
    productId: string,
    variantId: string
  ): Promise<ProductVariant> {
    const existing = await this.variantRepository.findById(variantId);
    if (!existing || existing.productId !== productId) {
      throw new VariantError("Variação não encontrada para este produto.", 404);
    }
    return existing;
  }

  private async ensureNoColorSizeCollision(
    productId: string,
    size: string,
    color: string,
    excludeVariantId?: string
  ): Promise<void> {
    const collision = await this.variantRepository.findByProductSizeColorInsensitive(
      productId,
      size,
      color,
      excludeVariantId
    );
    if (collision) {
      const message = excludeVariantId
        ? `Já existe outra variação com tamanho "${size}" e cor "${color}" para este produto.`
        : `Já existe uma variação cadastrada com tamanho "${size}" e cor "${color}" para este produto.`;
      throw new VariantError(message, 409);
    }
  }

  private buildUpdateData(input: UpdateVariantInput): UpdateVariantData {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new VariantError("Dados da variação inválidos.", 400);
    }

    const updateData: UpdateVariantData = {};

    if (input.size !== undefined) {
      updateData.size = this.normalizeSize(input.size);
    }
    if (input.color !== undefined) {
      updateData.color = this.normalizeColor(input.color);
    }
    if (input.stock !== undefined) {
      updateData.stock = this.normalizeStock(input.stock, false);
    }

    if (
      updateData.size === undefined &&
      updateData.color === undefined &&
      updateData.stock === undefined
    ) {
      throw new VariantError(
        "Informe ao menos um campo válido para atualização (size, color ou stock).",
        400
      );
    }

    return updateData;
  }

  private emitStockAdjustmentLog(params: {
    productId: string;
    variantId: string;
    previousStock: number;
    newStock: number;
    actorId?: string;
  }): void {
    if (params.newStock === params.previousStock) {
      return;
    }

    try {
      this.stockLogger({
        event: "STOCK_ADJUSTMENT",
        productId: params.productId,
        variantId: params.variantId,
        previousStock: params.previousStock,
        newStock: params.newStock,
        delta: params.newStock - params.previousStock,
        ...(params.actorId ? { actorId: params.actorId } : {}),
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Falhas no logger não devem reverter nem falhar a persistência do ajuste de estoque
    }
  }

  /** Lista as variações cadastradas para o produto informado com status de disponibilidade calculado. */
  async listByProduct(productId: string): Promise<VariantWithAvailability<ProductVariant>[]> {
    await this.ensureProductExists(productId);
    const variants = await this.variantRepository.findByProductId(productId);
    return variants.map((variant) => withVariantAvailability(variant));
  }

  /** Cria uma variação individual ou um lote atômico validando unicidade case-insensitive. */
  async createVariants(
    productId: string,
    payload: CreateVariantsPayload
  ): Promise<VariantWithAvailability<ProductVariant> | VariantWithAvailability<ProductVariant>[]> {
    await this.ensureProductExists(productId);

    if (!payload || typeof payload !== "object") {
      throw new VariantError("Dados da variação inválidos.", 400);
    }

    const isBatch = "variants" in payload && payload.variants !== undefined;

    if (isBatch) {
      const list = payload.variants;
      if (!Array.isArray(list) || list.length === 0) {
        throw new VariantError(
          "A lista de variações (variants) deve conter ao menos um item.",
          400
        );
      }

      const normalizedItems: CreateVariantData[] = [];
      const seenKeys = new Set<string>();

      for (const item of list) {
        const size = this.normalizeSize(item?.size);
        const color = this.normalizeColor(item?.color);
        const stock = this.normalizeStock(item?.stock, true);
        const key = `${size.toLowerCase()}::${color.toLowerCase()}`;

        if (seenKeys.has(key)) {
          throw new VariantError(
            `Variação duplicada no lote para tamanho "${size}" e cor "${color}".`,
            409
          );
        }
        seenKeys.add(key);

        normalizedItems.push({
          productId,
          size,
          color,
          stock,
        });
      }

      for (const item of normalizedItems) {
        await this.ensureNoColorSizeCollision(productId, item.size, item.color);
      }

      const created = await this.variantRepository.createManyAtomic(normalizedItems);
      return created.map((variant) => withVariantAvailability(variant));
    }

    const singleInput = payload as VariantInputItem;
    const size = this.normalizeSize(singleInput.size);
    const color = this.normalizeColor(singleInput.color);
    const stock = this.normalizeStock(singleInput.stock, true);

    await this.ensureNoColorSizeCollision(productId, size, color);

    const created = await this.variantRepository.create({
      productId,
      size,
      color,
      stock,
    });
    return withVariantAvailability(created);
  }

  /**
   * Atualiza tamanho, cor e/ou saldo em estoque de uma variação pertencente ao produto,
   * emitindo evento estruturado de auditoria sempre que `stock` for alterado.
   */
  async updateVariant(
    productId: string,
    variantId: string,
    input: UpdateVariantInput,
    actorId?: string
  ): Promise<VariantWithAvailability<ProductVariant>> {
    await this.ensureProductExists(productId);
    const updateData = this.buildUpdateData(input);
    const existing = await this.findOwnedVariantOrThrow(productId, variantId);

    if (updateData.size !== undefined || updateData.color !== undefined) {
      await this.ensureNoColorSizeCollision(
        productId,
        updateData.size ?? existing.size,
        updateData.color ?? existing.color,
        variantId
      );
    }

    const updated = await this.variantRepository.update(variantId, updateData);

    if (updateData.stock !== undefined) {
      this.emitStockAdjustmentLog({
        productId,
        variantId,
        previousStock: existing.stock,
        newStock: updated.stock,
        actorId,
      });
    }

    return withVariantAvailability(updated);
  }

  /**
   * Valida se uma variação pode ser adicionada ao carrinho na quantidade solicitada (`RF05`).
   * Bloqueia variações esgotadas (`stock === 0`) ou sem saldo suficiente (`quantity > stock`) com 409 Conflict.
   */
  async validateCartAvailability(
    productId: string,
    variantId: string,
    rawQuantity: unknown = 1
  ): Promise<VariantWithAvailability<ProductVariant>> {
    const quantity = rawQuantity === undefined ? 1 : rawQuantity;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) {
      throw new VariantError(
        "A quantidade solicitada deve ser um número inteiro maior que zero.",
        400
      );
    }

    await this.ensureProductExists(productId);
    const variant = await this.findOwnedVariantOrThrow(productId, variantId);

    if (variant.stock === 0) {
      throw new VariantError(
        "Esta variação está esgotada e não pode ser adicionada ao carrinho.",
        409
      );
    }

    if (quantity > variant.stock) {
      throw new VariantError(
        `Quantidade solicitada (${quantity}) excede o estoque disponível (${variant.stock}).`,
        409
      );
    }

    return withVariantAvailability(variant);
  }

  /** Remove uma variação sem histórico de pedidos; caso possua pedidos, orienta zerar o estoque. */
  async deleteVariant(productId: string, variantId: string): Promise<void> {
    await this.ensureProductExists(productId);
    await this.findOwnedVariantOrThrow(productId, variantId);

    const linkedToOrders = await this.variantRepository.hasOrderItems(variantId);
    if (linkedToOrders) {
      throw new VariantError(
        "Não é possível excluir uma variação vinculada a pedidos registrados. Recomendamos zerar o estoque (stock = 0) para indisponibilizá-la na vitrine.",
        409
      );
    }

    await this.variantRepository.delete(variantId);
  }
}
