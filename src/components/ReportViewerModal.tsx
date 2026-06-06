import React from "react";
import { HVACReport, AdminSettings } from "../types";
import { generatePDFReport, exportReportAsHTML } from "../utils/pdf";
import { calculateSatTemp } from "../utils/refrigerantPt";
import { 
  X, FileText, Download, Edit3, Calendar, User, Mail, MapPin, 
  Settings, Zap, Shield, HelpCircle, Activity, CheckCircle2, 
  AlertTriangle, AlertOctagon, Check, ArrowDownCircle, ArrowUpCircle,
  ExternalLink, MoreVertical, Clock, Star, Target
} from "lucide-react";

interface ReportViewerModalProps {
  report: HVACReport | null;
  adminSettings: AdminSettings;
  onClose: () => void;
  onEdit: (report: HVACReport) => void;
}

export default function ReportViewerModal({ report, adminSettings, onClose, onEdit }: ReportViewerModalProps) {
  if (!report) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excellent":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 rounded-full uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" /> Excelente
          </span>
        );
      case "normal":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-blue-950/50 text-blue-400 border border-blue-900/40 rounded-full uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" /> Operativo (Ok)
          </span>
        );
      case "requires_action":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-amber-950/50 text-amber-400 border border-amber-900/40 rounded-full uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" /> Alerta Técnica
          </span>
        );
      case "critical":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-rose-950/50 text-rose-400 border border-rose-900/40 rounded-full uppercase tracking-wider">
            <AlertOctagon className="w-3.5 h-3.5" /> Falla Crítica
          </span>
        );
      default:
        return null;
    }
  };

  const getChecklistBadge = (status: "cumple" | "no_cumple" | "na") => {
    switch (status) {
      case "cumple":
        return (
          <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            Cumple
          </span>
        );
      case "no_cumple":
        return (
          <span className="bg-rose-950/40 text-rose-400 border border-rose-900/50 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            Falla
          </span>
        );
      case "na":
        return (
          <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            N/A
          </span>
        );
    }
  };

  return (
    <div id="report-view-modal-backdrop" className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div 
        id="report-view-modal-container" 
        className="bg-[#0c0c0e] w-full max-w-4xl rounded-2xl sm:rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-[#121214] px-4 py-3.5 sm:px-6 sm:py-4.5 border-b border-zinc-800 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black text-zinc-100 uppercase tracking-widest truncate">Visualización de Informe</h2>
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/40 border border-blue-900/40 px-2 py-0.5 rounded shrink-0">
                  {report.folio}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 truncate">Mantenimiento Preventivo y Ficha Técnica</p>
            </div>
          </div>
          
          <button
            type="button"
            id="close-report-view-modal"
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 rounded-xl transition cursor-pointer self-end sm:self-auto"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Modal Body Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 scrollbar-thin">
          
          {/* Section 1: Client and location details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#141416] border border-zinc-800/80 p-5 rounded-2xl">
            {/* Empresa y Logo */}
            {(adminSettings.companyName || adminSettings.logo) && (
              <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 border-b border-zinc-800/60 w-full mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                    <Shield className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest block">Empresa de Servicios:</span>
                    <h4 className="text-sm font-black text-zinc-100 uppercase tracking-wider">{adminSettings.companyName || "Empresa Registrada"}</h4>
                  </div>
                </div>
                {adminSettings.logo ? (
                  <div className="bg-zinc-900/50 border border-zinc-800 px-3 py-1.5 rounded-xl flex items-center justify-center max-h-12 overflow-hidden shrink-0">
                    <img 
                      src={adminSettings.logo} 
                      alt="Logo Empresa" 
                      className="max-h-9 object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="text-[9px] font-mono font-bold text-zinc-500 border border-zinc-800/60 rounded-lg px-2.5 py-1 uppercase bg-zinc-900/30">
                    Sin Logotipo Cargado
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-zinc-400 text-xs">
                <MapPin className="w-4 h-4 text-blue-400" />
                <div>
                  <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Cliente / Instalación</span>
                  <strong className="text-zinc-150 text-[13px]">{report.clientName}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 text-zinc-300 text-xs">
                <Settings className="w-4 h-4 text-zinc-500" />
                <div>
                  <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Sucursal o Edificando</span>
                  <span className="text-zinc-300 font-semibold">{report.branchLocation}</span>
                </div>
              </div>

              {/* Extra linked geographic specs */}
              {(report.clientLocationAddress || report.clientRegion) && (
                <div className="pt-2 border-t border-zinc-850 space-y-1.5">
                  {report.clientLocationAddress && (
                    <div className="text-[11px] text-zinc-400">
                      <span className="text-[8px] text-zinc-500 uppercase font-black tracking-wider block">Dirección Física:</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${report.clientLocationAddress}${report.clientRegion ? `, ${report.clientRegion}` : ""}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1 text-zinc-300 hover:text-blue-400 transition-colors font-medium leading-relaxed underline decoration-zinc-700 hover:decoration-blue-400/60 decoration-dashed underline-offset-2 cursor-pointer"
                        title="Ver ubicación en Google Maps"
                      >
                        <span>{report.clientLocationAddress}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-550 group-hover:text-blue-400 shrink-0 transition-colors" />
                      </a>
                    </div>
                  )}
                  {report.clientRegion && (
                    <div className="text-[11px] text-zinc-450">
                      <span className="text-[8px] text-zinc-500 uppercase font-black tracking-wider block">Región:</span>
                      <span className="text-zinc-300 font-medium">{report.clientRegion}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3 md:border-l md:border-zinc-800/80 md:pl-6">
              <div className="flex items-center gap-2 text-zinc-400 text-xs">
                <User className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Técnico Encargado</span>
                  <strong className="text-zinc-200">{report.technicianName}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 text-zinc-400 text-xs">
                <Mail className="w-4 h-4 text-zinc-500" />
                <div>
                  <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Correo Electrónico de Envío</span>
                  <span className="text-zinc-400 font-mono text-[11px]">{report.clientEmail}</span>
                </div>
              </div>

              {/* Extra contact person credentials */}
              {(report.clientContactName || report.clientContactRole) && (
                <div className="pt-2 border-t border-zinc-850 space-y-1.5">
                  {report.clientContactName && (
                    <div className="text-[11px] text-zinc-300">
                      <span className="text-[8px] text-zinc-500 uppercase font-black tracking-wider block">Responsable Autorizado:</span>
                      <strong>{report.clientContactName}</strong> {report.clientContactRole && <span className="text-zinc-500">({report.clientContactRole})</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Equipment Datasheet */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-blue-400 uppercase tracking-widest flex items-center justify-between">
              <span>1. Especificaciones de Ficha Técnica</span>
              {getStatusBadge(report.overallStatus)}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#121214] border border-zinc-850 p-3 rounded-xl">
                <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Tipo de Unidad</span>
                <strong className="text-zinc-200 text-xs">{report.equipmentType || "N/D"}</strong>
              </div>
              <div className="bg-[#121214] border border-zinc-850 p-3 rounded-xl">
                <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Marca Equipo</span>
                <strong className="text-zinc-200 text-xs">{report.brand || "N/D"}</strong>
              </div>
              <div className="bg-[#121214] border border-zinc-850 p-3 rounded-xl">
                <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Modelo</span>
                <strong className="text-zinc-200 text-xs">{report.model || "N/D"}</strong>
              </div>
              <div className="bg-[#121214] border border-zinc-850 p-3 rounded-xl">
                <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Nº de Serie</span>
                <strong className="text-zinc-200 text-xs font-mono break-all">{report.serialNumber || "N/D"}</strong>
              </div>

              <div className="bg-[#121214] border border-zinc-850 p-3 rounded-xl">
                <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Gas Refrigerante</span>
                <strong className="text-zinc-200 text-xs font-mono text-blue-400">{report.refrigerantType || "N/D"}</strong>
              </div>
              <div className="bg-[#121214] border border-zinc-850 p-3 rounded-xl">
                <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Capacidad Térmica</span>
                <strong className="text-zinc-200 text-xs">{report.capacity || "N/D"}</strong>
              </div>
              <div className="bg-[#121214] border border-zinc-850 p-3 rounded-xl">
                <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Alimentación Eléctrica</span>
                <strong className="text-zinc-200 text-xs">{report.voltage || "N/D"}</strong>
              </div>
              <div className="bg-[#121214] border border-zinc-850 p-3 rounded-xl">
                <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5 font-sans">Amperaje Nominal</span>
                <strong className="text-zinc-200 text-xs">{report.amperage ? `${report.amperage} A` : "N/D"}</strong>
              </div>

              <div className={`border p-3 rounded-xl flex flex-col justify-between transition-all ${
                report.criticality === "altamente_critico"
                  ? "border-rose-500/20 bg-rose-500/5 shadow-inner"
                  : report.criticality === "critico"
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-zinc-850 bg-[#121214]"
              }`}>
                <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Criticidad Unidad</span>
                <span className={`text-xs font-extrabold flex items-center gap-1.5 ${
                  report.criticality === "altamente_critico"
                    ? "text-rose-400"
                    : report.criticality === "critico"
                      ? "text-amber-400"
                      : "text-emerald-450"
                }`}>
                  {report.criticality === "altamente_critico" && (
                    <>
                      <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>🔴 Altamente Crítico</span>
                    </>
                  )}
                  {report.criticality === "critico" && (
                    <>
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                      <span>🟡 Crítico</span>
                    </>
                  )}
                  {(report.criticality === "no_critico" || !report.criticality) && (
                    <>
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                      <span>🟢 No Crítico</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Operations details */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-blue-400 uppercase tracking-widest border-b border-zinc-850 pb-1.5">
              2. Mediciones Operacionales Clínicas
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
              <div className="bg-[#141416] p-3 rounded-xl border border-zinc-850 flex items-center justify-between">
                <div>
                  <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Temp. Ambiente</span>
                  <span className="text-xs font-bold text-zinc-200">{report.ambientTemp || "N/D"}</span>
                </div>
                <Activity className="w-4 h-4 text-zinc-500" />
              </div>

              <div className="bg-[#141416] p-3 rounded-xl border border-zinc-850 flex items-center justify-between">
                <div>
                  <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Temp. Retorno</span>
                  <span className="text-xs font-bold text-zinc-200">{report.returnTemp || "N/D"}</span>
                </div>
                <Activity className="w-4 h-4 text-zinc-500" />
              </div>

              <div className="bg-[#141416] p-3 rounded-xl border border-zinc-850 flex items-center justify-between">
                <div>
                  <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Temp. Inyección</span>
                  <span className="text-xs font-bold text-zinc-200">{report.supplyTemp || "N/D"}</span>
                </div>
                <Activity className="w-4 h-4 text-zinc-500" />
              </div>

              <div className="bg-[#141416] p-3 rounded-xl border border-zinc-850 flex items-center justify-between">
                <div>
                  <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Set Point</span>
                  <span className="text-xs font-bold text-zinc-200">{report.setPoint || "N/D"}</span>
                </div>
                <Target className="w-4 h-4 text-blue-400" />
              </div>

              <div className="bg-[#141416] p-3 rounded-xl border border-zinc-850 flex items-center justify-between">
                <div>
                  <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block font-sans">Amp. Turbina Evap.</span>
                  <span className="text-xs font-bold text-zinc-200">{report.fanAmperage ? `${report.fanAmperage} A` : "N/D"}</span>
                </div>
                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Section 4: Circuit Architecture display */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-blue-400 uppercase tracking-widest border-b border-zinc-850 pb-1.5">
              3. Circuitos de Refrigeración e Histrión de Presión
            </h3>

            {(report.circuits || []).length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic">No se registraron circuitos mecánicos en este servicio.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 w-full max-w-full">
                {report.circuits.map((crt, itemIndex) => (
                  <div key={crt.id} className="bg-[#121214] border border-zinc-800 p-4 sm:p-5 rounded-2xl space-y-4 w-full overflow-hidden">
                    
                    {/* Circuit Title */}
                    <div className="flex flex-wrap gap-2 items-center justify-between border-b border-zinc-800/80 pb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-zinc-150 truncate">{crt.name}</span>
                        <span className="text-[9px] bg-blue-950/50 text-blue-400 border border-blue-900/40 px-1.5 py-0.2 rounded font-mono shrink-0">
                          {crt.refrigerantChargeInput}
                        </span>
                      </div>
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        crt.status === "active" ? "bg-emerald-950/50 text-emerald-400 border border-emerald-990" : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}>
                        {crt.status === "active" ? "En Marcha" : crt.status}
                      </span>
                    </div>

                    {/* Testo Smart App Digital Dashboard Mock-up (Full width segment) */}
                    <div className="bg-[#f2f5f9] border border-[#d9e3ed] rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 w-full relative">
                      
                      {/* Top Header Panel (Timer + Refrigerant Star) */}
                      <div className="flex items-center justify-between border-b border-[#e1e9f1] pb-3 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-black tracking-widest text-[#ff6600] font-sans">testo</span>
                          <span className="text-[10px] bg-[#e1e9f1] text-[#42526e] px-2 py-0.5 rounded-md font-black uppercase font-sans">Smart App</span>
                        </div>
                        
                        {/* Centered Timer Pill */}
                        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-[#e1eaef] hover:bg-[#d5e0e7] text-[#1c2c3e] rounded-full text-xs font-black tracking-wider transition-colors">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>00:00:00</span>
                        </div>

                        {/* Star Refrigerant Block matching the attached image */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#d6dfeb] rounded-xl text-teal-850 shadow-sm text-xs font-black">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          <span className="uppercase text-[#2c4058]">{report.refrigerantType || "R410A"}</span>
                          <span className="text-[8px] text-[#8fa1b4] font-sans ml-0.5 font-bold">⌃</span>
                        </div>
                      </div>

                      {/* Dynamic Gauges Grid (Left and Right Cards side-by-side matching original Testo image) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                        
                        {/* LEFT CARD: Low Pressure / Evaporation temperature (testo 549i • 070) */}
                        {(() => {
                          const gasType = report.refrigerantType || "R410A";
                          const LP_Raw = crt.suctionPressure.replace(/[^\d.-]/g, "");
                          const LP_CleanVal = parseFloat(LP_Raw) || 0;
                          
                          // Unit and Min/Max scaling auto-detection
                          const LP_IsBar = crt.suctionPressure.toLowerCase().includes("bar") || LP_CleanVal < 35;
                          const LP_Unit = LP_IsBar ? "bar" : "psi";
                          const LP_Min = LP_IsBar ? -1 : -10;
                          const LP_Max = LP_IsBar ? 15 : 200;
                          
                          // Percentage for drawing arc
                          const LP_Percent = Math.min(100, Math.max(0, ((LP_CleanVal - LP_Min) / (LP_Max - LP_Min)) * 100));
                          // Stroke dashoffset for circular arc length of 160
                          const LP_Offset = 160 - (160 * (LP_Percent / 100));
                          
                          // Accurate Evap Temp based on refrigerant P-T tables
                          const evapTemp = calculateSatTemp(gasType, LP_CleanVal, LP_IsBar ? "bar" : "psi");

                          // Decimal comma formatter
                          const fmtDec = (v: number, d = 1) => v.toFixed(d).replace(".", ",");

                          return (
                            <div className="bg-white border border-[#e2e7ed] rounded-3xl p-5 shadow-sm flex flex-col items-center justify-between text-center select-none hover:shadow-md transition-shadow relative h-[390px]">
                              {/* Card Header line */}
                              <div className="w-full flex items-center justify-between border-b border-[#f1f5f9] pb-2 mb-4">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5e7185] tracking-wide">
                                  <span>testo 549i</span>
                                  <span className="text-[#102435] font-bold font-sans opacity-90">• 070</span>
                                </div>
                                <button className="p-1 hover:bg-[#f6f9fc] rounded text-[#8da2b5] transition-colors" title="Opciones">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Circular Gauge */}
                              <div className="relative w-[216px] h-[216px] my-3 mx-auto flex items-center justify-center">
                                <svg className="w-[900px] h-[250px] -mt-[30px]" viewBox="0 0 100 100">
                                  {/* Background Track Arc */}
                                  <path 
                                    d="M 25 78 A 30 30 0 1 1 75 78" 
                                    className="stroke-[#c2d7e5]/40 fill-none"
                                    strokeWidth="5" 
                                    strokeLinecap="round"
                                  />
                                  {/* Active Deep Blue Track Accent matching Testo app */}
                                  <path 
                                    d="M 25 78 A 30 30 0 1 1 75 78" 
                                    className="stroke-[#0c6496] fill-none transition-all duration-700"
                                    strokeWidth="6" 
                                    strokeLinecap="round"
                                    strokeDasharray="160"
                                    strokeDashoffset={LP_Offset}
                                  />
                                  {/* Min label under arc terminus */}
                                  <text x="25" y="88" className="text-[7.5px] font-sans font-medium fill-[#516478]" textAnchor="middle">
                                    {LP_Min}
                                  </text>
                                  {/* Max label under arc terminus */}
                                  <text x="75" y="88" className="text-[7.5px] font-sans font-medium fill-[#516478]" textAnchor="middle">
                                    {LP_Max}
                                  </text>
                                </svg>
 
                                {/* Value overlay inside center */}
                                <div className="absolute top-[59%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-full pl-0 ml-0 mt-[10px]">
                                  <span className="text-[22px] font-normal text-[#102435] font-sans leading-none tracking-tight font-black text-center">
                                    {fmtDec(LP_CleanVal, LP_IsBar ? 2 : 1)}
                                  </span>
                                  <span className="text-[10px] text-[#5e7185] font-sans mt-1.5 font-bold text-center">
                                    {LP_Unit}
                                  </span>
                                </div>
                              </div>

                              {/* Target Temperature Footer Section */}
                              <div className="w-full pt-4 -mt-[25px] flex flex-col items-center border-t border-[#f1f5f9]">
                                <span className="text-sm text-[#5e7185] font-normal font-sans mb-1.5 font-medium">
                                  Temperatura Evaporación
                                </span>
                                <span className="text-[32px] font-normal text-[#0c6496] font-sans tracking-tight">
                                  {fmtDec(evapTemp, 1)} <span className="text-xl align-baseline ml-0.5">°C</span>
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* RIGHT CARD: High Pressure / Condensation temperature */}
                        {(() => {
                          const gasType = report.refrigerantType || "R410A";
                          const HP_Raw = crt.dischargePressure.replace(/[^\d.-]/g, "");
                          const HP_CleanVal = parseFloat(HP_Raw) || 0;
                          
                          // Unit and Min/Max scaling auto-detection
                          const HP_IsBar = crt.dischargePressure.toLowerCase().includes("bar") || HP_CleanVal < 70;
                          const HP_Unit = HP_IsBar ? "bar" : "psi";
                          const HP_Min = HP_IsBar ? -1 : -10;
                          const HP_Max = HP_IsBar ? 60 : 400;
                          
                          // Percentage for drawing arc
                          const HP_Percent = Math.min(100, Math.max(0, ((HP_CleanVal - HP_Min) / (HP_Max - HP_Min)) * 100));
                          // Stroke dashoffset
                          const HP_Offset = 160 - (160 * (HP_Percent / 100));
                          
                          // Accurate Cond Temp based on refrigerant P-T tables
                          const condTemp = calculateSatTemp(gasType, HP_CleanVal, HP_IsBar ? "bar" : "psi");

                          // Decimal comma formatter
                          const fmtDec = (v: number, d = 1) => v.toFixed(d).replace(".", ",");

                          return (
                            <div className="bg-white border border-[#e2e7ed] rounded-3xl p-5 shadow-sm flex flex-col items-center justify-between text-center select-none hover:shadow-md transition-shadow relative h-[390px]">
                              {/* Card Header line */}
                              <div className="w-full flex items-center justify-between border-b border-[#f1f5f9] pb-2 mb-4">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5e7185] tracking-wide">
                                  <span>testo 549i</span>
                                  <span className="text-[#102435] font-bold font-sans opacity-90">• 008</span>
                                </div>
                                <button className="p-1 hover:bg-[#f6f9fc] rounded text-[#8da2b5] transition-colors" title="Opciones">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Circular Gauge */}
                              <div className="relative w-[216px] h-[216px] my-3 mx-auto flex items-center justify-center">
                                <svg className="w-[900px] h-[250px] ml-0 -mt-[30px]" viewBox="0 0 100 100">
                                  {/* Background Track Arc */}
                                  <path 
                                    d="M 25 78 A 30 30 0 1 1 75 78" 
                                    className="stroke-[#fbe2e4]/45 fill-none"
                                    strokeWidth="5" 
                                    strokeLinecap="round"
                                  />
                                  {/* Active Coral Red Track Accent */}
                                  <path 
                                    d="M 25 78 A 30 30 0 1 1 75 78" 
                                    className="stroke-[#e3373b] fill-none transition-all duration-700"
                                    strokeWidth="6" 
                                    strokeLinecap="round"
                                    strokeDasharray="160"
                                    strokeDashoffset={HP_Offset}
                                  />
                                  {/* Min label under arc terminus */}
                                  <text x="25" y="88" className="text-[7.5px] font-sans font-medium fill-[#516478]" textAnchor="middle">
                                    {HP_Min}
                                  </text>
                                  {/* Max label under arc terminus */}
                                  <text x="75" y="88" className="text-[7.5px] font-sans font-medium fill-[#516478]" textAnchor="middle">
                                    {HP_Max}
                                  </text>
                                </svg>
 
                                {/* Value overlay inside center */}
                                <div className="absolute top-[59%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-full mt-[10px]">
                                  <span className="text-[22px] font-normal text-[#102435] font-sans leading-none tracking-tight font-black text-center">
                                    {fmtDec(HP_CleanVal, HP_IsBar ? 2 : 1)}
                                  </span>
                                  <span className="text-[10px] text-[#5e7185] font-sans mt-1.5 font-bold text-center">
                                    {HP_Unit}
                                  </span>
                                </div>
                              </div>

                              {/* Target Temperature Footer Section */}
                              <div className="w-full pt-4 -mt-[25px] flex flex-col items-center border-t border-[#f1f5f9]">
                                <span className="text-sm text-[#5e7185] font-normal font-sans mb-1.5 font-medium">
                                  Temperatura Condensación
                                </span>
                                <span className="text-[32px] font-normal text-[#102435] font-sans tracking-tight">
                                  {fmtDec(condTemp, 1)} <span className="text-xl align-baseline ml-0.5">°C</span>
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                      </div>

                      {/* Overlap Secondary details for verification (T1/T2, subcooling, superheat shortcuts) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2 bg-white/70 backdrop-blur-md p-3.5 rounded-2xl border border-[#e1e9f1]">
                        <div className="text-center">
                          <span className="block text-[8px] uppercase tracking-wider font-extrabold text-[#5e748d] mb-0.5 font-sans">T1 (Succión)</span>
                          <span className="font-sans text-zinc-850 font-black text-xs">
                            {(() => {
                              const gasType = report.refrigerantType || "R410A";
                              const LP_Raw = crt.suctionPressure.replace(/[^\d.-]/g, "");
                              const LP_CleanVal = parseFloat(LP_Raw) || 0;
                              const LP_IsBar = crt.suctionPressure.toLowerCase().includes("bar") || LP_CleanVal < 35;
                              const evap = calculateSatTemp(gasType, LP_CleanVal, LP_IsBar ? "bar" : "psi");
                              const sh = parseFloat(crt.superheat) || 0;
                              return (evap + sh).toFixed(1).replace(".", ",");
                            })()} °C
                          </span>
                        </div>
                        <div className="text-center border-l border-zinc-200/50">
                          <span className="block text-[8px] uppercase tracking-wider font-extrabold text-[#5e748d] mb-0.5 font-sans">T2 (Líquido)</span>
                          <span className="font-sans text-zinc-850 font-black text-xs">
                            {(() => {
                              const gasType = report.refrigerantType || "R410A";
                              const HP_Raw = crt.dischargePressure.replace(/[^\d.-]/g, "");
                              const HP_CleanVal = parseFloat(HP_Raw) || 0;
                              const HP_IsBar = crt.dischargePressure.toLowerCase().includes("bar") || HP_CleanVal < 70;
                              const cond = calculateSatTemp(gasType, HP_CleanVal, HP_IsBar ? "bar" : "psi");
                              const sc = parseFloat(crt.subcooling) || 0;
                              return (cond - sc).toFixed(1).replace(".", ",");
                            })()} °C
                          </span>
                        </div>
                        <div className="text-center border-l border-zinc-200/50">
                          <span className="block text-[8px] uppercase tracking-wider font-extrabold text-blue-600 mb-0.5 font-sans">Sobrecalent. (SH)</span>
                          <span className="font-sans text-blue-700 font-extrabold text-xs">{crt.superheat.replace(".", ",")} °K</span>
                        </div>
                        <div className="text-center border-l border-zinc-200/50">
                          <span className="block text-[8px] uppercase tracking-wider font-extrabold text-rose-600 mb-0.5 font-sans">Subenfriam. (SC)</span>
                          <span className="font-sans text-rose-700 font-extrabold text-xs">{crt.subcooling.replace(".", ",")} °K</span>
                        </div>
                      </div>

                    </div>

                    {/* Compressors list */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block">
                        Compresores Vinculados
                      </span>
                      <div className="space-y-1.5">
                        {crt.compressors.map(comp => {
                          const isTrifasico = comp.phaseType === "trifasico";
                          return (
                            <div key={comp.id} className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center text-xs bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850 w-full overflow-hidden">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-semibold text-zinc-350 truncate">• {comp.name}</span>
                                <span className="text-[8px] bg-zinc-900 border border-zinc-800 px-1 py-0.2 rounded text-zinc-500 shrink-0 font-mono">
                                  {isTrifasico ? "3Ф (Trifásico)" : "1Ф (Monofásico)"}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 font-mono text-[10px] text-zinc-400 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                                {isTrifasico ? (
                                  <span className="shrink-0 text-[10px] text-zinc-400">
                                    Consumo: R:<strong className="text-amber-400">{comp.amperageR || comp.amperage || "12.0"}</strong> S:<strong className="text-emerald-400">{comp.amperageS || comp.amperage || "12.0"}</strong> T:<strong className="text-rose-400">{comp.amperageT || comp.amperage || "12.0"}</strong> A
                                  </span>
                                ) : (
                                  <span className="shrink-0">Amp: <strong className="text-amber-400">{comp.amperage} A</strong></span>
                                )}
                                <span className="shrink-0">Volt: <strong className="text-zinc-200">{comp.voltage} V</strong></span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                                  comp.status === "active" ? "text-emerald-400 bg-emerald-950/30" : "text-rose-400 bg-rose-950/30"
                                }`}>
                                  {comp.status === "active" ? "Ok" : "Falla"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Preventive Checklist table */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-blue-400 uppercase tracking-widest border-b border-zinc-850 pb-1.5">
              4. Lista de Comprobación Preventiva y Evidencia
            </h3>

            <div className="overflow-hidden border border-zinc-800 rounded-2xl bg-[#0f0f12]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#131317] text-zinc-500 font-extrabold uppercase tracking-wide border-b border-zinc-850">
                    <th className="px-4 py-2.5">Punto de Inspección</th>
                    <th className="px-4 py-2.5 text-center w-24">Estado</th>
                    <th className="px-4 py-2.5">Observaciones / Evidencia en Terreno</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.checklist || []).filter(chk => chk.status !== "na").map((chk) => (
                    <tr key={chk.id} className="border-b border-zinc-850/60 last:border-0 hover:bg-zinc-800/10">
                      <td className="px-4 py-3.5">
                        <strong className="text-zinc-200 block text-xs">{chk.label}</strong>
                        <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider block mt-0.5">
                          {chk.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {getChecklistBadge(chk.status)}
                      </td>
                      <td className="px-4 py-3.5 space-y-2">
                        <p className={`text-xs ${chk.notes ? "text-zinc-300" : "text-zinc-500 italic"}`}>
                          {chk.notes || "Sin observaciones específicas registradas."}
                        </p>
                        
                        {/* Evidence Pictures row */}
                        {chk.images && chk.images.length > 0 && (
                          <div className="flex gap-2 flex-wrap items-center pt-2">
                            {chk.images.map((imgBase64, imgIdx) => (
                              <div key={imgIdx} className="relative group overflow-hidden rounded-xl border border-zinc-700 shadow-md">
                                <img 
                                  src={imgBase64} 
                                  alt="Evidencia técnica" 
                                  referrerPolicy="no-referrer"
                                  className="w-40 h-40 object-cover transform hover:scale-105 transition duration-300"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 6: Electric Schematic diagram or Note */}
          {report.electricSchemeNote && (
            <div className="bg-[#111113] border border-zinc-800 p-5 rounded-2xl space-y-2.5">
              <h4 className="text-xs font-extrabold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-yellow-400" /> Esquema Unifilar y Detalle Eléctrico
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">
                {report.electricSchemeNote}
              </p>
            </div>
          )}

          {/* Section 7: General Diagnositcs comments */}
          <div className="bg-[#111113]/80 border border-zinc-800 p-5 rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              COMENTARIOS COMPLEMENTARIOS Y DIAGNÓSTICO GENERAL
            </h4>
            <div className="text-xs text-zinc-300 bg-black/40 border border-zinc-850 p-4.5 rounded-xl whitespace-pre-wrap leading-relaxed">
              {report.generalComments || "No se detallaron comentarios adicionales sobre este servicio técnico."}
            </div>
          </div>

          {/* Section 8: Signatures row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0e0e11] border border-zinc-850 p-5 rounded-2xl">
            {/* Technician info signature */}
            <div className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-800 rounded-xl space-y-3.5">
              <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest">
                Firma Firma Técnico Responsable
              </span>
              {report.signatures?.technicianSignature ? (
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 w-full flex items-center justify-center">
                  <img 
                    src={report.signatures.technicianSignature} 
                    alt="Firma Técnico" 
                    referrerPolicy="no-referrer"
                    className="max-h-24 object-contain invert brightness-125"
                  />
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-zinc-600 italic text-[11px]">
                  Firma digital no registrada
                </div>
              )}
              <div className="text-center">
                <strong className="text-zinc-200 text-xs block">
                  {report.signatures?.technicianName || report.technicianName}
                </strong>
                <span className="text-[10px] text-zinc-500">Técnico Analista HVAC</span>
              </div>
            </div>

            {/* Client info signature */}
            <div className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-800 rounded-xl space-y-3.5">
              <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest">
                Firma Representante Cliente Certificador
              </span>
              {report.signatures?.clientSignature ? (
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 w-full flex items-center justify-center">
                  <img 
                    src={report.signatures.clientSignature} 
                    alt="Firma Cliente" 
                    referrerPolicy="no-referrer"
                    className="max-h-24 object-contain invert brightness-125"
                  />
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-zinc-600 italic text-[11px]">
                  Firma digital no registrada
                </div>
              )}
              <div className="text-center">
                <strong className="text-zinc-200 text-xs block">
                  {report.signatures?.clientName || "N/A"}
                </strong>
                <span className="text-[10px] text-zinc-500">Representante Autorizado Cliente</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div className="bg-[#121214] px-6 py-4 border-t border-zinc-800 flex flex-wrap gap-2.5 justify-between items-center">
          
          <div className="flex gap-2">
            {/* Export beautiful PDF */}
            <button
              type="button"
              id="view-modal-pdf-btn"
              onClick={async () => {
                await generatePDFReport(report, adminSettings.companyName, adminSettings.logo);
              }}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer uppercase tracking-wider"
            >
              <Download className="w-4 h-4" /> PDF Alta Def. A4
            </button>

            {/* Export HTML page */}
            <button
              type="button"
              id="view-modal-html-btn"
              onClick={() => exportReportAsHTML(report, adminSettings.companyName)}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition cursor-pointer uppercase tracking-wider"
            >
              <Download className="w-4 h-4 text-blue-400" /> HTML Offline
            </button>
          </div>

          <div className="flex gap-2">
            {/* Form edit button directly from preview modal */}
            <button
              type="button"
              id="view-modal-edit-btn"
              onClick={() => {
                onEdit(report);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-[#1a1c23] hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer uppercase tracking-wider"
            >
              <Edit3 className="w-4 h-4 text-blue-400" /> Editar Registro
            </button>

            {/* Close modal */}
            <button
              type="button"
              id="view-modal-close-btn"
              onClick={onClose}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl text-xs font-bold transition cursor-pointer uppercase tracking-wider"
            >
              Cerrar Vista
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
