import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
  type CreateVariantsPayload,
  type UpdateVariantInput,
  VariantError,
  VariantService,
  type VariantServicePort,
} from "../services/variant.service";

function extractRouteParam(req: Request, param: "productId" | "variantId"): string {
  return String(req.params?.[param] ?? "");
}

/**
 * Controller HTTP de variações de produto e ajuste manual de estoque (`ProductVariant`).
 */
export class VariantController {
  private readonly variantService: VariantServicePort;

  constructor(variantService: VariantServicePort = new VariantService()) {
    this.variantService = variantService;
  }

  listByProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = extractRouteParam(req, "productId");
      const variants = await this.variantService.listByProduct(productId);
      res.status(200).json(variants);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = extractRouteParam(req, "productId");
      const payload = req.body as CreateVariantsPayload;
      const created = await this.variantService.createVariants(productId, payload);
      res.status(201).json(created);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const productId = extractRouteParam(req, "productId");
      const variantId = extractRouteParam(req, "variantId");
      const input = req.body as UpdateVariantInput;
      const updated = await this.variantService.updateVariant(
        productId,
        variantId,
        input,
        req.user?.id
      );
      res.status(200).json(updated);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = extractRouteParam(req, "productId");
      const variantId = extractRouteParam(req, "variantId");
      await this.variantService.deleteVariant(productId, variantId);
      res.status(200).json({ message: "Variação removida com sucesso." });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  validateCart = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = extractRouteParam(req, "productId");
      const variantId = extractRouteParam(req, "variantId");
      const quantity = (req.body as { quantity?: unknown } | undefined)?.quantity;
      const validated = await this.variantService.validateCartAvailability(
        productId,
        variantId,
        quantity
      );
      res.status(200).json(validated);
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
