/**
 * GET /api/admin/settings — leer configuración global
 * PUT /api/admin/settings — actualizar catálogos y branding
 */
import { sql, json, error, serverError } from "../_lib/db.js";
import { authenticate } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";

function recordKey(record: any): string {
  return String(record?.legacyId ?? record?.id ?? `cli_${Date.now()}_${Math.random().toString(36).slice(2)}`);
}

export async function fetch(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (!auth) return error("No autenticado", 401);

  try {
    if (req.method === "GET") {
      const rows = await sql`
        SELECT
          company_name AS "companyName", company_address AS "companyAddress",
          logo, brands, refrigerants, equipment_types AS "equipmentTypes", techs
        FROM admin_settings
        WHERE id = 1
        LIMIT 1
      `;

      // Combinar con clients/branches desde tablas relacionales
      const clients = await sql`
        SELECT
          COALESCE(c.legacy_id, c.id::text) AS id, c.id AS "serverId", c.legacy_id AS "legacyId",
          c.name, c.address, c.region,
          c.contact_person AS "contactPerson", c.contact_role AS "contactRole",
          c.contact_email AS "contactEmail", c.no_subs AS "noSubs",
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', COALESCE(s.legacy_id, s.id::text), 'serverId', s.id, 'legacyId', s.legacy_id,
              'type', s.type, 'code', s.code, 'name', s.name,
              'address', s.address, 'region', s.region, 'sameContact', s.same_contact,
              'contactPerson', s.contact_person, 'contactRole', s.contact_role,
              'contactEmail', s.contact_email
            )) FROM sub_branches s WHERE s.client_id = c.id), '[]'
          ) AS subs
        FROM clients c
        ORDER BY c.name
      `;

      return json({
        ...rows[0],
        clientRecords: clients,
        // Compatibilidad con estructura legacy
        clients: clients.map((c: any) => c.name),
        branches: clients.reduce((acc: any, c: any) => {
          acc[c.name] = c.noSubs
            ? [c.address || c.name]
            : (c.subs ?? []).map((s: any) => s.name || s.code).filter(Boolean);
          return acc;
        }, {}),
      });
    }

    if (req.method === "PUT") {
      if (auth.role !== "administrador") return error("No autorizado", 403);

      const body = (await req.json()) as any;

      await sql`
        UPDATE admin_settings SET
          company_name = ${body.companyName},
          company_address = ${body.companyAddress ?? null},
          logo = ${body.logo ?? null},
          brands = ${JSON.stringify(body.brands ?? [])}::jsonb,
          refrigerants = ${JSON.stringify(body.refrigerants ?? [])}::jsonb,
          equipment_types = ${JSON.stringify(body.equipmentTypes ?? [])}::jsonb,
          techs = ${JSON.stringify(body.techs ?? [])}::jsonb,
          updated_at = now()
        WHERE id = 1
      `;

      if (Array.isArray(body.clientRecords)) {
        const records = body.clientRecords;
        const existingClients = await sql`SELECT id, legacy_id AS "legacyId" FROM clients`;
        const keptClientIds = new Set<string>();

        for (const record of records) {
          const key = recordKey(record);
          const existing = existingClients.find((c: any) => c.legacyId === key || c.id === key);
          const clientRows = existing
            ? await sql`
                UPDATE clients SET
                  legacy_id = ${key},
                  name = ${record.name ?? ""},
                  address = ${record.address ?? null},
                  region = ${record.region ?? null},
                  contact_person = ${record.contactPerson ?? null},
                  contact_role = ${record.contactRole ?? null},
                  contact_email = ${record.contactEmail ?? null},
                  no_subs = ${Boolean(record.noSubs)}
                WHERE id = ${existing.id}::uuid
                RETURNING id
              `
            : await sql`
                INSERT INTO clients (
                  legacy_id, name, address, region, contact_person, contact_role,
                  contact_email, no_subs
                )
                VALUES (
                  ${key}, ${record.name ?? ""}, ${record.address ?? null}, ${record.region ?? null},
                  ${record.contactPerson ?? null}, ${record.contactRole ?? null},
                  ${record.contactEmail ?? null}, ${Boolean(record.noSubs)}
                )
                RETURNING id
              `;

          const clientId = clientRows[0].id;
          keptClientIds.add(clientId);

          await sql`DELETE FROM sub_branches WHERE client_id = ${clientId}::uuid`;
          if (!record.noSubs && Array.isArray(record.subs)) {
            for (const sub of record.subs) {
              await sql`
                INSERT INTO sub_branches (
                  legacy_id, client_id, type, code, name, address, region,
                  same_contact, contact_person, contact_role, contact_email
                )
                VALUES (
                  ${String(sub.legacyId ?? sub.id ?? `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`)},
                  ${clientId}::uuid,
                  ${sub.type ?? "OTRO"},
                  ${sub.code ?? ""},
                  ${sub.name ?? ""},
                  ${sub.address ?? null},
                  ${sub.region ?? null},
                  ${sub.sameContact ?? true},
                  ${sub.contactPerson ?? null},
                  ${sub.contactRole ?? null},
                  ${sub.contactEmail ?? null}
                )
              `;
            }
          }
        }

        for (const existing of existingClients as any[]) {
          if (!keptClientIds.has(existing.id)) {
            await sql`DELETE FROM clients WHERE id = ${existing.id}::uuid`;
          }
        }
      }

      await logAudit({
        userId: auth.sub, userName: auth.nombre, action: "update",
        entityType: "admin_settings", entityId: "1", req,
      });
      return json({ success: true });
    }

    return error("Método no permitido", 405);
  } catch (err: any) {
    return serverError("API /admin/settings error:", err);
  }
}
