/**
 * GET  /api/service-orders  — listar todas las OTs
 * POST /api/service-orders  — crear o upsert (por legacy_id)
 */
import { sql, json, error } from "../_lib/db";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method === "GET") {
      const rows = await sql`
        SELECT
          id, legacy_id AS "legacyId", folio, order_date AS date, order_number AS "orderNumber",
          service_type AS "serviceType",
          technician_name AS "technicianName",
          client_name AS "clientName", branch_name AS "branchLocation",
          client_contact_name AS "clientContactName", client_contact_role AS "clientContactRole",
          client_location_address AS "clientLocationAddress",
          diagnostic_rating AS "diagnosticRating",
          evidence, findings, conclusions, signatures,
          updated_at AS timestamp
        FROM service_orders
        ORDER BY order_date DESC, created_at DESC
        LIMIT 500
      `;
      return json(rows);
    }

    if (req.method === "POST") {
      const body = (await req.json()) as any;
      if (!body.folio || !body.clientName) {
        return error("Folio y cliente son requeridos", 400);
      }

      const legacyId = body.id ?? body.legacyId ?? null;

      const result = await sql`
        INSERT INTO service_orders (
          legacy_id, folio, order_date, order_number, service_type,
          technician_name, client_name, branch_name,
          client_contact_name, client_contact_role, client_location_address,
          diagnostic_rating, evidence, findings, conclusions, signatures
        ) VALUES (
          ${legacyId}, ${body.folio}, ${body.date}::date, ${body.orderNumber ?? null}, ${body.serviceType},
          ${body.technicianName}, ${body.clientName}, ${body.branchLocation ?? null},
          ${body.clientContactName ?? null}, ${body.clientContactRole ?? null}, ${body.clientLocationAddress ?? null},
          ${body.diagnosticRating ?? 'normal'},
          ${JSON.stringify(body.evidence ?? [])}::jsonb,
          ${body.findings ?? null}, ${body.conclusions ?? null},
          ${JSON.stringify(body.signatures ?? {})}::jsonb
        )
        ON CONFLICT (legacy_id) DO UPDATE SET
          folio = EXCLUDED.folio,
          order_date = EXCLUDED.order_date,
          order_number = EXCLUDED.order_number,
          service_type = EXCLUDED.service_type,
          technician_name = EXCLUDED.technician_name,
          client_name = EXCLUDED.client_name,
          branch_name = EXCLUDED.branch_name,
          client_contact_name = EXCLUDED.client_contact_name,
          client_contact_role = EXCLUDED.client_contact_role,
          client_location_address = EXCLUDED.client_location_address,
          diagnostic_rating = EXCLUDED.diagnostic_rating,
          evidence = EXCLUDED.evidence,
          findings = EXCLUDED.findings,
          conclusions = EXCLUDED.conclusions,
          signatures = EXCLUDED.signatures,
          sync_version = service_orders.sync_version + 1
        RETURNING id, legacy_id, sync_version, updated_at
      `;
      return json({ success: true, ...result[0] });
    }

    return error("Método no permitido", 405);
  } catch (err: any) {
    console.error("API /service-orders error:", err);
    return error(err.message ?? "Error del servidor", 500);
  }
}
