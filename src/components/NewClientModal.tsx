import React, { useState, useEffect } from "react";
import { AdminSettings } from "../types";
import { 
  Building, X, Plus, Trash2, ShieldCheck, Info, Sparkles, MapPin, Mail, User, Briefcase
} from "lucide-react";

interface NewClientModalProps {
  adminSettings: AdminSettings;
  onSave: (updatedSettings: AdminSettings, newlyCreatedClient: string, firstBranch: string, contactEmail: string) => void;
  onClose: () => void;
}

interface SubBranch {
  id: string;
  type: string;
  code: string;
  name: string;
  address: string;
  region: string;
  sameContact: boolean;
  contactName: string;
  contactRole: string;
  contactEmail: string;
}

const REGIONS_LIST = [
  "Región Metropolitana de Santiago",
  "Región de Valparaíso",
  "Región del Bío Bío",
  "Región de la Araucanía",
  "Región de Antofagasta",
  "Región de Coquimbo",
  "Región de O'Higgins",
  "Región del Maule",
  "Región de los Lagos",
  "Región de Tarapacá",
  "Región de Atacama",
  "Región de Arica y Parinacota",
  "Región de los Ríos",
  "Región de Ñuble",
  "Región de Aysén",
  "Región de Magallanes"
];

const INITIAL_SUB_TEMPLATE = (index: number): SubBranch => ({
  id: `sub-${Date.now()}-${index}`,
  type: "TIENDA",
  code: "EJ. 21-STK",
  name: "",
  address: "",
  region: "HEREDAR REGIÓN (METROPOLITANA DE SANTIAGO)",
  sameContact: true,
  contactName: "",
  contactRole: "",
  contactEmail: ""
});

export default function NewClientModal({ adminSettings, onSave, onClose }: NewClientModalProps) {
  const [clientName, setClientName] = useState("");
  const [direcciónMatriz, setDirecciónMatriz] = useState("");
  const [regionSelected, setRegionSelected] = useState("Región Metropolitana de Santiago");
  
  // Contacto comercial
  const [personaContacto, setPersonaContacto] = useState("");
  const [cargoContacto, setCargoContacto] = useState("");
  const [correoContacto, setCorreoContacto] = useState("");

  // Sucursales
  const [noBranches, setNoBranches] = useState(false);
  const [subs, setSubs] = useState<SubBranch[]>([INITIAL_SUB_TEMPLATE(0)]);

  // If regionSelected changes, update the "HEREDAR REGIÓN..." label in subs
  const getSubRegionLabel = (sub: SubBranch) => {
    if (sub.region.startsWith("HEREDAR REGIÓN")) {
      return `HEREDAR REGIÓN (${regionSelected.toUpperCase()})`;
    }
    return sub.region;
  };

  const addSub = () => {
    setSubs(prev => [...prev, INITIAL_SUB_TEMPLATE(prev.length)]);
  };

  const removeSub = (id: string) => {
    if (subs.length === 1) return; // keep at least one if possible
    setSubs(prev => prev.filter(sub => sub.id !== id));
  };

  const updateSub = (id: string, updatedFields: Partial<SubBranch>) => {
    setSubs(prev => prev.map(sub => {
      if (sub.id === id) {
        const newSub = { ...sub, ...updatedFields };
        // If sameContact is checked or turned on, copy parent contact info
        if (newSub.sameContact) {
          newSub.contactName = personaContacto;
          newSub.contactRole = cargoContacto;
          newSub.contactEmail = correoContacto;
        }
        return newSub;
      }
      return sub;
    }));
  };

  // Sync parent contact to subs with sameContact checked
  useEffect(() => {
    setSubs(prev => prev.map(sub => {
      if (sub.sameContact) {
        return {
          ...sub,
          contactName: personaContacto,
          contactRole: cargoContacto,
          contactEmail: correoContacto
        };
      }
      return sub;
    }));
  }, [personaContacto, cargoContacto, correoContacto]);

  const handleSave = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const trimmedClientName = clientName.trim();
    if (!trimmedClientName) {
      alert("Por favor ingrese el Nombre o Razón Social del cliente.");
      return;
    }

    if (adminSettings.clients.includes(trimmedClientName)) {
      alert("Este cliente ya existe en el sistema.");
      return;
    }

    // Determine target branches
    let finalBranches: string[] = [];
    if (noBranches) {
      finalBranches = ["Casa Matriz"];
    } else {
      finalBranches = subs
        .map(sub => sub.name.trim())
        .filter(name => name.length > 0);
      
      if (finalBranches.length === 0) {
        finalBranches = ["Casa Matriz"];
      }
    }

    // Prepare updated settings
    const updatedSettings = {
      ...adminSettings,
      clients: [...adminSettings.clients, trimmedClientName],
      branches: {
        ...adminSettings.branches,
        [trimmedClientName]: finalBranches
      }
    };

    // Save extended details map
    try {
      const existingStr = localStorage.getItem("hvac_client_extended_details") || "{}";
      const extendedDetails = JSON.parse(existingStr);
      
      if (noBranches) {
        extendedDetails[`${trimmedClientName}_Casa Matriz`] = {
          contactName: personaContacto,
          contactRole: cargoContacto,
          contactEmail: correoContacto,
          address: direcciónMatriz,
          region: regionSelected
        };
      } else {
        subs.forEach(sub => {
          const bName = sub.name.trim() || "Casa Matriz";
          extendedDetails[`${trimmedClientName}_${bName}`] = {
            contactName: sub.contactName || personaContacto,
            contactRole: sub.contactRole || cargoContacto,
            contactEmail: sub.contactEmail || correoContacto,
            address: sub.address || direcciónMatriz,
            region: sub.region.startsWith("HEREDAR") ? regionSelected : sub.region
          };
        });
      }
      localStorage.setItem("hvac_client_extended_details", JSON.stringify(extendedDetails));
    } catch (err) {
      console.error("Could not save extended client details to localStorage", err);
    }

    // Final callback
    const firstBranch = finalBranches[0];
    const firstBranchEmail = noBranches ? correoContacto : (subs[0]?.contactEmail || correoContacto);
    
    // Explicitly update all dependent states if necessary (though the callback handles most)
    onSave(updatedSettings, trimmedClientName, firstBranch, firstBranchEmail);
  };

  return (
    <div id="new-client-modal-backdrop" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div 
        id="new-client-form" 
        className="bg-[#0f0f11] w-full max-w-3xl rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col my-8 scrollbar-thin"
      >
        {/* Header decoration */}
        <div className="bg-[#121214] px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-zinc-150 uppercase tracking-wider">Nuevo Cliente</h2>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-0.5">Alta de Cliente y Multi-Sucursales (Subs)</p>
            </div>
          </div>
          <button
            type="button"
            id="close-client-modal"
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 rounded-xl transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          
          {/* Main Info */}
          <div className="bg-[#18181b]/50 border border-zinc-800/60 p-5 rounded-2xl space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Nombre o Razón Social</label>
              <input
                required
                type="text"
                placeholder="Por ejemplo: Aguas Andinas S.A."
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full text-xs border border-zinc-800 rounded px-3 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Dirección Matriz</label>
                <input
                  type="text"
                  placeholder="Por ejemplo: Av. Libertador Bernardo O'Higgins 1120"
                  value={direcciónMatriz}
                  onChange={(e) => setDirecciónMatriz(e.target.value)}
                  className="w-full text-[#ebebeb] text-xs border border-zinc-800 rounded px-3 py-2 bg-[#0c0c0e] text-zinc-155 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Región</label>
                <select
                  value={regionSelected}
                  onChange={(e) => setRegionSelected(e.target.value)}
                  className="w-full text-xs border border-zinc-800 rounded px-3 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {REGIONS_LIST.map(reg => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contacto Comercial section */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-extrabold text-blue-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800/50 pb-2">
              Contacto Comercial
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#18181b]/30 p-5 border border-zinc-800/40 rounded-2xl">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Persona de Contacto</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-550" />
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={personaContacto}
                    onChange={(e) => setPersonaContacto(e.target.value)}
                    className="w-full text-xs border border-zinc-800 rounded pl-8 pr-3 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Cargo</label>
                <div className="relative">
                  <Briefcase className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-550" />
                  <input
                    type="text"
                    placeholder="Ej. Gerente de Operaciones"
                    value={cargoContacto}
                    onChange={(e) => setCargoContacto(e.target.value)}
                    className="w-full text-xs border border-zinc-800 rounded pl-8 pr-3 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Correo de Contacto</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-550" />
                  <input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={correoContacto}
                    onChange={(e) => setCorreoContacto(e.target.value)}
                    className="w-full text-xs border border-zinc-800 rounded pl-8 pr-3 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sucursales section header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2">
              <h3 className="text-[11px] font-extrabold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                Sucursales (Sub)
              </h3>
              {!noBranches && (
                <button
                  type="button"
                  id="add-sub-button"
                  onClick={addSub}
                  className="flex items-center gap-1.5 text-[10px] font-extrabold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer active:scale-95 transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Sub
                </button>
              )}
            </div>

            {/* No sucursal Checkbox */}
            <label className="flex items-center gap-2 text-xs text-zinc-350 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={noBranches}
                onChange={(e) => setNoBranches(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span>El cliente no tiene sucursal, pero la dirección será la sucursal</span>
            </label>

            {/* Helper Banner */}
            <div className="bg-blue-950/15 border border-blue-900/30 p-3 rounded-xl flex items-start gap-2.5 text-blue-300">
              <Info className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
              <div className="text-[10px] leading-relaxed">
                <span className="font-extrabold uppercase tracking-wide block">Formato final de codificación:</span>
                LA CODIFICACIÓN FINAL DE CADA TAG CONSTARÁ DEL FORMATO: <strong className="font-mono text-blue-200 font-bold">[CÓDIGO_SUB(4)].[TIPO_EQUIPO(3)].[CORRELATIVO(4)]</strong>
              </div>
            </div>

            {/* Branch Blocks Container */}
            {!noBranches && (
              <div className="space-y-4">
                {subs.map((sub, idx) => (
                  <div key={sub.id} className="bg-[#121214] border border-zinc-800 p-5 rounded-2xl relative space-y-4">
                    {/* Header SUB with delete button */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold bg-blue-600/10 text-blue-400 border border-blue-600/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Sub {idx + 1}
                      </span>
                      {subs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSub(sub.id)}
                          className="p-1 hover:bg-zinc-800 text-rose-500 hover:text-rose-450 rounded-lg cursor-pointer"
                          title="Eliminar esta sucursal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Inputs Row 1: Tipo, Codificador, Nombre */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Tipo</label>
                        <select
                          value={sub.type}
                          onChange={(e) => updateSub(sub.id, { type: e.target.value })}
                          className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none cursor-pointer"
                        >
                          <option value="TIENDA">TIENDA</option>
                          <option value="OFICINA">OFICINA</option>
                          <option value="CENTRO DE DISTRIBUCIÓN">CENTRO DE DISTRIBUCIÓN</option>
                          <option value="BODEGA">BODEGA</option>
                          <option value="PLANTA INDUSTRIAL">PLANTA INDUSTRIAL</option>
                          <option value="OTRO">OTRO</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Codificador (8 Caracteres)</label>
                        <input
                          type="text"
                          maxLength={8}
                          placeholder="Ej. 21-STK"
                          value={sub.code}
                          onChange={(e) => updateSub(sub.id, { code: e.target.value })}
                          className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Nombre de la Sucursal</label>
                        <input
                          required
                          type="text"
                          placeholder="Nombre Identificador"
                          value={sub.name}
                          onChange={(e) => updateSub(sub.id, { name: e.target.value })}
                          className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Inputs Row 2: Dirección, Región de la sucursal */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Dirección sucursal</label>
                        <input
                          type="text"
                          placeholder="Dirección de la instalación"
                          value={sub.address}
                          onChange={(e) => updateSub(sub.id, { address: e.target.value })}
                          className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Región de la sucursal</label>
                        <select
                          value={sub.region}
                          onChange={(e) => updateSub(sub.id, { region: e.target.value })}
                          className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none cursor-pointer"
                        >
                          <option value="HEREDAR">
                            {`HEREDAR REGIÓN (${regionSelected.toUpperCase()})`}
                          </option>
                          {REGIONS_LIST.map(reg => (
                            <option key={reg} value={reg}>{reg}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Checkbox: Mismo datos de contacto */}
                    <label className="flex items-center gap-2 text-[11px] text-zinc-350 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sub.sameContact}
                        onChange={(e) => updateSub(sub.id, { sameContact: e.target.checked })}
                        className="rounded border-zinc-700 bg-zinc-950 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>¿MISMOS DATOS DE CONTACTO DEL CLIENTE?</span>
                    </label>

                    {/* Site Contact Details (Disabled or loaded based on sameContact) */}
                    {!sub.sameContact && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-800/40 pt-3">
                        <div>
                          <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Persona de Contacto del Sitio</label>
                          <input
                            type="text"
                            placeholder="Ej. Pedro Pérez"
                            value={sub.contactName}
                            onChange={(e) => updateSub(sub.id, { contactName: e.target.value })}
                            className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cargo de Contacto</label>
                          <input
                            type="text"
                            placeholder="Ej. Jefe de Local"
                            value={sub.contactRole}
                            onChange={(e) => updateSub(sub.id, { contactRole: e.target.value })}
                            className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Correo de Contacto</label>
                          <input
                            type="email"
                            placeholder="contacto@sucursal.com"
                            value={sub.contactEmail}
                            onChange={(e) => updateSub(sub.id, { contactEmail: e.target.value })}
                            className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 bg-[#0c0c0e] text-zinc-150 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Panel Footer */}
        <div className="bg-[#121214] px-6 py-4 border-t border-zinc-800 flex justify-end gap-3.5">
          <button
            type="button"
            id="cancel-new-client"
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 text-xs font-bold rounded-xl transition cursor-pointer uppercase tracking-wider"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            id="save-new-client"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl active:scale-95 transition cursor-pointer uppercase tracking-wider"
          >
            Guardar Cliente
          </button>
        </div>
      </div>
    </div>
  );
}
