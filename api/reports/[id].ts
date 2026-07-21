/**
 * GET    /api/reports/:id - leer un informe especifico
 * DELETE /api/reports/:id - eliminar
 *
 * El :id puede ser UUID de Postgres o legacy_id local.
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
              SELECT r.*
              FROM hvac_reports r
              LEFT JOIN clients c ON c.id = r.client_id
              WHERE r.id = ${id}::uuid
                AND (
                  c.id::text = ${auth.clienteId}
                  OR c.legacy_id = ${auth.clienteId}
                  OR c.name = ${auth.clienteId}
                  OR r.client_name = ${auth.clienteId}
                )
              LIMIT 1
            `
          : await sql`
              SELECT r.*
              FROM hvac_reports r
              LEFT JOIN clients c ON c.id = r.client_id
              WHERE r.legacy_id = ${id}
                AND (
                  c.id::text = ${auth.clienteId}
                  OR c.legacy_id = ${auth.clienteId}
                  OR c.name = ${auth.clienteId}
                  OR r.client_name = ${auth.clienteId}
                )
              LIMIT 1
            `
        : isUuid
          ? await sql`SELECT * FROM hvac_reports WHERE id = ${id}::uuid LIMIT 1`
          : await sql`SELECT * FROM hvac_reports WHERE legacy_id = ${id} LIMIT 1`;

      if (rows.length === 0) return error("Informe no encontrado", 404);
      return json(rows[0]);
    }

    if (req.method === "DELETE") {
      if (!["administrador", "supervisor"].includes(auth.role)) {
        return error("No autorizado para eliminar informes", 403);
      }

      const rows = isTenantScoped(auth)
        ? isUuid
          ? await sql`
              DELETE FROM hvac_reports r
              USING clients c
              WHERE r.id = ${id}::uuid
                AND c.id = r.client_id
                AND (
                  c.id::text = ${auth.clienteId}
                  OR c.legacy_id = ${auth.clienteId}
                  OR c.name = ${auth.clienteId}
                  OR r.client_name = ${auth.clienteId}
                )
              RETURNING r.id
            `
          : await sql`
              DELETE FROM hvac_reports r
              USING clients c
              WHERE r.legacy_id = ${id}
                AND c.id = r.client_id
                AND (
                  c.id::text = ${auth.clienteId}
                  OR c.legacy_id = ${auth.clienteId}
                  OR c.name = ${auth.clienteId}
                  OR r.client_name = ${auth.clienteId}
                )
              RETURNING r.id
            `
        : isUuid
          ? await sql`DELETE FROM hvac_reports WHERE id = ${id}::uuid RETURNING id`
          : await sql`DELETE FROM hvac_reports WHERE legacy_id = ${id} RETURNING id`;

      if (rows.length === 0) return error("Informe no encontrado", 404);
      await logAudit({
        userId: auth.sub,
        userName: auth.nombre,
        action: "delete",
        entityType: "hvac_report",
        entityId: rows[0].id,
        req,
      });
      return json({ success: true, deletedId: rows[0].id });
    }

    return error("Metodo no permitido", 405);
  } catch (err: any) {
    return serverError("API /reports/:id error:", err);
  }
}
