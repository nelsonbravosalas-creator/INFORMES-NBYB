import React from "react";
import { ServiceOrderReport, AdminSettings } from "../types";
import {
  X, Edit3, FileText, FileCode, Download,
  CheckCircle, AlertTriangle, AlertOctagon, CheckSquare,
  ClipboardList, MapPin, User, Phone, Calendar, Wrench,
} from "lucide-react";
import {
  exportServiceOrderAsHTML, exportServiceOrderAsJSON, generateServiceOrderPDF,
} from "../utils/pdf";

interface Props {
  order: ServiceOrderReport;
  adminSettings: AdminSettings;
  onClose: () => void;
  onEdit: (order: ServiceOrderReport) => void;
}

const RATING_MAP = {
  excellent:       { label: "Excelente",       cls: "bg-emerald-950/40 text-emerald-400 border-emerald-800", Icon: CheckCircle },
  normal:          { label: "Operativo",        cls: "bg-blue-950/40 text-blue-400 border-blue-800",         Icon: CheckSquare },
  requires_action: { label: "Requiere Acción",  cls: "bg-amber-950/40 text-amber-400 border-amber-800",      Icon: AlertTriangle },
  critical:        { label: "Crítico",          cls: "bg-rose-950/40 text-rose-400 border-rose-800",         Icon: AlertOctagon },
};

const SERVICE_LABELS: Record<string, string> = {
  preventivo: "Mantenimiento Preventivo",
  correctivo: "Mantenimiento Correctivo",
  urgencia: "Atención de Urgencia",
  garantia: "Garantía de Servicio",
  puesta_marcha: "Puesta en Marcha",
};

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs text-zinc-200">{value}</p>
    </div>
  );
}

export default function ServiceOrderViewerModal({ order, adminSettings, onClose, onEdit }: Props) {
  const rating = RATING_MAP[order.diagnosticRating] ?? RATING_MAP.normal;
  const RatingIcon = rating.Icon;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#18181b] w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-800">

        {/* Header */}
        <div className="bg-[#121212] px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center shrink-0">
              <ClipboardList className="w-4.5 h-4.5 text-violet-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-zinc-100">OT {order.folio}</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${rating.cls} flex items-center gap-1`}>
                  <RatingIcon className="w-3 h-3" /> {rating.label}
                </span>
                <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                  {SERVICE_LABELS[order.serviceType] ?? order.serviceType}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">{order.date}{order.orderNumber && ` · Ref: ${order.orderNumber}`}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition cursor-pointer shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">

          {/* Cliente & Localización */}
          <div className="bg-[#0f0f0f] border border-zinc-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Cliente" value={order.clientName} />
            <Field label="Sucursal / Ubicación" value={order.branchLocation} />
            <Field label="Técnico" value={order.technicianName} />
            <Field label="Contacto" value={order.clientContactName} />
            <Field label="Cargo" value={order.clientContactRole} />
            <Field label="Dirección" value={order.clientLocationAddress} />
          </div>

          {/* Calificación */}
          <div className={`rounded-xl border p-4 flex items-center gap-4 ${rating.cls}`}>
            <RatingIcon className="w-8 h-8 shrink-0" />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider">Calificación del Diagnóstico</p>
              <p className="text-lg font-black">{rating.label}</p>
            </div>
          </div>

          {/* Evidencias */}
          {(order.evidence ?? []).length > 0 && (
            <div>
              <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-[9px] font-black">4</span>
                Registro Fotográfico / Evidencias ({order.evidence.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {order.evidence.map((photo, idx) => (
                  <div key={photo.id} className="bg-[#0f0f0f] border border-zinc-800 rounded-xl overflow-hidden">
                    <img src={photo.imageBase64} alt={`Evidencia ${idx + 1}`}
                      className="w-full h-36 object-cover" />
                    <div className="p-2">
                      <p className="text-[9px] font-bold text-violet-400 mb-0.5">FOTO {idx + 1}</p>
                      <p className="text-[10px] text-zinc-400 leading-snug">
                        {photo.description || <span className="italic text-zinc-600">Sin descripción</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hallazgos */}
          <div>
            <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-[9px] font-black">5</span>
              Hallazgos y Diagnóstico
            </h4>
            <div className="bg-[#0f0f0f] border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed min-h-[60px]">
              {order.findings || <span className="italic text-zinc-600">Sin hallazgos registrados.</span>}
            </div>
          </div>

          {/* Conclusiones */}
          <div>
            <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-[9px] font-black">6</span>
              Conclusiones
            </h4>
            <div className="bg-[#0f0f0f] border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed min-h-[60px]">
              {order.conclusions || <span className="italic text-zinc-600">Sin conclusiones registradas.</span>}
            </div>
          </div>

          {/* Firmas */}
          <div>
            <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-[9px] font-black">7</span>
              Firmas Certificadoras · {order.signatures.signDate}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Técnico Responsable", name: order.signatures.technicianName || order.technicianName, sig: order.signatures.technicianSignature },
                { label: "Cliente / Recepción Conforme", name: order.signatures.clientName || order.clientName, sig: order.signatures.clientSignature },
              ].map(({ label, name, sig }) => (
                <div key={label} className="bg-[#0f0f0f] border border-zinc-800 rounded-xl p-3 flex flex-col items-center gap-2">
                  {sig ? (
                    <img src={sig} alt={label} className="max-h-20 max-w-full object-contain" />
                  ) : (
                    <div className="h-16 w-full flex items-center justify-center text-[10px] text-zinc-600 italic">Sin firma capturada</div>
                  )}
                  <div className="border-t border-zinc-700 w-full pt-2 text-center">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
                    <p className="text-[11px] text-zinc-300 font-semibold mt-0.5">{name || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-[#121212] px-6 py-4 border-t border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {/* PDF */}
            <button
              onClick={() => generateServiceOrderPDF(order, adminSettings.companyName)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[10px] font-bold border border-zinc-700 cursor-pointer transition"
              title="Exportar PDF A4">
              <FileText className="w-3.5 h-3.5 text-rose-400" /> PDF
            </button>
            {/* HTML */}
            <button
              onClick={() => exportServiceOrderAsHTML(order, adminSettings.companyName)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[10px] font-bold border border-zinc-700 cursor-pointer transition"
              title="Exportar HTML offline">
              <FileCode className="w-3.5 h-3.5 text-blue-400" /> HTML
            </button>
            {/* JSON */}
            <button
              onClick={() => exportServiceOrderAsJSON(order)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[10px] font-bold border border-zinc-700 cursor-pointer transition"
              title="Exportar JSON backup">
              <Download className="w-3.5 h-3.5 text-emerald-400" /> JSON
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(order)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold border border-zinc-700 cursor-pointer transition">
              <Edit3 className="w-3.5 h-3.5" /> Editar OT
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold cursor-pointer transition active:scale-95">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
