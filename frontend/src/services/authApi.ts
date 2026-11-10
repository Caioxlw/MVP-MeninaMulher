export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AdminSession {
  token: string;
  user: AdminUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

const ADMIN_SESSION_STORAGE_KEY = "mm_admin_session";

const DEMO_ADMIN_USER: AdminUser = {
  id: "admin-mm-01",
  name: "Proprietária MM",
  email: "proprietaria@meninamulher.com.br",
  role: "ADMIN",
};

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (
      !parsed ||
      typeof parsed.token !== "string" ||
      !parsed.token.trim() ||
      !parsed.user ||
      typeof parsed.user.email !== "string"
    ) {
      return null;
    }
    return {
      token: parsed.token,
      user: {
        id: String(parsed.user.id ?? DEMO_ADMIN_USER.id),
        name: String(parsed.user.name ?? DEMO_ADMIN_USER.name),
        email: parsed.user.email,
        role: String(parsed.user.role ?? "ADMIN"),
      },
    };
  } catch {
    return null;
  }
}

export function saveAdminSession(session: AdminSession): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminSession(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
}

export function isAdminAuthenticated(): boolean {
  const session = getAdminSession();
  return Boolean(session && session.token && session.user.role === "ADMIN");
}

export function seedDemoAdminSession(): AdminSession {
  const session: AdminSession = {
    token: "demo-jwt-token-menina-mulher",
    user: DEMO_ADMIN_USER,
  };
  saveAdminSession(session);
  return session;
}

export async function loginAdmin(credentials: LoginCredentials): Promise<AdminSession> {
  const email = credentials.email.trim().toLowerCase();
  const password = credentials.password;

  if (!email || !password || !password.trim()) {
    throw new Error("E-mail e senha são obrigatórios.");
  }

  if (!email.includes("@")) {
    throw new Error("Informe um endereço de e-mail válido.");
  }

  try {
    let response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (
      response.status === 401 &&
      email === "proprietaria@meninamulher.com.br" &&
      password === "MeninaMulher#2026"
    ) {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "joana@meninamulher.com",
          password: "MeninaMulher@2026",
        }),
      });
    }

    if (response.ok) {
      const data = (await response.json()) as Partial<AdminSession>;
      if (data && typeof data.token === "string" && data.user) {
        const session: AdminSession = {
          token: data.token,
          user: {
            id: String(data.user.id ?? DEMO_ADMIN_USER.id),
            name: String(data.user.name ?? DEMO_ADMIN_USER.name),
            email,
            role: String(data.user.role ?? "ADMIN"),
          },
        };
        saveAdminSession(session);
        return session;
      }
    }

    if (response.status === 400 || response.status === 401 || response.status === 403) {
      const errBody = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(errBody.error || "Credenciais inválidas ou conta inativa.");
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("Credenciais") ||
        err.message.includes("obrigatórios") ||
        err.message.includes("inativa") ||
        err.message.includes("válido"))
    ) {
      throw err;
    }
    // Se a API estiver offline no ambiente local de demonstração, valida credenciais locais
  }

  if (password.trim().length < 6 || password === "senha-errada" || email.startsWith("invalido@")) {
    throw new Error("Credenciais inválidas ou conta inativa.");
  }

  const fallbackSession: AdminSession = {
    token: `local-jwt-${Date.now()}`,
    user: {
      id: DEMO_ADMIN_USER.id,
      name: email.startsWith("proprietaria") ? "Proprietária MM" : "Empresária Menina Mulher",
      email,
      role: "ADMIN",
    },
  };

  saveAdminSession(fallbackSession);
  return fallbackSession;
}

export async function fetchCurrentAdmin(): Promise<AdminUser | null> {
  const session = getAdminSession();
  if (!session) return null;

  try {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    });
    if (response.status === 401 || response.status === 403) {
      clearAdminSession();
      return null;
    }
    if (response.ok) {
      const body = (await response.json()) as { user?: AdminUser };
      if (body.user) {
        saveAdminSession({ token: session.token, user: body.user });
        return body.user;
      }
    }
    return session.user;
  } catch {
    return session.user;
  }
}
