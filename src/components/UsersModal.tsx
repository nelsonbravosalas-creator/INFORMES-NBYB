import React, { useState, useEffect } from 'react';
import {
  X, UserPlus, Edit3, Trash2, Shield, Wrench, Users, Eye, EyeOff,
  CheckCircle, AlertCircle, Loader, KeyRound, Mail, User, ToggleLeft, ToggleRight
} from 'lucide-react';
import { AppUser, UserProfile } from '../types';
import { getUsers, saveUser, deleteUser, hashPin } from '../utils/storage';

interface UsersModalProps {
  onClose: () => void;
  currentUserId: string;
}

const PROFILE_CONFIG: Record<UserProfile, { label: string; color: string; icon: React.ReactNode }> = {
  administrador: {
    label: 'Administrador',
    color: 'text-violet-400 bg-violet-950/40 border-violet-700/40',
    icon: <Shield className="w-3 h-3" />,
  },
  supervisor: {
    label: 'Supervisor',
    color: 'text-blue-400 bg-blue-950/40 border-blue-700/40',
    icon: <Eye className="w-3 h-3" />,
  },
  tecnico: {
    label: 'Técnico',
    color: 'text-emerald-400 bg-emerald-950/40 border-emerald-700/40',
    icon: <Wrench className="w-3 h-3" />,
  },
  contratista: {
    label: 'Contratista',
    color: 'text-amber-400 bg-amber-950/40 border-amber-700/40',
    icon: <Users className="w-3 h-3" />,
  },
};

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function generateId(): string {
  return `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface UserFormData {
  email: string;
  nombre: string;
  perfil: UserProfile;
  pin: string;
  pinConfirm: string;
}

const EMPTY_FORM: UserFormData = {
  email: '',
  nombre: '',
  perfil: 'tecnico',
  pin: '',
  pinConfirm: '',
};

type ModalView = 'list' | 'form';

export default function UsersModal({ onClose, currentUserId }: UsersModalProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [view, setView] = useState<ModalView>('list');
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const list = await getUsers();
    setUsers(list);
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setError('');
    setSuccess('');
    setView('form');
  };

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      nombre: user.nombre,
      perfil: user.perfil,
      pin: '',
      pinConfirm: '',
    });
    setError('');
    setSuccess('');
    setView('form');
  };

  const handleSave = async () => {
    setError('');

    // Validaciones
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Correo electrónico inválido'); return;
    }
    if (!editingUser && (!form.pin || form.pin.length !== 4 || !/^\d{4}$/.test(form.pin))) {
      setError('El PIN debe ser de 4 dígitos numéricos'); return;
    }
    if (form.pin && form.pin !== form.pinConfirm) {
      setError('Los PINs no coinciden'); return;
    }
    // PIN si se cambió
    if (form.pin && (!/^\d{4}$/.test(form.pin))) {
      setError('El PIN debe ser de 4 dígitos numéricos'); return;
    }

    // Verificar email duplicado
    const allUsers = await getUsers();
    const duplicate = allUsers.find(
      u => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== editingUser?.id
    );
    if (duplicate) { setError('Ya existe un usuario con ese correo'); return; }

    setIsLoading(true);
    try {
      const pinHash = form.pin
        ? await hashPin(form.pin)
        : (editingUser?.pinHash || '');

      const user: AppUser = {
        id: editingUser?.id || generateId(),
        email: form.email.trim().toLowerCase(),
        nombre: form.nombre.trim(),
        perfil: form.perfil,
        pinHash,
        activo: editingUser?.activo ?? true,
        clienteId: editingUser?.clienteId || 'EECOL',
        avatarInitials: getInitials(form.nombre.trim()),
        createdAt: editingUser?.createdAt || new Date().toISOString(),
        lastLogin: editingUser?.lastLogin,
      };

      await saveUser(user);
      await loadUsers();
      setSuccess(editingUser ? 'Usuario actualizado ✓' : 'Usuario creado ✓');
      setTimeout(() => {
        setSuccess('');
        setView('list');
      }, 1200);
    } catch (err) {
      console.error('[UsersModal] Save error:', err);
      setError('Error al guardar el usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (user: AppUser) => {
    if (user.id === currentUserId) {
      alert('No puedes desactivarte a ti mismo.');
      return;
    }
    await saveUser({ ...user, activo: !user.activo });
    await loadUsers();
  };

  const handleDelete = async (user: AppUser) => {
    if (user.id === currentUserId) {
      alert('No puedes eliminar tu propia cuenta.');
      return;
    }
    if (!window.confirm(`¿Eliminar al usuario "${user.nombre}"? Esta acción no se puede deshacer.`)) return;
    await deleteUser(user.id);
    await loadUsers();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            {view === 'form' && (
              <button
                onClick={() => setView('list')}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-4 h-4 rotate-0" />
              </button>
            )}
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                {view === 'list' ? 'Gestión de Usuarios' : editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {view === 'list' ? `${users.length} usuario${users.length !== 1 ? 's' : ''} registrados` : 'Completa los datos del usuario'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── LISTA DE USUARIOS ── */}
          {view === 'list' && (
            <div className="p-5 space-y-3">
              {users.map(user => {
                const cfg = PROFILE_CONFIG[user.perfil];
                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      user.activo
                        ? 'bg-slate-800/60 border-slate-700/60'
                        : 'bg-slate-800/20 border-slate-700/20 opacity-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      user.activo ? 'bg-violet-600/20 text-violet-300' : 'bg-slate-700 text-slate-500'
                    }`}>
                      {user.avatarInitials || getInitials(user.nombre)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">{user.nombre}</span>
                        {user.id === currentUserId && (
                          <span className="text-[9px] font-bold bg-violet-600/30 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full uppercase">Tú</span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
                      <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`p-1.5 rounded-lg transition ${
                          user.activo
                            ? 'text-emerald-400 hover:bg-emerald-950/40'
                            : 'text-zinc-500 hover:bg-slate-700'
                        }`}
                        title={user.activo ? 'Desactivar' : 'Activar'}
                      >
                        {user.activo
                          ? <ToggleRight className="w-4 h-4" />
                          : <ToggleLeft className="w-4 h-4" />
                        }
                      </button>
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-950/30 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUserId}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {users.length === 0 && (
                <div className="text-center py-10 text-zinc-500">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay usuarios registrados</p>
                </div>
              )}
            </div>
          )}

          {/* ── FORMULARIO DE USUARIO ── */}
          {view === 'form' && (
            <div className="p-5 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Nombre completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: Juan Pérez"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 text-sm transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Correo electrónico *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="usuario@empresa.cl"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 text-sm transition"
                  />
                </div>
              </div>

              {/* Perfil */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Perfil *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PROFILE_CONFIG) as UserProfile[]).map(profile => {
                    const cfg = PROFILE_CONFIG[profile];
                    return (
                      <button
                        key={profile}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, perfil: profile }))}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                          form.perfil === profile
                            ? `${cfg.color} ring-1 ring-current`
                            : 'border-slate-600 text-zinc-400 hover:border-slate-500 bg-slate-700/30'
                        }`}
                      >
                        <span className={form.perfil === profile ? '' : 'opacity-50'}>{cfg.icon}</span>
                        <span className="text-xs font-bold">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PIN */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  PIN de 4 dígitos {editingUser ? '(dejar en blanco para no cambiar)' : '*'}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={form.pin}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setForm(f => ({ ...f, pin: val }));
                    }}
                    placeholder="••••"
                    inputMode="numeric"
                    maxLength={4}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 text-sm font-mono tracking-widest transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar PIN */}
              {form.pin && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Confirmar PIN *
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={form.pinConfirm}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setForm(f => ({ ...f, pinConfirm: val }));
                      }}
                      placeholder="••••"
                      inputMode="numeric"
                      maxLength={4}
                      className={`w-full pl-9 pr-4 py-2.5 bg-slate-700/50 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 text-sm font-mono tracking-widest transition ${
                        form.pinConfirm && form.pin !== form.pinConfirm
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
                          : form.pinConfirm && form.pin === form.pinConfirm
                          ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/30'
                          : 'border-slate-600 focus:border-violet-500 focus:ring-violet-500/30'
                      }`}
                    />
                    {form.pinConfirm && form.pin === form.pinConfirm && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                </div>
              )}

              {/* Errores y éxito */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-900/50 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-xs text-rose-300">{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-emerald-300">{success}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700 shrink-0 flex gap-3">
          {view === 'list' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-slate-700 rounded-xl border border-slate-600 transition"
              >
                Cerrar
              </button>
              <button
                onClick={openCreate}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-violet-500/20"
              >
                <UserPlus className="w-4 h-4" />
                Nuevo Usuario
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setView('list')}
                className="flex-1 py-2.5 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-slate-700 rounded-xl border border-slate-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:from-zinc-600 disabled:to-zinc-500 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-violet-500/20 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? <Loader className="w-4 h-4 animate-spin" />
                  : <CheckCircle className="w-4 h-4" />
                }
                {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
