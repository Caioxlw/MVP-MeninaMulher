import crypto from "crypto";
import { describe, expect, it, vi } from "vitest";
import { AuthController } from "../../controllers/auth.controller";
import { hashPassword, signJwt, verifyJwt, verifyPassword } from "../../lib/security";
import { createRequireAdminAuth } from "../../middlewares/auth.middleware";
import { UserRepository } from "../../repositories/user.repository";
import { AuthError, AuthService } from "../../services/auth.service";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "ADMIN";
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

function createMockResponse() {
  const res: {
    statusCode: number;
    body: unknown;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  } = {
    statusCode: 200,
    body: undefined,
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((payload: unknown) => {
    res.body = payload;
    return res;
  });
  return res;
}

describe("Testes Unitários — Autenticação e Controle de Acesso ADMIN (PBI #3 / Task #100)", () => {
  describe("1. Utilitários de Criptografia (scrypt + timingSafeEqual) e JWT", () => {
    it("deve gerar e verificar hash no formato scrypt$<salt>$<derivedHex> compatível com seed.ts", () => {
      const salt = "menina_mulher_seed_salt";
      const expectedHex = crypto.scryptSync("MeninaMulher@2026", salt, 32).toString("hex");
      const hashed = hashPassword("MeninaMulher@2026", salt);

      expect(hashed).toBe(`scrypt$${salt}$${expectedHex}`);
      expect(verifyPassword("MeninaMulher@2026", hashed)).toBe(true);
      expect(verifyPassword("SenhaErrada@2026", hashed)).toBe(false);
      expect(verifyPassword("MeninaMulher@2026", "formato_invalido")).toBe(false);
    });

    it("deve assinar, decodificar e validar expiração de token JWT com JWT_SECRET", () => {
      const secret = "test-jwt-secret-key";

      const token = signJwt({ sub: "user-123", role: "ADMIN" }, secret, 3600);
      const decoded = verifyJwt(token, secret);

      expect(decoded.sub).toBe("user-123");
      expect(decoded.role).toBe("ADMIN");
      expect(decoded.exp).toBeGreaterThan(decoded.iat);

      // Token com assinatura adulterada deve falhar
      expect(() => verifyJwt(`${token}adulterado`, secret)).toThrow();

      // Token expirado deve falhar
      const expiredToken = signJwt({ sub: "user-123", role: "ADMIN" }, secret, -10);
      expect(() => verifyJwt(expiredToken, secret)).toThrow();
    });
  });

  describe("2. UserRepository — Isolamento do PrismaClient", () => {
    it("findByEmailInsensitive deve consultar prisma.user.findFirst com filtro case-insensitive", async () => {
      const mockUser: UserRecord = {
        id: "uuid-admin-1",
        name: "Joana Santos",
        email: "joana@meninamulher.com",
        passwordHash: "scrypt$salt$hash",
        role: "ADMIN",
        active: true,
      };

      const mockPrisma = {
        user: {
          findFirst: vi.fn().mockResolvedValue(mockUser),
          findUnique: vi.fn(),
        },
      };

      const repo = new UserRepository(mockPrisma as never);
      const result = await repo.findByEmailInsensitive("  JOANA@MeninaMulher.com ");

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: {
            equals: "joana@meninamulher.com",
            mode: "insensitive",
          },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it("findById deve consultar prisma.user.findUnique pelo ID da usuária", async () => {
      const mockUser: UserRecord = {
        id: "uuid-admin-1",
        name: "Joana Santos",
        email: "joana@meninamulher.com",
        passwordHash: "scrypt$salt$hash",
        role: "ADMIN",
        active: true,
      };

      const mockPrisma = {
        user: {
          findFirst: vi.fn(),
          findUnique: vi.fn().mockResolvedValue(mockUser),
        },
      };

      const repo = new UserRepository(mockPrisma as never);
      const result = await repo.findById("uuid-admin-1");

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "uuid-admin-1" },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe("3. AuthService — Regras de Negócio e Segurança (RNF05)", () => {
    it("deve normalizar email, autenticar ADMIN ativa e retornar token + user sem passwordHash", async () => {
      const mockRepo = {
        findByEmailInsensitive: vi.fn().mockResolvedValue({
          id: "uuid-admin-1",
          name: "Joana Santos",
          email: "joana@meninamulher.com",
          passwordHash: hashPassword("MeninaMulher@2026", "menina_mulher_seed_salt"),
          role: "ADMIN",
          active: true,
        }),
        findById: vi.fn(),
      };

      const service = new AuthService(mockRepo as never, "unit-test-secret");
      const result = await service.login({
        email: "  JOANA@meninamulher.com  ",
        password: "MeninaMulher@2026",
      });

      expect(mockRepo.findByEmailInsensitive).toHaveBeenCalledWith("joana@meninamulher.com");
      expect(result.token).toEqual(expect.any(String));
      expect(result.user).toEqual({
        id: "uuid-admin-1",
        name: "Joana Santos",
        email: "joana@meninamulher.com",
        role: "ADMIN",
      });
      expect((result.user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it("deve rejeitar com erro 400 Bad Request quando email ou password estiverem vazios ou ausentes", async () => {
      const mockRepo = {
        findByEmailInsensitive: vi.fn(),
        findById: vi.fn(),
      };
      const service = new AuthService(mockRepo as never, "unit-test-secret");

      await expect(service.login({ email: "   ", password: "123" })).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(
        service.login({ email: "joana@meninamulher.com", password: "" })
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("deve rejeitar com erro 401 Unauthorized para email inexistente, senha incorreta ou conta inativa", async () => {
      const validHash = hashPassword("MeninaMulher@2026", "menina_mulher_seed_salt");

      const mockRepoNotFound = {
        findByEmailInsensitive: vi.fn().mockResolvedValue(null),
        findById: vi.fn(),
      };
      const serviceNotFound = new AuthService(mockRepoNotFound as never, "unit-test-secret");
      await expect(
        serviceNotFound.login({ email: "naoexiste@meninamulher.com", password: "123" })
      ).rejects.toMatchObject({ statusCode: 401 });

      const mockRepoWrongPass = {
        findByEmailInsensitive: vi.fn().mockResolvedValue({
          id: "uuid-admin-1",
          name: "Joana Santos",
          email: "joana@meninamulher.com",
          passwordHash: validHash,
          role: "ADMIN",
          active: true,
        }),
        findById: vi.fn(),
      };
      const serviceWrongPass = new AuthService(mockRepoWrongPass as never, "unit-test-secret");
      await expect(
        serviceWrongPass.login({ email: "joana@meninamulher.com", password: "errada" })
      ).rejects.toMatchObject({ statusCode: 401 });

      const mockRepoInactive = {
        findByEmailInsensitive: vi.fn().mockResolvedValue({
          id: "uuid-admin-1",
          name: "Joana Santos",
          email: "joana@meninamulher.com",
          passwordHash: validHash,
          role: "ADMIN",
          active: false,
        }),
        findById: vi.fn(),
      };
      const serviceInactive = new AuthService(mockRepoInactive as never, "unit-test-secret");
      await expect(
        serviceInactive.login({
          email: "joana@meninamulher.com",
          password: "MeninaMulher@2026",
        })
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe("4. Middleware requireAdminAuth — Proteção de Rotas e Verificação de Conta Ativa", () => {
    it("deve bloquear com 401 quando header Authorization estiver ausente, malformado ou token inválido", async () => {
      const mockRepo = {
        findByEmailInsensitive: vi.fn(),
        findById: vi.fn(),
      };
      const middleware = createRequireAdminAuth(mockRepo as never, "unit-test-secret");

      // Sem header Authorization
      const reqNoHeader = { headers: {} };
      const resNoHeader = createMockResponse();
      const nextNoHeader = vi.fn();
      await middleware(reqNoHeader as never, resNoHeader as never, nextNoHeader);
      expect(resNoHeader.statusCode).toBe(401);
      expect(nextNoHeader).not.toHaveBeenCalled();

      // Formato diferente de Bearer <token>
      const reqBadFormat = { headers: { authorization: "Basic abc123" } };
      const resBadFormat = createMockResponse();
      const nextBadFormat = vi.fn();
      await middleware(reqBadFormat as never, resBadFormat as never, nextBadFormat);
      expect(resBadFormat.statusCode).toBe(401);
      expect(nextBadFormat).not.toHaveBeenCalled();

      // Token inválido
      const reqBadToken = { headers: { authorization: "Bearer token.invalido.aqui" } };
      const resBadToken = createMockResponse();
      const nextBadToken = vi.fn();
      await middleware(reqBadToken as never, resBadToken as never, nextBadToken);
      expect(resBadToken.statusCode).toBe(401);
      expect(nextBadToken).not.toHaveBeenCalled();
    });

    it("deve bloquear com 401 se a usuária do token não existir mais ou estiver active: false, e injetar req.user quando ativa", async () => {
      const secret = "unit-test-secret";
      const validToken = signJwt({ sub: "uuid-admin-1", role: "ADMIN" }, secret, 3600);

      // Caso 1: Usuária desativada no banco
      const mockRepoInactive = {
        findByEmailInsensitive: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "uuid-admin-1",
          name: "Joana Santos",
          email: "joana@meninamulher.com",
          passwordHash: "scrypt$salt$hash",
          role: "ADMIN",
          active: false,
        }),
      };
      const middlewareInactive = createRequireAdminAuth(mockRepoInactive as never, secret);
      const reqInactive = { headers: { authorization: `Bearer ${validToken}` } };
      const resInactive = createMockResponse();
      const nextInactive = vi.fn();

      await middlewareInactive(reqInactive as never, resInactive as never, nextInactive);
      expect(resInactive.statusCode).toBe(401);
      expect(nextInactive).not.toHaveBeenCalled();

      // Caso 2: Usuária ativa e ADMIN
      const mockRepoActive = {
        findByEmailInsensitive: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "uuid-admin-1",
          name: "Joana Santos",
          email: "joana@meninamulher.com",
          passwordHash: "scrypt$salt$hash",
          role: "ADMIN",
          active: true,
        }),
      };
      const middlewareActive = createRequireAdminAuth(mockRepoActive as never, secret);
      const reqActive: { headers: Record<string, string>; user?: unknown } = {
        headers: { authorization: `Bearer ${validToken}` },
      };
      const resActive = createMockResponse();
      const nextActive = vi.fn();

      await middlewareActive(reqActive as never, resActive as never, nextActive);
      expect(nextActive).toHaveBeenCalledOnce();
      expect(reqActive.user).toEqual({
        id: "uuid-admin-1",
        name: "Joana Santos",
        email: "joana@meninamulher.com",
        role: "ADMIN",
      });
    });
  });

  describe("5. AuthController — Fluxo HTTP de login e me", () => {
    it("login deve retornar 200 OK com token e user no sucesso, e propagar statusCode 400/401 em falhas", async () => {
      const mockAuthService = {
        login: vi.fn().mockResolvedValue({
          token: "jwt-token-xyz",
          user: {
            id: "uuid-admin-1",
            name: "Joana Santos",
            email: "joana@meninamulher.com",
            role: "ADMIN",
          },
        }),
        getAuthenticatedUser: vi.fn(),
      };

      const controller = new AuthController(mockAuthService as never);
      const reqSuccess = {
        body: { email: "joana@meninamulher.com", password: "MeninaMulher@2026" },
      };
      const resSuccess = createMockResponse();

      await controller.login(reqSuccess as never, resSuccess as never);
      expect(resSuccess.statusCode).toBe(200);
      expect(resSuccess.body).toEqual({
        token: "jwt-token-xyz",
        user: {
          id: "uuid-admin-1",
          name: "Joana Santos",
          email: "joana@meninamulher.com",
          role: "ADMIN",
        },
      });

      // Falha 401
      vi.mocked(mockAuthService.login).mockRejectedValueOnce(
        new AuthError("Credenciais inválidas.", 401)
      );
      const resFail = createMockResponse();
      await controller.login({ body: { email: "x", password: "y" } } as never, resFail as never);
      expect(resFail.statusCode).toBe(401);
    });

    it("me deve retornar 200 OK com os dados públicos da usuária autenticada em req.user", async () => {
      const controller = new AuthController();
      const reqWithUser = {
        user: {
          id: "uuid-admin-1",
          name: "Joana Santos",
          email: "joana@meninamulher.com",
          role: "ADMIN",
        },
      };
      const res = createMockResponse();

      await controller.me(reqWithUser as never, res as never);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        user: {
          id: "uuid-admin-1",
          name: "Joana Santos",
          email: "joana@meninamulher.com",
          role: "ADMIN",
        },
      });
    });
  });
});
