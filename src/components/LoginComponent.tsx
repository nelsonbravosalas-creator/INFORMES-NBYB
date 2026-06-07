import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Delete, LogIn, AlertCircle, Check, Loader, Shield } from 'lucide-react';
import { usePWAInstall } from './PWAInstallButton';
import { loginWithPin, initUsersDB } from '../utils/storage';
import { AuthSession } from '../types';

interface LoginProps {
  onLoginSuccess: (session: AuthSession) => void;
}

type LoginStep = 'email' | 'pin';

export default function LoginComponent({ onLoginSuccess }: LoginProps) {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [shakePin, setShakePin] = useState(false);
  const { isOnline } = usePWAInstall();

  // Inicializar DB de usuarios al montar
  useEffect(() => {
    initUsersDB().catch(console.error);
  }, []);

  // Auto-submit cuando se completan 4 dígitos
  useEffect(() => {
    if (pin.length === 4) {
      handlePinSubmit();
    }
  }, [pin]);

  // Teclado físico para el PIN (cuando step === 'pin')
  useEffect(() => {
    if (step !== 'pin') return;
    const handleKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key) && pin.length < 4) {
        setPin(prev => prev + e.key);
        setError('');
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
        setError('');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [step, pin]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Ingresa tu correo electrónico');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Correo electrónico inválido');
      return;
    }
    setError('');
    setStep('pin');
  };

  const handlePinSubmit = useCallback(async () => {
    if (pin.length < 4 || isLoading) return;
    setIsLoading(true);
    setError('');

    try {
      const session = await loginWithPin(email, pin);
      if (!session) {
        // PIN incorrecto — animar y limpiar
        setShakePin(true);
        setTimeout(() => {
          setShakePin(false);
          setPin('');
        }, 600);
        setError('PIN incorrecto. Intenta de nuevo.');
        setIsLoading(false);
        return;
      }
      // Login exitoso
      onLoginSuccess(session);
    } catch (err) {
      console.error('[Login] Error:', err);
      setError('Error al iniciar sesión. Intenta de nuevo.');
      setPin('');
      setIsLoading(false);
    }
  }, [pin, email, isLoading, onLoginSuccess]);

  const handleNumpadPress = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleDemoAdmin = async () => {
    setEmail('admin@nbyb.cl');
    setStep('pin');
    setPin('3517');
  };

  const handleDemoTecnico = async () => {
    setEmail('tecnico@nbyb.cl');
    setStep('pin');
    setPin('1234');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1 tracking-tight uppercase">
            GESTIÓN HVAC PRO
          </h1>
          <p className="text-xs text-zinc-400">Sistema NBYB — Informes & Diagnóstico</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">

          {/* Tabs de paso */}
          <div className="flex border-b border-slate-700">
            <div className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
              step === 'email' ? 'text-violet-400 border-b-2 border-violet-500' : 'text-zinc-500'
            }`}>
              1. Correo
            </div>
            <div className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
              step === 'pin' ? 'text-violet-400 border-b-2 border-violet-500' : 'text-zinc-500'
            }`}>
              2. PIN
            </div>
          </div>

          <div className="p-6">
            {/* ── PASO 1: Email ── */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wider">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="usuario@empresa.cl"
                      autoComplete="email"
                      autoFocus
                      className="w-full pl-9 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition text-sm"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-900/50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="text-xs text-rose-300">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold rounded-xl transition-all duration-200 text-sm uppercase tracking-wider shadow-lg shadow-violet-500/25 active:scale-95"
                >
                  Continuar
                </button>
              </form>
            )}

            {/* ── PASO 2: PIN Numpad ── */}
            {step === 'pin' && (
              <div className="space-y-5">
                {/* Email actual */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-xs text-zinc-400 truncate max-w-[160px]">{email}</span>
                  </div>
                  <button
                    onClick={() => { setStep('email'); setPin(''); setError(''); }}
                    className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition"
                  >
                    Cambiar
                  </button>
                </div>

                {/* Título PIN */}
                <div className="text-center">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
                    Ingresa tu PIN de 4 dígitos
                  </p>

                  {/* Indicadores de dígitos */}
                  <div
                    className={`flex justify-center gap-4 mb-1 transition-transform ${shakePin ? 'animate-shake' : ''}`}
                    style={shakePin ? { animation: 'shake 0.5s ease-in-out' } : {}}
                  >
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                          i < pin.length
                            ? 'bg-violet-500 border-violet-500 scale-110'
                            : 'bg-transparent border-slate-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Error PIN */}
                {error && (
                  <div className="flex items-center justify-center gap-2 p-2.5 bg-rose-950/40 border border-rose-900/50 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="text-xs text-rose-300">{error}</span>
                  </div>
                )}

                {/* Teclado Numérico */}
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                    <button
                      key={digit}
                      onClick={() => handleNumpadPress(String(digit))}
                      disabled={isLoading || pin.length >= 4}
                      className="h-14 text-xl font-bold text-white bg-slate-700/60 hover:bg-slate-600/80 active:bg-violet-600/50 active:scale-95 rounded-xl border border-slate-600/50 hover:border-slate-500 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none"
                    >
                      {digit}
                    </button>
                  ))}
                  {/* Fila final: Borrar / 0 / Confirmar */}
                  <button
                    onClick={handleBackspace}
                    disabled={isLoading || pin.length === 0}
                    className="h-14 flex items-center justify-center text-zinc-400 hover:text-white bg-slate-700/40 hover:bg-slate-600/60 active:scale-95 rounded-xl border border-slate-600/30 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed select-none"
                    aria-label="Borrar"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleNumpadPress('0')}
                    disabled={isLoading || pin.length >= 4}
                    className="h-14 text-xl font-bold text-white bg-slate-700/60 hover:bg-slate-600/80 active:bg-violet-600/50 active:scale-95 rounded-xl border border-slate-600/50 hover:border-slate-500 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none"
                  >
                    0
                  </button>
                  <button
                    onClick={handlePinSubmit}
                    disabled={isLoading || pin.length < 4}
                    className="h-14 flex items-center justify-center bg-gradient-to-br from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 active:scale-95 rounded-xl border border-violet-400/30 transition-all duration-150 disabled:from-slate-600 disabled:to-slate-500 disabled:cursor-not-allowed select-none shadow-lg shadow-violet-500/20"
                    aria-label="Confirmar PIN"
                  >
                    {isLoading
                      ? <Loader className="w-5 h-5 text-white animate-spin" />
                      : <Check className="w-5 h-5 text-white" />
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Estado de conexión */}
        <div className={`mt-4 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-semibold mx-auto w-fit ${
          isOnline
            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
            : 'bg-orange-950/40 text-orange-400 border border-orange-500/20 animate-pulse'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-orange-400'}`} />
          {isOnline ? 'Conectado' : 'Sin conexión — datos locales disponibles'}
        </div>

        {/* Demo logins */}
        <div className="mt-5 bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider text-center mb-3">
            Acceso de demostración
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDemoAdmin}
              className="py-2 px-3 bg-violet-900/30 hover:bg-violet-800/40 border border-violet-700/30 rounded-lg text-xs text-violet-300 font-semibold transition active:scale-95"
            >
              👤 Administrador<br />
              <span className="text-violet-500 font-mono">PIN: 3517</span>
            </button>
            <button
              onClick={handleDemoTecnico}
              className="py-2 px-3 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-700/30 rounded-lg text-xs text-blue-300 font-semibold transition active:scale-95"
            >
              🔧 Técnico<br />
              <span className="text-blue-500 font-mono">PIN: 1234</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSS para animación de shake */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
