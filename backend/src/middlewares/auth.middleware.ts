import { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../lib/security";
import { UserRepository } from "../repositories/user.repository";
import { PublicUserDto } from "../services/auth.service";

export interface AuthenticatedRequest extends Request {
  user?: PublicUserDto;
}

async function resolveAuthenticatedAdmin(
  headers: Request["headers"] | undefined,
  userRepository: UserRepository,
  jwtSecret?: string
): Promise<PublicUserDto | null> {
  const authHeader = headers?.authorization;

  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  try {
    const payload = verifyJwt(token, jwtSecret);
    const user = await userRepository.findById(payload.sub);

    if (!user || !user.active || user.role !== "ADMIN") {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
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
    const adminUser = await resolveAuthenticatedAdmin(req.headers, userRepository, jwtSecret);

    if (!adminUser) {
      res.status(401).json({
        error: "Acesso não autorizado. Token ausente, inválido ou conta inativa.",
      });
      return;
    }

    req.user = adminUser;
    next();
  };
}

export const requireAdminAuth = createRequireAdminAuth();
