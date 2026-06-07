import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Check, Wifi, WifiOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ── Estado compartido del prompt (singleton) ─────────────────
let _deferredPrompt: BeforeInstallPromptEvent | null = null;
let _listeners: Array<(p: BeforeInstallPromptEvent | null) => void> = [];

function notifyListeners(p: BeforeInstallPromptEvent | null) {
  _deferredPrompt = p;
  _listeners.forEach(fn => fn(p));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    notifyListeners(e as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => {
    notifyListeners(null);
  });
}

// ── Hook compartido ───────────────────────────────────────────
export function usePWAInstall() {
  const [isInstalled, setIsInstalled] = useState(
    typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
  );
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(_deferredPrompt);

  useEffect(() => {
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Suscribirse a cambios del prompt
    const listener = (p: BeforeInstallPromptEvent | null) => setDeferredPrompt(p);
    _listeners.push(listener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      _listeners = _listeners.filter(fn => fn !== listener);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        notifyListeners(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[PWA] Install error:', err);
      return false;
    }
  };

  return { isInstalled, isOnline, canInstall: !!deferredPrompt && !isInstalled, triggerInstall };
}

// ── Botón de instalación en el HEADER (inline, compacto) ─────
export function PWAHeaderInstallButton() {
  const { isInstalled, canInstall, triggerInstall } = usePWAInstall();
  const [installed, setInstalled] = useState(false);

  if (isInstalled || installed) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 font-semibold">
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">App instalada</span>
      </div>
    );
  }

  if (!canInstall) return null;

  return (
    <button
      onClick={async () => {
        const ok = await triggerInstall();
        if (ok) setInstalled(true);
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 active:scale-95 text-white rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 shadow-md shadow-violet-500/30 border border-violet-400/20"
      title="Instalar HVAC Pro como aplicación"
    >
      <Download className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Instalar App</span>
      <span className="sm:hidden">App</span>
    </button>
  );
}

// ── Botón flotante (bottom-right) — legacy, mantenido ────────
export default function PWAInstallButton() {
  const { isInstalled, canInstall, triggerInstall } = usePWAInstall();

  if (isInstalled || !canInstall) return null;

  return (
    <button
      onClick={triggerInstall}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-violet-400/30 font-bold text-sm"
      title="Instalar como aplicación"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Descargar App</span>
      <span className="sm:hidden">App</span>
    </button>
  );
}

// ── Indicador Online/Offline ──────────────────────────────────
export function OnlineIndicator() {
  const { isOnline } = usePWAInstall();

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
      isOnline
        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
        : 'bg-orange-950/40 text-orange-300 border border-orange-500/20 animate-pulse'
    }`}>
      {isOnline
        ? <Wifi className="w-3 h-3" />
        : <WifiOff className="w-3 h-3" />
      }
      <span className="hidden md:inline">{isOnline ? 'En línea' : 'Sin conexión'}</span>
    </div>
  );
}
