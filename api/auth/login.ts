/**
 * POST /api/auth/login — valida email + PIN contra la tabla `users` y emite
 * un JWT. Esta es la única fuente de verdad para autenticación: el login
 * local (LocalForage) que existía antes queda solo como respaldo offline,
 * sin acceso real a la API (ver src/utils/storage.ts).
 */
import bcrypt from "bcryptjs";
import { sql, json, error, serverError } from "../_lib/db.js";
import { signToken } from "../_lib/auth.js";
import { checkRateLimit, clientIp } from "../_lib/rateLimit.js";
import { logAudit } from "../_lib/audit.js";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return error("Método no permitido", 405);

  try {
    const { email, pin } = (await req.json()) as { email?: string; pin?: string };
    if (!email || !pin) return error("Correo y PIN son requeridos", 400);

    const normalizedEmail = email.trim().toLowerCase();
    const ip = clientIp(req);

    // Máx. 5 intentos / 15 min por cuenta, 20 / 15 min por IP (fuerza bruta de PIN de 4 dígitos)
    const allowedByIp = await checkRateLimit(`login:ip:${ip}`, 20, 15 * 60);
    const allowedByEmail = await checkRateLimit(`login:email:${normalizedEmail}`, 5, 15 * 60);
    if (!allowedByIp || !allowedByEmail) {
      return error("Demasiados intentos. Intenta nuevamente en unos minutos.", 429);
    }

    const rows = await sql`
      SELECT id, email, name, role, password_hash AS "passwordHash", is_active AS "isActive",
             cliente_id AS "clienteId"
      FROM users WHERE email = ${normalizedEmail} LIMIT 1
    `;
    const user = rows[0];

    if (!user || !user.isActive || !user.passwordHash) {
      await logAudit({ action: "login_failed", entityType: "user", metadata: { email: normalizedEmail }, req });
      return error("Correo o PIN incorrecto.", 401);
    }

    const valid = await bcrypt.compare(pin, user.passwordHash);
    if (!valid) {
      await logAudit({ action: "login_failed", entityType: "user", entityId: user.id, metadata: { email: normalizedEmail }, req });
      return error("Correo o PIN incorrecto.", 401);
    }

    await sql`UPDATE users SET last_login = now() WHERE id = ${user.id}::uuid`;
    await logAudit({ userId: user.id, userName: user.name, action: "login", entityType: "user", entityId: user.id, req });

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      nombre: user.name,
      clienteId: user.clienteId ?? null,
    });

    return json({
      token,
      user: {
        userId: user.id,
        email: user.email,
        nombre: user.name,
        perfil: user.role,
        clienteId: user.clienteId ?? "",
      },
    });
  } catch (err: any) {
    return serverError("API /auth/login error:", err);
  }
}
