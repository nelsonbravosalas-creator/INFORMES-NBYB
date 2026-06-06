import { Circuit, Compressor } from "../types";
import { Plus, Trash2, Zap, Thermometer, Wind, CheckCircle, AlertTriangle, Play, Square, XCircle } from "lucide-react";
import { calculateSatTemp } from "../utils/refrigerantPt";

interface CircuitArchitectureProps {
  circuits: Circuit[];
  onChange: (updatedCircuits: Circuit[]) => void;
  refrigerantType?: string;
}

export default function CircuitArchitecture({ circuits, onChange, refrigerantType = "R410A" }: CircuitArchitectureProps) {
  
  const addCircuit = () => {
    const newCircuitId = `cir_${Date.now()}`;
    const newCircuit: Circuit = {
      id: newCircuitId,
      name: `Circuito ${circuits.length + 1}`,
      refrigerantChargeInput: "3.5 kg",
      status: "active",
      suctionPressure: "115",
      dischargePressure: "340",
      superheat: "8",
      subcooling: "6",
      compressors: [
        {
          id: `comp_${newCircuitId}_1`,
          name: "Compresor 1",
          status: "active",
          amperage: "12.5",
          voltage: "220",
          phaseType: "monofasico",
          amperageR: "12.5",
          amperageS: "12.5",
          amperageT: "12.5"
        }
      ]
    };
    onChange([...circuits, newCircuit]);
  };

  const removeCircuit = (circuitId: string) => {
    const updated = circuits.filter(c => c.id !== circuitId);
    // Rename existing circuits for consistency
    const renamed = updated.map((c, i) => ({
      ...c,
      name: `Circuito ${i + 1}`
    }));
    onChange(renamed);
  };

  const updateCircuit = (circuitId: string, fields: Partial<Circuit>) => {
    const updated = circuits.map(c => {
      if (c.id === circuitId) {
        return { ...c, ...fields };
      }
      return c;
    });
    onChange(updated);
  };

  const addCompressor = (circuitId: string) => {
    const targetCircuit = circuits.find(c => c.id === circuitId);
    if (!targetCircuit) return;

    const newCompressor: Compressor = {
      id: `comp_${Date.now()}`,
      name: `Compresor ${targetCircuit.compressors.length + 1}`,
      status: "active",
      amperage: "11.0",
      voltage: "220",
      phaseType: "monofasico",
      amperageR: "11.0",
      amperageS: "11.0",
      amperageT: "11.0"
    };

    updateCircuit(circuitId, {
      compressors: [...targetCircuit.compressors, newCompressor]
    });
  };

  const removeCompressor = (circuitId: string, compressorId: string) => {
    const targetCircuit = circuits.find(c => c.id === circuitId);
    if (!targetCircuit) return;

    const filteredCompressors = targetCircuit.compressors.filter(comp => comp.id !== compressorId);
    const renamedCompressors = filteredCompressors.map((comp, i) => ({
      ...comp,
      name: `Compresor ${i + 1}`
    }));

    updateCircuit(circuitId, {
      compressors: renamedCompressors
    });
  };

  const updateCompressor = (circuitId: string, compressorId: string, fields: Partial<Compressor>) => {
    const targetCircuit = circuits.find(c => c.id === circuitId);
    if (!targetCircuit) return;

    const updatedCompressors = targetCircuit.compressors.map(comp => {
      if (comp.id === compressorId) {
        return { ...comp, ...fields };
      }
      return comp;
    });

    updateCircuit(circuitId, {
      compressors: updatedCompressors
    });
  };

  return (
    <div id="circuit-architecture-root" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 animate-pulse" /> Arquitectura de Circuitos Refrigerantes
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Gestione compresores, presiones, sobrecalentamiento y subenfriamiento por circuito técnico.
          </p>
        </div>
        <button
          id="add-circuit-btn"
          type="button"
          onClick={addCircuit}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Agregar Circuito
        </button>
      </div>

      {circuits.length === 0 ? (
        <div id="empty-circuits-alert" className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-slate-950/20">
          <p className="text-sm text-slate-500 mb-2">No hay circuitos registrados todavía.</p>
          <button
            id="empty-add-ckt-btn"
            type="button"
            onClick={addCircuit}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            Añadir primer circuito ahora
          </button>
        </div>
      ) : (
        <div id="circuits-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-full">
          {circuits.map((circuit, cIdx) => (
            <div
              id={`circuit-card-${circuit.id}`}
              key={circuit.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col w-full max-w-full"
            >
              {/* Header */}
              <div className="bg-slate-50/80 dark:bg-slate-900/40 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{circuit.name}</span>
                  <select
                    id={`circuit-status-${circuit.id}`}
                    value={circuit.status}
                    onChange={(e) => updateCircuit(circuit.id, { status: e.target.value as any })}
                    className={`text-xs font-bold rounded px-2 py-0.5 border ${
                      circuit.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" :
                      circuit.status === "warning" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" :
                      circuit.status === "error" ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" :
                      "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <option value="active">Activo (OK)</option>
                    <option value="warning">Alerta</option>
                    <option value="error">Falla Crítica</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
                <button
                  id={`remove-ctk-btn-${circuit.id}`}
                  type="button"
                  onClick={() => removeCircuit(circuit.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Eliminar circuito"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4 flex-1 w-full overflow-hidden">
                {/* Specs Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Carga Gas Refrigerante [kg]</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-0 top-0 bottom-0 px-2 flex items-center justify-center bg-zinc-900 border-r border-zinc-800 rounded-l text-[10px] font-bold text-blue-400 font-mono select-none">
                        KG
                      </div>
                      <input
                        id={`garcharge-${circuit.id}`}
                        type="text"
                        value={circuit.refrigerantChargeInput}
                        onChange={(e) => updateCircuit(circuit.id, { refrigerantChargeInput: e.target.value })}
                        placeholder="Ej. R-410A / 4.5kg"
                        className="w-full text-xs border border-zinc-800 rounded pl-[2.4rem] pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#0c0c0e] dark:text-zinc-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Presión de Succión (Alta-Baja)</label>
                    <div className="flex gap-1.5 items-center">
                      <input
                        id={`sucpress-${circuit.id}`}
                        type="text"
                        value={circuit.suctionPressure}
                        onChange={(e) => updateCircuit(circuit.id, { suctionPressure: e.target.value })}
                        placeholder="Baja (PSI)"
                        className="w-1/2 text-center text-xs border border-zinc-800 rounded px-1.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#0c0c0e] dark:bg-zinc-950 dark:text-zinc-200"
                      />
                      <span className="text-[10px] text-zinc-500">/</span>
                      <input
                        id={`dispress-${circuit.id}`}
                        type="text"
                        value={circuit.dischargePressure}
                        onChange={(e) => updateCircuit(circuit.id, { dischargePressure: e.target.value })}
                        placeholder="Alta (PSI)"
                        className="w-1/2 text-center text-xs border border-zinc-800 rounded px-1.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#0c0c0e] dark:bg-zinc-950 dark:text-zinc-200"
                      />
                    </div>
                    {/* Live calculated saturation temperatures */}
                    {(() => {
                      const LP_Raw = circuit.suctionPressure.replace(/[^\d.-]/g, "");
                      const LP_CleanVal = parseFloat(LP_Raw) || 0;
                      const LP_IsBar = circuit.suctionPressure.toLowerCase().includes("bar") || LP_CleanVal < 35;
                      const evapVal = calculateSatTemp(refrigerantType, LP_CleanVal, LP_IsBar ? "bar" : "psi");

                      const HP_Raw = circuit.dischargePressure.replace(/[^\d.-]/g, "");
                      const HP_CleanVal = parseFloat(HP_Raw) || 0;
                      const HP_IsBar = circuit.dischargePressure.toLowerCase().includes("bar") || HP_CleanVal < 70;
                      const condVal = calculateSatTemp(refrigerantType, HP_CleanVal, HP_IsBar ? "bar" : "psi");

                      const fmtDec = (v: number) => v.toFixed(1).replace(".", ",");

                      return (
                        <div className="flex justify-between items-center mt-1 px-1 text-[9px] text-zinc-400 font-sans">
                          <span>Espera Temp Evap (Te): <strong className="text-blue-400">{fmtDec(evapVal)} °C</strong></span>
                          <span>Cond Temp (Tc): <strong className="text-red-400">{fmtDec(condVal)} °C</strong></span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Subcooler & Superheat */}
                <div className="bg-[#0f0f0f] p-3 rounded-lg border border-zinc-850 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-blue-400 tracking-wider block mb-1">Sobrecalentamiento (SH)</span>
                    <div className="flex gap-1.5 items-center">
                      <input
                        id={`sh-${circuit.id}`}
                        type="text"
                        value={circuit.superheat}
                        onChange={(e) => updateCircuit(circuit.id, { superheat: e.target.value })}
                        placeholder="Ej. 8"
                        className="w-full max-w-[80px] text-center text-xs border border-zinc-800 rounded bg-[#0f0f0f] dark:bg-zinc-950 dark:text-zinc-200 py-1"
                      />
                      <span className="text-[11px] text-zinc-500 shrink-0">°K / °C</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-emerald-400 tracking-wider block mb-1">Subenfriamiento (SC)</span>
                    <div className="flex gap-1.5 items-center">
                      <input
                        id={`sc-${circuit.id}`}
                        type="text"
                        value={circuit.subcooling}
                        onChange={(e) => updateCircuit(circuit.id, { subcooling: e.target.value })}
                        placeholder="Ej. 6"
                        className="w-full max-w-[80px] text-center text-xs border border-zinc-800 rounded bg-[#0f0f0f] dark:bg-zinc-950 dark:text-zinc-200 py-1"
                      />
                      <span className="text-[11px] text-zinc-500 shrink-0">°K / °C</span>
                    </div>
                  </div>
                </div>

                {/* Compressors Management */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-350">Compresores del Circuito</span>
                    <button
                      id={`add-comp-btn-${circuit.id}`}
                      type="button"
                      onClick={() => addCompressor(circuit.id)}
                      className="text-[11px] text-blue-400 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      + Añadir Compresor
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {circuit.compressors.map((comp, compIdx) => {
                      const isTrifasico = comp.phaseType === "trifasico";
                      return (
                        <div
                          id={`comp-${circuit.id}-${comp.id}`}
                          key={comp.id}
                          className="bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-zinc-850 p-3 rounded-lg space-y-2.5"
                        >
                          {/* Top controls */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {comp.status === "active" && <Play className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                              {comp.status === "inactive" && <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                              {comp.status === "fault" && <XCircle className="w-3.5 h-3.5 text-rose-500 animate-bounce shrink-0" />}
                              
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{comp.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Phase Select */}
                              <select
                                id={`comp-phase-${comp.id}`}
                                value={comp.phaseType || "monofasico"}
                                onChange={(e) => updateCompressor(circuit.id, comp.id, { phaseType: e.target.value as any })}
                                className="text-[10px] font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-zinc-800 rounded px-1 py-0.5 cursor-pointer text-slate-700 dark:text-slate-350"
                              >
                                <option value="monofasico">Monofásico (1Ф)</option>
                                <option value="trifasico">Trifásico (3Ф)</option>
                              </select>

                              {/* Status Select */}
                              <select
                                id={`comp-status-${comp.id}`}
                                value={comp.status}
                                onChange={(e) => updateCompressor(circuit.id, comp.id, { status: e.target.value as any })}
                                className="text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1 py-0.5 cursor-pointer text-slate-700 dark:text-slate-350"
                              >
                                <option value="active">En Marcha</option>
                                <option value="inactive">Detenido</option>
                                <option value="fault">En Falla</option>
                              </select>

                              <button
                                id={`del-comp-btn-${comp.id}`}
                                type="button"
                                onClick={() => removeCompressor(circuit.id, comp.id)}
                                className="bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 rounded p-1 transition cursor-pointer"
                                title="Remover compresor"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Inputs Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            {/* Voltage Input */}
                            <div className={`${isTrifasico ? "sm:col-span-1" : "sm:col-span-2"} flex items-center gap-1 bg-white dark:bg-slate-950 px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded`}>
                              <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">Volt:</span>
                              <input
                                id={`comp-volt-${comp.id}`}
                                type="text"
                                value={comp.voltage}
                                onChange={(e) => updateCompressor(circuit.id, comp.id, { voltage: e.target.value })}
                                placeholder="220"
                                className="w-full text-xs dark:text-slate-200 select-all border-none focus:outline-none p-0.5 bg-transparent text-center font-mono"
                              />
                              <span className="text-[9px] text-slate-400 shrink-0">V</span>
                            </div>

                            {/* Amperage Inputs */}
                            {!isTrifasico ? (
                              <div className="sm:col-span-2 flex items-center gap-1 bg-white dark:bg-slate-950 px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded">
                                <span className="text-[9px] text-blue-400 font-bold uppercase shrink-0">Amp (1Ф):</span>
                                <input
                                  id={`comp-amp-${comp.id}`}
                                  type="text"
                                  value={comp.amperage}
                                  onChange={(e) => updateCompressor(circuit.id, comp.id, { amperage: e.target.value })}
                                  placeholder="12.0"
                                  className="w-full text-xs dark:text-slate-200 select-all border-none focus:outline-none p-0.5 bg-transparent text-center font-mono font-semibold"
                                />
                                <span className="text-[9px] text-slate-400 shrink-0 font-bold">A</span>
                              </div>
                            ) : (
                              <div className="sm:col-span-3 grid grid-cols-3 gap-1.5">
                                <div className="flex items-center gap-0.5 bg-white dark:bg-slate-950 px-1 py-1 border border-slate-200 dark:border-slate-800 rounded">
                                  <span className="text-[9px] text-amber-500 font-extrabold shrink-0">R:</span>
                                  <input
                                    id={`comp-amp-r-${comp.id}`}
                                    type="text"
                                    value={comp.amperageR || comp.amperage || "12.0"}
                                    onChange={(e) => updateCompressor(circuit.id, comp.id, { amperageR: e.target.value, amperage: e.target.value })}
                                    placeholder="R"
                                    className="w-full text-center text-xs dark:text-slate-200 select-all border-none focus:outline-none p-0.2 bg-transparent font-mono"
                                  />
                                  <span className="text-[8px] text-slate-500 shrink-0">A</span>
                                </div>
                                <div className="flex items-center gap-0.5 bg-white dark:bg-slate-950 px-1 py-1 border border-slate-200 dark:border-slate-800 rounded">
                                  <span className="text-[9px] text-emerald-500 font-extrabold shrink-0">S:</span>
                                  <input
                                    id={`comp-amp-s-${comp.id}`}
                                    type="text"
                                    value={comp.amperageS || comp.amperage || "12.0"}
                                    onChange={(e) => updateCompressor(circuit.id, comp.id, { amperageS: e.target.value })}
                                    placeholder="S"
                                    className="w-full text-center text-xs dark:text-slate-200 select-all border-none focus:outline-none p-0.2 bg-transparent font-mono"
                                  />
                                  <span className="text-[8px] text-slate-500 shrink-0">A</span>
                                </div>
                                <div className="flex items-center gap-0.5 bg-white dark:bg-slate-950 px-1 py-1 border border-slate-200 dark:border-slate-800 rounded">
                                  <span className="text-[9px] text-rose-500 font-extrabold shrink-0">T:</span>
                                  <input
                                    id={`comp-amp-t-${comp.id}`}
                                    type="text"
                                    value={comp.amperageT || comp.amperage || "12.0"}
                                    onChange={(e) => updateCompressor(circuit.id, comp.id, { amperageT: e.target.value })}
                                    placeholder="T"
                                    className="w-full text-center text-xs dark:text-slate-200 select-all border-none focus:outline-none p-0.2 bg-transparent font-mono"
                                  />
                                  <span className="text-[8px] text-slate-500 shrink-0">A</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
