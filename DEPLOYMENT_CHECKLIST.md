# Checklist de Despliegue — Gestión HVAC Pro

Checklist de verificación antes de desplegar a producción (Vercel + Neon).

## 1. Variables de entorno

- [ ] `.env` creado localmente (no versionado — está en `.gitignore`)
- [ ] `GEMINI_API_KEY` — https://aistudio.google.com/apikey
- [ ] `DATABASE_URL` — connection string de Neon (`postgres://...?sslmode=require`)
- [ ] `JWT_SECRET` — string aleatorio de 32+ caracteres (`openssl rand -base64 48`)
- [ ] Las 3 variables cargadas en Vercel → Settings → Environment Variables (Production **y** Preview)

## 2. Build local

- [ ] `npm install` sin errores
- [ ] `npm run lint` (`tsc --noEmit`) sin errores nuevos
- [ ] `npm run build:vercel` completa y genera `dist/`
- [ ] `npm audit` revisado (ver nota sobre `xlsx` sin fix upstream en el README)

## 3. Base de datos (Neon)

- [ ] Proyecto Neon creado, `DATABASE_URL` copiada
- [ ] Extensiones `uuid-ossp` y `pgcrypto` disponibles (las crea `schema.sql`)

**Instalación nueva:**
```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

**Base ya desplegada previamente** (aplica roles nuevos, `rate_limit_events`, siembra usuarios — no borra datos):
```bash
psql "$DATABASE_URL" -f db/migration_001_security.sql
```

- [ ] Verificar tablas: `clients`, `sub_branches`, `users`, `hvac_reports`, `service_orders`, `admin_settings`, `audit_log`, `rate_limit_events`
- [ ] `SELECT email, role FROM users;` devuelve `admin@nbyb.cl` (administrador) y `tecnico@nbyb.cl` (tecnico)
- [ ] PIN de demo (3517 / 1234) cambiado desde el panel de Usuarios antes de dar acceso real

## 4. Google Gemini (OCR)

- [ ] API key generada y restringida a la Generative Language API
- [ ] Probado localmente: `npm run dev` → capturar una placa desde "Nueva OT" u "Nuevo Informe"
- [ ] Rate limit de la app confirmado: 30 reconocimientos/hora por usuario (ver [api/ocr.ts](api/ocr.ts))

## 5. Vercel

- [ ] Repo conectado, framework detectado como Vite
- [ ] Build Command: `npm run build:vercel` · Output: `dist`
- [ ] `functions.api/**/*.ts` en `vercel.json` con runtime `@vercel/node@5.0.0`, memoria 1024MB, timeout 30s
- [ ] Deploy inicial exitoso, URL responde

## 6. Verificación post-deploy

- [ ] Login con `admin@nbyb.cl` funciona (correo → PIN → JWT)
- [ ] Sin token, `curl https://tu-dominio/api/reports` responde **401** (no debe devolver datos)
- [ ] `GET /api/reports` con token válido devuelve datos
- [ ] Crear un informe offline (modo avión) y verificar que sincroniza al reconectar
- [ ] `PUT /api/admin/settings` con un usuario `tecnico` responde **403** (solo administrador)
- [ ] Cabeceras de seguridad presentes en la respuesta (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`)

## 7. Dominio propio (opcional)

- [ ] Dominio agregado en Vercel, CNAME apuntando a `cname.vercel.com`
- [ ] SSL provisionado automáticamente (Let's Encrypt vía Vercel)
- [ ] HTTPS forzado

## Troubleshooting

**Build falla en Vercel**
- Revisar versión de Node (`.nvmrc` pide 22)
- Revisar que todos los imports relativos en `api/**/*.ts` terminen en `.js` (requisito de ESM con `"type": "module"` — ver commit `31c3edf`, causó `ERR_MODULE_NOT_FOUND` en producción)

**Rutas `/api/*` responden 401 inesperado**
- Verificar que el cliente esté enviando `Authorization: Bearer <token>` (lo hace automáticamente [api-client.ts](src/utils/api-client.ts) si hay sesión activa)
- Verificar que `JWT_SECRET` sea el mismo valor en todos los entornos de Vercel

**Conexión a base de datos falla**
- Verificar formato de `DATABASE_URL` (`postgres://...?sslmode=require`)
- Confirmar que el proyecto Neon no esté suspendido (autosuspend en plan free)

**PIN no valida / usuarios no existen**
- Confirmar que se corrió `schema.sql` o `migration_001_security.sql` (ambos siembran `admin@nbyb.cl` / `tecnico@nbyb.cl`)

---

**Nota histórica:** la versión anterior de este checklist recomendaba `db/schema-multitenant.sql` — ese schema nunca se conectó al código y fue eliminado del repo. El único schema real es `db/schema.sql`.
