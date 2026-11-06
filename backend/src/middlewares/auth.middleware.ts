import { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../lib/security";
import { UserRepository } from "../repositories/user.repository";
import { PublicUserDto } from "../services/auth.service";

export interface AuthenticatedRequest extends Request {
  user?: PublicUserDto;
}

/**
 * Cria o middleware de proteção de rotas administrativas (`requireAdminAuth`),
 * validando assinatura/expiração do token Bearer JWT e consultando o `UserRepository`
 * para garantir que a conta permanece existente, ativa (`active: true`) e com `role: "ADMIN"`.
 */
export function createRequireAdminAuth(
  userRepository: UserRepository = new UserRepository(),
  jwtSecret?: string
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers?.authorization;

    if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Acesso não autorizado. Token Bearer ausente ou malformado.",
      });
      return;
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      res.status(401).json({
        error: "Acesso não autorizado. Token Bearer vazio.",
      });
      return;
    }

    try {
      const payload = verifyJwt(token, jwtSecret);
      const user = await userRepository.findById(payload.sub);

      if (!user || !user.active || user.role !== "ADMIN") {
        res.status(401).json({
          error: "Acesso não autorizado. Conta inexistente ou desativada.",
        });
        return;
      }

      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      next();
    } catch {
      res.status(401).json({
        error: "Acesso não autorizado. Token inválido ou expirado.",
      });
    }
  };
}

export const requireAdminAuth = createRequireAdminAuth();
