/**
 * GET /api/admin/settings — leer configuración global
 * PUT /api/admin/settings — actualizar catálogos y branding
 */
import { sql, json, error } from "../_lib/db";

export default async function handler(req: Request): Promise<Response> {
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
          c.id, c.legacy_id AS "legacyId", c.name, c.address, c.region,
          c.contact_person AS "contactPerson", c.contact_role AS "contactRole",
          c.contact_email AS "contactEmail", c.no_subs AS "noSubs",
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', s.id, 'type', s.type, 'code', s.code, 'name', s.name,
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

      return json({ success: true });
    }

    return error("Método no permitido", 405);
  } catch (err: any) {
    console.error("API /admin/settings error:", err);
    return error(err.message ?? "Error del servidor", 500);
  }
}
