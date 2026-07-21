/**
 * Registro de auditoría — usa la tabla `audit_log` que ya existía en el
 * schema pero ninguna ruta escribía en ella (no había forma de saber quién
 * creó, editó o borró un informe, ni de detectar abuso).
 */
import { sql } from "./db.js";
import { clientIp } from "./rateLimit.js";

export async function logAudit(params: {
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
  req?: Request;
}): Promise<void> {
  try {
    const ip = params.req ? clientIp(params.req) : null;
    const userAgent = params.req?.headers.get("user-agent") ?? null;
    await sql`
      INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, metadata, ip_address, user_agent)
      VALUES (
        ${params.userId ?? null}::uuid, ${params.userName ?? null}, ${params.action},
        ${params.entityType}, ${params.entityId ?? null}, ${JSON.stringify(params.metadata ?? {})}::jsonb,
        ${ip}, ${userAgent}
      )
    `;
  } catch (err) {
    // La auditoría nunca debe tumbar el request principal
    console.error("[audit] failed to log:", err);
  }
}
