/**
 * GET    /api/reports/:id  — leer un informe específico
 * DELETE /api/reports/:id  — eliminar
 *
 * El :id puede ser el UUID de Postgres o el legacy_id (UUID local de LocalForage).
 */
import { sql, json, error } from "../_lib/db";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (!id) return error("ID requerido", 400);

    // Aceptar tanto UUID como legacy_id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (req.method === "GET") {
      const rows = isUuid
        ? await sql`SELECT * FROM hvac_reports WHERE id = ${id}::uuid LIMIT 1`
        : await sql`SELECT * FROM hvac_reports WHERE legacy_id = ${id} LIMIT 1`;
      if (rows.length === 0) return error("Informe no encontrado", 404);
      return json(rows[0]);
    }

    if (req.method === "DELETE") {
      const rows = isUuid
        ? await sql`DELETE FROM hvac_reports WHERE id = ${id}::uuid RETURNING id`
        : await sql`DELETE FROM hvac_reports WHERE legacy_id = ${id} RETURNING id`;
      if (rows.length === 0) return error("Informe no encontrado", 404);
      return json({ success: true, deletedId: rows[0].id });
    }

    return error("Método no permitido", 405);
  } catch (err: any) {
    console.error("API /reports/:id error:", err);
    return error(err.message ?? "Error del servidor", 500);
  }
}
