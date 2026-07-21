import localforage from "localforage";
import { HVACReport, AdminSettings, ServiceOrderReport, AppUser, AuthSession, UserProfile } from "../types";
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

// ============================================================
// USUARIOS Y AUTENTICACIÓN
// ============================================================
const USERS_KEY = "app_users";
const SESSION_KEY = "auth_session";
const PIN_SALT = "nbyb-hvac-2026";
const DB_VERSION = 1;

/** Hash de 4 dígitos PIN usando Web Crypto API (SHA-256 + salt) */
export async function hashPin(pin: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + PIN_SALT);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Fallback sin Web Crypto (muy raro en browsers modernos)
    return btoa(pin + PIN_SALT);
  }
}

/** Verifica que el PIN ingresado coincide con el hash almacenado */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === storedHash;
}

/** Usuarios por defecto (seed inicial) */
async function buildDefaultUsers(): Promise<AppUser[]> {
  const adminHash = await hashPin("3517");
  const tecnicoHash = await hashPin("1234");
  const now = new Date().toISOString();
  return [
    {
      id: "usr-001",
      email: "admin@nbyb.cl",
      nombre: "Administrador NBYB",
      perfil: "administrador" as UserProfile,
      pinHash: adminHash,
      activo: true,
      clienteId: "EECOL",
      avatarInitials: "AN",
      createdAt: now,
    },
    {
      id: "usr-002",
      email: "tecnico@nbyb.cl",
      nombre: "Técnico Demo",
      perfil: "tecnico" as UserProfile,
      pinHash: tecnicoHash,
      activo: true,
      clienteId: "EECOL",
      avatarInitials: "TD",
      createdAt: now,
    },
  ];
}

/** Inicializa la DB de usuarios si está vacía */
export async function initUsersDB(): Promise<void> {
  const existing = await localforage.getItem<AppUser[]>(USERS_KEY);
  const version = await localforage.getItem<number>("db_version");
  if (!existing || existing.length === 0 || version !== DB_VERSION) {
    const defaults = await buildDefaultUsers();
    await localforage.setItem(USERS_KEY, defaults);
    await localforage.setItem("db_version", DB_VERSION);
    console.log("[DB] Usuarios inicializados:", defaults.length);
  }
}

export async function getUsers(): Promise<AppUser[]> {
  await initUsersDB();
  const list = await localforage.getItem<AppUser[]>(USERS_KEY);
  return list || [];
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const users = await getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function saveUser(user: AppUser): Promise<AppUser[]> {
  const list = await getUsers();
  const idx = list.findIndex(u => u.id === user.id);
  if (idx > -1) {
    list[idx] = user;
  } else {
    list.push(user);
  }
  await localforage.setItem(USERS_KEY, list);
  return list;
}

export async function deleteUser(id: string): Promise<AppUser[]> {
  const list = await getUsers();
  const updated = list.filter(u => u.id !== id);
  await localforage.setItem(USERS_KEY, updated);
  return updated;
}

/**
 * Fallback SOLO para modo offline: LoginComponent intenta primero
 * AuthAPI.login (servidor, fuente de verdad) y únicamente cae aquí si no
 * hay red. Una sesión creada por esta vía no trae un JWT válido, así que
 * cualquier llamada a /api/* seguirá exigiendo reautenticación online.
 */
export async function loginWithPin(email: string, pin: string): Promise<AuthSession | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.activo) return null;

  const ok = await verifyPin(pin, user.pinHash);
  if (!ok) return null;

  // Actualizar último login
  user.lastLogin = new Date().toISOString();
  await saveUser(user);

  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    nombre: user.nombre,
    perfil: user.perfil,
    clienteId: user.clienteId || "",
    token: `token_${user.id}_${Date.now()}`,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8h
  };

  await localforage.setItem(SESSION_KEY, session);
  return session;
}

export async function getSession(): Promise<AuthSession | null> {
  const session = await localforage.getItem<AuthSession>(SESSION_KEY);
  if (!session) return null;
  // Verificar expiración
  if (new Date(session.expiresAt) < new Date()) {
    await localforage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

/** Persiste una sesión ya validada (p.ej. por AuthAPI.login contra el servidor). */
export async function saveSession(session: AuthSession): Promise<void> {
  await localforage.setItem(SESSION_KEY, session);
}

/**
 * Cachea localmente el usuario recién autenticado por el servidor junto con
 * el hash de su PIN, para que el login offline (sin red) siga funcionando
 * en este mismo dispositivo la próxima vez.
 */
export async function cacheOfflineCredential(
  user: { id: string; email: string; nombre: string; perfil: UserProfile; clienteId?: string },
  pin: string
): Promise<void> {
  const existing = await getUserByEmail(user.email);
  const pinHash = await hashPin(pin);
  await saveUser({
    id: existing?.id || user.id,
    email: user.email.toLowerCase(),
    nombre: user.nombre,
    perfil: user.perfil,
    pinHash,
    activo: true,
    clienteId: user.clienteId ?? existing?.clienteId,
    avatarInitials: existing?.avatarInitials,
    createdAt: existing?.createdAt || new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  });
}

export async function logout(): Promise<void> {
  await localforage.removeItem(SESSION_KEY);
  await localforage.removeItem("auth_email");
  await localforage.removeItem("auth_tenant_id");
  await localforage.removeItem("auth_token");
}
