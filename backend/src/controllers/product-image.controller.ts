import type { Request, Response } from "express";
import {
  type AddProductImageInput,
  ProductImageError,
  ProductImageService,
  type ProductImageServicePort,
  type UpdateProductImageInput,
} from "../services/product-image.service";

function extractRouteParam(req: Request, param: "productId" | "imageId"): string {
  return String(req.params?.[param] ?? "");
}

/**
 * Controller HTTP da galeria de fotos de produtos (`ProductImage` - PBI #17).
 */
export class ProductImageController {
  private readonly productImageService: ProductImageServicePort;

  constructor(productImageService: ProductImageServicePort = new ProductImageService()) {
    this.productImageService = productImageService;
  }

  listByProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = extractRouteParam(req, "productId");
      const images = await this.productImageService.listByProduct(productId);
      res.status(200).json(images);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = extractRouteParam(req, "productId");
      const body = (req.body ?? {}) as AddProductImageInput;

      const uploadedUrl = req.file
        ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
        : undefined;

      const created = await this.productImageService.addProductImage(productId, {
        url: uploadedUrl ?? body.url,
        altText: body.altText,
        position: body.position,
        isPrimary: body.isPrimary,
      });

      res.status(201).json(created);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = extractRouteParam(req, "productId");
      const imageId = extractRouteParam(req, "imageId");
      const body = (req.body ?? {}) as UpdateProductImageInput;

      const updated = await this.productImageService.updateProductImage(productId, imageId, body);
      res.status(200).json(updated);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = extractRouteParam(req, "productId");
      const imageId = extractRouteParam(req, "imageId");

      await this.productImageService.deleteProductImage(productId, imageId);
      res.status(200).json({ message: "Foto removida com sucesso." });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: unknown, res: Response): void {
    if (error instanceof ProductImageError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Erro interno ao processar fotos do produto." });
  }
}
