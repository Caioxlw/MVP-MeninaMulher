import crypto from "crypto";

const DEFAULT_JWT_SECRET = process.env.JWT_SECRET || "menina_mulher_default_jwt_secret_dev_2026";
const DEFAULT_EXPIRES_IN_SECONDS = 8 * 60 * 60; // 8h (RNF04)

export interface JwtPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Gera um hash de senha no formato `scrypt$<salt>$<derivedHex>` compatível com o `seed.ts` (RNF05).
 */
export function hashPassword(
  plainPassword: string,
  salt: string = crypto.randomBytes(16).toString("hex")
): string {
  const derivedHex = crypto.scryptSync(plainPassword, salt, 32).toString("hex");
  return `scrypt$${salt}$${derivedHex}`;
}

/**
 * Verifica uma senha em texto plano contra um hash `scrypt$<salt>$<derivedHex>`
 * utilizando comparação em tempo constante (`crypto.timingSafeEqual`) para evitar timing attacks.
 */
export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  if (!plainPassword || !storedHash || typeof storedHash !== "string") {
    return false;
  }

  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, salt, storedHex] = parts;
  if (!salt || !storedHex) {
    return false;
  }

  try {
    const derivedBuffer = crypto.scryptSync(plainPassword, salt, 32);
    const storedBuffer = Buffer.from(storedHex, "hex");

    if (derivedBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedBuffer, storedBuffer);
  } catch {
    return false;
  }
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecodeToString(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  return Buffer.from(padded, "base64").toString("utf-8");
}

/**
 * Assina um token JWT (HS256) com expiração padrão de 8 horas (RNF04, RF11).
 */
export function signJwt(
  payload: { sub: string; role: string },
  secret: string = process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  expiresInSeconds: number = DEFAULT_EXPIRES_IN_SECONDS
): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    sub: payload.sub,
    role: payload.role,
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds,
  };

  const headerSegment = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadSegment = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${headerSegment}.${payloadSegment}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${signature}`;
}

/**
 * Valida a assinatura e a expiração de um token JWT (HS256).
 */
export function verifyJwt(
  token: string,
  secret: string = process.env.JWT_SECRET || DEFAULT_JWT_SECRET
): JwtPayload {
  if (!token || typeof token !== "string") {
    throw new Error("Token JWT ausente ou inválido.");
  }

  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new Error("Formato de token JWT inválido.");
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments;
  const signingInput = `${headerSegment}.${payloadSegment}`;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const actualSigBuffer = Buffer.from(signatureSegment, "utf-8");
  const expectedSigBuffer = Buffer.from(expectedSignature, "utf-8");

  if (
    actualSigBuffer.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(actualSigBuffer, expectedSigBuffer)
  ) {
    throw new Error("Assinatura do token JWT inválida.");
  }

  const parsedPayload = JSON.parse(base64UrlDecodeToString(payloadSegment)) as JwtPayload;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (
    typeof parsedPayload.exp !== "number" ||
    parsedPayload.exp <= nowSeconds ||
    !parsedPayload.sub ||
    !parsedPayload.role
  ) {
    throw new Error("Token JWT expirado ou payload inválido.");
  }

  return parsedPayload;
}
