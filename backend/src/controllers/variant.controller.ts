import type { Request, Response } from "express";
import { VariantError, VariantService } from "../services/variant.service";

export class VariantController {
  private readonly variantService: VariantService;

  constructor(variantService: VariantService = new VariantService()) {
    this.variantService = variantService;
  }

  listByProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = String(req.params.productId || "");
      const variants = await this.variantService.listByProduct(productId);
      res.status(200).json(variants);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = String(req.params.productId || "");
      const created = await this.variantService.createVariants(productId, req.body);
      res.status(201).json(created);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = String(req.params.productId || "");
      const variantId = String(req.params.variantId || "");
      const updated = await this.variantService.updateVariant(productId, variantId, req.body);
      res.status(200).json(updated);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = String(req.params.productId || "");
      const variantId = String(req.params.variantId || "");
      await this.variantService.deleteVariant(productId, variantId);
      res.status(200).json({ message: "Variação removida com sucesso." });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: unknown, res: Response): void {
    if (error instanceof VariantError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Erro interno ao processar variações do produto." });
  }
}
