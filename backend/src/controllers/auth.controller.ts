import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { UserRepository } from "../repositories/user.repository";
import { AuthError, AuthService } from "../services/auth.service";

/**
 * Controller HTTP de autenticação (`POST /api/auth/login` e `GET /api/auth/me`).
 */
export class AuthController {
  private readonly authService: AuthService;
  private readonly userRepository: UserRepository;

  constructor(
    authService: AuthService = new AuthService(),
    userRepository: UserRepository = new UserRepository()
  ) {
    this.authService = authService;
    this.userRepository = userRepository;
  }

  login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await this.authService.login({
        email: req.body?.email,
        password: req.body?.password,
      });
      res.status(200).json(result);
    } catch (error: unknown) {
      if (
        error instanceof AuthError ||
        (error && typeof (error as { statusCode?: unknown }).statusCode === "number")
      ) {
        const statusErr = error as { statusCode: number; message: string };
        res.status(statusErr.statusCode).json({ error: statusErr.message });
        return;
      }
      res.status(500).json({ error: "Erro interno ao processar autenticação." });
    }
  };

  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (req.user) {
      res.status(200).json({ user: req.user });
      return;
    }

    res.status(401).json({ error: "Usuária não autenticada." });
  };
}
