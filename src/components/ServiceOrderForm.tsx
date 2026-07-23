import React, { useState, useRef } from "react";
import { ServiceOrderReport, AdminSettings, Signatures, ServiceType, DiagnosticRating, EvidencePhoto } from "../types";
import SignaturePad from "./SignaturePad";
import {
  branchLabel,
  findBranchRecord,
  findClientRecord,
  getClientBranches,
  getLinkedServiceOrderClientDetails,
} from "../utils/clientCatalog";
import {
  ArrowLeft, Save, ClipboardList, CheckCircle, AlertTriangle,
  AlertOctagon, CheckSquare, Camera, X, ImagePlus,
} from "lucide-react";

interface ServiceOrderFormProps {
  order?: ServiceOrderReport | null;
  adminSettings: AdminSettings;
  onSave: (order: ServiceOrderReport) => void;
  onClose: () => void;
}

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: "preventivo",    label: "Mantenimiento Preventivo" },
  { value: "correctivo",    label: "Mantenimiento Correctivo" },
  { value: "urgencia",      label: "Atención de Urgencia" },
  { value: "garantia",      label: "Garantía de Servicio" },
  { value: "puesta_marcha", label: "Puesta en Marcha" },
];

const DIAGNOSTIC_RATINGS: {
  value: DiagnosticRating;
  label: string;
  description: string;
  color: string;
  text: string;
  Icon: React.ElementType;
}[] = [
  { value: "excellent",       label: "Excelente",       description: "Sistema en óptimas condiciones", color: "border-emerald-500 bg-emerald-950/30", text: "text-emerald-400", Icon: CheckCircle  },
  { value: "normal",          label: "Operativo",       description: "Funcionamiento normal",           color: "border-blue-500 bg-blue-950/30",     text: "text-blue-400",    Icon: CheckSquare  },
  { value: "requires_action", label: "Requiere Acción", description: "Observaciones pendientes",        color: "border-amber-500 bg-amber-950/30",   text: "text-amber-400",   Icon: AlertTriangle },
  { value: "critical",        label: "Crítico",         description: "Falla grave detectada",           color: "border-rose-500 bg-rose-950/30",     text: "text-rose-400",    Icon: AlertOctagon  },
];

const inputCls = "w-full text-xs border border-zinc-700 rounded-lg px-3 py-2 bg-[#0f0f0f] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder-zinc-600";
const labelCls = "block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1";

const sectionTitle = (n: number, text: string) => (
  <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
    <span className="w-5 h-5 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-[10px] font-black shrink-0">
      {n}
    </span>
    {text}
  </h3>
);

export default function ServiceOrderForm({ order, adminSettings, onSave, onClose }: ServiceOrderFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialClient = order?.clientName ?? (adminSettings.clients[0] ?? "");
  const initialClientRecord = findClientRecord(adminSettings, initialClient);
  const initialBranches = getClientBranches(adminSettings, initialClient);
  const initialBranchRecord = findBranchRecord(adminSettings, initialClient, order?.branchLocation ?? initialBranches[0] ?? "");
  const initialBranchLocation = order?.branchLocation
    ?? branchLabel(initialClientRecord, initialBranchRecord, initialBranches[0] ?? "");
  const initialLinkedDetails = getLinkedServiceOrderClientDetails(adminSettings, initialClient, initialBranchLocation);

  const [form, setForm] = useState<Omit<ServiceOrderReport, "id" | "timestamp">>({
    folio:                 order?.folio                 ?? `OT-${Date.now().toString().slice(-6)}`,
    date:                  order?.date                  ?? today,
    technicianName:        order?.technicianName        ?? (adminSettings.techs[0] ?? ""),
    serviceType:           order?.serviceType           ?? "preventivo",
    orderNumber:           order?.orderNumber           ?? "",
    clientId:              order?.clientId              ?? initialLinkedDetails.clientId,
    clientName:            initialClient,
    branchId:              order?.branchId              ?? initialLinkedDetails.branchId,
    siteId:                order?.siteId                ?? initialLinkedDetails.siteId,
    branchLocation:        initialBranchLocation,
    clientContactName:     order?.clientContactName     ?? initialLinkedDetails.clientContactName,
    clientContactRole:     order?.clientContactRole     ?? initialLinkedDetails.clientContactRole,
    clientLocationAddress: order?.clientLocationAddress ?? initialLinkedDetails.clientLocationAddress,
    diagnosticRating:      order?.diagnosticRating      ?? "normal",
    evidence:              order?.evidence              ?? [],
    findings:              order?.findings              ?? "",
    conclusions:           order?.conclusions           ?? "",
    signatures: order?.signatures ?? {
      technicianName:      "",
      technicianSignature: "",
      clientName:          "",
      clientSignature:     "",
      signDate:            today,
    },
  });

  const [selectedClient, setSelectedClient] = useState(initialClient);
  const branchOptions = Array.from(new Set([
    ...getClientBranches(adminSettings, selectedClient),
    form.branchLocation,
  ].filter(Boolean)));

  const set = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) =>
    setForm(f => ({ ...f, [field]: value }));

  const setSig = (field: keyof Signatures, value: string) =>
    setForm(f => ({ ...f, signatures: { ...f.signatures, [field]: value } }));

  const handleClientChange = (client: string) => {
    setSelectedClient(client);
    const clientRecord = findClientRecord(adminSettings, client);
    const firstBranch = getClientBranches(adminSettings, client)[0] ?? "";
    const branchRecord = findBranchRecord(adminSettings, client, firstBranch);
    const nextBranchLocation = branchLabel(clientRecord, branchRecord, firstBranch);
    setForm(f => ({
      ...f,
      clientName: client,
      branchLocation: nextBranchLocation,
      ...getLinkedServiceOrderClientDetails(adminSettings, client, nextBranchLocation),
    }));
  };

  const handleBranchChange = (branchLocation: string) => {
    setForm(f => ({
      ...f,
      branchLocation,
      ...getLinkedServiceOrderClientDetails(adminSettings, f.clientName, branchLocation),
    }));
  };

  // Evidence photo handlers
  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files ?? []);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const imageBase64 = ev.target?.result as string;
        if (!imageBase64) return;
        const newPhoto: EvidencePhoto = {
          id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          imageBase64,
          description: "",
        };
        setForm(f => ({ ...f, evidence: [...f.evidence, newPhoto] }));
      };
      reader.readAsDataURL(file);
    });

    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const updatePhotoDescription = (id: string, description: string) =>
    setForm(f => ({
      ...f,
      evidence: f.evidence.map(p => p.id === id ? { ...p, description } : p),
    }));

  const removePhoto = (id: string) =>
    setForm(f => ({ ...f, evidence: f.evidence.filter(p => p.id !== id) }));

  const handleSave = () => {
    if (!form.folio.trim()) { alert("El folio es requerido."); return; }
    if (!form.clientName.trim()) { alert("Debe seleccionar un cliente."); return; }
    onSave({
      id:        order?.id ?? `ot_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...form,
    });
  };

  return (
    <div className="space-y-4">

      {/* Form header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div>
            <h2 className="text-sm font-extrabold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-violet-400" />
              {order ? "Editar Orden de Servicio" : "Nueva Orden de Servicio"}
            </h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">Complete las 7 secciones del informe de OT</p>
          </div>
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold active:scale-95 transition shadow-sm shadow-violet-500/20 uppercase tracking-wider cursor-pointer">
          <Save className="w-4 h-4" /> Guardar OT
        </button>
      </div>

      {/* 1. Información General */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-4">
        {sectionTitle(1, "Información General de la Inspección")}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Folio OT *</label>
            <input type="text" className={inputCls} value={form.folio}
              onChange={e => set("folio", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Fecha de Inspección</label>
            <input type="date" className={inputCls} value={form.date}
              onChange={e => set("date", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Técnico Responsable</label>
            <select className={inputCls} value={form.technicianName}
              onChange={e => set("technicianName", e.target.value)}>
              {adminSettings.techs.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tipo de Servicio</label>
            <select className={inputCls} value={form.serviceType}
              onChange={e => set("serviceType", e.target.value as ServiceType)}>
              {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>N° OT Referencia Cliente</label>
            <input type="text" className={inputCls} value={form.orderNumber}
              onChange={e => set("orderNumber", e.target.value)}
              placeholder="Ej: OT-2026-001" />
          </div>
        </div>
      </div>

      {/* 2. Cliente & Localización */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-4">
        {sectionTitle(2, "Cuenta del Cliente & Localización")}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Cliente *</label>
            <select className={inputCls} value={selectedClient}
              onChange={e => handleClientChange(e.target.value)}>
              {adminSettings.clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Sucursal / Ubicación</label>
            <select className={inputCls} value={form.branchLocation}
              onChange={e => handleBranchChange(e.target.value)}>
              {branchOptions.length > 0
                ? branchOptions.map(b => <option key={b} value={b}>{b}</option>)
                : <option value="">Sin sucursales registradas</option>}
            </select>
          </div>
          <div>
            <label className={labelCls}>Nombre Contacto</label>
            <input type="text" className={inputCls} value={form.clientContactName}
              onChange={e => set("clientContactName", e.target.value)}
              placeholder="Ej: Juan Pérez" />
          </div>
          <div>
            <label className={labelCls}>Cargo / Rol</label>
            <input type="text" className={inputCls} value={form.clientContactRole}
              onChange={e => set("clientContactRole", e.target.value)}
              placeholder="Ej: Jefe de Mantención" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Dirección / Referencia</label>
            <input type="text" className={inputCls} value={form.clientLocationAddress}
              onChange={e => set("clientLocationAddress", e.target.value)}
              placeholder="Ej: Av. Providencia 1234, Piso 3, Santiago" />
          </div>
        </div>
      </div>

      {/* 3. Calificación del Diagnóstico */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-4">
        {sectionTitle(3, "Calificación del Diagnóstico")}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DIAGNOSTIC_RATINGS.map(r => {
            const selected = form.diagnosticRating === r.value;
            return (
              <button key={r.value} type="button"
                onClick={() => set("diagnosticRating", r.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition cursor-pointer text-center ${selected ? r.color : "border-zinc-700 hover:border-zinc-600"}`}>
                <r.Icon className={`w-6 h-6 ${r.text}`} />
                <div>
                  <p className={`text-xs font-extrabold ${r.text}`}>{r.label}</p>
                  <p className="text-[9px] text-zinc-500 mt-0.5 leading-tight">{r.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Registro Fotográfico / Evidencias */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-4">
        {sectionTitle(4, "Registro Fotográfico / Evidencias")}

        {/* Hidden file input — accepts camera & gallery on Android */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleAddPhotos}
        />

        {/* Add photo button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-zinc-700 hover:border-violet-500 hover:bg-violet-950/10 rounded-xl py-5 text-xs font-bold text-zinc-500 hover:text-violet-400 transition cursor-pointer"
        >
          <Camera className="w-5 h-5" />
          Adjuntar Foto de Cámara o Galería
          <ImagePlus className="w-4 h-4 opacity-60" />
        </button>

        {/* Photo grid */}
        {form.evidence.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {form.evidence.map((photo, idx) => (
              <div key={photo.id} className="bg-[#0f0f0f] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                {/* Image */}
                <div className="relative">
                  <img
                    src={photo.imageBase64}
                    alt={`Evidencia ${idx + 1}`}
                    className="w-full h-44 object-cover"
                  />
                  {/* Photo number badge */}
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Foto {idx + 1}
                  </span>
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-2 right-2 bg-rose-600/80 hover:bg-rose-500 text-white rounded-full p-1 transition cursor-pointer"
                    title="Eliminar imagen"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Description input */}
                <div className="p-3 flex-1">
                  <textarea
                    rows={3}
                    value={photo.description}
                    onChange={e => updatePhotoDescription(photo.id, e.target.value)}
                    placeholder="Descripción de la evidencia fotografiada..."
                    className="w-full text-xs border border-zinc-700 rounded-lg px-3 py-2 bg-[#18181b] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder-zinc-600 resize-none leading-relaxed"
                  />
                </div>
              </div>
            ))}

            {/* Inline add-more tile */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-44 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-800 hover:border-violet-500 hover:bg-violet-950/10 rounded-xl text-zinc-600 hover:text-violet-400 transition cursor-pointer"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Agregar más</span>
            </button>
          </div>
        )}

        {form.evidence.length === 0 && (
          <p className="text-center text-[11px] text-zinc-600 italic">
            Sin evidencias adjuntas. Usa el botón de arriba para agregar fotos desde la cámara o galería.
          </p>
        )}
      </div>

      {/* 5. Hallazgos y Diagnóstico */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-4">
        {sectionTitle(5, "Hallazgos y Diagnóstico")}
        <textarea
          rows={7}
          value={form.findings}
          onChange={e => set("findings", e.target.value)}
          placeholder="Describa detalladamente los hallazgos observados durante la inspección, fallas detectadas, mediciones realizadas y diagnóstico técnico del sistema..."
          className="w-full text-xs border border-zinc-700 rounded-xl px-4 py-3 bg-[#0f0f0f] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder-zinc-600 resize-none leading-relaxed"
        />
      </div>

      {/* 6. Conclusiones */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-4">
        {sectionTitle(6, "Conclusiones")}
        <textarea
          rows={5}
          value={form.conclusions}
          onChange={e => set("conclusions", e.target.value)}
          placeholder="Indique los trabajos realizados, recomendaciones, materiales utilizados, próximas acciones requeridas o fecha de revisión sugerida..."
          className="w-full text-xs border border-zinc-700 rounded-xl px-4 py-3 bg-[#0f0f0f] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder-zinc-600 resize-none leading-relaxed"
        />
      </div>

      {/* 7. Firmas Certificadoras */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-4">
        {sectionTitle(7, "Firmas Certificadoras")}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <input type="text" className={inputCls}
              value={form.signatures.technicianName}
              onChange={e => setSig("technicianName", e.target.value)}
              placeholder="Nombre del técnico responsable" />
            <SignaturePad
              id="so-tech-sig"
              label="Firma Técnico Responsable"
              initialValue={form.signatures.technicianSignature}
              onSave={v => setSig("technicianSignature", v)}
            />
          </div>
          <div className="space-y-2">
            <input type="text" className={inputCls}
              value={form.signatures.clientName}
              onChange={e => setSig("clientName", e.target.value)}
              placeholder="Nombre del cliente / receptor conforme" />
            <SignaturePad
              id="so-client-sig"
              label="Firma Cliente / Recepción Conforme"
              initialValue={form.signatures.clientSignature}
              onSave={v => setSig("clientSignature", v)}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Fecha de Firma</label>
          <input type="date" value={form.signatures.signDate}
            onChange={e => setSig("signDate", e.target.value)}
            className="text-xs border border-zinc-700 rounded-lg px-3 py-2 bg-[#0f0f0f] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
      </div>

      {/* Bottom save */}
      <div className="flex justify-end pb-6">
        <button onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold active:scale-95 transition shadow-lg shadow-violet-500/20 uppercase tracking-wider cursor-pointer">
          <Save className="w-4 h-4" /> Guardar Orden de Servicio
        </button>
      </div>
    </div>
  );
}
