import { Circuit } from "../types";
import { Activity, ShieldAlert, Cpu, Wrench } from "lucide-react";

interface UnilinearSchematicProps {
  circuits: Circuit[];
  brand: string;
  model: string;
  refrigerantType: string;
  voltage: string;
  onNoteChange?: (note: string) => void;
  note?: string;
}

export default function UnilinearSchematic({
  circuits,
  brand,
  model,
  refrigerantType,
  voltage,
  onNoteChange,
  note = ""
}: UnilinearSchematicProps) {
  
  // Create an interactive, live SVG scheme
  const hasCircuits = circuits.length > 0;
  
  return (
    <div id="unilinear-schematic-card" className="bg-[#18181b] border border-zinc-800 text-zinc-100 p-4 sm:p-6 rounded-xl space-y-4 shadow-xl min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-400">
            <Cpu className="w-4.5 h-4.5" /> Esquema Unifilar & Circuito Refrigerante Dinámico
          </h4>
          <p className="text-[11px] text-zinc-400">
            Esquema interactivo generado automáticamente en base a la configuración de carga y compresores.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800 text-zinc-300">
          <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> SISTEMA SIMULADO
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative bg-[#0d0d0d] rounded-lg p-2 overflow-x-auto border border-zinc-800">
        <svg
          id="hvac-pro-unilinear-svg"
          viewBox="0 0 800 380"
          className="w-full min-w-[520px] sm:min-w-[650px] h-auto text-slate-300 stroke-slate-500 fill-none"
        >
          {/* Defs for arrows / markers */}
          <defs>
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
            <marker id="arrow-red" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f87171" />
            </marker>
            <pattern id="diagonal-stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#334155" strokeWidth="2" />
            </pattern>
          </defs>

          {/* GRID BACKGROUND */}
          <rect width="800" height="380" fill="url(#diagonal-stripes)" opacity="0.3" rx="4" />

          {/* MAIN COMPONENT BOUNDARY */}
          <rect x="20" y="20" width="760" height="340" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" rx="8" />
          <text x="35" y="40" fill="#64748b" className="text-[10px] font-mono uppercase tracking-widest">{brand || "SISTEMA"} / {model || "UNIDAD"}</text>

          {/* ELECTRICAL POWER SOURCE LINE */}
          <path d="M 50 70 L 180 70" stroke="#f59e0b" strokeWidth="2.5" />
          <circle cx="50" cy="70" r="4.5" fill="#f59e0b" />
          <text x="60" y="62" fill="#ef4444" className="text-[9px] font-mono font-extrabold uppercase">ALIMENTACIÓN: {voltage || "220V/3Ph"}</text>
          
          {/* Main Contactor / Breaker icon */}
          <path d="M 180 70 L 200 55" stroke="#f59e0b" strokeWidth="2.5" />
          <path d="M 200 70 L 240 70" stroke="#f59e0b" strokeWidth="2" />
          <text x="175" y="48" fill="#f59e0b" className="text-[8px] font-bold">KM1 (Contactor Principal)</text>

          {/* Sub Busbar for Circuits */}
          <path d="M 240 70 L 240 160" stroke="#f59e0b" strokeWidth="2" strokeDasharray="1,1" />

          {/* REFRIGERANT CIRCUITS GENERATOR INSIDE SVG */}
          {hasCircuits ? (
            circuits.slice(0, 2).map((crt, index) => {
              const yOffset = index * 120;
              const connY = 100 + index * 50;

              // Color determination
              const colorCkt = crt.status === "active" ? "#10b981" : 
                               crt.status === "warning" ? "#f59e0b" : 
                               crt.status === "error" ? "#ef4444" : "#64748b";

              return (
                <g key={crt.id} id={`svg-circuit-${index}`}>
                  {/* Bus power breaker */}
                  <path d={`M 240 ${connY} L 280 ${connY}`} stroke="#f59e0b" strokeWidth="1.5" />
                  <path d={`M 283 ${connY} M 283 ${connY}`} stroke={colorCkt} />
                  
                  {/* Circuit Main Frame Rectangle */}
                  <rect x="290" y={60 + yOffset} width="460" height="105" rx="6" fill="#020617" stroke={colorCkt} strokeWidth="1.5" />
                  <text x="302" y={78 + yOffset} fill={colorCkt} className="text-[10px] font-bold font-mono uppercase">{crt.name} ({refrigerantType || "refrigerante"})</text>
                  <text x="680" y={78 + yOffset} fill="#475569" className="text-[9px] font-mono">Carga: {crt.refrigerantChargeInput}</text>

                  {/* Compressor Symbol */}
                  <line x1="340" y1={120 + yOffset} x2="340" y2={100 + yOffset} stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="340" cy="120 + yOffset" r="16" fill="#0f172a" stroke={colorCkt} strokeWidth="2" />
                  <text x="330" y={115 + yOffset} fill="#f8fafc" className="text-[10px] font-extrabold font-mono">COMP</text>
                  <text x="325" y={127 + yOffset} fill="#64748b" className="text-[8px]">1~ Motor</text>

                  {/* High and Low pressure gauges */}
                  <circle cx="410" cy={100 + yOffset} r="8" stroke="#38bdf8" strokeWidth="1" />
                  <line x1="410" y1={108 + yOffset} x2="410" y2={118 + yOffset} stroke="#38bdf8" strokeWidth="1" />
                  <text x="402" y={91 + yOffset} fill="#38bdf8" className="text-[8px] font-bold">LP: {crt.suctionPressure} PSI</text>

                  <circle cx="510" cy={100 + yOffset} r="8" stroke="#f87171" strokeWidth="1" />
                  <line x1="510" y1={108 + yOffset} x2="510" y2={118 + yOffset} stroke="#f87171" strokeWidth="1" />
                  <text x="502" y={91 + yOffset} fill="#f87171" className="text-[8px] font-bold">HP: {crt.dischargePressure} PSI</text>

                  {/* Expansion valve symbol */}
                  <path d={`M 590 ${110 + yOffset} L 610 ${125 + yOffset} L 590 ${125 + yOffset} L 610 ${110 + yOffset} Z`} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
                  <text x="585" y={100 + yOffset} fill="#cbd5e1" className="text-[8px] font-mono">TXV (Válvula)</text>

                  {/* Refrigerant Flow Lines */}
                  {/* Suction Line (Blue, cold gas) */}
                  <path d={`M 356 ${120 + yOffset} L 400 ${120 + yOffset}`} stroke="#38bdf8" strokeWidth="2.5" markerStart="url(#arrow-blue)" />
                  <path d={`M 420 ${120 + yOffset} C 460 ${120 + yOffset}, 470 ${140 + yOffset}, 530 ${140 + yOffset}`} stroke="#38bdf8" strokeWidth="2" strokeDasharray="2,2" />
                  <text x="430" y={135 + yOffset} fill="#38bdf8" className="text-[8px] font-mono">Sobrecalentamiento: {crt.superheat || "0"} °K</text>

                  {/* Discharge Line (Red, hot liquid) */}
                  <path d={`M 515 ${120 + yOffset} L 585 ${120 + yOffset}`} stroke="#f87171" strokeWidth="2.5" markerStart="url(#arrow-red)" />
                  <path d={`M 612 ${120 + yOffset} L 670 ${120 + yOffset}`} stroke="#10b981" strokeWidth="2" />
                  <text x="618" y={135 + yOffset} fill="#10b981" className="text-[8px] font-mono">Subenfriamiento: {crt.subcooling || "0"} °K</text>
                </g>
              );
            })
          ) : (
            // Fallback default schematic drawing (empty state)
            <g id="svg-fallback-drawing">
              <rect x="290" y="60" width="460" height="230" rx="6" fill="#020617" stroke="#334155" />
              <text x="520" y="160" textAnchor="middle" fill="#64748b" className="text-xs">
                Configure circuitos de refrigeración abajo para ver
              </text>
              <text x="520" y="180" textAnchor="middle" fill="#475569" className="text-[10px] font-mono">
                el esquema mecánico unifilar dinámico
              </text>
            </g>
          )}

          {/* Evaporator Indicator Left */}
          <rect x="28" y="220" width="160" height="110" rx="4" fill="#020617" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
          <text x="40" y="240" fill="#38bdf8" className="text-[9px] font-bold font-mono">SERPENTÍN EVAPORADOR</text>
          <path d="M 40 260 H 170 V 275 H 40 V 290 H 170" stroke="#38bdf8" strokeWidth="1.5" />
          <text x="45" y="315" fill="#475569" className="text-[8px]">Sección de Enfriamiento</text>
        </svg>
      </div>

      {/* Note input below schematic */}
      <div id="schematic-note-container" className="flex flex-col space-y-1.5">
        <label className="text-xs font-semibold text-zinc-550 text-zinc-500 flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5" /> Notas Adicionales sobre el Esquema Eléctrico/Unifilar:
        </label>
        <textarea
          id="electric-scheme-note-input"
          value={note}
          onChange={(e) => onNoteChange?.(e.target.value)}
          placeholder="Ej: Se observa caída de tensión en KM1 durante el arranque del primer compresor. Se recomienda cambio de capacitor de marcha..."
          className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 max-h-24"
        />
      </div>
    </div>
  );
}
