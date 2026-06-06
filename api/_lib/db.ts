/**
 * Cliente Neon Postgres compartido para todas las API routes.
 *
 * Usa @neondatabase/serverless que está optimizado para entornos
 * serverless de Vercel (conexión HTTP, no requiere pool persistente).
 */
import { neon, neonConfig } from "@neondatabase/serverless";

// Configurar fetch cache para reducir cold starts en Vercel
neonConfig.fetchConnectionCache = true;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL no está configurada. Configúrala en Vercel → Settings → Environment Variables"
  );
}

export const sql = neon(DATABASE_URL);

/**
 * Helper: ejecutar query y devolver primer row o null
 */
export async function queryOne<T = any>(
  query: TemplateStringsArray,
  ...params: any[]
): Promise<T | null> {
  const rows = await sql(query, params);
  return (rows[0] as T) ?? null;
}

/**
 * Helper: respuesta JSON estándar
 */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Helper: respuesta de error estándar
 */
export function error(message: string, status = 500, details?: unknown): Response {
  return json({ error: message, details }, status);
}
