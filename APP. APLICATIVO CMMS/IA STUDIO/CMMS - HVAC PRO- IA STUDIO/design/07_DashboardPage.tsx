// ============================================================================
// CMMS HVAC PRO - DASHBOARD PAGE v2.0
// Actualizado según: REGLAS_NEGOCIO_CMMS_HVAC.md, WORKFLOWS_NEGOCIO_CMMS_HVAC.md
// Autor: Nelson Bravo Salas
// Fecha: Junio 2026
//
// Reglas implementadas:
//   BR-STD-001   → Campos obligatorios (firma, horas, descripción ≥10 chars)
//   BR-CICLO-001 → Estados OT: abierta → en_progreso → cerrada (sin reversal)
//   BR-KPIS-001  → MTBF=720/fallos, MTTR=AVG(dur)/3600, Disp=(1-MTTR/720)*100
//   BR-ACTIVOS-001 → Equipos en "baja" NO reciben nuevas OTs
//   BR-ROLES-001 → Admin > Técnico > Viewer (RBAC)
//   WF-003       → Ejecutar OT: botón "Iniciar Trabajo" → en_progreso
//   WF-004       → Cerrar OT: requiere horas + firma_cierre
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// TIPOS (aligned with CMMS_HVAC_ARQUITECTURA_MULTITENANT.md §3.1)
// ============================================================================

export type TipoEquipo = 'chiller' | 'fancoil' | 'uta' | 'split' | 'vrv' | 'otro';
export type Tag = 'critico' | 'alto-uso' | 'bajo-uso' | 'obsoleto' | 'nuevo';
export type EstadoSistema = 'bueno' | 'regular' | 'deficiente' | 'crítico';
export type TipoMantenimiento = 'preventivo' | 'correctivo' | 'urgencia';

/** BR-CICLO-001: Transiciones permitidas SOLO hacia adelante */
export type EstadoOT = 'abierta' | 'en_progreso' | 'cerrada';

/** BR-ACTIVOS-001: Equipo en "baja" NO recibe nuevas OTs */
export type EstadoActivo = 'activo' | 'inactivo' | 'baja';

export type Prioridad = 'baja' | 'media' | 'alta' | 'crítica';

/** BR-ROLES-001 */
export type Rol = 'admin' | 'tecnico' | 'viewer';

export interface AuthSession {
  userId: string;
  clientId: string;
  sucursalId?: string;
  nombre: string;
  email: string;
  perfil: Rol;
}

export interface Activo {
  id: string;
  id_cliente: string;
  id_sucursal: string;
  id_tipo_equipo: TipoEquipo;
  id_tag?: Tag;
  nombre: string;
  serial?: string;
  marca?: string;
  modelo?: string;
  ultima_revision?: Date;
  /** BR-ACTIVOS-001: activo/inactivo/baja */
  estado: EstadoActivo;
}

export interface OrdenTrabajo {
  id: string;
  id_cliente: string;
  id_sucursal: string;
  id_activo: string;
  id_tipo_equipo: TipoEquipo;
  id_tag?: Tag;
  folio: string;
  tecnico_id?: string;
  tipo_mantenimiento: TipoMantenimiento;
  /** BR-CICLO-001 */
  estado: EstadoOT;
  prioridad: Prioridad;
  /** BR-STD-001: mínimo 10 caracteres */
  descripcion: string;
  notas_tecnico?: string;
  fecha_creacion: Date;
  /** Requerido cuando estado = en_progreso o cerrada */
  fecha_inicio?: Date;
  /** Requerido cuando estado = cerrada (ESENCIAL para MTTR) */
  fecha_cierre?: Date;
  /** Requerido cuando estado = cerrada */
  horas_ejecutadas?: number;
  firma_cierre?: string;
  synced?: boolean;
}

/** BR-KPIS-001: Estructura de KPIs calculados desde ordenes_trabajo cerradas */
export interface KPIsData {
  /** MTBF = 720 / fallos (fallos = OTs correctivas cerradas en 30 días) */
  mtbf_horas: number;
  /** MTTR = AVG(fecha_cierre - fecha_inicio) / 3600 */
  mttr_horas: number;
  /** Disponibilidad = (1 - MTTR/720) * 100 */
  disponibilidad_pct: number;
  total_ordenes: number;
  ordenes_correctivas: number;
  ordenes_preventivas: number;
}

// ============================================================================
// VALIDACIONES BR-CICLO-001 (transiciones de estado OT)
// ============================================================================

/** Retorna el próximo estado válido según BR-CICLO-001 */
function getSiguienteEstado(estadoActual: EstadoOT): EstadoOT | null {
  const transiciones: Record<EstadoOT, EstadoOT | null> = {
    abierta: 'en_progreso',
    en_progreso: 'cerrada',
    cerrada: null, // Terminal — no se puede reabrir
  };
  return transiciones[estadoActual];
}

/** BR-ACTIVOS-001: Bloquear creación de OT para equipos en baja */
function puedeCrearOT(activo: Activo): boolean {
  return activo.estado === 'activo';
}

/** BR-CICLO-001: Validar transición */
function esTransicionValida(desde: EstadoOT, hacia: EstadoOT): boolean {
  return getSiguienteEstado(desde) === hacia;
}

// ============================================================================
// CÁLCULO DE KPIs — BR-KPIS-001
// ============================================================================

/**
 * Calcula MTBF, MTTR y Disponibilidad desde lista de OTs cerradas.
 *
 * MTBF = 720 / fallos
 *   donde fallos = COUNT(tipo_mantenimiento = 'correctivo')
 *
 * MTTR = AVG(fecha_cierre - fecha_inicio) en horas
 *
 * Disponibilidad = (1 - MTTR/720) * 100
 */
function calcularKPIs(ordenes: OrdenTrabajo[]): KPIsData {
  const cerradas = ordenes.filter(
    (o) => o.estado === 'cerrada' && o.fecha_cierre && o.fecha_inicio
  );

  const correctivas = cerradas.filter((o) => o.tipo_mantenimiento === 'correctivo');
  const preventivas = cerradas.filter((o) => o.tipo_mantenimiento === 'preventivo');

  const fallos = correctivas.length;
  const mtbf = fallos > 0 ? 720 / fallos : 720;

  const totalDuracionHoras =
    cerradas.length > 0
      ? cerradas.reduce((acc, o) => {
          const dur =
            (new Date(o.fecha_cierre!).getTime() - new Date(o.fecha_inicio!).getTime()) /
            3_600_000;
          return acc + Math.max(0, dur);
        }, 0)
      : 0;

  const mttr = cerradas.length > 0 ? totalDuracionHoras / cerradas.length : 0;
  const disponibilidad = (1 - mttr / 720) * 100;

  return {
    mtbf_horas: Math.round(mtbf * 10) / 10,
    mttr_horas: Math.round(mttr * 10) / 10,
    disponibilidad_pct: Math.min(100, Math.round(disponibilidad * 100) / 100),
    total_ordenes: ordenes.length,
    ordenes_correctivas: correctivas.length,
    ordenes_preventivas: preventivas.length,
  };
}

// ============================================================================
// MOCK DATA (reemplazar por llamadas API reales)
// ============================================================================

const EQUIPOS_MOCK: Activo[] = [
  {
    id: 'act-001', id_cliente: 'cli-test-001', id_sucursal: 'suc-test-001',
    id_tipo_equipo: 'chiller', id_tag: 'critico',
    nombre: 'Chiller Trane CenTraVac 19XL', serial: 'CH-001', marca: 'Trane',
    ultima_revision: new Date('2026-05-15'), estado: 'activo',
  },
  {
    id: 'act-002', id_cliente: 'cli-test-001', id_sucursal: 'suc-test-001',
    id_tipo_equipo: 'fancoil', id_tag: 'alto-uso',
    nombre: 'Fan Coil Carrier 42XW', serial: 'FC-002', marca: 'Carrier',
    ultima_revision: new Date('2026-05-20'), estado: 'activo',
  },
  {
    id: 'act-003', id_cliente: 'cli-test-001', id_sucursal: 'suc-test-001',
    id_tipo_equipo: 'uta', id_tag: 'critico',
    nombre: 'UTA Lennox LGA', serial: 'UTA-003', marca: 'Lennox',
    ultima_revision: new Date('2026-04-10'), estado: 'inactivo',
  },
  {
    id: 'act-004', id_cliente: 'cli-test-001', id_sucursal: 'suc-test-001',
    id_tipo_equipo: 'split', id_tag: 'bajo-uso',
    nombre: 'Split Daikin FTXB', serial: 'SP-004', marca: 'Daikin',
    ultima_revision: new Date('2026-03-01'), estado: 'baja',
  },
  {
    id: 'act-005', id_cliente: 'cli-test-001', id_sucursal: 'suc-test-001',
    id_tipo_equipo: 'vrv', id_tag: 'nuevo',
    nombre: 'VRV Mitsubishi City Multi', serial: 'VRV-005', marca: 'Mitsubishi',
    ultima_revision: new Date('2026-06-01'), estado: 'activo',
  },
];

const now = new Date();
const hace3h = new Date(now.getTime() - 3 * 3_600_000);
const hace6h = new Date(now.getTime() - 6 * 3_600_000);

const OTS_MOCK: OrdenTrabajo[] = [
  {
    id: 'ot-001', id_cliente: 'cli-test-001', id_sucursal: 'suc-test-001',
    id_activo: 'act-001', id_tipo_equipo: 'chiller', id_tag: 'critico',
    folio: 'OT-2026-06-00001', tipo_mantenimiento: 'correctivo',
    estado: 'abierta', prioridad: 'crítica',
    descripcion: 'Fuga de refrigerante detectada en condensador principal',
    fecha_creacion: hace6h, synced: true,
  },
  {
    id: 'ot-002', id_cliente: 'cli-test-001', id_sucursal: 'suc-test-001',
    id_activo: 'act-002', id_tipo_equipo: 'fancoil',
    folio: 'OT-2026-06-00002', tipo_mantenimiento: 'preventivo',
    estado: 'en_progreso', prioridad: 'media',
    descripcion: 'Mantenimiento preventivo trimestral de filtros y bobinas',
    fecha_creacion: hace3h, fecha_inicio: hace3h, synced: true,
  },
  {
    id: 'ot-003', id_cliente: 'cli-test-001', id_sucursal: 'suc-test-001',
    id_activo: 'act-005', id_tipo_equipo: 'vrv',
    folio: 'OT-2026-06-00003', tipo_mantenimiento: 'preventivo',
    estado: 'cerrada', prioridad: 'baja',
    descripcion: 'Revisión anual sistema VRV y calibración de controladores',
    fecha_creacion: new Date('2026-06-01'), fecha_inicio: new Date('2026-06-01T09:00'),
    fecha_cierre: new Date('2026-06-01T11:30'), horas_ejecutadas: 2.5, synced: true,
  },
  {
    id: 'ot-004', id_cliente: 'cli-test-001', id_sucursal: 'suc-test-001',
    id_activo: 'act-001', id_tipo_equipo: 'chiller', id_tag: 'critico',
    folio: 'OT-2026-05-00042', tipo_mantenimiento: 'correctivo',
    estado: 'cerrada', prioridad: 'alta',
    descripcion: 'Reemplazo de compresor secundario por falla mecánica',
    fecha_creacion: new Date('2026-05-15'), fecha_inicio: new Date('2026-05-15T08:00'),
    fecha_cierre: new Date('2026-05-15T14:00'), horas_ejecutadas: 6, synced: true,
  },
];

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

interface DashboardPageProps {
  session: AuthSession;
  onLogout: () => void;
  onNewOT?: (activoId: string) => void;
}

// --- KPI Ring ---------------------------------------------------------------

interface KPIRingProps {
  label: string;
  value: number;       // 0-100 porcentaje para el anillo
  display: string;     // texto central (ej: "240h", "99.6%")
  formula: string;     // tooltip: fórmula BR-KPIS-001
  color: string;       // stroke color
  status: 'excellent' | 'good' | 'critical';
}

const KPIRing: React.FC<KPIRingProps> = ({ label, value, display, formula, color, status }) => {
  const [animVal, setAnimVal] = useState(0);
  const C = 163.4; // 2π×26

  useEffect(() => {
    const t = setTimeout(() => setAnimVal(value), 120);
    return () => clearTimeout(t);
  }, [value]);

  const dash = (animVal / 100) * C;
  const statusColors: Record<string, string> = {
    excellent: '#10b981',
    good: '#f59e0b',
    critical: '#ef4444',
  };

  return (
    <div className="hvac-kpi-card" title={formula}>
      <svg width="70" height="70" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="26" fill="none" stroke="#1a2236" strokeWidth="6" />
        <circle
          cx="30" cy="30" r="26"
          fill="none"
          stroke={statusColors[status]}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          strokeDashoffset={C * 0.25}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="30" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#f1f5f9">
          {display}
        </text>
      </svg>
      <p className="hvac-kpi-label">{label}</p>
    </div>
  );
};

// --- StatusDot (3 estados: activo/inactivo/baja) ----------------------------

interface StatusDotProps {
  estado: EstadoActivo;
}

/** BR-ACTIVOS-001: 3 estados de equipo */
const StatusDot: React.FC<StatusDotProps> = ({ estado }) => {
  const config: Record<EstadoActivo, { cls: string; label: string }> = {
    activo:   { cls: 'hvac-dot-green',  label: 'Activo' },
    inactivo: { cls: 'hvac-dot-amber',  label: 'Inactivo' },
    baja:     { cls: 'hvac-dot-red',    label: 'Baja' },
  };
  const { cls, label } = config[estado];
  return (
    <span className={`hvac-status-dot ${cls}`} title={label} />
  );
};

// --- OT Estado Badge --------------------------------------------------------

const ESTADO_OT_CONFIG: Record<EstadoOT, { label: string; color: string }> = {
  abierta:     { label: 'ABIERTA',      color: '#f59e0b' },
  en_progreso: { label: 'EN PROGRESO',  color: '#22d3ee' },
  cerrada:     { label: 'CERRADA',      color: '#10b981' },
};

const PRIORIDAD_CONFIG: Record<Prioridad, { color: string }> = {
  baja:    { color: '#10b981' },
  media:   { color: '#f59e0b' },
  alta:    { color: '#f97316' },
  crítica: { color: '#ef4444' },
};

// --- SignatureCanvas (BR-STD-001: firma obligatoria al cerrar) ---------------

interface SignatureCanvasProps {
  onSignature: (dataUrl: string) => void;
  onClear: () => void;
}

const SignatureCanvasCompact: React.FC<SignatureCanvasProps> = ({ onSignature, onClear }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0d1119';
      ctx.fillRect(0, 0, 300, 100);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, []);

  const pos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y); ctx.stroke();
    setHasSig(true);
  };

  const stop = () => {
    setDrawing(false);
    if (hasSig) onSignature(canvasRef.current!.toDataURL('image/png'));
  };

  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0d1119';
      ctx.fillRect(0, 0, 300, 100);
    }
    setHasSig(false);
    onClear();
  };

  return (
    <div style={{ marginTop: 8 }}>
      <canvas
        ref={canvasRef} width={300} height={100}
        onMouseDown={start} onMouseMove={draw}
        onMouseUp={stop} onMouseLeave={stop}
        style={{
          border: '1px solid #1a2236', borderRadius: 4,
          cursor: 'crosshair', display: 'block',
          background: '#0d1119',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="hvac-btn-ghost" onClick={clear} type="button">Limpiar</button>
        <span style={{ fontSize: 11, color: '#64748b', lineHeight: '28px' }}>
          {hasSig ? '✓ Firma capturada' : 'Dibuja tu firma'}
        </span>
      </div>
    </div>
  );
};

// --- CerrarOrdenModal (WF-004: requiere firma + horas) -----------------------

interface CerrarOrdenModalProps {
  orden: OrdenTrabajo;
  onClose: () => void;
  onConfirm: (horas: number, notas: string, firma: string) => void;
}

const CerrarOrdenModal: React.FC<CerrarOrdenModalProps> = ({ orden, onClose, onConfirm }) => {
  const [horas, setHoras] = useState('');
  const [notas, setNotas] = useState('');
  const [firma, setFirma] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const h = parseFloat(horas);
    if (!h || h <= 0) { setError('Horas ejecutadas debe ser mayor a 0'); return; }
    if (!firma) { setError('Firma digital es obligatoria (BR-STD-001)'); return; }
    onConfirm(h, notas, firma);
  };

  return (
    <div className="hvac-modal-overlay">
      <div className="hvac-modal">
        <h3 className="hvac-modal-title">Cerrar Orden de Trabajo</h3>
        <div className="hvac-modal-info">
          <span className="label-folio">{orden.folio}</span>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{orden.descripcion}</p>
        </div>

        {error && <p className="hvac-error">{error}</p>}

        <label className="hvac-field-label">Horas Ejecutadas *</label>
        <input
          type="number" step="0.5" min="0.5" value={horas}
          onChange={e => setHoras(e.target.value)}
          className="hvac-input"
          placeholder="Ej: 2.5"
        />

        <label className="hvac-field-label">Notas Finales</label>
        <textarea
          value={notas} onChange={e => setNotas(e.target.value)}
          className="hvac-input" rows={3}
          placeholder="Trabajo realizado, materiales usados..."
        />

        <label className="hvac-field-label">Firma Digital * (BR-STD-001)</label>
        <SignatureCanvasCompact
          onSignature={setFirma}
          onClear={() => setFirma('')}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="hvac-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="hvac-btn-primary" onClick={handleSubmit}>
            Confirmar Cierre
          </button>
        </div>
      </div>
    </div>
  );
};

// --- OT Card (WF-003/WF-004: botones de transición de estado) ---------------

interface OTCardProps {
  orden: OrdenTrabajo;
  session: AuthSession;
  onIniciar: (id: string) => void;
  onCerrar: (orden: OrdenTrabajo) => void;
}

const OTCard: React.FC<OTCardProps> = ({ orden, session, onIniciar, onCerrar }) => {
  const estadoCfg = ESTADO_OT_CONFIG[orden.estado];
  const priorCfg = PRIORIDAD_CONFIG[orden.prioridad];
  const isAdmin = session.perfil === 'admin';
  const isTecnico = session.perfil === 'tecnico';
  const canAct = isAdmin || isTecnico;

  /** BR-CICLO-001: siguiente acción válida */
  const siguiente = getSiguienteEstado(orden.estado);

  const duracion = orden.fecha_inicio
    ? Math.round(
        ((orden.fecha_cierre ?? new Date()).getTime() - new Date(orden.fecha_inicio).getTime()) /
          3_600_000 * 10
      ) / 10
    : null;

  return (
    <div className="hvac-ot-card">
      <div className="hvac-ot-header">
        <div>
          <span className="label-folio">{orden.folio}</span>
          <span className="hvac-tipo-badge">{orden.tipo_mantenimiento}</span>
        </div>
        <span
          className="hvac-estado-badge"
          style={{ color: estadoCfg.color, borderColor: estadoCfg.color }}
        >
          {estadoCfg.label}
        </span>
      </div>

      <p className="hvac-ot-desc">{orden.descripcion}</p>

      <div className="hvac-ot-meta">
        <span style={{ color: priorCfg.color, fontSize: 11, fontWeight: 700 }}>
          ▲ {orden.prioridad.toUpperCase()}
        </span>
        {duracion !== null && (
          <span style={{ fontSize: 11, color: '#64748b' }}>⏱ {duracion}h</span>
        )}
        {!orden.synced && (
          <span className="hvac-sync-pending" title="Pendiente de sincronización">⟳ PENDIENTE</span>
        )}
      </div>

      {/* BR-CICLO-001: botones de transición — SOLO hacia adelante */}
      {canAct && siguiente && (
        <div className="hvac-ot-actions">
          {siguiente === 'en_progreso' && (
            <button
              className="hvac-btn-action hvac-btn-iniciar"
              onClick={() => onIniciar(orden.id)}
            >
              ▶ INICIAR TRABAJO
            </button>
          )}
          {siguiente === 'cerrada' && (
            <button
              className="hvac-btn-action hvac-btn-cerrar"
              onClick={() => onCerrar(orden)}
            >
              ✓ FINALIZAR Y CERRAR
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: DashboardPage
// ============================================================================

const DashboardPage: React.FC<DashboardPageProps> = ({ session, onLogout, onNewOT }) => {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'ordenes' | 'equipos'>('dashboard');
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>(OTS_MOCK);
  const [equipos] = useState<Activo[]>(EQUIPOS_MOCK);
  const [cerrarModal, setCerrarModal] = useState<OrdenTrabajo | null>(null);
  const [tickTime, setTickTime] = useState(new Date());

  /** BR-ROLES-001 */
  const isAdmin   = session.perfil === 'admin';
  const isTecnico = session.perfil === 'tecnico';
  const isViewer  = session.perfil === 'viewer';

  // Reloj en vivo
  useEffect(() => {
    const id = setInterval(() => setTickTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // BR-KPIS-001: calcular KPIs desde las OTs reales
  const kpis = calcularKPIs(ordenes);

  // Porcentaje para anillo MTBF (meta: >500h → 100%, <50h → 0%)
  const mtbfPct = Math.min(100, (kpis.mtbf_horas / 500) * 100);
  // MTTR: meta <2h → 100%, >12h → 0%
  const mttrPct = Math.max(0, 100 - (kpis.mttr_horas / 12) * 100);
  // Disponibilidad directa
  const dispPct = kpis.disponibilidad_pct;
  // OTs abiertas/total
  const otsAbiertas = ordenes.filter(o => o.estado !== 'cerrada').length;
  const otsPct = ordenes.length > 0 ? ((ordenes.length - otsAbiertas) / ordenes.length) * 100 : 0;

  const mtbfStatus  = kpis.mtbf_horas > 500 ? 'excellent' : kpis.mtbf_horas > 200 ? 'good' : 'critical';
  const mttrStatus  = kpis.mttr_horas < 2 ? 'excellent' : kpis.mttr_horas < 8 ? 'good' : 'critical';
  const dispStatus  = kpis.disponibilidad_pct >= 99 ? 'excellent' : kpis.disponibilidad_pct >= 95 ? 'good' : 'critical';

  // ---- WF-003: Iniciar trabajo ----
  const handleIniciar = useCallback((id: string) => {
    setOrdenes(prev =>
      prev.map(o => {
        if (o.id !== id) return o;
        if (!esTransicionValida(o.estado, 'en_progreso')) return o; // BR-CICLO-001
        return { ...o, estado: 'en_progreso', fecha_inicio: new Date(), synced: false };
      })
    );
    // TODO: SyncEngine → PATCH /api/ordenes?action=actualizar&id=X
  }, []);

  // ---- WF-004: Abrir modal de cierre ----
  const handleOpenCerrar = useCallback((orden: OrdenTrabajo) => {
    if (!esTransicionValida(orden.estado, 'cerrada')) return;
    setCerrarModal(orden);
  }, []);

  // ---- WF-004: Confirmar cierre ----
  const handleConfirmarCierre = useCallback(
    (horas: number, notas: string, firma: string) => {
      if (!cerrarModal) return;
      setOrdenes(prev =>
        prev.map(o => {
          if (o.id !== cerrarModal.id) return o;
          if (!esTransicionValida(o.estado, 'cerrada')) return o;
          return {
            ...o,
            estado: 'cerrada',
            fecha_cierre: new Date(),
            horas_ejecutadas: horas,
            notas_tecnico: notas,
            firma_cierre: firma,
            synced: false,
          };
        })
      );
      setCerrarModal(null);
      // TODO: SyncEngine → PATCH /api/ordenes?action=cerrar&id=X
    },
    [cerrarModal]
  );

  // ---- BR-ACTIVOS-001: verificar si activo puede recibir OT ----
  const handleNewOT = (activo: Activo) => {
    if (!puedeCrearOT(activo)) {
      alert(`El equipo "${activo.nombre}" está en estado "${activo.estado}" y no puede recibir nuevas Órdenes de Trabajo (BR-ACTIVOS-001).`);
      return;
    }
    onNewOT?.(activo.id);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Estilos inline */}
      <style>{`
        /* ---- RESET & BASE ---- */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:    #070a0f;
          --s1:    #0d1119;
          --s2:    #111722;
          --s3:    #17202e;
          --bd:    #1a2236;
          --bd2:   #263350;
          --or:    #f97316;
          --cy:    #22d3ee;
          --gr:    #10b981;
          --am:    #f59e0b;
          --re:    #ef4444;
          --tx:    #e2e8f0;
          --tx2:   #94a3b8;
          --tx3:   #64748b;
          --ff-d:  'Barlow Condensed', sans-serif;
          --ff-m:  'JetBrains Mono', monospace;
          --sw:    228px;
          --th:    54px;
        }
        body { background: var(--bg); color: var(--tx); font-family: var(--ff-d); }

        /* ---- LAYOUT ---- */
        .hvac-shell { display: flex; height: 100vh; overflow: hidden; }

        /* ---- SIDEBAR ---- */
        .hvac-sidebar {
          width: var(--sw); min-width: var(--sw);
          background: var(--s1);
          border-right: 1px solid var(--bd);
          display: flex; flex-direction: column;
        }
        .hvac-logo {
          padding: 18px 20px;
          border-bottom: 1px solid var(--bd);
          font-family: var(--ff-d);
          font-size: 20px; font-weight: 900; letter-spacing: .04em;
          color: var(--or);
        }
        .hvac-logo span { color: var(--cy); }
        .hvac-nav { flex: 1; padding: 12px 0; }
        .hvac-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 20px;
          font-size: 13px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
          color: var(--tx3); cursor: pointer; border: none; background: none; width: 100%;
          transition: color .15s, background .15s;
        }
        .hvac-nav-item:hover { color: var(--tx); background: var(--s2); }
        .hvac-nav-item.active { color: var(--or); background: var(--s2); border-left: 3px solid var(--or); }
        .hvac-nav-icon { font-size: 16px; }
        .hvac-sidebar-footer {
          padding: 16px 20px; border-top: 1px solid var(--bd);
          font-size: 11px; color: var(--tx3);
        }
        .hvac-user-name { font-weight: 700; color: var(--tx2); font-size: 12px; }
        .hvac-user-role {
          display: inline-block; margin-top: 4px; padding: 2px 6px;
          background: var(--s3); border-radius: 4px;
          font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
          color: var(--cy);
        }
        .hvac-logout-btn {
          margin-top: 8px; padding: 6px 12px;
          background: none; border: 1px solid var(--bd2); border-radius: 4px;
          color: var(--tx3); font-size: 11px; cursor: pointer;
          transition: all .15s;
        }
        .hvac-logout-btn:hover { border-color: var(--re); color: var(--re); }

        /* ---- MAIN ---- */
        .hvac-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .hvac-topbar {
          height: var(--th); min-height: var(--th);
          background: var(--s1); border-bottom: 1px solid var(--bd);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px;
        }
        .hvac-topbar-title {
          font-size: 18px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase;
        }
        .hvac-topbar-right { display: flex; align-items: center; gap: 16px; }
        .hvac-clock { font-family: var(--ff-m); font-size: 13px; color: var(--cy); }
        .hvac-online-badge {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; color: var(--gr);
        }
        .hvac-content { flex: 1; overflow-y: auto; padding: 24px; }

        /* ---- KPI CARDS ---- */
        .hvac-kpi-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
        }
        .hvac-kpi-card {
          background: var(--s1); border: 1px solid var(--bd); border-radius: 8px;
          padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px;
          cursor: help;
          transition: border-color .2s;
        }
        .hvac-kpi-card:hover { border-color: var(--bd2); }
        .hvac-kpi-label {
          font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
          color: var(--tx3); text-align: center;
        }

        /* ---- STATUS DOTS (3 estados: activo/inactivo/baja) ---- */
        .hvac-status-dot {
          display: inline-block; width: 8px; height: 8px; border-radius: 50%;
        }
        /* BR-ACTIVOS-001 */
        .hvac-dot-green { background: var(--gr); box-shadow: 0 0 6px var(--gr); animation: pulse-g 2s infinite; }
        .hvac-dot-amber { background: var(--am); box-shadow: 0 0 6px var(--am); animation: pulse-a 2s infinite; }
        .hvac-dot-red   { background: var(--re); }
        @keyframes pulse-g { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes pulse-a { 0%,100%{opacity:1} 50%{opacity:.4} }

        /* ---- EQUIPMENT TABLE ---- */
        .hvac-section { background: var(--s1); border: 1px solid var(--bd); border-radius: 8px; margin-bottom: 24px; }
        .hvac-section-header {
          padding: 12px 16px; border-bottom: 1px solid var(--bd);
          display: flex; align-items: center; justify-content: space-between;
        }
        .hvac-section-title {
          font-size: 13px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; color: var(--tx2);
        }
        table { width: 100%; border-collapse: collapse; }
        th {
          font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          color: var(--tx3); padding: 8px 16px; text-align: left;
          border-bottom: 1px solid var(--bd); white-space: nowrap;
        }
        td { padding: 10px 16px; font-size: 13px; border-bottom: 1px solid var(--bd); }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: var(--s2); }
        .tag-badge {
          padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .05em;
        }
        .tag-critico   { background: #3f1212; color: #f87171; border: 1px solid #7f1d1d; }
        .tag-alto-uso  { background: #3f2c12; color: #fbbf24; border: 1px solid #78350f; }
        .tag-bajo-uso  { background: #0f2b1e; color: #34d399; border: 1px solid #064e3b; }
        .tag-obsoleto  { background: #1e1e1e; color: #9ca3af; border: 1px solid #374151; }
        .tag-nuevo     { background: #0f1f3f; color: #60a5fa; border: 1px solid #1e3a5f; }
        /* Estado activo colores en tabla */
        .estado-activo   { color: var(--gr); font-weight: 700; font-size: 11px; }
        .estado-inactivo { color: var(--am); font-weight: 700; font-size: 11px; }
        .estado-baja     { color: var(--re); font-weight: 700; font-size: 11px; text-decoration: line-through; }

        /* ---- OT CARDS ---- */
        .hvac-ot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
        .hvac-ot-card {
          background: var(--s1); border: 1px solid var(--bd); border-radius: 8px;
          padding: 14px; display: flex; flex-direction: column; gap: 8px;
          transition: border-color .2s;
        }
        .hvac-ot-card:hover { border-color: var(--bd2); }
        .hvac-ot-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .label-folio { font-family: var(--ff-m); font-size: 12px; color: var(--or); font-weight: 700; }
        .hvac-tipo-badge {
          margin-left: 8px; padding: 1px 6px; border-radius: 4px;
          font-size: 9px; font-weight: 700; text-transform: uppercase;
          background: var(--s3); color: var(--tx3);
        }
        .hvac-estado-badge {
          padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 900;
          letter-spacing: .05em; text-transform: uppercase; border: 1px solid;
        }
        .hvac-ot-desc { font-size: 12px; color: var(--tx2); line-height: 1.4; }
        .hvac-ot-meta { display: flex; gap: 12px; align-items: center; }
        .hvac-sync-pending { font-size: 10px; color: var(--am); font-family: var(--ff-m); }
        .hvac-ot-actions { display: flex; gap: 8px; margin-top: 4px; }
        .hvac-btn-action {
          flex: 1; padding: 7px 12px; border: none; border-radius: 5px;
          font-size: 11px; font-weight: 900; letter-spacing: .05em; cursor: pointer;
          font-family: var(--ff-d); transition: opacity .2s;
        }
        .hvac-btn-action:hover { opacity: .85; }
        /* WF-003: Iniciar */
        .hvac-btn-iniciar { background: var(--cy); color: #0d1119; }
        /* WF-004: Cerrar */
        .hvac-btn-cerrar  { background: var(--or); color: #0d1119; }

        /* ---- MODAL ---- */
        .hvac-modal-overlay {
          position: fixed; inset: 0; background: rgba(7,10,15,.85);
          display: flex; align-items: center; justify-content: center; z-index: 999;
        }
        .hvac-modal {
          background: var(--s2); border: 1px solid var(--bd2); border-radius: 10px;
          padding: 24px; width: 380px; max-width: 95vw;
          display: flex; flex-direction: column; gap: 10px;
        }
        .hvac-modal-title {
          font-size: 16px; font-weight: 900; letter-spacing: .04em; color: var(--or);
        }
        .hvac-modal-info {
          background: var(--s3); border-radius: 6px; padding: 10px;
        }
        .hvac-field-label {
          display: block; font-size: 11px; font-weight: 700; letter-spacing: .06em;
          text-transform: uppercase; color: var(--tx3); margin-bottom: 4px;
        }
        .hvac-input {
          width: 100%; padding: 8px 10px;
          background: var(--s1); border: 1px solid var(--bd2); border-radius: 5px;
          color: var(--tx); font-size: 13px; font-family: var(--ff-d);
          outline: none;
        }
        .hvac-input:focus { border-color: var(--or); }
        .hvac-error { font-size: 12px; color: var(--re); }
        .hvac-btn-ghost {
          padding: 7px 14px; border: 1px solid var(--bd2); border-radius: 5px;
          background: none; color: var(--tx3); font-size: 12px; cursor: pointer;
          font-family: var(--ff-d); font-weight: 700; letter-spacing: .04em;
          transition: all .15s;
        }
        .hvac-btn-ghost:hover { border-color: var(--tx3); color: var(--tx); }
        .hvac-btn-primary {
          flex: 1; padding: 8px 16px; border: none; border-radius: 5px;
          background: var(--or); color: #0d1119;
          font-size: 12px; font-weight: 900; cursor: pointer;
          font-family: var(--ff-d); letter-spacing: .04em;
          transition: opacity .15s;
        }
        .hvac-btn-primary:hover { opacity: .85; }
        /* ---- BR info tag ---- */
        .hvac-br-tag {
          font-size: 9px; font-weight: 700; letter-spacing: .04em;
          color: var(--tx3); font-family: var(--ff-m);
        }
        /* VIEWER badge */
        .hvac-viewer-notice {
          padding: 10px 16px; background: var(--s3); border-radius: 6px;
          font-size: 12px; color: var(--tx3); border-left: 3px solid var(--am);
        }
      `}</style>

      {/* Fuentes */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <div className="hvac-shell">
        {/* ---- SIDEBAR ---- */}
        <aside className="hvac-sidebar">
          <div className="hvac-logo">
            CMMS<span>·</span>HVAC <span>PRO</span>
          </div>

          <nav className="hvac-nav">
            {[
              { key: 'dashboard', icon: '◈', label: 'Dashboard' },
              { key: 'ordenes',   icon: '⊞', label: 'Órdenes de Trabajo' },
              { key: 'equipos',   icon: '⊡', label: 'Equipos / Activos' },
            ].map(item => (
              <button
                key={item.key}
                className={`hvac-nav-item ${activeSection === item.key ? 'active' : ''}`}
                onClick={() => setActiveSection(item.key as any)}
              >
                <span className="hvac-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hvac-sidebar-footer">
            <p className="hvac-user-name">{session.nombre}</p>
            <span className="hvac-user-role">{session.perfil}</span>
            <br />
            <button className="hvac-logout-btn" onClick={onLogout}>Cerrar sesión</button>
          </div>
        </aside>

        {/* ---- MAIN ---- */}
        <div className="hvac-main">
          {/* Topbar */}
          <header className="hvac-topbar">
            <span className="hvac-topbar-title">
              {activeSection === 'dashboard' && 'Dashboard KPIs'}
              {activeSection === 'ordenes'   && 'Órdenes de Trabajo'}
              {activeSection === 'equipos'   && 'Equipos / Activos'}
            </span>
            <div className="hvac-topbar-right">
              <span className="hvac-online-badge">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                EN LÍNEA
              </span>
              <span className="hvac-clock">
                {tickTime.toLocaleTimeString('es-CL')}
              </span>
            </div>
          </header>

          {/* Contenido */}
          <main className="hvac-content">

            {/* ==================== DASHBOARD ==================== */}
            {activeSection === 'dashboard' && (
              <>
                {/* KPI Grid — BR-KPIS-001 */}
                <div className="hvac-kpi-grid">
                  <KPIRing
                    label="MTBF"
                    value={mtbfPct}
                    display={`${kpis.mtbf_horas}h`}
                    formula="MTBF = 720 / fallos correctivos (BR-KPIS-001)"
                    color="var(--gr)"
                    status={mtbfStatus}
                  />
                  <KPIRing
                    label="MTTR"
                    value={mttrPct}
                    display={`${kpis.mttr_horas}h`}
                    formula="MTTR = AVG(fecha_cierre - fecha_inicio) / 3600 (BR-KPIS-001)"
                    color="var(--cy)"
                    status={mttrStatus}
                  />
                  <KPIRing
                    label="DISPONIBILIDAD"
                    value={dispPct}
                    display={`${kpis.disponibilidad_pct.toFixed(1)}%`}
                    formula="Disponibilidad = (1 - MTTR/720) × 100 (BR-KPIS-001)"
                    color="var(--or)"
                    status={dispStatus}
                  />
                  <KPIRing
                    label="OTs CERRADAS"
                    value={otsPct}
                    display={`${kpis.total_ordenes - otsAbiertas}/${kpis.total_ordenes}`}
                    formula="OTs cerradas / total OTs del período"
                    color="var(--am)"
                    status={otsPct >= 80 ? 'excellent' : otsPct >= 50 ? 'good' : 'critical'}
                  />
                </div>

                {/* Resumen BR-KPIS-001 */}
                <div className="hvac-section" style={{ marginBottom: 24 }}>
                  <div className="hvac-section-header">
                    <span className="hvac-section-title">Resumen KPIs — Últimos 30 días</span>
                    <span className="hvac-br-tag">BR-KPIS-001</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
                    {[
                      { label: 'OTs Correctivas (fallos)', val: kpis.ordenes_correctivas, note: 'Entrada de MTBF' },
                      { label: 'OTs Preventivas',          val: kpis.ordenes_preventivas, note: 'No cuentan como fallo' },
                      { label: 'Total OTs',                val: kpis.total_ordenes,       note: 'Cerradas en período' },
                    ].map(({ label, val, note }) => (
                      <div key={label} style={{ padding: '14px 20px', borderRight: '1px solid var(--bd)' }}>
                        <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--tx)' }}>{val}</p>
                        <p style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{label}</p>
                        <p style={{ fontSize: 10, color: 'var(--bd2)', marginTop: 2 }}>{note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OTs recientes */}
                <div className="hvac-section">
                  <div className="hvac-section-header">
                    <span className="hvac-section-title">OTs Activas</span>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="hvac-ot-grid">
                      {ordenes
                        .filter(o => o.estado !== 'cerrada')
                        .map(o => (
                          <OTCard
                            key={o.id}
                            orden={o}
                            session={session}
                            onIniciar={handleIniciar}
                            onCerrar={handleOpenCerrar}
                          />
                        ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ==================== ÓRDENES ==================== */}
            {activeSection === 'ordenes' && (
              <>
                {isViewer && (
                  <div className="hvac-viewer-notice" style={{ marginBottom: 16 }}>
                    ℹ️ Modo Viewer — solo lectura. No puede crear ni modificar órdenes. (BR-ROLES-001)
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 900, letterSpacing: '.04em' }}>
                    Todas las Órdenes de Trabajo
                  </h2>
                  <span className="hvac-br-tag">BR-CICLO-001 activo</span>
                </div>
                <div className="hvac-ot-grid">
                  {ordenes.map(o => (
                    <OTCard
                      key={o.id}
                      orden={o}
                      session={session}
                      onIniciar={handleIniciar}
                      onCerrar={handleOpenCerrar}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ==================== EQUIPOS ==================== */}
            {activeSection === 'equipos' && (
              <div className="hvac-section">
                <div className="hvac-section-header">
                  <span className="hvac-section-title">Activos / Equipos HVAC</span>
                  <span className="hvac-br-tag">BR-ACTIVOS-001</span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Equipo</th>
                      <th>Tipo</th>
                      <th>Serial</th>
                      <th>Tag</th>
                      <th>Última Revisión</th>
                      {(isAdmin || isTecnico) && <th>Acción</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {equipos.map(eq => (
                      <tr key={eq.id}>
                        <td>
                          <StatusDot estado={eq.estado} />
                          <span
                            className={`estado-${eq.estado}`}
                            style={{ marginLeft: 8 }}
                          >
                            {eq.estado.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <p style={{ fontWeight: 700 }}>{eq.nombre}</p>
                          {eq.marca && (
                            <p style={{ fontSize: 11, color: 'var(--tx3)' }}>{eq.marca}</p>
                          )}
                        </td>
                        <td style={{ textTransform: 'uppercase', fontSize: 12, color: 'var(--tx3)' }}>
                          {eq.id_tipo_equipo}
                        </td>
                        <td style={{ fontFamily: 'var(--ff-m)', fontSize: 11 }}>
                          {eq.serial ?? '—'}
                        </td>
                        <td>
                          {eq.id_tag ? (
                            <span className={`tag-badge tag-${eq.id_tag}`}>{eq.id_tag}</span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--tx3)' }}>
                          {eq.ultima_revision
                            ? new Date(eq.ultima_revision).toLocaleDateString('es-CL')
                            : '—'}
                        </td>
                        {(isAdmin || isTecnico) && (
                          <td>
                            {/* BR-ACTIVOS-001: solo "activo" puede crear OT */}
                            <button
                              onClick={() => handleNewOT(eq)}
                              disabled={!puedeCrearOT(eq)}
                              style={{
                                padding: '5px 12px',
                                background: puedeCrearOT(eq) ? 'var(--or)' : 'var(--s3)',
                                color: puedeCrearOT(eq) ? '#0d1119' : 'var(--tx3)',
                                border: 'none', borderRadius: 4,
                                fontSize: 11, fontWeight: 900, cursor: puedeCrearOT(eq) ? 'pointer' : 'not-allowed',
                                fontFamily: 'var(--ff-d)',
                              }}
                              title={
                                !puedeCrearOT(eq)
                                  ? `Equipo en "${eq.estado}" — no puede recibir OTs (BR-ACTIVOS-001)`
                                  : 'Nueva Orden de Trabajo'
                              }
                            >
                              {eq.estado === 'baja' ? '⊘ BAJA' : '+ OT'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modal Cerrar OT (WF-004) */}
      {cerrarModal && (
        <CerrarOrdenModal
          orden={cerrarModal}
          onClose={() => setCerrarModal(null)}
          onConfirm={handleConfirmarCierre}
        />
      )}
    </>
  );
};

export default DashboardPage;
