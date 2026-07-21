# Arquitectura Offline y Sincronización

Cómo funciona hoy el modo offline de Gestión HVAC Pro — sin ficción, alineado con [src/utils/storage.ts](src/utils/storage.ts) y [src/utils/sync.ts](src/utils/sync.ts).

## Qué es real y qué no

✅ **Implementado:**
- Almacenamiento local en IndexedDB vía LocalForage — informes, OTs, usuarios cacheados, sesión.
- Crear/editar informes y órdenes de servicio sin conexión.
- Sincronización automática (push + pull) al recuperar conexión.
- Indicador de estado online/offline en la UI ([PWAInstallButton.tsx](src/components/PWAInstallButton.tsx), hook `usePWAInstall`).
- Login offline degradado (ver sección Autenticación).

❌ **No implementado (a pesar de lo que sugiere el nombre "PWA"):**
- No hay `manifest.json` ni Service Worker en el repo (`index.html` no registra ninguno, no existe carpeta `public/`).
- Sin Service Worker no hay precarga del app-shell: el primer login siempre requiere red para descargar el bundle de JS/CSS.
- No hay instalación real como app standalone — el botón "Descargar App" usa el evento nativo `beforeinstallprompt`, que Chrome **no dispara sin manifest + Service Worker válidos**. Hoy es efectivamente un botón inerte en producción.
- No hay notificaciones push ni Background Sync API.

Si se quiere una PWA instalable de verdad, falta: `public/manifest.json`, un `service-worker.js` con estrategia de caché, y registrarlo en `index.html`. Es un trabajo aparte, no cubierto aquí.

## Almacenamiento local (LocalForage / IndexedDB)

Base: `HVAC_Pro_App_DB` → store `hvac_reports_store`.

| Key | Contenido |
|---|---|
| `hvac_reports` | `HVACReport[]` |
| `hvac_service_orders` | `ServiceOrderReport[]` |
| `hvac_admin_settings` | `AdminSettings` (catálogos, branding) |
| `app_users` | `AppUser[]` — caché local de usuarios (offline-only, ver Autenticación) |
| `auth_session` | `AuthSession \| null` — sesión activa |
| `db_version` | versión del seed local de usuarios |

Cada informe/OT trae un campo `_syncStatus?: 'pending' | 'synced' | 'error'` que decide qué empujar al servidor.

## Autenticación

1. **Online (fuente de verdad):** `LoginComponent` llama a `POST /api/auth/login` con correo + PIN de 4 dígitos. El servidor valida contra la tabla `users` (bcrypt) y devuelve un JWT de 8h. La sesión se guarda en `auth_session`, y el PIN recién validado se cachea localmente (hash SHA-256 + salt) para el fallback offline.
2. **Offline (degradado):** si el `fetch` a `/api/auth/login` falla por red, se compara el PIN contra el hash cacheado en `app_users`. Esto solo funciona para un usuario que ya inició sesión online al menos una vez **en ese dispositivo**. La sesión resultante no trae un JWT válido, así que cualquier llamada a `/api/*` seguirá devolviendo 401 hasta volver a autenticarse online.

Ver [api/auth/login.ts](api/auth/login.ts) y [api/_lib/auth.ts](api/_lib/auth.ts) para la validación server-side.

## Sincronización (`src/utils/sync.ts`)

```
syncAll()
  ├─ pushPendingReports()        POST /api/reports por cada informe con _syncStatus !== 'synced'
  ├─ pushPendingServiceOrders()  POST /api/service-orders ídem
  ├─ pullReportsFromServer()     GET /api/reports  → merge local (servidor gana)
  └─ pullServiceOrdersFromServer() GET /api/service-orders → merge local
```

**Disparadores** ([initAutoSync](src/utils/sync.ts)):
- Al montar la app (si hay sesión).
- Cada 5 minutos mientras haya conexión (`setInterval`).
- Al recuperar conexión (`window.addEventListener('online', ...)`).

**Resolución de conflictos:** last-write-wins simple — el servidor gana si el registro ya existe (`ON CONFLICT (legacy_id) DO UPDATE` en Postgres, ver `db/schema.sql`). No hay CRDT ni merge de campos individuales.

**Todas las llamadas de `api-client.ts`** (`ReportsAPI`, `ServiceOrdersAPI`, etc.) usan `tryRequest`: si falla la red devuelven `null` en vez de lanzar, así el caller decide seguir mostrando los datos locales.

## Indicador de conexión

`usePWAInstall()` expone `isOnline` (basado en `navigator.onLine` + eventos `online`/`offline`). En la UI: 🟢 "Conectado" / 🟠 "Sin conexión — datos locales disponibles".

## Probar el modo offline

```
DevTools (F12) → Network → checkbox "Offline"
```
1. Crear un informe con la red desconectada → queda `_syncStatus: 'pending'`.
2. Reactivar la red → dentro de los siguientes 5 minutos (o al instante si se dispara el evento `online`) el informe sube y pasa a `'synced'`.

## Endpoints usados por el sync

```
GET/POST /api/reports          GET/DELETE /api/reports/:id
GET/POST /api/service-orders   GET/DELETE /api/service-orders/:id
```
Todos requieren `Authorization: Bearer <token>` — ver [README.md](README.md#autenticación).
