import localforage from "localforage";
import { HVACReport, AdminSettings, ServiceOrderReport } from "../types";
import { DEFAULT_ADMIN_SETTINGS } from "../constants";

// Configure localForage
localforage.config({
  name: "HVAC_Pro_App_DB",
  storeName: "hvac_reports_store",
  description: "BBDD local para informes y configuración de Gestión HVAC Pro"
});

const REPORT_LIST_KEY = "hvac_reports";
const ADMIN_SETTING_KEY = "hvac_admin_settings";

/**
 * Safe storage wrapper following specifications
 */
export async function getReports(): Promise<HVACReport[]> {
  try {
    const list = await localforage.getItem<HVACReport[]>(REPORT_LIST_KEY);
    return list || [];
  } catch (err) {
    console.warn("localForage getReports failed, falling back to localStorage", err);
    try {
      const backup = localStorage.getItem(REPORT_LIST_KEY);
      return backup ? JSON.parse(backup) : [];
    } catch (_) {
      return [];
    }
  }
}

export async function saveReport(report: HVACReport): Promise<HVACReport[]> {
  try {
    const list = await getReports();
    const existingIndex = list.findIndex(r => r.id === report.id);
    if (existingIndex > -1) {
      list[existingIndex] = { ...report, timestamp: new Date().toISOString() };
    } else {
      list.unshift(report);
    }
    await localforage.setItem(REPORT_LIST_KEY, list);
    
    // Backup in localStorage
    try {
      localStorage.setItem(REPORT_LIST_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("localStorage backup failed (likely quota limit due to photos)", e);
    }
    return list;
  } catch (err) {
    console.error("localForage saveReport failed, doing localStorage save", err);
    const list = await getReports();
    const existingIndex = list.findIndex(r => r.id === report.id);
    if (existingIndex > -1) {
      list[existingIndex] = { ...report, timestamp: new Date().toISOString() };
    } else {
      list.unshift(report);
    }
    try {
      localStorage.setItem(REPORT_LIST_KEY, JSON.stringify(list));
    } catch (_) {}
    return list;
  }
}

export async function deleteReport(id: string): Promise<HVACReport[]> {
  try {
    const list = await getReports();
    const updated = list.filter(r => r.id !== id);
    await localforage.setItem(REPORT_LIST_KEY, updated);
    try {
      localStorage.setItem(REPORT_LIST_KEY, JSON.stringify(updated));
    } catch (_) {}
    return updated;
  } catch (err) {
    console.error("localForage deleteReport failed", err);
    const list = await getReports();
    const updated = list.filter(r => r.id !== id);
    try {
      localStorage.setItem(REPORT_LIST_KEY, JSON.stringify(updated));
    } catch (_) {}
    return updated;
  }
}

export async function getAdminSettings(): Promise<AdminSettings> {
  try {
    const settings = await localforage.getItem<AdminSettings>(ADMIN_SETTING_KEY);
    return settings || { ...DEFAULT_ADMIN_SETTINGS };
  } catch (err) {
    console.warn("localForage getAdminSettings failed, falling back to localStorage", err);
    try {
      const backup = localStorage.getItem(ADMIN_SETTING_KEY);
      return backup ? JSON.parse(backup) : { ...DEFAULT_ADMIN_SETTINGS };
    } catch (_) {
      return { ...DEFAULT_ADMIN_SETTINGS };
    }
  }
}

export async function saveAdminSettings(settings: AdminSettings): Promise<void> {
  try {
    await localforage.setItem(ADMIN_SETTING_KEY, settings);
    try {
      localStorage.setItem(ADMIN_SETTING_KEY, JSON.stringify(settings));
    } catch (_) {}
  } catch (err) {
    console.error("localForage saveAdminSettings failed", err);
    try {
      localStorage.setItem(ADMIN_SETTING_KEY, JSON.stringify(settings));
    } catch (_) {}
  }
}

const SERVICE_ORDERS_KEY = "hvac_service_orders";

export async function getServiceOrders(): Promise<ServiceOrderReport[]> {
  try {
    const list = await localforage.getItem<ServiceOrderReport[]>(SERVICE_ORDERS_KEY);
    return list || [];
  } catch (err) {
    console.warn("localForage getServiceOrders failed, falling back to localStorage", err);
    try {
      const backup = localStorage.getItem(SERVICE_ORDERS_KEY);
      return backup ? JSON.parse(backup) : [];
    } catch (_) {
      return [];
    }
  }
}

export async function saveServiceOrder(order: ServiceOrderReport): Promise<ServiceOrderReport[]> {
  try {
    const list = await getServiceOrders();
    const idx = list.findIndex(o => o.id === order.id);
    if (idx > -1) {
      list[idx] = { ...order, timestamp: new Date().toISOString() };
    } else {
      list.unshift(order);
    }
    await localforage.setItem(SERVICE_ORDERS_KEY, list);
    try { localStorage.setItem(SERVICE_ORDERS_KEY, JSON.stringify(list)); } catch (_) {}
    return list;
  } catch (err) {
    console.error("localForage saveServiceOrder failed", err);
    const list = await getServiceOrders();
    const idx = list.findIndex(o => o.id === order.id);
    if (idx > -1) {
      list[idx] = { ...order, timestamp: new Date().toISOString() };
    } else {
      list.unshift(order);
    }
    try { localStorage.setItem(SERVICE_ORDERS_KEY, JSON.stringify(list)); } catch (_) {}
    return list;
  }
}

export async function deleteServiceOrder(id: string): Promise<ServiceOrderReport[]> {
  try {
    const list = await getServiceOrders();
    const updated = list.filter(o => o.id !== id);
    await localforage.setItem(SERVICE_ORDERS_KEY, updated);
    try { localStorage.setItem(SERVICE_ORDERS_KEY, JSON.stringify(updated)); } catch (_) {}
    return updated;
  } catch (err) {
    console.error("localForage deleteServiceOrder failed", err);
    const list = await getServiceOrders();
    const updated = list.filter(o => o.id !== id);
    try { localStorage.setItem(SERVICE_ORDERS_KEY, JSON.stringify(updated)); } catch (_) {}
    return updated;
  }
}
