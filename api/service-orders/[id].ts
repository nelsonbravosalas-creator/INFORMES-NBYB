/**
 * GET    /api/service-orders/:id  — leer una OT específica
 * DELETE /api/service-orders/:id  — eliminar
 */
import { sql, json, error, serverError } from "../_lib/db.js";
import { authenticate } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";

export default async function handler(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (!auth) return error("No autenticado", 401);

  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (!id) return error("ID requerido", 400);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (req.method === "GET") {
      const rows = isUuid
        ? await sql`SELECT * FROM service_orders WHERE id = ${id}::uuid LIMIT 1`
        : await sql`SELECT * FROM service_orders WHERE legacy_id = ${id} LIMIT 1`;
      if (rows.length === 0) return error("OT no encontrada", 404);
      return json(rows[0]);
    }

    if (req.method === "DELETE") {
      if (!["administrador", "supervisor"].includes(auth.role)) {
        return error("No autorizado para eliminar órdenes de servicio", 403);
      }
      const rows = isUuid
        ? await sql`DELETE FROM service_orders WHERE id = ${id}::uuid RETURNING id`
        : await sql`DELETE FROM service_orders WHERE legacy_id = ${id} RETURNING id`;
      if (rows.length === 0) return error("OT no encontrada", 404);
      await logAudit({
        userId: auth.sub, userName: auth.nombre, action: "delete",
        entityType: "service_order", entityId: rows[0].id, req,
      });
      return json({ success: true, deletedId: rows[0].id });
    }

    return error("Método no permitido", 405);
  } catch (err: any) {
    return serverError("API /service-orders/:id error:", err);
  }
}
