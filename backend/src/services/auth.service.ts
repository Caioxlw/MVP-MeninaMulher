import { signJwt, verifyPassword } from "../lib/security";
import { UserRepository } from "../repositories/user.repository";

export interface PublicUserDto {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginInput {
  email?: string;
  password?: string;
}

export interface LoginOutput {
  token: string;
  user: PublicUserDto;
}

export class AuthError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Camada de regras de negócio de autenticação da empresária (RF11, RNF04, RNF05).
 * Não acessa o `PrismaClient` diretamente — utiliza exclusivamente o `UserRepository`.
 */
export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly jwtSecret?: string;

  constructor(userRepository: UserRepository = new UserRepository(), jwtSecret?: string) {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
  }

  async login(input: LoginInput): Promise<LoginOutput> {
    const rawEmail = typeof input?.email === "string" ? input.email.trim() : "";
    const rawPassword = typeof input?.password === "string" ? input.password : "";

    if (!rawEmail || !rawPassword || rawPassword.trim() === "") {
      throw new AuthError("E-mail e senha são obrigatórios.", 400);
    }

    const normalizedEmail = rawEmail.toLowerCase();
    const user = await this.userRepository.findByEmailInsensitive(normalizedEmail);

    if (
      !user ||
      !user.active ||
      user.role !== "ADMIN" ||
      !verifyPassword(rawPassword, user.passwordHash)
    ) {
      throw new AuthError("Credenciais inválidas ou conta inativa.", 401);
    }

    const token = signJwt({ sub: user.id, role: user.role }, this.jwtSecret);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getAuthenticatedUser(userId: string): Promise<PublicUserDto> {
    if (!userId) {
      throw new AuthError("Usuária não autenticada.", 401);
    }

    const user = await this.userRepository.findById(userId);
    if (!user || !user.active || user.role !== "ADMIN") {
      throw new AuthError("Sessão inválida ou conta inativa.", 401);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
