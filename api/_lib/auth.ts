/**
 * Autenticación server-side vía JWT.
 *
 * Antes, la app confiaba en un "AuthSession" armado enteramente en el
 * navegador (LocalForage) y las rutas /api/* no verificaban nada — cualquiera
 * con la URL podía leer/escribir todos los datos. Ahora el login real ocurre
 * en /api/auth/login (contra la tabla `users`) y cada ruta protegida exige
 * un JWT válido firmado por el servidor.
 */
import jwt from "jsonwebtoken";

export interface AuthUser {
  sub: string;    // users.id (uuid)
  email: string;
  role: string;   // administrador | supervisor | tecnico | contratista
  nombre: string;
  clienteId: string | null;
}

const TOKEN_TTL = "8h";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET no está configurada (o es demasiado corta). Configúrala en Vercel → Settings → Environment Variables."
    );
  }
  return secret;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, getSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, getSecret()) as AuthUser;
  } catch {
    return null;
  }
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/** Verifica el JWT de la request. Devuelve null si falta o es inválido/expirado. */
export function authenticate(req: Request): AuthUser | null {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifyToken(token);
}

export const ADMIN_ROLES = ["administrador"];
export const MANAGER_ROLES = ["administrador", "supervisor"];
