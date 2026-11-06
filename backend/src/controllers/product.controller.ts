import { Request, Response } from "express";
import { ProductRepository, PublicProductFilters } from "../repositories/product.repository";
import { ProductError, ProductService } from "../services/product.service";

function handleControllerError(error: unknown, res: Response, fallbackMessage: string): void {
  if (
    error instanceof ProductError ||
    (error && typeof (error as { statusCode?: unknown }).statusCode === "number")
  ) {
    const statusErr = error as { statusCode: number; message: string };
    res.status(statusErr.statusCode).json({ error: statusErr.message });
    return;
  }

  res.status(500).json({ error: fallbackMessage });
}

/**
 * Controller HTTP de produtos (`Product`) para vitrine pública e painel administrativo (PBI #16).
 */
export class ProductController {
  private readonly productService: ProductService;
  private readonly productRepository: ProductRepository;

  constructor(
    productService: ProductService = new ProductService(),
    productRepository: ProductRepository = new ProductRepository()
  ) {
    this.productService = productService;
    this.productRepository = productRepository;
  }

  listPublic = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: PublicProductFilters = {};

      if (req.query?.featured === "true") {
        filters.featured = true;
      } else if (req.query?.featured === "false") {
        filters.featured = false;
      }

      if (typeof req.query?.categoryId === "string" && req.query.categoryId.trim() !== "") {
        filters.categoryId = req.query.categoryId.trim();
      }

      if (typeof req.query?.category === "string" && req.query.category.trim() !== "") {
        filters.categorySlug = req.query.category.trim();
      }

      const products = await this.productRepository.findPublicActive(filters);
      res.status(200).json(products);
    } catch (error: unknown) {
      handleControllerError(error, res, "Erro ao listar produtos do catálogo.");
    }
  };

  getPublicById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params?.id ?? "");
      const product = await this.productRepository.findPublicById(id);

      if (!product) {
        res.status(404).json({ error: "Produto não encontrado ou indisponível no catálogo." });
        return;
      }

      res.status(200).json(product);
    } catch (error: unknown) {
      handleControllerError(error, res, "Erro ao consultar detalhe do produto.");
    }
  };

  listAdmin = async (_req: Request, res: Response): Promise<void> => {
    try {
      const products = await this.productRepository.findAllAdmin();
      res.status(200).json(products);
    } catch (error: unknown) {
      handleControllerError(error, res, "Erro ao listar produtos no painel administrativo.");
    }
  };

  getAdminById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params?.id ?? "");
      const product = await this.productRepository.findAdminById(id);

      if (!product) {
        res.status(404).json({ error: "Produto não encontrado." });
        return;
      }

      res.status(200).json(product);
    } catch (error: unknown) {
      handleControllerError(error, res, "Erro ao consultar produto no painel administrativo.");
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const created = await this.productService.createProduct(req.body ?? {});
      res.status(201).json(created);
    } catch (error: unknown) {
      handleControllerError(error, res, "Erro ao cadastrar produto.");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params?.id ?? "");
      const updated = await this.productService.updateProduct(id, req.body ?? {});
      res.status(200).json(updated);
    } catch (error: unknown) {
      handleControllerError(error, res, "Erro ao atualizar produto.");
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params?.id ?? "");
      await this.productService.deleteProduct(id);
      res.status(200).json({ message: "Produto excluído com sucesso." });
    } catch (error: unknown) {
      handleControllerError(error, res, "Erro ao excluir produto.");
    }
  };
}
