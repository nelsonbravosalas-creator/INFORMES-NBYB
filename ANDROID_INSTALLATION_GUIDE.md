# Guía de Uso en Android

## Requisitos

| Componente | Requisito |
|---|---|
| Android | 6.0 o superior |
| Navegador | Chrome (recomendado), Samsung Internet, Edge |
| Red | WiFi o datos móviles para el primer acceso; funciona sin red después |

## Acceso desde el navegador

La app **no es (todavía) una PWA instalable** — no hay `manifest.json` ni Service Worker registrados (ver [PWA_OFFLINE_WORKFLOW.md](./PWA_OFFLINE_WORKFLOW.md)). Chrome por lo tanto **no** mostrará el banner automático de instalación. Lo que sí funciona:

### Acceso directo en la pantalla de inicio (atajo, no instalación real)

1. Abrir la URL de la app en Chrome.
2. Tocar el menú **⋮** (tres puntos, arriba a la derecha).
3. Tocar **"Agregar a pantalla de inicio"**.
4. Confirmar el nombre y tocar **"Agregar"**.

Esto crea un ícono que abre la app en una pestaña de Chrome (con barra de direcciones reducida) — no en modo standalone real, y no precarga el app-shell para uso 100% offline desde el primer momento.

## Primer inicio de sesión

1. Abrir la app (o el acceso directo).
2. **Paso 1 — Correo:** ingresar el correo registrado (ej. `admin@nbyb.cl`).
3. **Paso 2 — PIN:** ingresar el PIN numérico de 4 dígitos con el teclado en pantalla.
4. El PIN se envía a `/api/auth/login`; si es correcto, la app entra al dashboard. Si es incorrecto, el teclado vibra/tiembla y pide reintentar.
5. Con conexión, el intento se valida contra el servidor (fuente de verdad). Sin conexión, se compara contra el último PIN validado en ese mismo dispositivo (ver [PWA_OFFLINE_WORKFLOW.md](./PWA_OFFLINE_WORKFLOW.md#autenticación)).

No hay login con contraseña — solo correo + PIN de 4 dígitos.

## Uso offline

- Crear y editar informes/OTs funciona sin red; las fotos y firmas se guardan en IndexedDB (LocalForage).
- El indicador en la parte superior muestra 🟢 **Conectado** o 🟠 **Sin conexión — datos locales disponibles**.
- Al recuperar conexión, los registros pendientes (`_syncStatus: 'pending'`) se suben automáticamente.
- Limitación real: si el navegador nunca cargó la app con red (sin caché de app-shell), **no puede abrirse por primera vez sin conexión**.

## Cerrar sesión

Ícono de logout en el header → confirmar → vuelve a la pantalla de login. La sesión (`auth_session` en LocalForage) se borra; los informes/OTs guardados localmente permanecen.

## Liberar espacio / reiniciar la app

Android → Configuración → Apps → Chrome → Almacenamiento → **Borrar datos del sitio** (o equivalente para el navegador usado). Esto elimina también los informes que no se hayan sincronizado — confirmar que el indicador esté en 🟢 y que no queden registros `pending` antes de hacerlo.

## Problemas comunes

**"No aparece el botón de instalar"**
Esperado — no hay manifest/Service Worker todavía. Usar "Agregar a pantalla de inicio" desde el menú de Chrome.

**"El PIN no valida"**
Revisar conexión: si está offline, solo valida si ese usuario ya inició sesión antes en ese dispositivo. Si está online y el PIN es correcto pero sigue fallando, puede haberse alcanzado el límite de intentos (5 cada 15 minutos) — esperar y reintentar.

**"No sincroniza"**
Revisar el indicador de conexión. Si está en verde y aun así no sincroniza, abrir la consola del navegador (DevTools → Console) para ver el error de red.

**"Las fotos no cargan"**
Verificar espacio de almacenamiento disponible en el dispositivo — las fotos se guardan como base64 en IndexedDB.

---

Ver también: [PWA_OFFLINE_WORKFLOW.md](./PWA_OFFLINE_WORKFLOW.md) para el detalle técnico de sincronización y autenticación.
