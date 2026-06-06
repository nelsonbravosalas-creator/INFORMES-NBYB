# Android Installation Guide - INFORMES-NBYB PWA

## 📱 System Requirements

| Component | Requirement |
|-----------|------------|
| **Android Version** | 6.0 (API 23) or higher |
| **Browser** | Chrome, Firefox, Samsung Internet, Edge |
| **Storage** | ~50MB for app + cache |
| **Screen** | 4.7" or larger (phone or tablet) |
| **Network** | WiFi or mobile data (app works offline) |

---

## 🚀 Installation Methods

### Method 1: Chrome Install Prompt (Recommended)

**What is this?**
When you visit INFORMES-NBYB in Chrome, the browser detects it's a PWA and shows an install prompt.

**Steps:**
1. **Open Chrome browser**
   - Tap the Chrome icon on your phone home screen
   
2. **Visit the app URL**
   - Type or paste: `https://informes-nbyb.vercel.app` (or your domain)
   - Wait for the page to fully load
   
3. **Look for Install Prompt**
   - 📲 You should see a card/banner in the address bar or a button floating on the screen
   - It says "Descargar App" with a download icon
   
4. **Tap "Descargar App"**
   - This opens an installation dialog
   - Shows app name, icon, and permissions requested
   
5. **Tap "Instalar"**
   - Confirms you want to install the app
   - Chrome downloads the app shell
   
6. **Wait for Installation**
   - You'll see a loading indicator
   - Installation takes 5-10 seconds
   
7. **App Added to Home Screen**
   - New icon appears on your home screen with name "INFORMES"
   - Tap to launch the app

**Verification:**
- ✅ App opens in full-screen mode (no address bar)
- ✅ Title bar shows violet theme color (#7c3aed)
- ✅ Tapping system back button exits the app

---

### Method 2: Chrome Menu (Add to Home Screen)

**What is this?**
Manual method if the install prompt doesn't appear.

**Steps:**
1. **Open the app in Chrome**
   - Navigate to INFORMES-NBYB URL
   
2. **Tap Chrome Menu**
   - Three dots **⋮** in top-right corner
   
3. **Select "Instalar aplicación"**
   - Look for option: "Instalar aplicación" or "Install app"
   - Some Chrome versions say "Add to home screen"
   
4. **Confirm Installation**
   - Dialog appears with app details
   - Tap **"Instalar"** or **"Add"**
   
5. **Wait for Completion**
   - Chrome saves the app to home screen
   - You may see a confirmation toast
   
6. **App Ready**
   - New icon on home screen labeled "INFORMES"
   - Ready to launch

**Troubleshooting:**
- **Can't find the option?**
  - Menu might say "Agregar a pantalla de inicio" (Spanish)
  - Or simply "Instalar"
- **Option grayed out?**
  - App might not meet PWA requirements
  - Check: HTTPS, manifest.json, service worker
- **Already installed?**
  - Menu shows "Abrir aplicación" instead of install

---

### Method 3: Firefox (Add-on Method)

**What is this?**
Firefox has a slightly different PWA installation process.

**Steps:**
1. **Open in Firefox**
   - Use Firefox browser on Android
   
2. **Navigate to App URL**
   - Type or paste INFORMES-NBYB URL
   
3. **Tap Menu**
   - Three lines **≡** in bottom-right corner
   
4. **Select "Instalar"**
   - Firefox shows "Install" option for PWAs
   
5. **Confirm**
   - App adds to home screen
   - Firefox shows confirmation

**Verification:**
- Works same as Chrome
- Firefox icon shows app was installed via Firefox

---

### Method 4: Samsung Internet Browser

**What is this?**
Samsung's browser has excellent PWA support.

**Steps:**
1. **Open Samsung Internet**
   - Pre-installed on Samsung devices
   
2. **Navigate to App**
   - Visit INFORMES-NBYB URL
   
3. **Tap Menu**
   - Three dots **⋮** in bottom-right
   
4. **Select "Add to home screen"**
   - Samsung Internet option for PWAs
   
5. **Confirm**
   - Choose name and icon
   - Tap "Add"

**Advantage:**
- Samsung Internet is optimized for PWAs
- Faster performance on Samsung devices
- Better offline support

---

### Method 5: Edge Browser (Mobile)

**What is this?**
Microsoft Edge for Android has PWA support.

**Steps:**
1. **Open Microsoft Edge**
   - Download from Play Store if not installed
   
2. **Navigate to App URL**
   - Visit INFORMES-NBYB URL
   
3. **Tap Menu**
   - Three dots **⋮** button
   
4. **Select "Install app" or "Add to home screen"**
   - Edge shows the option
   
5. **Confirm Installation**
   - Edge completes the install

---

## 📋 First Launch Checklist

After installation, verify everything works:

- [ ] **App launches in full-screen mode** (no browser UI)
- [ ] **Theme color is violet** (#7c3aed)
- [ ] **App icon shows on home screen**
- [ ] **App name is "INFORMES"**
- [ ] **Can login with credentials**
- [ ] **Data loads correctly**
- [ ] **Works when WiFi is disconnected**
- [ ] **No app store required** (native PWA)

---

## 🔌 Offline Functionality

### How Offline Mode Works

Once installed and accessed, INFORMES-NBYB:

1. **Caches essential assets**
   - App shell (HTML, CSS, JavaScript)
   - Images and icons
   - First few reports/orders

2. **Works without internet**
   - Create new reports offline
   - View previously cached reports
   - All data stored locally on phone

3. **Auto-syncs when online**
   - Detects connection restoration
   - Uploads pending reports
   - Downloads server updates

### Testing Offline Mode

**Method 1: Airplane Mode**
1. Swipe down from top (quick settings)
2. Tap "Airplane mode" to enable
3. App still works normally
4. Turn off airplane mode
5. App auto-syncs in background

**Method 2: WiFi Toggle**
1. Disable WiFi from quick settings
2. Keep mobile data off
3. App uses cached data
4. Re-enable WiFi to sync

---

## 🔑 Login & Session Management

### First Time Login

1. **Open the installed app**
   - Tap icon on home screen
   - App launches in standalone mode

2. **See Login Screen**
   - Shows INFORMES-NBYB header with H logo
   - Email and password fields
   - Demo login button

3. **Enter Credentials**
   - Email: your@company.cl
   - Password: your_password

4. **Tap "Ingresar al Sistema"**
   - App starts syncing
   - See progress bar (0% → 100%)
   - Status: "Descargando datos..."

5. **Wait for Sync Complete**
   - Progress reaches 100%
   - Status: "Sincronización completada ✓"
   - App loads dashboard

### Session Persistence

- 🔐 Login credentials stored locally (encrypted recommended)
- 📍 Session stays active even after closing app
- 🚪 Logout removes session automatically
- 🔄 New login triggers fresh sync

### Logout

**How to logout:**
1. Open app
2. Tap logout icon (door 🚪) in top-right
3. Confirm "¿Cerrar sesión?"
4. App returns to login screen
5. All session data cleared

---

## 💾 Storage & Data Management

### Local Storage Usage

INFORMES-NBYB stores data locally on your device:

| Data Type | Storage | Size |
|-----------|---------|------|
| Reports | IndexedDB | ~5-10MB |
| Service Orders | IndexedDB | ~3-5MB |
| Settings | IndexedDB | ~1MB |
| Cache Images | Cache API | ~10-20MB |
| App Assets | Cache API | ~5MB |
| **Total** | | ~30-40MB |

### Clear App Data

If you need to reset the app:

1. **Open Android Settings**
2. Go to **Apps** → **INFORMES**
3. Tap **Storage and cache**
4. Tap **Clear Storage** (removes all data)
5. Tap **Clear Cache** (removes cached images)

**Warning:** This logs you out and deletes all local reports!

---

## 🎮 Using the App

### Main Navigation

**After login, you see:**
- 📊 Dashboard with stats
- 📝 "Nuevo Informe" button (create reports)
- 📋 "Nueva OT" button (create service orders)
- ⚙️ "Administrar" button (settings)

### Creating Reports on Mobile

**Layout is optimized for phone:**
- 📱 Single column on small screens
- 🔘 Large touch targets (buttons, inputs)
- ⌨️ Virtual keyboard auto-shows
- 🖼️ Full-screen camera access
- 👆 Swipe to navigate sections

### Taking Photos

**Camera integration:**
1. Tap **"+ Agregar Fotos"** in section 4
2. Choose: **Camera** (take new) or **Gallery** (existing)
3. Capture photo of equipment
4. Add description (optional)
5. Photo stored with report

---

## 🔧 Troubleshooting

### Issue: "Installation not available"

**Causes:**
- ❌ Not using Chrome/Firefox/Samsung Internet
- ❌ App not loading HTTPS
- ❌ Browser too old

**Solution:**
- Update browser to latest version
- Check URL is `https://` (not `http://`)
- Try different browser (Chrome recommended)

---

### Issue: App won't sync

**Causes:**
- ❌ No internet connection
- ❌ Server is down
- ❌ Sync endpoint misconfigured

**Solution:**
1. Check connection (WiFi or mobile data)
2. Look at online indicator (green or orange)
3. Open browser DevTools → Console for errors
4. Try manual sync (wait 5 seconds)

---

### Issue: "Service Worker failed to register"

**Causes:**
- ❌ Not HTTPS
- ❌ Service worker script missing
- ❌ Browser doesn't support SW

**Solution:**
1. Verify URL is secure (https://)
2. Hard refresh: Swipe down 3 times (Chrome)
3. Clear browser cache → try again

---

### Issue: App keeps logging out

**Causes:**
- ❌ Session cookie expired
- ❌ LocalForage cleared
- ❌ Browser data wiped

**Solution:**
1. Check device storage isn't full
2. Don't clear app data manually
3. Update the app (new version may fix)

---

### Issue: Photos not loading

**Causes:**
- ❌ Cache cleared
- ❌ Storage full (no space for images)
- ❌ Old cached images deleted

**Solution:**
1. Check storage: Settings → Storage → Free up space
2. Clear browser cache carefully (doesn't delete app data)
3. Re-sync to download fresh cache

---

### Issue: "App keeps crashing"

**Causes:**
- ❌ Low device memory (RAM)
- ❌ Too many reports loaded
- ❌ Browser bug

**Solution:**
1. Close other apps
2. Restart the device
3. Update Android to latest version
4. Try different browser

---

## 🌐 Connection Indicators

### Status Bar in App

**Top-right shows connection status:**

🟢 **En línea (Online)**
- Connected to internet
- Sync is active
- Data will upload automatically

🟠 **Sin conexión (Offline - pulsing)**
- No internet connection
- App uses cached data
- Changes stored locally
- Will sync when connected

---

## 📊 Viewing Sync Status

### During Login

Shows real-time sync progress:
- "Iniciando sincronización..." (0%)
- "Descargando datos..." (50%)
- "Sincronización completada ✓" (100%)

### In Dashboard

- Green indicator = synced
- Orange indicator = offline (pending sync)
- Each report shows its sync status

---

## 🎨 Customization

### Change Theme (Optional)

**Dark Mode / Light Mode:**
1. Tap moon icon 🌙 (dark) or sun ☀️ (light)
2. App theme changes immediately
3. Preference saved locally

---

## 📞 Support & Troubleshooting

If you experience issues:

1. **Check internet connection**
   - Online indicator should be green
   - Try WiFi if on mobile data

2. **Look at browser console**
   - Chrome: DevTools → Console
   - Check for error messages

3. **Try a different browser**
   - Some versions have better PWA support
   - Chrome is most reliable

4. **Contact support**
   - Provide: Browser, Android version, error message
   - Include screenshot of issue

---

## ✅ Success Indicators

**You've successfully installed INFORMES-NBYB when:**

- ✅ App icon on home screen
- ✅ Launches in full-screen mode
- ✅ Can login with email/password
- ✅ Online indicator shows in header
- ✅ Can create reports offline
- ✅ Reports sync automatically
- ✅ Takes photos with camera
- ✅ No address bar when running

---

## 📚 Learn More

- [PWA Offline Workflow](./PWA_OFFLINE_WORKFLOW.md)
- [Service Worker Documentation](./PWA_OFFLINE_WORKFLOW.md#-service-worker-operations)
- [API Reference](./NEON_DB_MAPPING.md)

---

**Version**: 1.0
**Last Updated**: 2026-06-06
**Browser Support**: Chrome 51+, Firefox 55+, Samsung Internet 5+, Edge 79+
