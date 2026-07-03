/**
 * GET  /api/reports         — listar todos los informes
 * POST /api/reports         — crear o upsert (por legacy_id si existe)
 */
import { sql, json, error } from "../_lib/db.js";

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method === "GET") {
      const rows = await sql`
        SELECT
          id, legacy_id AS "legacyId", folio, report_date AS date,
          technician_name AS "technicianName", client_name AS "clientName",
          branch_name AS "branchLocation", brand, model, serial_number AS "serialNumber",
          refrigerant_type AS "refrigerantType", capacity, voltage, amperage,
          equipment_type AS "equipmentType", criticality, overall_status AS "overallStatus",
          measurements, circuits, checklist, signatures,
          electric_scheme_note AS "electricSchemeNote", custom_drawing_svg AS "customDrawingSvg",
          general_comments AS "generalComments",
          updated_at AS timestamp
        FROM hvac_reports
        ORDER BY report_date DESC, created_at DESC
        LIMIT 500
      `;
      return json(rows);
    }

    if (req.method === "POST") {
      const body = (await req.json()) as any;
      if (!body.folio || !body.clientName) {
        return error("Folio y cliente son requeridos", 400);
      }

      // Upsert por legacy_id (id local) si está presente
      const legacyId = body.id ?? body.legacyId ?? null;

      const result = await sql`
        INSERT INTO hvac_reports (
          legacy_id, folio, report_date, technician_name,
          client_name, branch_name, brand, model, serial_number,
          refrigerant_type, capacity, voltage, amperage,
          equipment_type, criticality, overall_status,
          measurements, circuits, checklist, signatures,
          electric_scheme_note, custom_drawing_svg, general_comments
        ) VALUES (
          ${legacyId}, ${body.folio}, ${body.date}::date, ${body.technicianName},
          ${body.clientName}, ${body.branchLocation ?? null}, ${body.brand ?? null}, ${body.model ?? null}, ${body.serialNumber ?? null},
          ${body.refrigerantType ?? null}, ${body.capacity ?? null}, ${body.voltage ?? null}, ${body.amperage ?? null},
          ${body.equipmentType ?? null}, ${body.criticality ?? null}, ${body.overallStatus ?? 'normal'},
          ${JSON.stringify({ ambientTemp: body.ambientTemp, returnTemp: body.returnTemp, supplyTemp: body.supplyTemp, fanAmperage: body.fanAmperage, setPoint: body.setPoint })}::jsonb,
          ${JSON.stringify(body.circuits ?? [])}::jsonb,
          ${JSON.stringify(body.checklist ?? [])}::jsonb,
          ${JSON.stringify(body.signatures ?? {})}::jsonb,
          ${body.electricSchemeNote ?? null}, ${body.customDrawingSvg ?? null}, ${body.generalComments ?? null}
        )
        ON CONFLICT (legacy_id) DO UPDATE SET
          folio = EXCLUDED.folio,
          report_date = EXCLUDED.report_date,
          technician_name = EXCLUDED.technician_name,
          client_name = EXCLUDED.client_name,
          branch_name = EXCLUDED.branch_name,
          brand = EXCLUDED.brand,
          model = EXCLUDED.model,
          serial_number = EXCLUDED.serial_number,
          refrigerant_type = EXCLUDED.refrigerant_type,
          capacity = EXCLUDED.capacity,
          voltage = EXCLUDED.voltage,
          amperage = EXCLUDED.amperage,
          equipment_type = EXCLUDED.equipment_type,
          criticality = EXCLUDED.criticality,
          overall_status = EXCLUDED.overall_status,
          measurements = EXCLUDED.measurements,
          circuits = EXCLUDED.circuits,
          checklist = EXCLUDED.checklist,
          signatures = EXCLUDED.signatures,
          electric_scheme_note = EXCLUDED.electric_scheme_note,
          custom_drawing_svg = EXCLUDED.custom_drawing_svg,
          general_comments = EXCLUDED.general_comments,
          sync_version = hvac_reports.sync_version + 1
        RETURNING id, legacy_id, sync_version, updated_at
      `;
      return json({ success: true, ...result[0] });
    }

    return error("Método no permitido", 405);
  } catch (err: any) {
    console.error("API /reports error:", err);
    return error(err.message ?? "Error del servidor", 500);
  }
}
