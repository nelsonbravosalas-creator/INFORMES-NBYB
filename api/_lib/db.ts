/**
 * Cliente Neon Postgres compartido para todas las API routes.
 *
 * Usa @neondatabase/serverless que está optimizado para entornos
 * serverless de Vercel (conexión HTTP, no requiere pool persistente).
 */
import { neon } from "@neondatabase/serverless";

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
 * Cabeceras de seguridad aplicadas a toda respuesta JSON de la API.
 * (CSP y Permissions-Policy se dejan fuera: afectan al documento HTML, no a
 * respuestas JSON de fetch/XHR, y requieren pruebas dedicadas por el uso de
 * cámara/canvas en NameplateOCR y SignaturePad.)
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
};

/**
 * Helper: respuesta JSON estándar
 */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
  });
}

/**
 * Helper: respuesta de error estándar
 */
export function error(message: string, status = 500, details?: unknown): Response {
  return json({ error: message, details }, status);
}

/**
 * Helper: loguea la excepción real en el servidor pero nunca la expone al
 * cliente (evita filtrar mensajes internos de Postgres/Neon, rutas de
 * archivos, etc. — ver hallazgo A05 Security Misconfiguration).
 */
export function serverError(context: string, err: unknown): Response {
  console.error(context, err);
  return error("Error interno del servidor. Intenta nuevamente.", 500);
}
