/**
 * Cliente HTTP para comunicarse con las API routes de Vercel.
 *
 * - Usa la URL del propio host (mismo dominio en producción).
 * - Maneja errores de red devolviendo null para que el caller decida fallback
 *   a LocalForage cuando no hay conexión.
 * - Todas las respuestas son JSON.
 */
import { HVACReport, ServiceOrderReport, AdminSettings } from "../types";
import { getSession } from "./storage";

const API_BASE = ""; // mismo origen — Vercel sirve /api/* desde el mismo dominio

interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Adjunta el JWT de sesión (emitido por /api/auth/login) — sin esto, toda
  // ruta protegida responde 401 (ver api/_lib/auth.ts).
  const session = await getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init?.headers as Record<string, string> ?? {}) };
  if (session?.token) headers["Authorization"] = `Bearer ${session.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: ApiError = new Error(body.error ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.details = body.details;
    throw err;
  }

  return (await res.json()) as T;
}

/**
 * Wrapper "best-effort": intenta llamar a la API, si falla devuelve null.
 * Útil para llamadas que pueden fallback silenciosamente a LocalForage.
 */
async function tryRequest<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await request<T>(path, init);
  } catch (err) {
    console.warn(`[api-client] ${path} fallback:`, (err as Error).message);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// HVAC Reports
// ────────────────────────────────────────────────────────────────────────────
export const ReportsAPI = {
  list: () => tryRequest<HVACReport[]>("/api/reports"),
  get: (id: string) => tryRequest<HVACReport>(`/api/reports/${id}`),
  save: (report: HVACReport) =>
    tryRequest<{ success: boolean; id: string } & Partial<HVACReport>>("/api/reports", {
      method: "POST",
      body: JSON.stringify(report),
    }),
  delete: (id: string) =>
    tryRequest<{ success: boolean }>(`/api/reports/${id}`, { method: "DELETE" }),
};

// ────────────────────────────────────────────────────────────────────────────
// Service Orders
// ────────────────────────────────────────────────────────────────────────────
export const ServiceOrdersAPI = {
  list: () => tryRequest<ServiceOrderReport[]>("/api/service-orders"),
  get: (id: string) => tryRequest<ServiceOrderReport>(`/api/service-orders/${id}`),
  save: (order: ServiceOrderReport) =>
    tryRequest<{ success: boolean; id: string } & Partial<ServiceOrderReport>>("/api/service-orders", {
      method: "POST",
      body: JSON.stringify(order),
    }),
  delete: (id: string) =>
    tryRequest<{ success: boolean }>(`/api/service-orders/${id}`, { method: "DELETE" }),
};

// ────────────────────────────────────────────────────────────────────────────
// Admin Settings
// ────────────────────────────────────────────────────────────────────────────
export const AdminAPI = {
  get: () => tryRequest<AdminSettings>("/api/admin/settings"),
  save: (settings: AdminSettings) =>
    tryRequest<{ success: boolean }>("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
};

// ────────────────────────────────────────────────────────────────────────────
// Autenticación
// ────────────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  user: { userId: string; email: string; nombre: string; perfil: string; clienteId: string };
}

export const AuthAPI = {
  /** Lanza error si las credenciales son inválidas o hay un 429 — el caller decide el fallback offline. */
  login: (email: string, pin: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, pin }),
    }),
};

// ────────────────────────────────────────────────────────────────────────────
// Usuarios (gestión server-side — reemplaza el CRUD 100% local)
// ────────────────────────────────────────────────────────────────────────────
export interface ServerAppUser {
  id: string;
  email: string;
  nombre: string;
  perfil: string;
  activo: boolean;
  clienteId?: string;
  createdAt: string;
  lastLogin?: string;
}

export const UsersAPI = {
  list: () => tryRequest<ServerAppUser[]>("/api/users"),
  create: (data: { email: string; nombre: string; perfil: string; pin: string; activo?: boolean; clienteId?: string }) =>
    request<ServerAppUser>("/api/users", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ nombre: string; perfil: string; pin: string; activo: boolean; clienteId: string }>) =>
    request<ServerAppUser>("/api/users", { method: "PUT", body: JSON.stringify({ id, ...data }) }),
  delete: (id: string) =>
    request<{ success: boolean }>("/api/users", { method: "DELETE", body: JSON.stringify({ id }) }),
};

// ────────────────────────────────────────────────────────────────────────────
// OCR
// ────────────────────────────────────────────────────────────────────────────
export const OCR_API = {
  /** Lanza error si Gemini falla — el caller debe decidir cómo manejarlo. */
  recognize: (imageBase64: string, mimeType = "image/png") =>
    request<{ success: boolean; data: any }>("/api/ocr", {
      method: "POST",
      body: JSON.stringify({ image: imageBase64, mimeType }),
    }),
};

// ────────────────────────────────────────────────────────────────────────────
// Detección de conexión
// ────────────────────────────────────────────────────────────────────────────
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

export function onOnlineChange(cb: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleOnline = () => cb(true);
  const handleOffline = () => cb(false);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
