import { Product } from "@prisma/client";
import { CategoryRepository } from "../repositories/category.repository";
import {
  CreateProductData,
  ProductRepository,
  UpdateProductData,
} from "../repositories/product.repository";

export interface CreateProductInput {
  name?: string;
  description?: string | null;
  price?: number | string;
  active?: boolean;
  featured?: boolean;
  categoryId?: string | null;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export class ProductError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "ProductError";
    this.statusCode = statusCode;
  }
}

function parseNonNegativePrice(rawPrice: unknown): number {
  if (
    rawPrice === undefined ||
    rawPrice === null ||
    rawPrice === "" ||
    typeof rawPrice === "boolean"
  ) {
    throw new ProductError("O preço do produto é obrigatório e deve ser um número >= 0.", 400);
  }

  const parsed = Number(rawPrice);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ProductError(
      "O preço do produto deve ser um valor numérico maior ou igual a zero.",
      400
    );
  }

  return parsed;
}

/**
 * Camada de regras de negócio de produtos (`Product`) (RF01, RF02, RF12, RNF04, RNF09, US09, US11).
 * Isola 100% das validações e regras de domínio sem acessar o `PrismaClient` diretamente.
 */
export class ProductService {
  private readonly productRepository: ProductRepository;
  private readonly categoryRepository: CategoryRepository;

  constructor(
    productRepository: ProductRepository = new ProductRepository(),
    categoryRepository: CategoryRepository = new CategoryRepository()
  ) {
    this.productRepository = productRepository;
    this.categoryRepository = categoryRepository;
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    const trimmedName = typeof input?.name === "string" ? input.name.trim() : "";
    if (!trimmedName) {
      throw new ProductError("O nome do produto é obrigatório.", 400);
    }

    const parsedPrice = parseNonNegativePrice(input?.price);

    let normalizedDescription: string | null = null;
    if (typeof input?.description === "string") {
      normalizedDescription = input.description.trim();
    }

    const categoryId = input?.categoryId ?? null;
    if (categoryId !== null) {
      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        throw new ProductError("Categoria informada não foi encontrada.", 404);
      }
    }

    const data: CreateProductData = {
      name: trimmedName,
      description: normalizedDescription,
      price: parsedPrice,
      active: typeof input?.active === "boolean" ? input.active : true,
      featured: typeof input?.featured === "boolean" ? input.featured : false,
      categoryId,
    };

    return this.productRepository.create(data);
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const existing = await this.productRepository.findAdminById(id);
    if (!existing) {
      throw new ProductError("Produto não encontrado.", 404);
    }

    const updateData: UpdateProductData = {};

    if (input.name !== undefined) {
      const trimmedName = typeof input.name === "string" ? input.name.trim() : "";
      if (!trimmedName) {
        throw new ProductError("O nome do produto não pode ser vazio.", 400);
      }
      updateData.name = trimmedName;
    }

    if (input.description !== undefined) {
      updateData.description =
        typeof input.description === "string" ? input.description.trim() : null;
    }

    if (input.price !== undefined) {
      updateData.price = parseNonNegativePrice(input.price);
    }

    if (input.active !== undefined) {
      if (typeof input.active !== "boolean") {
        throw new ProductError("O campo 'active' deve ser um booleano.", 400);
      }
      updateData.active = input.active;
    }

    if (input.featured !== undefined) {
      if (typeof input.featured !== "boolean") {
        throw new ProductError("O campo 'featured' deve ser um booleano.", 400);
      }
      updateData.featured = input.featured;
    }

    if (input.categoryId !== undefined) {
      if (input.categoryId !== null) {
        const category = await this.categoryRepository.findById(input.categoryId);
        if (!category) {
          throw new ProductError("Categoria informada não foi encontrada.", 404);
        }
      }
      updateData.categoryId = input.categoryId;
    }

    return this.productRepository.update(id, updateData);
  }

  async deleteProduct(id: string): Promise<void> {
    const existing = await this.productRepository.findAdminById(id);
    if (!existing) {
      throw new ProductError("Produto não encontrado.", 404);
    }

    const hasOrders = await this.productRepository.hasOrderItems(id);
    if (hasOrders) {
      throw new ProductError(
        "Não é possível excluir fisicamente um produto que já possui pedidos vinculados. Oculte o produto (active: false) para retirá-lo da vitrine mantendo o histórico de vendas.",
        409
      );
    }

    try {
      await this.productRepository.delete(id);
    } catch {
      throw new ProductError(
        "Não é possível excluir fisicamente um produto que já possui pedidos vinculados. Oculte o produto (active: false) para retirá-lo da vitrine mantendo o histórico de vendas.",
        409
      );
    }
  }
}
