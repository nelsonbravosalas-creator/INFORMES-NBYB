/**
 * GET  /api/reports - listar informes visibles para el usuario
 * POST /api/reports - crear o upsert, resolviendo IDs multi-tenant
 */
import { sql, json, error, serverError } from "../_lib/db.js";
import { authenticate } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";
import { isTenantScoped, resolveClientAndSite, upsertEquipment } from "../_lib/multiTenant.js";
import { ensureHvacReportPayloadColumn, toHvacReport } from "../_lib/reportMapper.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetch(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (!auth) return error("No autenticado", 401);

  try {
    await ensureHvacReportPayloadColumn();

    if (req.method === "GET") {
      const rows = isTenantScoped(auth)
        ? await sql`
            SELECT
              r.id, r.legacy_id AS "legacyId", r.folio, r.report_date AS date,
              r.technician_name AS "technicianName",
              r.client_name AS "clientName", r.client_id AS "clientId",
              r.branch_name AS "branchLocation", r.branch_id AS "branchId",
              r.branch_id AS "siteId", r.equipment_id AS "equipmentId",
              r.correlative, r.correlative_label AS "correlativeLabel",
              r.brand, r.model, r.serial_number AS "serialNumber",
              r.refrigerant_type AS "refrigerantType", r.capacity, r.voltage, r.amperage,
              r.equipment_type AS "equipmentType", r.criticality, r.overall_status AS "overallStatus",
              r.measurements, r.circuits, r.checklist, r.signatures,
              r.electric_scheme_note AS "electricSchemeNote", r.custom_drawing_svg AS "customDrawingSvg",
              r.general_comments AS "generalComments",
              r.report_payload AS "reportPayload",
              r.updated_at AS timestamp
            FROM hvac_reports r
            LEFT JOIN clients c ON c.id = r.client_id
            WHERE c.id::text = ${auth.clienteId}
               OR c.legacy_id = ${auth.clienteId}
               OR c.name = ${auth.clienteId}
               OR r.client_name = ${auth.clienteId}
            ORDER BY r.report_date DESC, r.created_at DESC
            LIMIT 500
          `
        : await sql`
            SELECT
              id, legacy_id AS "legacyId", folio, report_date AS date,
              technician_name AS "technicianName",
              client_name AS "clientName", client_id AS "clientId",
              branch_name AS "branchLocation", branch_id AS "branchId",
              branch_id AS "siteId", equipment_id AS "equipmentId",
              correlative, correlative_label AS "correlativeLabel",
              brand, model, serial_number AS "serialNumber",
              refrigerant_type AS "refrigerantType", capacity, voltage, amperage,
              equipment_type AS "equipmentType", criticality, overall_status AS "overallStatus",
              measurements, circuits, checklist, signatures,
              electric_scheme_note AS "electricSchemeNote", custom_drawing_svg AS "customDrawingSvg",
              general_comments AS "generalComments",
              report_payload AS "reportPayload",
              updated_at AS timestamp
            FROM hvac_reports
            ORDER BY report_date DESC, created_at DESC
            LIMIT 500
          `;
      return json(rows.map(toHvacReport));
    }

    if (req.method === "POST") {
      const body = (await req.json()) as any;
      if (!body.folio || !body.clientName) {
        return error("Folio y cliente son requeridos", 400);
      }

      const bodyIdIsUuid = typeof body.id === "string" && UUID_RE.test(body.id);
      const legacyId = body.legacyId ?? (bodyIdIsUuid ? null : body.id) ?? null;
      const { clientId, siteId } = await resolveClientAndSite(body);
      const equipmentId = await upsertEquipment(body, clientId, siteId);

      const existing = bodyIdIsUuid
        ? await sql`
            SELECT id, correlative
            FROM hvac_reports
            WHERE id = ${body.id}::uuid
            LIMIT 1
          `
        : legacyId
        ? await sql`
            SELECT id, correlative
            FROM hvac_reports
            WHERE legacy_id = ${legacyId}
            LIMIT 1
          `
        : [];

      let correlative = Number.isInteger(body.correlative) ? Number(body.correlative) : null;
      if (correlative !== null && (correlative < 0 || correlative > 9999)) {
        return error("ID_Correlativo debe estar entre 0000 y 9999", 400);
      }

      if (existing[0]?.correlative !== null && existing[0]?.correlative !== undefined) {
        correlative = Number(existing[0].correlative);
      } else if (correlative === null && equipmentId) {
        const next = await sql`
          SELECT next_equipment_report_correlative(${equipmentId}::uuid) AS correlative
        `;
        correlative = Number(next[0].correlative);
      }

      const targetId = existing[0]?.id ?? (bodyIdIsUuid ? body.id : null);

      const result = await sql`
        INSERT INTO hvac_reports (
          id, legacy_id, folio, report_date, technician_name,
          client_name, client_id, branch_name, branch_id,
          equipment_id, correlative,
          brand, model, serial_number,
          refrigerant_type, capacity, voltage, amperage,
          equipment_type, criticality, overall_status,
          measurements, circuits, checklist, signatures,
          electric_scheme_note, custom_drawing_svg, general_comments,
          report_payload
        ) VALUES (
          COALESCE(${targetId}::uuid, uuid_generate_v4()), ${legacyId}, ${body.folio}, ${body.date}::date, ${body.technicianName},
          ${body.clientName}, ${clientId}::uuid, ${body.branchLocation ?? null}, ${siteId}::uuid,
          ${equipmentId ? `${equipmentId}` : null}::uuid, ${correlative},
          ${body.brand ?? null}, ${body.model ?? null}, ${body.serialNumber ?? null},
          ${body.refrigerantType ?? null}, ${body.capacity ?? null}, ${body.voltage ?? null}, ${body.amperage ?? null},
          ${body.equipmentType ?? null}, ${body.criticality ?? null}, ${body.overallStatus ?? "normal"},
          ${JSON.stringify({ ambientTemp: body.ambientTemp, returnTemp: body.returnTemp, supplyTemp: body.supplyTemp, fanAmperage: body.fanAmperage, setPoint: body.setPoint })}::jsonb,
          ${JSON.stringify(body.circuits ?? [])}::jsonb,
          ${JSON.stringify(body.checklist ?? [])}::jsonb,
          ${JSON.stringify(body.signatures ?? {})}::jsonb,
          ${body.electricSchemeNote ?? null}, ${body.customDrawingSvg ?? null}, ${body.generalComments ?? null},
          ${JSON.stringify(body)}::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
          legacy_id = COALESCE(hvac_reports.legacy_id, EXCLUDED.legacy_id),
          folio = EXCLUDED.folio,
          report_date = EXCLUDED.report_date,
          technician_name = EXCLUDED.technician_name,
          client_name = EXCLUDED.client_name,
          client_id = EXCLUDED.client_id,
          branch_name = EXCLUDED.branch_name,
          branch_id = EXCLUDED.branch_id,
          equipment_id = EXCLUDED.equipment_id,
          correlative = COALESCE(hvac_reports.correlative, EXCLUDED.correlative),
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
          report_payload = EXCLUDED.report_payload,
          sync_version = hvac_reports.sync_version + 1
        RETURNING
          id, legacy_id AS "legacyId", sync_version, updated_at,
          client_id AS "clientId", branch_id AS "branchId", branch_id AS "siteId",
          equipment_id AS "equipmentId", correlative,
          correlative_label AS "correlativeLabel"
      `;

      await logAudit({
        userId: auth.sub,
        userName: auth.nombre,
        action: result[0].sync_version === 1 ? "create" : "update",
        entityType: "hvac_report",
        entityId: result[0].id,
        metadata: { folio: body.folio, equipmentId: result[0].equipmentId, correlative: result[0].correlativeLabel },
        req,
      });

      return json({ success: true, ...result[0] });
    }

    return error("Metodo no permitido", 405);
  } catch (err: any) {
    return serverError("API /reports error:", err);
  }
}
