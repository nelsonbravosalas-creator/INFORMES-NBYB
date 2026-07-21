/**
 * GET    /api/service-orders/:id - leer una OT especifica
 * DELETE /api/service-orders/:id - eliminar
 */
import { sql, json, error, serverError } from "../_lib/db.js";
import { authenticate } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";
import { isTenantScoped } from "../_lib/multiTenant.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetch(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (!auth) return error("No autenticado", 401);

  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (!id) return error("ID requerido", 400);

    const isUuid = UUID_RE.test(id);

    if (req.method === "GET") {
      const rows = isTenantScoped(auth)
        ? isUuid
          ? await sql`
              SELECT o.*
              FROM service_orders o
              LEFT JOIN clients c ON c.id = o.client_id
              WHERE o.id = ${id}::uuid
                AND (
                  c.id::text = ${auth.clienteId}
                  OR c.legacy_id = ${auth.clienteId}
                  OR c.name = ${auth.clienteId}
                  OR o.client_name = ${auth.clienteId}
                )
              LIMIT 1
            `
          : await sql`
              SELECT o.*
              FROM service_orders o
              LEFT JOIN clients c ON c.id = o.client_id
              WHERE o.legacy_id = ${id}
                AND (
                  c.id::text = ${auth.clienteId}
                  OR c.legacy_id = ${auth.clienteId}
                  OR c.name = ${auth.clienteId}
                  OR o.client_name = ${auth.clienteId}
                )
              LIMIT 1
            `
        : isUuid
          ? await sql`SELECT * FROM service_orders WHERE id = ${id}::uuid LIMIT 1`
          : await sql`SELECT * FROM service_orders WHERE legacy_id = ${id} LIMIT 1`;

      if (rows.length === 0) return error("OT no encontrada", 404);
      return json(rows[0]);
    }

    if (req.method === "DELETE") {
      if (!["administrador", "supervisor"].includes(auth.role)) {
        return error("No autorizado para eliminar ordenes de servicio", 403);
      }

      const rows = isTenantScoped(auth)
        ? isUuid
          ? await sql`
              DELETE FROM service_orders o
              USING clients c
              WHERE o.id = ${id}::uuid
                AND c.id = o.client_id
                AND (
                  c.id::text = ${auth.clienteId}
                  OR c.legacy_id = ${auth.clienteId}
                  OR c.name = ${auth.clienteId}
                  OR o.client_name = ${auth.clienteId}
                )
              RETURNING o.id
            `
          : await sql`
              DELETE FROM service_orders o
              USING clients c
              WHERE o.legacy_id = ${id}
                AND c.id = o.client_id
                AND (
                  c.id::text = ${auth.clienteId}
                  OR c.legacy_id = ${auth.clienteId}
                  OR c.name = ${auth.clienteId}
                  OR o.client_name = ${auth.clienteId}
                )
              RETURNING o.id
            `
        : isUuid
          ? await sql`DELETE FROM service_orders WHERE id = ${id}::uuid RETURNING id`
          : await sql`DELETE FROM service_orders WHERE legacy_id = ${id} RETURNING id`;

      if (rows.length === 0) return error("OT no encontrada", 404);
      await logAudit({
        userId: auth.sub,
        userName: auth.nombre,
        action: "delete",
        entityType: "service_order",
        entityId: rows[0].id,
        req,
      });
      return json({ success: true, deletedId: rows[0].id });
    }

    return error("Metodo no permitido", 405);
  } catch (err: any) {
    return serverError("API /service-orders/:id error:", err);
  }
}
