/**
 * Sincronización offline-first entre LocalForage (cliente) y Neon (servidor).
 *
 * Estrategia "last-write-wins" simple:
 * 1. Al guardar localmente, marcar el registro con _syncStatus = 'pending'.
 * 2. Cuando hay conexión, hacer push de pendientes → /api/*.
 * 3. Hacer pull de cambios remotos y mergear (servidor gana en conflicto).
 *
 * Para conflictos más sofisticados (multi-técnico editando), se puede
 * extender con vector clocks o CRDT en el futuro.
 */
import { HVACReport, ServiceOrderReport } from "../types";
import { ReportsAPI, ServiceOrdersAPI, isOnline } from "./api-client";
import { getReports, getServiceOrders, saveReport, saveServiceOrder } from "./storage";

type SyncableReport = HVACReport & { _syncStatus?: "pending" | "synced" | "error" };
type SyncableOT     = ServiceOrderReport & { _syncStatus?: "pending" | "synced" | "error" };

/**
 * Push: sube todos los registros pendientes al servidor.
 */
export async function pushPendingReports(): Promise<{ pushed: number; failed: number }> {
  if (!isOnline()) return { pushed: 0, failed: 0 };

  const local = (await getReports()) as SyncableReport[];
  const pending = local.filter(r => r._syncStatus !== "synced");

  let pushed = 0;
  let failed = 0;

  for (const report of pending) {
    const result = await ReportsAPI.save(report);
    if (result?.success) {
      const { id: serverId, ...serverFields } = result;
      await saveReport({ ...report, ...serverFields, id: report.id, serverId, _syncStatus: "synced" } as any);
      pushed++;
    } else {
      failed++;
    }
  }

  return { pushed, failed };
}

export async function pushPendingServiceOrders(): Promise<{ pushed: number; failed: number }> {
  if (!isOnline()) return { pushed: 0, failed: 0 };

  const local = (await getServiceOrders()) as SyncableOT[];
  const pending = local.filter(o => o._syncStatus !== "synced");

  let pushed = 0;
  let failed = 0;

  for (const ot of pending) {
    const result = await ServiceOrdersAPI.save(ot);
    if (result?.success) {
      const { id: serverId, ...serverFields } = result;
      await saveServiceOrder({ ...ot, ...serverFields, id: ot.id, serverId, _syncStatus: "synced" } as any);
      pushed++;
    } else {
      failed++;
    }
  }

  return { pushed, failed };
}

/**
 * Pull: descarga registros del servidor y mergea con locales.
 * Servidor gana en conflicto (LWW por timestamp).
 */
export async function pullReportsFromServer(): Promise<number> {
  if (!isOnline()) return 0;

  const remote = await ReportsAPI.list();
  if (!remote) return 0;

  let merged = 0;
  for (const r of remote) {
    const localId = (r as any).legacyId ?? r.id;
    await saveReport({ ...r, id: localId, _syncStatus: "synced" } as any);
    merged++;
  }
  return merged;
}

export async function pullServiceOrdersFromServer(): Promise<number> {
  if (!isOnline()) return 0;

  const remote = await ServiceOrdersAPI.list();
  if (!remote) return 0;

  let merged = 0;
  for (const r of remote) {
    const localId = (r as any).legacyId ?? r.id;
    await saveServiceOrder({ ...r, id: localId, _syncStatus: "synced" } as any);
    merged++;
  }
  return merged;
}

/**
 * Sincronización bidireccional completa.
 * Ideal llamarlo al arrancar la app y cuando vuelve la conexión.
 */
export async function syncAll(): Promise<{
  reports: { pushed: number; failed: number; pulled: number };
  serviceOrders: { pushed: number; failed: number; pulled: number };
}> {
  // Push primero para no perder cambios locales
  const reportsPush = await pushPendingReports();
  const otPush = await pushPendingServiceOrders();

  // Luego pull para obtener cambios de otros usuarios
  const reportsPulled = await pullReportsFromServer();
  const otPulled = await pullServiceOrdersFromServer();

  return {
    reports: { ...reportsPush, pulled: reportsPulled },
    serviceOrders: { ...otPush, pulled: otPulled },
  };
}

/**
 * Helper: iniciar sync automático
 * - Al arrancar la app
 * - Cada 5 minutos si hay conexión
 * - Cuando vuelve la conexión
 */
export function initAutoSync(onUpdate?: () => void): () => void {
  let intervalId: number | null = null;

  const doSync = async () => {
    if (!isOnline()) return;
    try {
      await syncAll();
      onUpdate?.();
    } catch (e) {
      console.warn("[sync] auto sync failed:", e);
    }
  };

  // Sync inmediato
  void doSync();

  // Sync periódico cada 5 min
  intervalId = window.setInterval(doSync, 5 * 60 * 1000);

  // Sync al recuperar conexión
  const handleOnline = () => void doSync();
  window.addEventListener("online", handleOnline);

  // Cleanup
  return () => {
    if (intervalId) window.clearInterval(intervalId);
    window.removeEventListener("online", handleOnline);
  };
}
