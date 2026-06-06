# Plan de Despliegue: INFORMES-NBYB en Vercel + Neon DB

> **Repo destino:** https://github.com/nelsonbravosalas-creator/INFORMES-NBYB
> **Hosting:** Vercel (Frontend + Serverless Functions)
> **Base de datos:** Neon (Postgres serverless)

---

## 🎯 Arquitectura Híbrida (recomendada)

Mantiene la naturaleza **offline-first** original (técnico en terreno sin internet) y agrega capacidades multiusuario en la nube:

```
┌─────────────────────────┐
│  Android / Browser PWA  │
│  ┌───────────────────┐  │
│  │ LocalForage cache │  │  ← Offline 100% funcional
│  └─────────┬─────────┘  │
│            │ sync       │
└────────────┼────────────┘
             ▼
┌─────────────────────────┐
│  Vercel Edge Network    │
│  ┌───────────────────┐  │
│  │  /api/ocr (Gemini)│  │  ← OCR placas equipos
│  │  /api/reports     │  │  ← CRUD informes HVAC
│  │  /api/service-ots │  │  ← CRUD órdenes servicio
│  │  /api/admin       │  │  ← Clientes/Configuración
│  │  /api/auth        │  │  ← Login técnicos (opcional)
│  └─────────┬─────────┘  │
└────────────┼────────────┘
             ▼
┌─────────────────────────┐
│  Neon Postgres          │
│  - reports              │
│  - service_orders       │
│  - clients              │
│  - sub_branches         │
│  - users (técnicos)     │
│  - audit_log            │
└─────────────────────────┘
```

---

## 📋 Pasos del Despliegue

### Fase 1: Migración Git al nuevo repositorio

**Problema actual:** El repo Git padre (`App_HVAC/`) contiene múltiples proyectos. No queremos subir todos al nuevo repo.

**Solución:** Crear repo Git independiente para `hvac-pro-app HTML/` y conectarlo al GitHub remoto.

```powershell
# 1. Crear carpeta destino (fuera de Google Drive para evitar conflictos de sync)
$DEST = "C:\Users\The Pirata\Documents\Dev\INFORMES-NBYB"
New-Item -ItemType Directory -Force -Path $DEST | Out-Null

# 2. Copiar archivos del proyecto (excluyendo node_modules, dist, .git padre)
robocopy "C:\Users\The Pirata\Documents\Google Drive\APPS\App_HVAC\APP. INFORME HVAC\hvac-pro-app HTML" `
         $DEST /E /XD node_modules dist dist-mobile .git .claude

# 3. Inicializar repo nuevo
cd $DEST
git init
git branch -M main
git add .
git commit -m "Initial commit: HVAC Pro App with Service Orders module"

# 4. Conectar al GitHub remoto
git remote add origin https://github.com/nelsonbravosalas-creator/INFORMES-NBYB.git

# 5. Primera subida
git push -u origin main
```

> Si el repo en GitHub ya tiene commits, usa `git pull --rebase origin main` antes del push.

---

### Fase 2: Crear cuenta Neon DB

1. Ir a https://neon.tech → Sign up (con GitHub)
2. Crear proyecto: `informes-nbyb`
3. Región: **US East (más cercana a Vercel default)**
4. Plan: **Free** (3 GB storage, 1 GB transfer/mes — suficiente para empezar)
5. Copiar el **connection string** (formato: `postgres://user:pass@host/db?sslmode=require`)
6. Ejecutar el script `db/schema.sql` desde la consola SQL de Neon

---

### Fase 3: Setup Vercel

1. Ir a https://vercel.com → Sign up con GitHub
2. **Import Project** → seleccionar `nelsonbravosalas-creator/INFORMES-NBYB`
3. **Framework Preset:** Vite (auto-detectado)
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. **Environment Variables:**
   | Variable | Valor |
   |----------|-------|
   | `DATABASE_URL` | (de Neon, con `?sslmode=require`) |
   | `GEMINI_API_KEY` | (tu API key de Google AI Studio) |
   | `JWT_SECRET` | (string aleatorio 32+ chars para sesiones) |
   | `NODE_ENV` | `production` |

7. Click **Deploy**

> Vercel dará URL: `https://informes-nbyb.vercel.app`

---

### Fase 4: Conectar dominio personalizado (opcional)

- En Vercel → **Settings** → **Domains** → agregar `informes.nbyb.cl` o similar
- Configurar registros DNS según indique Vercel

---

## 🗂 Cambios de Código Requeridos

### Estructura de carpetas final

```
INFORMES-NBYB/
├── api/                          # Vercel Serverless Functions
│   ├── ocr.ts                    # POST /api/ocr (Gemini)
│   ├── reports/
│   │   ├── index.ts              # GET/POST /api/reports
│   │   └── [id].ts               # GET/PUT/DELETE /api/reports/:id
│   ├── service-orders/
│   │   ├── index.ts
│   │   └── [id].ts
│   ├── admin/
│   │   └── settings.ts
│   └── _lib/
│       ├── db.ts                 # Cliente Neon (@neondatabase/serverless)
│       └── auth.ts               # JWT helpers (opcional)
├── db/
│   ├── schema.sql                # DDL para Neon
│   ├── seed.sql                  # Datos iniciales (técnicos, marcas)
│   └── migrations/               # Migrations futuras
├── src/
│   ├── components/               # (sin cambios)
│   ├── utils/
│   │   ├── storage.ts            # Wrapper LocalForage (sin cambios)
│   │   ├── api-client.ts         # NUEVO — fetch a /api/*
│   │   └── sync.ts               # NUEVO — sincronización offline ↔ Neon
│   └── App.tsx                   # Mínimas adaptaciones para sync
├── vercel.json                   # Config Vercel
├── .env.example                  # Plantilla de variables
└── DEPLOY-PLAN.md                # Este archivo
```

### Lógica de sincronización (alto nivel)

```typescript
// Al guardar un reporte:
async function saveReport(report) {
  // 1. Guardar inmediatamente en LocalForage (offline-first)
  await localforage.setItem(report.id, { ...report, _syncStatus: 'pending' });

  // 2. Intentar sincronizar con Neon (silenciosamente si falla)
  try {
    if (navigator.onLine) {
      await fetch('/api/reports', { method: 'POST', body: JSON.stringify(report) });
      await localforage.setItem(report.id, { ...report, _syncStatus: 'synced' });
    }
  } catch (e) {
    // Quedará pendiente para sync posterior
  }
}

// Sync periódico al recuperar conexión:
window.addEventListener('online', async () => {
  const pending = await getPendingReports();
  for (const r of pending) {
    await fetch('/api/reports', { method: 'POST', body: JSON.stringify(r) });
  }
});
```

---

## 💾 Schema SQL para Neon

Ver archivo `db/schema.sql` (creado).

Estructura principal:

- `clients` — empresas clientes
- `sub_branches` — sucursales (con FK a clients)
- `users` — técnicos / admins (auth opcional)
- `hvac_reports` — informes de mantenimiento HVAC (JSONB para circuits/checklist)
- `service_orders` — órdenes de servicio (JSONB para evidence)
- `audit_log` — quién hizo qué y cuándo

**Decisión clave:** Datos complejos anidados (circuitos, checklist, evidencias con base64) se almacenan como **JSONB** en lugar de tablas relacionales múltiples. Esto:

- ✅ Mantiene compatibilidad con la estructura TypeScript actual
- ✅ Migración trivial desde LocalForage (mismo JSON)
- ✅ Búsqueda rápida con índices GIN
- ⚠️ Imágenes base64 (firmas, fotos) ocupan espacio — considerar mover a Vercel Blob o S3 si crece mucho

---

## 📊 Costos Estimados (Free Tier)

| Servicio | Free Tier | Cuándo escalar |
|----------|-----------|----------------|
| **Vercel Hobby** | 100 GB transfer, 100K invocaciones serverless | > 50 técnicos activos |
| **Neon Free** | 3 GB storage, 1 proyecto | > 5000 informes con fotos |
| **Gemini API** | Cuota gratuita actual | Según uso OCR |
| **GitHub** | Ilimitado para repos privados | — |

Total inicial: **$0/mes** para empezar.

Escalado típico (~10 técnicos activos, 200 informes/mes con fotos):
- Vercel Pro: $20/mes
- Neon Launch: $19/mes
- **Total ~$40/mes**

---

## 🔐 Consideraciones de Seguridad

1. **Variables de entorno:** Nunca commitear `.env`. Solo `.env.example`.
2. **Conexión SSL a Neon:** Siempre `?sslmode=require` en `DATABASE_URL`.
3. **API Keys:** `GEMINI_API_KEY` solo en backend serverless, nunca expuesta al cliente.
4. **CORS:** Configurar `vercel.json` para que `/api/*` solo acepte el origen del frontend.
5. **Rate limiting:** Considerar Vercel Edge Config o upstash/ratelimit para evitar abuso de OCR.
6. **Auth (Fase 2):** Implementar JWT con técnicos en tabla `users` para multi-tenancy.

---

## 🚦 Estado de Migración

| Tarea | Estado |
|-------|--------|
| Documentación de plan | ✅ Listo |
| `vercel.json` | ✅ Listo |
| `db/schema.sql` | ✅ Listo |
| `.env.example` actualizado | ✅ Listo |
| `api/ocr.ts` (migración de server.ts) | ✅ Listo |
| `api/reports/*` CRUD | ⏳ Stub creado, requiere refinamiento |
| `api/service-orders/*` CRUD | ⏳ Stub creado, requiere refinamiento |
| `src/utils/api-client.ts` | ⏳ Stub creado |
| `src/utils/sync.ts` (offline ↔ online) | 🔲 Pendiente — fase 2 |
| Auth de técnicos | 🔲 Pendiente — fase 3 |
| Migración Git al nuevo repo | 🔲 Requiere ejecución del usuario |
| Setup Neon (consola web) | 🔲 Requiere ejecución del usuario |
| Setup Vercel (consola web) | 🔲 Requiere ejecución del usuario |

---

## 📝 Decisiones de Arquitectura

### ¿Por qué Neon y no Supabase?
- Neon: Postgres puro, branching por feature, escalado a cero (más barato en uso bajo)
- Supabase: trae auth + storage + realtime de fábrica, pero más opinionado

Si en el futuro quieres realtime/auth integrado, Supabase tiene migración trivial desde Neon.

### ¿Por qué JSONB y no tablas relacionales puras?
- Los `circuits`, `checklist`, `evidence` son arrays anidados con estructura variable
- Para reportes, no es necesario JOIN — siempre se consulta el reporte completo
- Si en el futuro quieres analytics (ej: "todos los circuitos con presión baja anormal"), Postgres soporta queries sobre JSONB con índices GIN

### ¿Por qué mantener LocalForage?
- Técnicos en terreno frecuentemente sin señal
- UX más rápido (no espera red)
- Resiliente: si Neon cae, la app sigue funcionando localmente

---

## 🎬 Próximos Pasos Inmediatos

1. **Tú ejecutas:** Script de migración Git (Fase 1) — copia/pega los comandos PowerShell de arriba
2. **Tú ejecutas:** Crear cuenta Neon, copiar `DATABASE_URL`
3. **Tú ejecutas:** Conectar Vercel al repo GitHub
4. **Yo continúo (siguiente sesión):**
   - Refinar API routes con queries SQL reales
   - Implementar `sync.ts` para sincronización offline → Neon
   - Tests E2E del flujo completo
