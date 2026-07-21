/**
 * GET  /api/users  — listar usuarios (cualquier usuario autenticado)
 * POST /api/users  — crear usuario (solo administrador)
 */
import bcrypt from "bcryptjs";
import { sql, json, error, serverError } from "../_lib/db.js";
import { authenticate } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";

export async function fetch(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (!auth) return error("No autenticado", 401);

  try {
    if (req.method === "GET") {
      const rows = await sql`
        SELECT id, email, name AS "nombre", role AS "perfil", is_active AS "activo",
               cliente_id AS "clienteId", created_at AS "createdAt", last_login AS "lastLogin"
        FROM users ORDER BY name
      `;
      return json(rows);
    }

    if (req.method === "POST") {
      if (auth.role !== "administrador") return error("No autorizado", 403);

      const body = (await req.json()) as any;
      if (!body.email || !body.nombre || !body.pin) {
        return error("Nombre, correo y PIN son requeridos", 400);
      }
      if (!/^\d{4}$/.test(body.pin)) return error("El PIN debe ser de 4 dígitos numéricos", 400);

      const pinHash = await bcrypt.hash(body.pin, 10);
      const rows = await sql`
        INSERT INTO users (email, name, role, password_hash, is_active, cliente_id)
        VALUES (
          ${String(body.email).trim().toLowerCase()}, ${body.nombre}, ${body.perfil ?? "tecnico"},
          ${pinHash}, ${body.activo ?? true}, ${body.clienteId ?? null}
        )
        RETURNING id, email, name AS "nombre", role AS "perfil", is_active AS "activo",
                  cliente_id AS "clienteId", created_at AS "createdAt"
      `;
      await logAudit({
        userId: auth.sub, userName: auth.nombre, action: "create",
        entityType: "user", entityId: rows[0].id, req,
      });
      return json(rows[0], 201);
    }

    return error("Método no permitido", 405);
  } catch (err: any) {
    if (err?.code === "23505") return error("Ya existe un usuario con ese correo", 409);
    return serverError("API /users error:", err);
  }
}
