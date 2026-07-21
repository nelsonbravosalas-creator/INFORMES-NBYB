/**
 * PUT    /api/users/:id  — actualizar (uno mismo, o administrador para cualquiera)
 * DELETE /api/users/:id  — eliminar (solo administrador; no auto-eliminación)
 */
import bcrypt from "bcryptjs";
import { sql, json, error, serverError } from "../_lib/db.js";
import { authenticate } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";

export async function fetch(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (!auth) return error("No autenticado", 401);

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();
  if (!id) return error("ID requerido", 400);

  try {
    if (req.method === "PUT") {
      const isSelf = auth.sub === id;
      const isAdmin = auth.role === "administrador";
      if (!isSelf && !isAdmin) return error("No autorizado", 403);

      const body = (await req.json()) as any;
      const pinHash =
        body.pin && /^\d{4}$/.test(body.pin) ? await bcrypt.hash(body.pin, 10) : null;

      // Solo un administrador puede cambiar el perfil o activar/desactivar cuentas
      const newRole = isAdmin ? body.perfil ?? null : null;
      const newActive = isAdmin ? body.activo ?? null : null;

      const rows = await sql`
        UPDATE users SET
          name = COALESCE(${body.nombre ?? null}, name),
          role = COALESCE(${newRole}, role),
          is_active = COALESCE(${newActive}, is_active),
          cliente_id = COALESCE(${body.clienteId ?? null}, cliente_id),
          password_hash = COALESCE(${pinHash}, password_hash)
        WHERE id = ${id}::uuid
        RETURNING id, email, name AS "nombre", role AS "perfil", is_active AS "activo", cliente_id AS "clienteId"
      `;
      if (rows.length === 0) return error("Usuario no encontrado", 404);

      await logAudit({
        userId: auth.sub, userName: auth.nombre, action: "update",
        entityType: "user", entityId: id, req,
      });
      return json(rows[0]);
    }

    if (req.method === "DELETE") {
      if (auth.role !== "administrador") return error("No autorizado", 403);
      if (auth.sub === id) return error("No puedes eliminar tu propia cuenta", 400);

      const rows = await sql`DELETE FROM users WHERE id = ${id}::uuid RETURNING id`;
      if (rows.length === 0) return error("Usuario no encontrado", 404);

      await logAudit({
        userId: auth.sub, userName: auth.nombre, action: "delete",
        entityType: "user", entityId: id, req,
      });
      return json({ success: true, deletedId: id });
    }

    return error("Método no permitido", 405);
  } catch (err: any) {
    return serverError("API /users/:id error:", err);
  }
}
