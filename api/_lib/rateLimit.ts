/**
 * Rate limiting persistente en Postgres.
 *
 * Un limitador en memoria no sirve en Vercel: cada invocación puede caer en
 * una instancia serverless distinta (cold start), así que el conteo se
 * perdería justo donde más importa (fuerza bruta de PIN en /api/auth/login).
 * Usamos la tabla `rate_limit_events` (ver db/migration_001_security.sql).
 */
import { sql } from "./db.js";

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Devuelve true si la acción está permitida (y la registra), false si se
 * superó el máximo de intentos para ese `bucket` dentro de la ventana.
 */
export async function checkRateLimit(
  bucket: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<boolean> {
  const rows = await sql`
    SELECT COUNT(*)::int AS c FROM rate_limit_events
    WHERE bucket = ${bucket} AND created_at > now() - make_interval(secs => ${windowSeconds})
  `;
  if ((rows[0]?.c ?? 0) >= maxAttempts) return false;

  await sql`INSERT INTO rate_limit_events (bucket) VALUES (${bucket})`;

  // Limpieza oportunista de eventos viejos (evita crecimiento indefinido sin cron job)
  if (Math.random() < 0.02) {
    await sql`DELETE FROM rate_limit_events WHERE created_at < now() - interval '2 days'`;
  }

  return true;
}
