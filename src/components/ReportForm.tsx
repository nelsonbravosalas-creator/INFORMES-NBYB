import React, { useState, useEffect } from "react";
import { HVACReport, AdminSettings, Circuit, InspectionChecklistItem } from "../types";
import { DEFAULT_CHECKLIST_TEMPLATE } from "../constants";
import NameplateOCR from "./NameplateOCR";
import CircuitArchitecture from "./CircuitArchitecture";
import UnilinearSchematic from "./UnilinearSchematic";
import ChecklistEvidence from "./ChecklistEvidence";
import SignaturePad from "./SignaturePad";
import NewClientModal from "./NewClientModal";
import { 
  FileText, ArrowLeft, Save, FileCheck, Check, AlertCircle, Sparkles,
  Info, ShieldCheck, Thermometer, Wind, Zap, MessageCircle, Plus, Target
} from "lucide-react";

interface ReportFormProps {
  report: HVACReport | null; // Null means create new
  adminSettings: AdminSettings;
  onSave: (report: HVACReport) => void;
  onClose: () => void;
  onUpdateAdminSettings?: (settings: AdminSettings) => void;
}

export default function ReportForm({ report, adminSettings, onSave, onClose, onUpdateAdminSettings }: ReportFormProps) {
  // Setup local states starting from report or dynamic defaults
  const [folio, setFolio] = useState("");
  const [date, setDate] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [clientContactName, setClientContactName] = useState("");
  const [clientContactRole, setClientContactRole] = useState("");
  const [clientLocationAddress, setClientLocationAddress] = useState("");
  const [clientRegion, setClientRegion] = useState("");

  // Ficha técnica
  const [equipmentId, setEquipmentId] = useState("");
  const [correlative, setCorrelative] = useState<number | undefined>(undefined);
  const [correlativeLabel, setCorrelativeLabel] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [criticality, setCriticality] = useState<'altamente_critico' | 'critico' | 'no_critico'>("no_critico");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [refrigerantType, setRefrigerantType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [voltage, setVoltage] = useState("");
  const [amperage, setAmperage] = useState("");

  // Mediciones
  const [ambientTemp, setAmbientTemp] = useState("28 °C");
  const [returnTemp, setReturnTemp] = useState("24 °C");
  const [supplyTemp, setSupplyTemp] = useState("14 °C");
  const [fanAmperage, setFanAmperage] = useState("2.8");
  const [setPoint, setSetPoint] = useState("22 °C");

  // Dynamic circuits list
  const [circuits, setCircuits] = useState<Circuit[]>([]);

  // Checklist
  const [checklist, setChecklist] = useState<InspectionChecklistItem[]>([]);

  // Unilinear note
  const [electricSchemeNote, setElectricSchemeNote] = useState("");

  // Signatures
  const [techSign, setTechSign] = useState("");
  const [clientSign, setClientSign] = useState("");
  const [techNameSign, setTechNameSign] = useState("");
  const [clientNameSign, setClientNameSign] = useState("");

  // General comments & Overall operation status
  const [generalComments, setGeneralComments] = useState("");
  const [overallStatus, setOverallStatus] = useState<"excellent" | "normal" | "requires_action" | "critical">("normal");

  const [ocrError, setOcrError] = useState("");
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);

  const [isAddingTech, setIsAddingTech] = useState(false);
  const [newTechName, setNewTechName] = useState("");

  const handleAddTechnician = () => {
    const trimmed = newTechName.trim();
    if (!trimmed) return;
    
    if (adminSettings.techs.includes(trimmed)) {
      setTechnicianName(trimmed);
      setIsAddingTech(false);
      setNewTechName("");
      return;
    }

    const updatedTechs = [...adminSettings.techs, trimmed];
    const updatedSettings = {
      ...adminSettings,
      techs: updatedTechs
    };

    if (onUpdateAdminSettings) {
      onUpdateAdminSettings(updatedSettings);
    }
    
    setTechnicianName(trimmed);
    setIsAddingTech(false);
    setNewTechName("");
  };

  const findClientRecord = (name: string) =>
    adminSettings.clientRecords?.find(c => c.name === name);

  const findBranchRecord = (cName: string, bName: string) =>
    findClientRecord(cName)?.subs?.find(s => s.name === bName || s.code === bName);

  const updateTenantIds = (cName: string, bName: string) => {
    const clientRecord = findClientRecord(cName);
    const branchRecord = clientRecord?.subs?.find(s => s.name === bName || s.code === bName);
    setClientId(clientRecord?.id || "");
    setBranchId(branchRecord?.id || "");
  };

  // Helper to load client and branch attributes from extended details with smart fallbacks
  const updateClientInfoFromDatabase = (cName: string, bLocation: string) => {
    if (!cName) return;
    try {
      const existingStr = localStorage.getItem("hvac_client_extended_details") || "{}";
      const extendedDetails = JSON.parse(existingStr);
      const key = `${cName}_${bLocation || "Casa Matriz"}`;
      const info = extendedDetails[key];
      if (info) {
        setClientContactName(info.contactName || "");
        setClientContactRole(info.contactRole || "");
        setClientLocationAddress(info.address || "");
        setClientRegion(info.region || "Región Metropolitana");
        if (info.contactEmail) {
          setClientEmail(info.contactEmail);
        }
      } else {
        // Dynamic smart fallback placeholders matching Chile's layout
        setClientContactName("Encargado de Operaciones");
        setClientContactRole("Supervisor de Mantención");
        setClientLocationAddress(`Av. Industrial, Sector ${bLocation || "Central"}`);
        setClientRegion("Región Metropolitana");
      }
    } catch (err) {
      console.warn("Error reading extended client details", err);
    }
  };

  // Load report data or default structures on mounting
  useEffect(() => {
    if (report) {
      setFolio(report.folio);
      setDate(report.date);
      setTechnicianName(report.technicianName);
      setClientId(report.clientId || "");
      setClientName(report.clientName);
      setClientEmail(report.clientEmail);
      setBranchId(report.branchId || report.siteId || "");
      setBranchLocation(report.branchLocation);
      setClientContactName(report.clientContactName || "");
      setClientContactRole(report.clientContactRole || "");
      setClientLocationAddress(report.clientLocationAddress || "");
      setClientRegion(report.clientRegion || "");

      setEquipmentId(report.equipmentId || "");
      setCorrelative(report.correlative);
      setCorrelativeLabel(report.correlativeLabel || "");
      setEquipmentType(report.equipmentType);
      setCriticality(report.criticality || "no_critico");
      setBrand(report.brand);
      setModel(report.model);
      setSerialNumber(report.serialNumber);
      setRefrigerantType(report.refrigerantType);
      setCapacity(report.capacity);
      setVoltage(report.voltage);
      setAmperage(report.amperage);
      setAmbientTemp(report.ambientTemp);
      setReturnTemp(report.returnTemp);
      setSupplyTemp(report.supplyTemp);
      setFanAmperage(report.fanAmperage);
      setSetPoint(report.setPoint || "22 °C");
      setCircuits(report.circuits || []);
      setChecklist(report.checklist || []);
      setElectricSchemeNote(report.electricSchemeNote || "");
      setGeneralComments(report.generalComments || "");
      setOverallStatus(report.overallStatus || "normal");
      
      setTechSign(report.signatures?.technicianSignature || "");
      setClientSign(report.signatures?.clientSignature || "");
      setTechNameSign(report.signatures?.technicianName || report.technicianName);
      setClientNameSign(report.signatures?.clientName || report.clientName);
    } else {
      // Create new report state defaults
      const generatedFolio = `FOL-${Date.now().toString().slice(-6)}`;
      setFolio(generatedFolio);
      setDate(new Date().toISOString().split("T")[0]);
      setTechnicianName(adminSettings.techs[0] || "");
      
      const initialClient = adminSettings.clients[0] || "";
      const initialClientRecord = findClientRecord(initialClient);
      setClientId(initialClientRecord?.id || "");
      setClientName(initialClient);
      setClientEmail("");
      
      // Auto-set first branch if matches client
      const clientBranches = adminSettings.branches[initialClient] || [];
      const initialBranch = clientBranches[0] || "";
      const initialBranchRecord = initialClientRecord?.subs?.find(s => s.name === initialBranch || s.code === initialBranch);
      setBranchId(initialBranchRecord?.id || "");
      setBranchLocation(initialBranch);
      setEquipmentId("");
      setCorrelative(undefined);
      setCorrelativeLabel("");

      // Load linked metadata
      updateClientInfoFromDatabase(initialClient, initialBranch);

      // Default technical specifications
      setEquipmentType(adminSettings.equipmentTypes[0] || "");
      setCriticality("no_critico");
      setBrand(adminSettings.brands[0] || "");
      setRefrigerantType(adminSettings.refrigerants[0] || "");
      setCapacity("36,000 BTU / 3 TR");
      setVoltage("220V / 3Ph / 60Hz");
      setAmperage("12.5");
      setSetPoint("22 °C");

      // Checklist template
      setChecklist(JSON.parse(JSON.stringify(DEFAULT_CHECKLIST_TEMPLATE)));

      // Circuits template empty
      setCircuits([]);
    }
  }, [report, adminSettings]);

  // Handle client change list and dynamic branch population
  const handleClientChange = (cName: string) => {
    setClientName(cName);
    const clientRecord = findClientRecord(cName);
    setClientId(clientRecord?.id || "");
    const clientBranches = adminSettings.branches[cName] || [];
    const firstBranch = clientBranches[0] || "";
    const branchRecord = clientRecord?.subs?.find(s => s.name === firstBranch || s.code === firstBranch);
    setBranchId(branchRecord?.id || "");
    setBranchLocation(firstBranch);
    updateClientInfoFromDatabase(cName, firstBranch);
  };

  const handleBranchChange = (bLoc: string) => {
    setBranchLocation(bLoc);
    setBranchId(findBranchRecord(clientName, bLoc)?.id || "");
    updateClientInfoFromDatabase(clientName, bLoc);
  };

  const handleAddNewClient = (updatedSettings: AdminSettings, newlyCreatedClient: string, firstBranch: string, contactEmail: string) => {
    if (onUpdateAdminSettings) {
      onUpdateAdminSettings(updatedSettings);
    }
    const clientRecord = updatedSettings.clientRecords?.find(c => c.name === newlyCreatedClient);
    const branchRecord = clientRecord?.subs?.find(s => s.name === firstBranch || s.code === firstBranch);
    setClientId(clientRecord?.id || "");
    setBranchId(branchRecord?.id || "");
    setClientName(newlyCreatedClient);
    setBranchLocation(firstBranch);
    setClientEmail(contactEmail);
    setIsNewClientOpen(false);
  };

  // OCR Fill-in helper
  const handleOCRExtracted = (data: {
    brand: string;
    model: string;
    serialNumber: string;
    refrigerantType: string;
    capacity: string;
    voltage: string;
    amperage: string;
  }) => {
    setOcrError("");
    setOcrSuccess(true);
    if (data.brand) setBrand(data.brand);
    if (data.model) setModel(data.model);
    if (data.serialNumber) setSerialNumber(data.serialNumber);
    if (data.refrigerantType) setRefrigerantType(data.refrigerantType);
    if (data.capacity) setCapacity(data.capacity);
    if (data.voltage) setVoltage(data.voltage);
    if (data.amperage) setAmperage(data.amperage);

    setTimeout(() => setOcrSuccess(false), 5000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalizedReport: HVACReport = {
      id: report?.id || `rep_${Date.now()}`,
      folio,
      timestamp: new Date().toISOString(),
      date,
      technicianName,
      clientId,
      clientName,
      clientEmail,
      branchId,
      siteId: branchId,
      branchLocation,
      clientContactName,
      clientContactRole,
      clientLocationAddress,
      clientRegion,
      equipmentId,
      correlative,
      correlativeLabel,
      brand,
      model,
      serialNumber,
      refrigerantType,
      capacity,
      voltage,
      amperage,
      equipmentType,
      criticality,
      ambientTemp,
      returnTemp,
      supplyTemp,
      fanAmperage,
      setPoint,
      circuits,
      checklist,
      electricSchemeNote,
      generalComments,
      overallStatus,
      signatures: {
        technicianName: techNameSign || technicianName,
        technicianSignature: techSign,
        clientName: clientNameSign || clientName,
        clientSignature: clientSign,
        signDate: date
      }
    };

    onSave(finalizedReport);
  };

  return (
    <form id="hvac-report-creation-form" onSubmit={handleSubmit} className="space-y-8 animate-fade-in pb-12">
      
      {/* Upper navigation header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2.5">
          <button
            id="back-list-btn"
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-zinc-100 flex items-center gap-1.5 uppercase tracking-wide">
              <FileText className="w-5 h-5 text-blue-400" /> {report ? "Editar Informe HVAC" : "Nuevo Informe HVAC Pro"}
            </h2>
            <p className="text-xs text-zinc-500">Completa y firma digitalmente la inspección técnica.</p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            id="cancel-report-btn"
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-350 text-xs font-semibold rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            id="submit-report-btn"
            type="submit"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md active:scale-95 transition"
          >
            <Save className="w-4 h-4" /> Guardar Informe
          </button>
        </div>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: General metadata & Team inputs (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Metadata Card: Folio, Date & Technician */}
          <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" /> Información General de la Inspección
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Folio (ID Uníco)</label>
                <input
                  id="form-folio-field"
                  type="text"
                  required
                  value={folio}
                  onChange={(e) => setFolio(e.target.value)}
                  className="w-full text-xs font-bold border border-zinc-800 bg-zinc-950 text-blue-400 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Fecha Inspección</label>
                <input
                  id="form-date-field"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-zinc-950 text-zinc-200"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-zinc-300">Técnico Certificado</label>
                  <button
                    type="button"
                    onClick={() => setIsAddingTech(!isAddingTech)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 transition-all font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Agregar Técnico
                  </button>
                </div>
                
                {isAddingTech ? (
                  <div className="flex gap-1.5 border border-zinc-800 p-1 rounded bg-zinc-900/60">
                    <input
                      type="text"
                      placeholder="Nombre Técnico"
                      value={newTechName}
                      onChange={(e) => setNewTechName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTechnician();
                        }
                      }}
                      className="flex-1 text-xs px-2 py-1.5 bg-zinc-950 border border-zinc-850 rounded text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddTechnician}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-[10px] uppercase transition cursor-pointer"
                    >
                      Sumar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingTech(false);
                        setNewTechName("");
                      }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded font-bold text-[10px] uppercase transition cursor-pointer"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <select
                    id="form-tech-select"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-zinc-950 text-zinc-200"
                  >
                    {adminSettings.techs.map(tech => (
                      <option key={tech} value={tech}>{tech}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {(clientId || branchId || equipmentId || correlativeLabel) && (
              <div className="text-[10px] text-zinc-500 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 font-mono break-all">
                ID_Cliente: {clientId || "pendiente"} | ID_Sitio: {branchId || "pendiente"} | ID_Equipo: {equipmentId || "se asigna al sincronizar"} | ID_Correlativo: {correlativeLabel || "0000..9999"}
              </div>
            )}
          </div>

          {/* Client & Branch Card */}
          <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Cuenta del Cliente & Localización
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-zinc-300">Cliente Asociado</label>
                  <button
                    type="button"
                    onClick={() => setIsNewClientOpen(true)}
                    className="text-[10px] bg-blue-600/10 border border-blue-500/20 hover:bg-blue-500/15 text-blue-400 font-bold px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 uppercase tracking-wide"
                  >
                    <Plus className="w-3 h-3" /> Nuevo Cliente
                  </button>
                </div>
                {adminSettings.clients.length === 0 ? (
                  <span className="text-[11px] text-rose-400 italic block">Cargue o cree un cliente</span>
                ) : (
                  <select
                    id="form-client-select"
                    value={clientName}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#0c0c0e] text-zinc-200"
                  >
                    {adminSettings.clients.map(cli => (
                      <option key={cli} value={cli}>{cli}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-zinc-300">Sucursal o Edificio</label>
                  {clientName && (
                    <button
                      type="button"
                      onClick={() => {
                        const newBrc = window.prompt("Ingrese el nombre de la nueva sucursal o edificio para este cliente:");
                        if (newBrc && newBrc.trim()) {
                          const trimmed = newBrc.trim();
                          const updatedBranches = { ...adminSettings.branches };
                          const current = updatedBranches[clientName] || [];
                          if (!current.includes(trimmed)) {
                            updatedBranches[clientName] = [...current, trimmed];
                            if (onUpdateAdminSettings) {
                              onUpdateAdminSettings({
                                ...adminSettings,
                                branches: updatedBranches
                              });
                            }
                          }
                          setBranchLocation(trimmed);
                          updateClientInfoFromDatabase(clientName, trimmed);
                        }
                      }}
                      className="text-[10px] bg-blue-600/10 border border-blue-500/20 hover:bg-blue-500/15 text-blue-400 font-bold px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 uppercase tracking-wide"
                    >
                      <Plus className="w-3 h-3" /> Nueva Sucursal
                    </button>
                  )}
                </div>
                {!clientName ? (
                  <select id="form-branch-select-disabled" disabled className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 bg-zinc-900/40 text-zinc-500">
                    <option>Seleccione Cliente</option>
                  </select>
                ) : (
                  <select
                    id="form-branch-select"
                    value={branchLocation}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#0c0c0e] text-zinc-200"
                  >
                    {(() => {
                      const branches = adminSettings.branches[clientName] || [];
                      const list = [...branches];
                      if (branchLocation && !list.includes(branchLocation)) {
                        list.push(branchLocation);
                      }
                      if (list.length === 0) {
                        return (
                          <>
                            <option value="">-- No hay sucursales/sitios --</option>
                            {branchLocation && <option value={branchLocation}>{branchLocation}</option>}
                          </>
                        );
                      }
                      return list.map(brc => (
                        <option key={brc} value={brc}>{brc}</option>
                      ));
                    })()}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Correo de Notificaciones</label>
                <input
                  id="form-client-email-input"
                  type="email"
                  required
                  placeholder="ejemplo@cliente.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#0c0c0e] text-zinc-200"
                />
              </div>
            </div>

            {/* Client detail fields linked to the selections */}
            <div id="linked-client-details-container" className="border-t border-zinc-800/80 pt-4.5 space-y-4">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">
                Detalles del Cliente Vinculados
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Nombre Cliente</label>
                  <input
                    id="form-client-detail-name"
                    type="text"
                    required
                    placeholder="ej. Plaza Central Mall"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#0c0c0e] text-zinc-250 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Responsable</label>
                  <input
                    id="form-client-detail-contact-name"
                    type="text"
                    placeholder="Persona de Contacto"
                    value={clientContactName}
                    onChange={(e) => setClientContactName(e.target.value)}
                    className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#0c0c0e] text-zinc-250"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Cargo</label>
                  <input
                    id="form-client-detail-role"
                    type="text"
                    placeholder="ej. Supervisor Mantención"
                    value={clientContactRole}
                    onChange={(e) => setClientContactRole(e.target.value)}
                    className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#0c0c0e] text-zinc-250"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Ubicación / Dir.</label>
                  <input
                    id="form-client-detail-address"
                    type="text"
                    placeholder="ej. Av. Providencia #1020"
                    value={clientLocationAddress}
                    onChange={(e) => setClientLocationAddress(e.target.value)}
                    className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#0c0c0e] text-zinc-250"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Región</label>
                  <input
                    id="form-client-detail-region"
                    type="text"
                    placeholder="Región Metropolitana"
                    value={clientRegion}
                    onChange={(e) => setClientRegion(e.target.value)}
                    className="w-full text-xs border border-zinc-800 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#0c0c0e] text-zinc-250"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI nameplate assist button */}
          <NameplateOCR
            onDataExtracted={handleOCRExtracted}
            onError={(msg) => {
              setOcrError(msg);
              setTimeout(() => setOcrError(""), 6000);
            }}
          />

          {ocrError && (
            <div id="ocr-error-badge" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" /> {ocrError}
            </div>
          )}

          {ocrSuccess && (
            <div id="ocr-success-badge" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> Ficha del compresor auto-completada con éxito desde placa.
            </div>
          )}

          {/* Specification fields */}
          <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" /> Ficha Técnica de la Unidad
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Tipo de Equipo</label>
                <select
                  id="form-eq-type-select"
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 dark:bg-slate-950 dark:text-slate-200"
                >
                  {adminSettings.equipmentTypes.map(eq => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Marca</label>
                <select
                  id="form-brand-select"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 dark:bg-slate-950 dark:text-slate-200"
                >
                  {adminSettings.brands.map(br => (
                    <option key={br} value={br}>{br}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Modelo exacto</label>
                <input
                  id="form-model-input"
                  type="text"
                  required
                  placeholder="Ej. KCA360A"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Número de Serie</label>
                <input
                  id="form-serial-input"
                  type="text"
                  required
                  placeholder="Ej. 1650A43210"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Tipo Gas Refrigerante</label>
                <select
                  id="form-refrig-select"
                  value={refrigerantType}
                  onChange={(e) => setRefrigerantType(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 dark:bg-slate-950 dark:text-slate-200"
                >
                  {adminSettings.refrigerants.map(ref => (
                    <option key={ref} value={ref}>{ref}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Capacidad (BTU/TR)</label>
                <input
                  id="form-capacity-input"
                  type="text"
                  placeholder="Ej. 36000 BTU / 3 TR"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Voltaje / Fases</label>
                <input
                  id="form-voltage-input"
                  type="text"
                  placeholder="Ej. 220V/3Ph/60Hz"
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Corriente FLA / Amps Max</label>
                <input
                  id="form-amperage-input"
                  type="text"
                  placeholder="Ej. 15.4 A"
                  value={amperage}
                  onChange={(e) => setAmperage(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Criticidad del Equipo</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <select
                      id="form-criticality-select"
                      value={criticality}
                      onChange={(e) => setCriticality(e.target.value as any)}
                      className={`w-full text-xs font-bold border rounded pl-2.5 pr-8 py-1.5 bg-[#0c0c0e] text-zinc-150 appearance-none focus:outline-none focus:ring-1 ${
                        criticality === "altamente_critico" 
                          ? "border-rose-900/60 focus:ring-rose-500 text-rose-400" 
                          : criticality === "critico" 
                            ? "border-amber-900/60 focus:ring-amber-500 text-amber-400" 
                            : "border-emerald-900/60 focus:ring-emerald-500 text-emerald-450"
                      }`}
                    >
                      <option value="no_critico" className="text-zinc-200 bg-zinc-950">🟢 No Crítico</option>
                      <option value="critico" className="text-zinc-200 bg-zinc-950">🟡 Crítico</option>
                      <option value="altamente_critico" className="text-zinc-200 bg-zinc-950">🔴 Altamente Crítico</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-zinc-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Icon/Simbology indicator */}
                  <div className="flex items-center shrink-0">
                    {criticality === "altamente_critico" && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider rounded animate-pulse shadow-sm shadow-rose-900/10">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Altamente Crítico</span>
                      </div>
                    )}
                    {criticality === "critico" && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded shadow-sm shadow-amber-900/10">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Crítico</span>
                      </div>
                    )}
                    {criticality === "no_critico" && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-[10px] font-black uppercase tracking-wider rounded shadow-sm shadow-emerald-900/10">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>No Crítico</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Measurements inputs */}
          <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400 animate-pulse" /> Mediciones Físicas
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Temperatura Ambiente</label>
                <div className="flex bg-zinc-950 rounded border border-zinc-800 items-center px-2">
                  <Thermometer className="w-4 h-4 text-zinc-500" />
                  <input
                    id="form-ambient-temp-input"
                    type="text"
                    value={ambientTemp}
                    onChange={(e) => setAmbientTemp(e.target.value)}
                    className="w-full text-xs border-0 bg-transparent py-1.5 focus:ring-0 focus:outline-none font-bold text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Temperatura Retorno</label>
                <div className="flex bg-zinc-950 rounded border border-zinc-800 items-center px-2">
                  <Wind className="w-4 h-4 text-blue-400" />
                  <input
                    id="form-return-temp-input"
                    type="text"
                    value={returnTemp}
                    onChange={(e) => setReturnTemp(e.target.value)}
                    className="w-full text-xs border-0 bg-transparent py-1.5 focus:ring-0 focus:outline-none font-bold text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Temperatura Inyección</label>
                <div className="flex bg-zinc-950 rounded border border-zinc-800 items-center px-2">
                  <Wind className="w-4 h-4 text-emerald-400" />
                  <input
                    id="form-supply-temp-input"
                    type="text"
                    value={supplyTemp}
                    onChange={(e) => setSupplyTemp(e.target.value)}
                    className="w-full text-xs border-0 bg-transparent py-1.5 focus:ring-0 focus:outline-none font-bold text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Set Point</label>
                <div className="flex bg-zinc-950 rounded border border-zinc-800 items-center px-2">
                  <Target className="w-4 h-4 text-blue-400" />
                  <input
                    id="form-set-point-input"
                    type="text"
                    value={setPoint}
                    onChange={(e) => setSetPoint(e.target.value)}
                    className="w-full text-xs border-0 bg-transparent py-1.5 focus:ring-0 focus:outline-none font-bold text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Amperaje Turbina (Fan)</label>
                <div className="flex bg-zinc-950 rounded border border-zinc-800 items-center px-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <input
                    id="form-fan-amp-input"
                    type="text"
                    value={fanAmperage}
                    onChange={(e) => setFanAmperage(e.target.value)}
                    className="w-full text-xs border-0 bg-transparent py-1.5 focus:ring-0 focus:outline-none font-bold text-zinc-100"
                  />
                  <span className="text-zinc-500 text-xs ml-1">A</span>
                </div>
              </div>
            </div>
          </div>

          {/* Refrigeration Circuit management */}
          <div className="bg-[#18181b] border border-zinc-800 p-3.5 sm:p-5 rounded-2xl shadow-sm w-full overflow-hidden">
            <CircuitArchitecture circuits={circuits} onChange={setCircuits} refrigerantType={refrigerantType} />
          </div>

          {/* Dynamic Unilinear Drawing */}
          <UnilinearSchematic
            circuits={circuits}
            brand={brand}
            model={model}
            refrigerantType={refrigerantType}
            voltage={voltage}
            note={electricSchemeNote}
            onNoteChange={setElectricSchemeNote}
          />

        </div>

        {/* Right Side: Maintenance checklist + comments + signatures (1 col) */}
        <div className="space-y-6">
          
          {/* Status general report */}
          <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>Calificación del Diagnóstico</span>
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                id="sum-status-excellent-btn"
                type="button"
                onClick={() => setOverallStatus("excellent")}
                className={`p-3 border text-xs font-bold rounded-xl transition cursor-pointer ${
                  overallStatus === "excellent"
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-zinc-800 hover:bg-zinc-800/40 text-zinc-300"
                }`}
              >
                Excelente
              </button>
              <button
                id="sum-status-normal-btn"
                type="button"
                onClick={() => setOverallStatus("normal")}
                className={`p-3 border text-xs font-bold rounded-xl transition cursor-pointer ${
                  overallStatus === "normal"
                    ? "bg-sky-500 border-sky-500 text-white"
                    : "border-zinc-800 hover:bg-zinc-800/45 text-zinc-300"
                }`}
              >
                Operativo (Ok)
              </button>
              <button
                id="sum-status-warn-btn"
                type="button"
                onClick={() => setOverallStatus("requires_action")}
                className={`p-3 border text-xs font-bold rounded-xl transition cursor-pointer ${
                  overallStatus === "requires_action"
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "border-zinc-800 hover:bg-zinc-800/45 text-zinc-300"
                }`}
              >
                Alerta Técnica
              </button>
              <button
                id="sum-status-crit-btn"
                type="button"
                onClick={() => setOverallStatus("critical")}
                className={`p-3 border text-xs font-bold rounded-xl transition cursor-pointer ${
                  overallStatus === "critical"
                    ? "bg-rose-500 border-rose-500 text-white"
                    : "border-zinc-800 hover:bg-zinc-800/45 text-zinc-300"
                }`}
              >
                Falla Crítica
              </button>
            </div>
          </div>

          {/* Maintenance checklist block */}
          <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>Lista de Comprobación Preventiva</span>
            </h4>
            <ChecklistEvidence checklist={checklist} onChange={setChecklist} />
          </div>

          {/* Comments */}
          <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-2xl shadow-sm space-y-3">
            <h4 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-blue-400" /> Diagnóstico y Comentarios
            </h4>
            <textarea
              id="form-overall-comments-field"
              value={generalComments}
              onChange={(e) => setGeneralComments(e.target.value)}
              placeholder="Escriba aquí los comentarios generales del servicio técnico..."
              className="w-full text-xs min-h-[100px] border border-zinc-800 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-zinc-950 text-zinc-100"
            />
          </div>

          {/* Touch Signatures capture */}
          <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-2xl shadow-sm space-y-5">
            <h4 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-400" /> Captura de Firmas Certificadoras
            </h4>

            {/* Technician signature */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Nombre Técnico Firmante</label>
                <input
                  id="form-tech-sign-name"
                  type="text"
                  placeholder="Carlos Mendoza"
                  value={techNameSign}
                  onChange={(e) => setTechNameSign(e.target.value)}
                  className="w-full text-xs border border-zinc-800 rounded px-2.5 py-1.5 bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <SignaturePad
                id="technician-sign-pad"
                label="Firma del Técnico"
                initialValue={techSign}
                onSave={setTechSign}
              />
            </div>

            <hr className="border-zinc-800" />

            {/* Client Signature */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Nombre Representante Cliente</label>
                <input
                  id="form-client-sign-name"
                  type="text"
                  placeholder="ej. Nelson Bravo Salas"
                  value={clientNameSign}
                  onChange={(e) => setClientNameSign(e.target.value)}
                  className="w-full text-xs border border-zinc-800 rounded px-2.5 py-1.5 bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <SignaturePad
                id="client-sign-pad"
                label="Firma del Cliente (Conformidad)"
                initialValue={clientSign}
                onSave={setClientSign}
              />
            </div>
          </div>

        </div>

      </div>

      {/* Persistent footer control pane */}
      <div className="sticky bottom-4 inset-x-0 bg-black/90 backdrop-blur-md p-4 rounded-2xl border border-zinc-800 shadow-lg flex justify-end gap-3 z-30">
        <button
          id="form-btm-cancel"
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition cursor-pointer"
        >
          Cancelar
        </button>
        <button
          id="form-btm-save"
          type="submit"
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg transition cursor-pointer"
        >
          <Save className="w-4 h-4" /> Guardar y Registrar
        </button>
      </div>

      {isNewClientOpen && (
        <NewClientModal
          adminSettings={adminSettings}
          onSave={handleAddNewClient}
          onClose={() => setIsNewClientOpen(false)}
        />
      )}

    </form>
  );
}
