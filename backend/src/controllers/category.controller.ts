import { Request, Response } from "express";
import { CategoryRepository } from "../repositories/category.repository";

/**
 * Controller HTTP de categorias (`GET /api/categories`).
 * Utiliza o atalho arquitetural `Controller -> Repository` para leitura simples sem regra de negócio.
 */
export class CategoryController {
  private readonly categoryRepository: CategoryRepository;

  constructor(categoryRepository: CategoryRepository = new CategoryRepository()) {
    this.categoryRepository = categoryRepository;
  }

  list = async (_req: Request, res: Response): Promise<void> => {
    try {
      const categories = await this.categoryRepository.findAll();
      res.status(200).json(categories);
    } catch {
      res.status(500).json({ error: "Erro ao listar categorias." });
    }
  };
}
