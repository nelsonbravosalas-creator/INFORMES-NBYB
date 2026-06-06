# PWA Offline-First Workflow Documentation

## 📱 Overview

INFORMES-NBYB is a Progressive Web App (PWA) designed for HVAC field technicians with difficult network access. The app uses an **offline-first** architecture where:

1. **All data is stored locally** in IndexedDB via LocalForage
2. **Works completely offline** without internet connection
3. **Auto-syncs with server** when connection is available
4. **Can be installed** on Android home screen like a native app
5. **Service Worker handles caching** for instant loading and offline capability

---

## 🔑 Key Features

### Offline-First Architecture
- ✅ Create reports/service orders without internet
- ✅ All data persists in browser storage (IndexedDB)
- ✅ Automatic sync when connection returns
- ✅ No data loss during network interruptions
- ✅ Background sync on connection restore

### PWA Installation
- 📲 Install on Android home screen
- 🚀 Launch like a native app (standalone mode)
- 🎨 App icon, splash screen, theme color
- 📴 Works offline (with cached data)
- 🔄 Auto-updates when new version available

### Service Worker Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│ REQUEST TYPE                                            │
├─────────────────────────────────────────────────────────┤
│ Static Assets (JS/CSS/HTML)   → CACHE-FIRST            │
│ Images (.png, .jpg, .svg)     → CACHE-FIRST            │
│ API Calls (/api/*)            → NETWORK-FIRST          │
│ Other                         → NETWORK-FIRST + CACHE  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication & Session Management

### Login Flow

```mermaid
User Opens App
        ↓
[Check LocalForage for auth_email & auth_tenant_id]
        ↓
    ┌───┴────────┐
    ↓            ↓
Session Found   No Session
    ↓            ↓
Dashboard    LoginComponent
             ↓
          [Enter Credentials]
             ↓
          [Store in LocalForage]
             ↓
          [Trigger syncAll()]
             ↓
        [Sync Progress]
             ↓
          Dashboard
```

### Stored Authentication Data

Located in **LocalForage** (IndexedDB):

```typescript
{
  auth_email: "tech@empresa.cl"
  auth_tenant_id: "uuid-..."
  auth_token: "token_..."
}
```

**Security Note**: For production, implement JWT tokens and encrypted storage.

---

## 🔄 Sync Workflow

### Automatic Sync Triggers

1. **On App Startup** → Immediate sync when user logs in
2. **Every 5 Minutes** → Periodic sync if online (if enabled)
3. **On Connection Restore** → Sync when device reconnects to internet
4. **Manual Trigger** → User can manually sync (future enhancement)

### Sync Process (Push-First Strategy)

```
syncAll()
  ├─ Push Pending Reports
  │   ├─ Find all reports with _syncStatus = 'pending'
  │   ├─ POST /api/service-orders to server
  │   └─ Mark as _syncStatus = 'synced'
  │
  ├─ Push Pending Service Orders
  │   ├─ Find all OTs with _syncStatus = 'pending'
  │   ├─ POST /api/service-orders to server
  │   └─ Mark as _syncStatus = 'synced'
  │
  ├─ Pull Reports from Server
  │   ├─ GET /api/reports
  │   └─ Merge with local (server wins on conflict)
  │
  └─ Pull Service Orders from Server
      ├─ GET /api/service-orders
      └─ Merge with local (server wins on conflict)
```

### Conflict Resolution

When a record exists both locally and remotely:
- **Last-Write-Wins (LWW)**: Server version overwrites local if newer
- **Pending vs Synced**: Pending changes pushed before pulling remote
- **Multi-Technician**: Future CRDT implementation for collaborative editing

---

## 📱 Android Installation Guide

### Prerequisites
- Android device with Chrome, Firefox, or Samsung Internet browser
- Manifest.json properly configured
- HTTPS domain (or localhost for testing)

### Installation Steps

**Method 1: Install Prompt**
1. Open app in Chrome browser
2. Wait for "Install" button (floating bottom-right)
3. Tap "Descargar App" button
4. Confirm "Install"
5. App appears on home screen as standalone icon

**Method 2: Chrome Menu**
1. Open app in Chrome
2. Tap **⋮ (Menu)**
3. Select **"Install app"** or **"Add to home screen"**
4. Confirm installation
5. App launches in full-screen mode

**Method 3: PWA Shortcut**
1. Long-press on home screen
2. Select **"Widgets"** → **"Shortcuts"**
3. Find **INFORMES-NBYB**
4. Drag to home screen
5. Tap to launch

### Verification
- App runs in **standalone mode** (no address bar)
- Title bar shows app theme color (#7c3aed violet)
- Tap system back button exits the app
- Works offline with cached data

---

## 🔋 Local Storage Structure

### LocalForage Keys (IndexedDB)

```typescript
// Authentication
"auth_email"              → string
"auth_tenant_id"          → string
"auth_token"              → string

// Data Storage
"hvac_reports"            → HVACReport[]
"service_orders"          → ServiceOrderReport[]
"admin_settings"          → AdminSettings

// Sync Status (embedded in records)
report._syncStatus        → "pending" | "synced" | "error"
order._syncStatus         → "pending" | "synced" | "error"
```

---

## 📤 Service Worker Operations

### Installation Phase

When app first runs, Service Worker:
1. **Caches static assets** (HTML, CSS, JS, manifest.json, favicon)
2. **Registers routes** for fetch interception
3. **Activates immediately** with `skipWaiting()`

### Fetch Interception

```javascript
// For JS/CSS/HTML: Cache-first strategy
if (url.includes('.js') || url.includes('.css')) {
  Try cache first → Fallback to network → Fallback to /index.html
}

// For Images: Cache-first with network fallback
if (url.includes('.png') || url.includes('.jpg')) {
  Try cache → Fallback to network → Return 404
}

// For API calls: Network-first strategy
if (url.includes('/api/')) {
  Try network → Fallback to cache → Return 503 error
}
```

### Background Sync Events

```javascript
// When connection returns, fire background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    Notify clients to push pending reports
  }
  if (event.tag === 'sync-orders') {
    Notify clients to push pending orders
  }
});
```

---

## 🔌 Network Status Indicators

### Online Indicator Component

Located in header shows:
- 🟢 **En línea** (green) - Internet available
- 🟠 **Sin conexión** (orange, pulsing) - No internet

The app continues working normally in both states:
- **Online**: Sync enabled, API calls work
- **Offline**: All data from cache, changes marked as pending

---

## 📊 Data Sync Monitoring

### Sync Progress States

1. **idle** → No sync in progress
2. **syncing** → Active sync with progress bar (0-100%)
3. **complete** → Sync finished successfully ✓
4. **error** → Sync failed (user can retry)

### Failed Sync Handling

If sync fails:
- ❌ Reports remain marked as `_syncStatus = 'error'`
- 🔄 Auto-retry every 5 minutes
- 📱 User notification on connection return
- 💾 Data is **never lost** (stays in LocalForage)

---

## 🚀 Development & Testing

### Test Offline Mode

**Chrome DevTools:**
1. Open **DevTools** (F12)
2. Go to **Network** tab
3. Check **"Offline"** checkbox
4. App continues working with cached data

**Service Worker Inspection:**
1. Open **DevTools** → **Application** tab
2. Click **"Service Workers"**
3. See registered service worker
4. View cache contents in **Cache Storage**

### Test PWA Installation

```bash
# Serve over HTTPS (required for PWA)
npm run build
npm run preview  # or use a simple HTTP server

# Mobile: Open https://localhost:5173
# Look for install prompt
```

### Test Sync Workflow

1. Create a report **offline**
2. Check: `_syncStatus = 'pending'`
3. Go back **online**
4. Wait 5 seconds for auto-sync
5. Check: `_syncStatus = 'synced'`

---

## 📝 API Endpoints Used for Sync

### Push Operations (Client → Server)

```
POST /api/reports
{
  id, folio, date, client, diagnostics, ...,
  _syncStatus: "pending"
}
Response: { success: true, id: uuid, sync_version: 1 }

POST /api/service-orders
{
  id, folio, date, serviceType, diagnosticRating, ...,
  _syncStatus: "pending"
}
Response: { success: true, id: uuid, sync_version: 1 }
```

### Pull Operations (Server → Client)

```
GET /api/reports
Response: HVACReport[]

GET /api/service-orders
Response: ServiceOrderReport[]
```

---

## 🛠️ Configuration Files

### manifest.json
- App name, icons, theme colors
- Display mode: `"standalone"` (no browser UI)
- Shortcuts for quick actions
- Share target for image sharing

### service-worker.js
- Cache versioning: `v1-informes-nbyb`
- Fetch strategies per asset type
- Background sync listeners
- Push notification handlers

### index.html
- Service Worker registration script
- Manifest link
- Meta tags for PWA (theme-color, apple-touch-icon)

---

## 🔒 Security Considerations

### Current Implementation (Development)

⚠️ **This is a development implementation. For production:**

1. **Store tokens securely**
   - Use HttpOnly cookies (not localStorage)
   - Implement token refresh mechanism
   - Use JWTs with expiration

2. **Encrypt sensitive data**
   - Customer PII in LocalForage
   - Use crypto-js or libsodium.js

3. **Validate on server**
   - All API requests require authentication
   - Enforce tenant isolation with RLS
   - Rate limit endpoints

4. **HTTPS only**
   - Service Worker requires secure context
   - Prevent man-in-the-middle attacks
   - Use CSP headers

---

## 📚 Related Files

- **Service Worker**: `public/service-worker.js`
- **Install Button**: `src/components/PWAInstallButton.tsx`
- **Login Component**: `src/components/LoginComponent.tsx`
- **Sync Utilities**: `src/utils/sync.ts`
- **App Root**: `src/App.tsx`
- **Manifest**: `public/manifest.json`
- **HTML Entry**: `index.html`

---

## 🎯 Next Steps

### Immediate
- [ ] Test PWA installation on Android Chrome
- [ ] Verify offline mode works
- [ ] Test sync workflow

### Short Term
- [ ] Add sync progress bar to UI
- [ ] Implement manual sync button
- [ ] Add error retry mechanism
- [ ] Create user-friendly sync status

### Medium Term
- [ ] Encrypt LocalForage data
- [ ] Implement JWT token refresh
- [ ] Add conflict resolution UI
- [ ] Support multi-technician sync

### Long Term
- [ ] CRDT for collaborative editing
- [ ] Differential sync (only changed fields)
- [ ] Cloud backup for data safety
- [ ] Analytics and monitoring

---

## 📞 Troubleshooting

**Problem**: App doesn't sync
- **Check**: Is device online? (see indicator)
- **Check**: Are changes marked as _syncStatus = 'pending'?
- **Check**: Service Worker registered? (DevTools → Application)
- **Fix**: Open DevTools console for sync errors

**Problem**: Service Worker not caching
- **Check**: Serving over HTTPS?
- **Check**: Manifest.json linked in index.html?
- **Check**: Cache version in service-worker.js (v1-informes-nbyb)
- **Fix**: Hard refresh (Ctrl+Shift+R) to bypass browser cache

**Problem**: Can't install PWA
- **Check**: Using Chrome/Firefox on Android?
- **Check**: App has manifest.json?
- **Check**: Using HTTPS or localhost?
- **Fix**: Clear browser data and try again

---

**Version**: 1.0 (PWA Offline-First Implementation)
**Last Updated**: 2026-06-06
