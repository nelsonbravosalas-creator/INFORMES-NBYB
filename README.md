# Gestión HVAC Pro (INFORMES-NBYB)

Aplicación de terreno para técnicos HVAC: informes de mantenimiento y órdenes de servicio, con captura de datos offline (LocalForage) y sincronización a Neon PostgreSQL cuando hay conexión. Incluye reconocimiento de placas de equipos vía Gemini AI (OCR).

## Enlaces

- [Guía de instalación en Android](./ANDROID_INSTALLATION_GUIDE.md)
- [Arquitectura offline y sincronización](./PWA_OFFLINE_WORKFLOW.md)
- [Checklist de despliegue](./DEPLOYMENT_CHECKLIST.md)

## Stack

| Componente | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| Almacenamiento local | LocalForage (IndexedDB) |
| Backend (dev/self-host) | Express (`server.ts`) |
| Backend (producción) | Vercel Serverless Functions (`api/**`) |
| Base de datos | Neon PostgreSQL (`@neondatabase/serverless`) |
| Autenticación | JWT firmado server-side + bcrypt (PIN de 4 dígitos) |
| OCR de placas | Google Gemini (`@google/genai`) |
| Export | jsPDF + html2canvas (PDF), XLSX (Excel) |

## Arquitectura

```
React (Vite) ──┬── LocalForage (offline-first: informes, OTs, sesión)
                └── fetch /api/*  ──►  Vercel Functions ──► Neon PostgreSQL
                                            │
                                            └── Google Gemini (OCR)
```

No hay Service Worker ni `manifest.json` implementados todavía — "instalar" la app hoy es un acceso directo genérico del navegador (ver [ANDROID_INSTALLATION_GUIDE.md](./ANDROID_INSTALLATION_GUIDE.md)), no una PWA instalable con caché de app-shell. Lo que sí es 100% real es el modo offline vía LocalForage: crear/editar informes y OTs sin red, con sync automático al volver la conexión (ver [PWA_OFFLINE_WORKFLOW.md](./PWA_OFFLINE_WORKFLOW.md)).

## Autenticación

- Login en dos pasos: correo → PIN numérico de 4 dígitos.
- `POST /api/auth/login` valida contra la tabla `users` (bcrypt) y emite un JWT de 8h ([api/auth/login.ts](api/auth/login.ts)).
- Toda ruta `/api/*` exige `Authorization: Bearer <token>` — sin token válido responde 401.
- Roles: `administrador`, `supervisor`, `tecnico`, `contratista`. Borrar informes/OTs y editar configuración global requiere `administrador`/`supervisor`.
- Si no hay red, el login cae a un PIN cacheado localmente (offline-only): permite ver datos locales, pero no puede llamar a la API real hasta volver a autenticarse online.
- Login por PIN limitado a 5 intentos/15min por cuenta y 20/15min por IP (`rate_limit_events` en Postgres).

## Base de datos

Único schema real: [db/schema.sql](db/schema.sql) (`clients`, `sub_branches`, `users`, `hvac_reports`, `service_orders`, `admin_settings`, `audit_log`, `rate_limit_events`).

```bash
# Instalación nueva
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql

# Sobre una base ya desplegada (aditivo, no destructivo)
psql "$DATABASE_URL" -f db/migration_001_security.sql
```

## Desarrollo local

**Requisitos:** Node 22 (ver `.nvmrc`).

```bash
npm install
cp .env.example .env   # completar GEMINI_API_KEY, DATABASE_URL, JWT_SECRET
npm run dev             # http://localhost:3000
```

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor Express + Vite en modo desarrollo |
| `npm run build` | Build de Vite + bundle de `server.ts` a `dist/server.cjs` (self-host) |
| `npm run build:vercel` | Build de Vite para despliegue en Vercel |
| `npm run build:mobile` | Build single-file para empaquetar como app móvil |
| `npm run db:init` | Aplica `schema.sql` + `seed.sql` contra `$DATABASE_URL` |
| `npm start` | Sirve `dist/server.cjs` (producción self-host) |
| `npm run lint` | `tsc --noEmit` |

## Estructura

```
api/                    # Vercel Functions
├── _lib/                 # db.ts (Neon), auth.ts (JWT), rateLimit.ts, audit.ts
├── auth/login.ts
├── users/                 # CRUD de usuarios (admin)
├── reports/, service-orders/, admin/settings.ts, ocr.ts
db/
├── schema.sql             # schema real, usado por api/_lib/db.ts
├── migration_001_security.sql
└── seed.sql
src/
├── components/            # LoginComponent, ReportForm, ServiceOrderForm, UsersModal, ...
├── utils/                  # storage.ts (LocalForage), sync.ts, api-client.ts, pdf.ts, excel.ts
server.ts               # Express (dev / self-host)
vercel.json             # Config de Vercel (functions, headers, rewrites)
```

## Seguridad

Cabeceras de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS), errores genéricos al cliente (el detalle solo se loguea server-side), exportes a PDF/HTML con escape de HTML (evita XSS almacenado vía informes/OTs), y registro de auditoría en `audit_log` para login, creaciones, ediciones y borrados.

Vulnerabilidad conocida sin fix upstream: `xlsx` (prototype pollution / ReDoS, ver `npm audit`) — usado en [src/utils/excel.ts](src/utils/excel.ts) para import/export de Excel.

## Licencia

Copyright © 2026 NBYB. Todos los derechos reservados.
