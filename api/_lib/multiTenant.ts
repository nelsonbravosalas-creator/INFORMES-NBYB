import { sql } from "./db.js";
import { AuthUser } from "./auth.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function asUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

function siteCode(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return (normalized || "SITIO").slice(0, 8);
}

export async function resolveClientAndSite(body: any): Promise<{ clientId: string; siteId: string }> {
  const explicitClientId = asUuid(body.clientId);
  const explicitSiteId = asUuid(body.siteId ?? body.branchId);

  let clientId = explicitClientId;
  if (clientId) {
    const rows = await sql`SELECT id FROM clients WHERE id = ${clientId}::uuid LIMIT 1`;
    clientId = rows[0]?.id ?? null;
  }

  const clientName = String(body.clientName ?? "").trim();
  if (!clientId) {
    if (!clientName) throw new Error("Cliente requerido para resolver ID_Cliente");

    const existing = await sql`
      SELECT id FROM clients
      WHERE lower(name) = lower(${clientName})
      ORDER BY created_at
      LIMIT 1
    `;

    if (existing[0]?.id) {
      clientId = existing[0].id;
    } else {
      const inserted = await sql`
        INSERT INTO clients (name, contact_email)
        VALUES (${clientName}, ${body.clientEmail ?? null})
        RETURNING id
      `;
      clientId = inserted[0].id;
    }
  }

  let siteId = explicitSiteId;
  if (siteId) {
    const rows = await sql`
      SELECT id FROM sub_branches
      WHERE id = ${siteId}::uuid AND client_id = ${clientId}::uuid
      LIMIT 1
    `;
    siteId = rows[0]?.id ?? null;
  }

  const siteName = String(body.branchLocation ?? body.siteName ?? "Casa Matriz").trim() || "Casa Matriz";
  if (!siteId) {
    const existing = await sql`
      SELECT id FROM sub_branches
      WHERE client_id = ${clientId}::uuid
        AND lower(name) = lower(${siteName})
      ORDER BY created_at
      LIMIT 1
    `;

    if (existing[0]?.id) {
      siteId = existing[0].id;
    } else {
      const inserted = await sql`
        INSERT INTO sub_branches (
          client_id, type, code, name, address, region,
          contact_person, contact_role, contact_email
        ) VALUES (
          ${clientId}::uuid, 'SUCURSAL', ${siteCode(siteName)}, ${siteName},
          ${body.clientLocationAddress ?? null}, ${body.clientRegion ?? null},
          ${body.clientContactName ?? null}, ${body.clientContactRole ?? null},
          ${body.clientEmail ?? null}
        )
        RETURNING id
      `;
      siteId = inserted[0].id;
    }
  }

  return { clientId, siteId };
}

export async function upsertEquipment(body: any, clientId: string, siteId: string): Promise<string | null> {
  const explicitEquipmentId = asUuid(body.equipmentId);
  if (explicitEquipmentId) {
    const rows = await sql`
      SELECT id FROM equipment
      WHERE id = ${explicitEquipmentId}::uuid
        AND client_id = ${clientId}::uuid
        AND site_id = ${siteId}::uuid
      LIMIT 1
    `;
    if (rows[0]?.id) return rows[0].id;
  }

  const serialNumber = String(body.serialNumber ?? "").trim();
  if (!serialNumber) return null;

  const result = await sql`
    INSERT INTO equipment (
      client_id, site_id, equipment_type, brand, model, serial_number,
      refrigerant_type, capacity, voltage, amperage, criticality
    ) VALUES (
      ${clientId}::uuid, ${siteId}::uuid, ${body.equipmentType ?? null},
      ${body.brand ?? null}, ${body.model ?? null}, ${serialNumber},
      ${body.refrigerantType ?? null}, ${body.capacity ?? null},
      ${body.voltage ?? null}, ${body.amperage ?? null}, ${body.criticality ?? null}
    )
    ON CONFLICT (client_id, site_id, serial_number) DO UPDATE SET
      equipment_type = EXCLUDED.equipment_type,
      brand = EXCLUDED.brand,
      model = EXCLUDED.model,
      refrigerant_type = EXCLUDED.refrigerant_type,
      capacity = EXCLUDED.capacity,
      voltage = EXCLUDED.voltage,
      amperage = EXCLUDED.amperage,
      criticality = EXCLUDED.criticality,
      updated_at = now()
    RETURNING id
  `;

  return result[0]?.id ?? null;
}

export function isTenantScoped(auth: AuthUser): boolean {
  return auth.role !== "administrador" && Boolean(auth.clienteId);
}
