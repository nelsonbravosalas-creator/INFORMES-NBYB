import React, { useState, useRef } from "react";
import { AdminSettings, ClientRecord, SubBranch, SubType } from "../types";
import { importExcelToAdminData } from "../utils/excel";
import {
  Building, Upload, Plus, Trash2, Settings2, X, FileSpreadsheet,
  Loader2, Image as ImageIcon, Edit3, MapPin, Phone, Info,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHILE_REGIONS = [
  "Región Metropolitana de Santiago",
  "Región de Valparaíso",
  "Región de O'Higgins",
  "Región del Maule",
  "Región del Ñuble",
  "Región del Biobío",
  "Región de La Araucanía",
  "Región de Los Ríos",
  "Región de Los Lagos",
  "Región de Aysén",
  "Región de Magallanes",
  "Región de Coquimbo",
  "Región de Atacama",
  "Región de Antofagasta",
  "Región de Tarapacá",
  "Región de Arica y Parinacota",
];

const SUB_TYPES: SubType[] = [
  "TIENDA", "BODEGA", "OFICINA", "PLANTA", "SUCURSAL",
  "LABORATORIO", "DATA CENTER", "HOSPITAL", "HOTEL", "MALL", "OTRO",
];

const inputCls =
  "w-full text-xs border border-zinc-700 rounded-lg px-3 py-2 bg-[#0a0a0c] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-600";
const labelCls = "block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function syncLegacy(records: ClientRecord[]): { clients: string[]; branches: Record<string, string[]> } {
  const clients = records.map(r => r.name);
  const branches: Record<string, string[]> = {};
  records.forEach(r => {
    branches[r.name] = r.noSubs
      ? [r.address || r.name]
      : r.subs.map(s => s.name || s.code).filter(Boolean);
  });
  return { clients, branches };
}

function migrateRecords(settings: AdminSettings): ClientRecord[] {
  if (settings.clientRecords?.length) return settings.clientRecords;
  return settings.clients.map((name, i) => ({
    id: `cli_legacy_${i}`,
    name,
    address: "",
    region: CHILE_REGIONS[0],
    contactPerson: "",
    contactRole: "",
    contactEmail: "",
    noSubs: false,
    subs: (settings.branches[name] ?? []).map((branchName, j) => ({
      id: `sub_legacy_${i}_${j}`,
      type: "OTRO" as SubType,
      code: "",
      name: branchName,
      address: "",
      region: "HEREDAR",
      sameContact: true,
    })),
  }));
}

// ─── SubCard ──────────────────────────────────────────────────────────────────

function SubCard({
  sub, idx, onUpdate, onRemove, parentRegion,
}: {
  sub: SubBranch;
  idx: number;
  onUpdate: (id: string, u: Partial<SubBranch>) => void;
  onRemove: (id: string) => void;
  parentRegion: string;
}) {
  return (
    <div className="bg-[#0a0a0c] border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-blue-400 bg-blue-950/40 border border-blue-900/50 px-2.5 py-0.5 rounded-full">
          SUB {idx + 1}
        </span>
        <button type="button" onClick={() => onRemove(sub.id)}
          className="p-1 hover:bg-rose-950/30 text-zinc-500 hover:text-rose-400 rounded cursor-pointer transition">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Tipo</label>
          <select className={inputCls} value={sub.type}
            onChange={e => onUpdate(sub.id, { type: e.target.value as SubType })}>
            {SUB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Codificador (8 caracteres)</label>
          <input type="text" className={inputCls} value={sub.code} maxLength={8}
            onChange={e => onUpdate(sub.id, { code: e.target.value.toUpperCase().slice(0, 8) })}
            placeholder="EJ. 21-STK" />
        </div>
        <div>
          <label className={labelCls}>Nombre de la Sucursal</label>
          <input type="text" className={inputCls} value={sub.name}
            onChange={e => onUpdate(sub.id, { name: e.target.value })}
            placeholder="Nombre Identificador" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Dirección Sucursal</label>
          <input type="text" className={inputCls} value={sub.address}
            onChange={e => onUpdate(sub.id, { address: e.target.value })}
            placeholder="Dirección de la instalación" />
        </div>
        <div>
          <label className={labelCls}>Región de la Sucursal</label>
          <select className={inputCls} value={sub.region}
            onChange={e => onUpdate(sub.id, { region: e.target.value })}>
            <option value="HEREDAR">Heredar Región ({parentRegion.replace("Región ", "")})</option>
            {CHILE_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={sub.sameContact}
          onChange={e => onUpdate(sub.id, { sameContact: e.target.checked })}
          className="w-3.5 h-3.5 accent-blue-600" />
        <span className="text-[11px] text-zinc-400">¿Mismos datos de contacto del cliente?</span>
      </label>

      {!sub.sameContact && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/60">
          <div>
            <label className={labelCls}>Persona de Contacto</label>
            <input type="text" className={inputCls} value={sub.contactPerson ?? ""}
              onChange={e => onUpdate(sub.id, { contactPerson: e.target.value })}
              placeholder="Ej. María González" />
          </div>
          <div>
            <label className={labelCls}>Cargo</label>
            <input type="text" className={inputCls} value={sub.contactRole ?? ""}
              onChange={e => onUpdate(sub.id, { contactRole: e.target.value })}
              placeholder="Ej. Encargado Local" />
          </div>
          <div>
            <label className={labelCls}>Correo</label>
            <input type="email" className={inputCls} value={sub.contactEmail ?? ""}
              onChange={e => onUpdate(sub.id, { contactEmail: e.target.value })}
              placeholder="local@empresa.com" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ClientModal ──────────────────────────────────────────────────────────────

function ClientModal({
  client, onSave, onCancel,
}: {
  client: ClientRecord | null;
  onSave: (c: ClientRecord) => void;
  onCancel: () => void;
}) {
  const blank: ClientRecord = {
    id: `cli_${Date.now()}`,
    name: "", address: "", region: CHILE_REGIONS[0],
    contactPerson: "", contactRole: "", contactEmail: "",
    noSubs: false, subs: [],
  };

  const [form, setForm] = useState<ClientRecord>(client ?? blank);

  const addSub = () => {
    const s: SubBranch = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      type: "TIENDA", code: "", name: "", address: "",
      region: "HEREDAR", sameContact: true,
    };
    setForm(f => ({ ...f, subs: [...f.subs, s] }));
  };

  const updateSub = (id: string, u: Partial<SubBranch>) =>
    setForm(f => ({ ...f, subs: f.subs.map(s => s.id === id ? { ...s, ...u } : s) }));

  const removeSub = (id: string) =>
    setForm(f => ({ ...f, subs: f.subs.filter(s => s.id !== id) }));

  const handleSave = () => {
    if (!form.name.trim()) { alert("El nombre o razón social es requerido."); return; }
    onSave({ ...form, id: client?.id ?? form.id });
  };

  const set = <K extends keyof ClientRecord>(field: K, val: ClientRecord[K]) =>
    setForm(f => ({ ...f, [field]: val }));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#1c1c1f] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-zinc-700 shadow-2xl">

        {/* Header */}
        <div className="bg-[#141417] px-6 py-4 flex items-center gap-4 border-b border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center shrink-0">
            <Building className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-zinc-100 uppercase tracking-wider">
              {client ? "Editar Cliente" : "Nuevo Cliente"}
            </h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Alta de cliente y multi-sucursales (SUBS)
            </p>
          </div>
          <button onClick={onCancel}
            className="ml-auto p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Nombre */}
          <div>
            <label className={labelCls}>Nombre o Razón Social</label>
            <input type="text" className={inputCls} value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="Por ejemplo: Aguas Andinas S.A." />
          </div>

          {/* Dirección + Región */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Dirección Matriz</label>
              <input type="text" className={inputCls} value={form.address}
                onChange={e => set("address", e.target.value)}
                placeholder="Por ejemplo: Av. Libertador B. O'Higgins 1120" />
            </div>
            <div>
              <label className={labelCls}>Región</label>
              <select className={inputCls} value={form.region}
                onChange={e => set("region", e.target.value)}>
                {CHILE_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Contacto Comercial */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Contacto Comercial
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Persona de Contacto</label>
                <input type="text" className={inputCls} value={form.contactPerson}
                  onChange={e => set("contactPerson", e.target.value)}
                  placeholder="Ej. Juan Pérez" />
              </div>
              <div>
                <label className={labelCls}>Cargo</label>
                <input type="text" className={inputCls} value={form.contactRole}
                  onChange={e => set("contactRole", e.target.value)}
                  placeholder="Ej. Gerente de Operaciones" />
              </div>
              <div>
                <label className={labelCls}>Correo de Contacto</label>
                <input type="email" className={inputCls} value={form.contactEmail}
                  onChange={e => set("contactEmail", e.target.value)}
                  placeholder="correo@empresa.com" />
              </div>
            </div>
          </div>

          {/* Sucursales SUB */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Sucursales (SUB)
              </h4>
              {!form.noSubs && (
                <button type="button" onClick={addSub}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition">
                  <Plus className="w-3 h-3" /> Agregar SUB
                </button>
              )}
            </div>

            {/* No-subs checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.noSubs}
                onChange={e => setForm(f => ({ ...f, noSubs: e.target.checked, subs: e.target.checked ? [] : f.subs }))}
                className="w-3.5 h-3.5 accent-blue-600" />
              <span className="text-[11px] text-zinc-400">
                El cliente no tiene sucursal, pero la dirección será la sucursal
              </span>
            </label>

            {!form.noSubs && (
              <>
                {/* Coding format info */}
                <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-3 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-extrabold text-blue-300 uppercase tracking-wider">
                      Formato Final de Codificación:
                    </p>
                    <p className="text-[9px] text-zinc-400 mt-0.5">
                      La codificación final de cada TAG constará del formato:{" "}
                      <span className="font-bold text-blue-300">
                        [CÓDIGO_SUB(4)].[TIPO_EQUIPO(3)].[CORRELATIVO(4)]
                      </span>
                    </p>
                  </div>
                </div>

                {form.subs.length === 0 ? (
                  <p className="text-center text-[11px] text-zinc-600 italic py-4">
                    Sin sucursales. Haz clic en "+ Agregar SUB" para añadir una.
                  </p>
                ) : (
                  form.subs.map((sub, idx) => (
                    <React.Fragment key={sub.id}>
                      <SubCard sub={sub} idx={idx}
                        onUpdate={updateSub} onRemove={removeSub} parentRegion={form.region} />
                    </React.Fragment>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#141417] px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
          <button onClick={onCancel}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700 cursor-pointer transition">
            Cancelar
          </button>
          <button onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer transition active:scale-95">
            Guardar Cliente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AdminSettingsModal ───────────────────────────────────────────────────────

interface AdminSettingsModalProps {
  settings: AdminSettings;
  onSave: (updatedSettings: AdminSettings) => void | Promise<void>;
  onClose: () => void;
}

export default function AdminSettingsModal({ settings, onSave, onClose }: AdminSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AdminSettings>({
    ...settings,
    clientRecords: migrateRecords(settings),
  });

  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);

  const [newBrand, setNewBrand] = useState("");
  const [newRefrigerant, setNewRefrigerant] = useState("");
  const [newEqType, setNewEqType] = useState("");
  const [newTech, setNewTech] = useState("");

  const [excelImportLoading, setExcelImportLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Client record handlers ──

  const handleSaveClientRecord = (record: ClientRecord) => {
    const existing = localSettings.clientRecords ?? [];
    const idx = existing.findIndex(r => r.id === record.id);
    const updated = idx > -1
      ? existing.map((r, i) => i === idx ? record : r)
      : [record, ...existing];
    const { clients, branches } = syncLegacy(updated);
    setLocalSettings(prev => ({ ...prev, clientRecords: updated, clients, branches }));
    setShowClientModal(false);
    setEditingClient(null);
  };

  const handleDeleteClientRecord = (id: string) => {
    const record = localSettings.clientRecords.find(r => r.id === id);
    if (!window.confirm(`¿Eliminar "${record?.name}" y todas sus sucursales?`)) return;
    const updated = localSettings.clientRecords.filter(r => r.id !== id);
    const { clients, branches } = syncLegacy(updated);
    setLocalSettings(prev => ({ ...prev, clientRecords: updated, clients, branches }));
  };

  // ── Logo ──

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Por favor, selecciona una imagen para el logotipo."); return; }
    const reader = new FileReader();
    reader.onload = () => setLocalSettings(prev => ({ ...prev, logo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  // ── Excel import ──

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setExcelImportLoading(true);
      const imported = await importExcelToAdminData(file);
      const combinedClients = Array.from(new Set([...localSettings.clients, ...imported.clients]));
      const combinedBranches = { ...localSettings.branches };
      Object.keys(imported.branches).forEach(client => {
        combinedBranches[client] = Array.from(new Set([
          ...(combinedBranches[client] ?? []), ...imported.branches[client]
        ]));
      });
      setLocalSettings(prev => ({ ...prev, clients: combinedClients, branches: combinedBranches }));
      alert("¡Importación de clientes y sucursales completada con éxito!");
    } catch (err) {
      alert("Error al importar archivo Excel. Asegúrate de que tenga columnas 'Cliente' y 'Sucursal'.");
    } finally {
      setExcelImportLoading(false);
    }
  };

  // ── Generic list items ──

  const addGenericItem = (
    field: "brands" | "refrigerants" | "equipmentTypes" | "techs",
    value: string, setter: (v: string) => void
  ) => {
    const t = value.trim();
    if (!t || localSettings[field].includes(t)) return;
    setLocalSettings(prev => ({ ...prev, [field]: [...prev[field], t] }));
    setter("");
  };

  const deleteGenericItem = (
    field: "brands" | "refrigerants" | "equipmentTypes" | "techs",
    value: string
  ) => setLocalSettings(prev => ({ ...prev, [field]: prev[field].filter(i => i !== value) }));

  const save = async () => {
    try {
      setIsSaving(true);
      await onSave(localSettings);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──

  const inputSm = "flex-1 text-[11px] border border-zinc-800 rounded px-2 py-1.5 bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div id="admin-settings-backdrop" className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div id="admin-settings-modal" className="bg-[#18181b] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-800">

        {/* Header */}
        <div className="bg-[#121212] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight">Configuración del Administrador</h3>
              <p className="text-[11px] text-zinc-500">Gestione listas bases de datos y marca empresarial.</p>
            </div>
          </div>
          <button id="close-admin-btn" onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">

          {/* Company identity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-400" /> Identidad Empresarial
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">Nombre Comercial de la Empresa</label>
                  <input id="admin-company-name-input" type="text"
                    value={localSettings.companyName}
                    onChange={e => setLocalSettings(p => ({ ...p, companyName: e.target.value }))}
                    className="w-full text-xs border border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-zinc-950 text-zinc-200" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">Dirección Corporativa</label>
                  <input id="admin-company-address-input" type="text"
                    value={localSettings.companyAddress || ""}
                    onChange={e => setLocalSettings(p => ({ ...p, companyAddress: e.target.value }))}
                    className="w-full text-xs border border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-zinc-950 text-zinc-200" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <span className="block text-[11px] font-bold text-zinc-300">Logo Empresarial (PDF)</span>
              <div id="admin-logo-upload-zone" onClick={() => logoInputRef.current?.click()}
                className="border border-dashed border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center h-28 hover:bg-zinc-800/20 cursor-pointer text-center relative overflow-hidden group transition-all">
                {localSettings.logo ? (
                  <>
                    <img src={localSettings.logo} alt="Logo" className="max-h-20 object-contain" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 py-1 text-[9px] text-white opacity-0 group-hover:opacity-100 transition text-center font-bold">Cambiar Logo</div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-7 h-7 text-blue-500 mb-1" />
                    <span className="text-[10px] font-semibold text-zinc-400">Subir Logotipo</span>
                    <span className="text-[8px] text-zinc-500 mt-0.5">PNG / JPG transparente recomendado</span>
                  </>
                )}
                <input id="admin-logo-file-input" ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* Excel Batch Import */}
          <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex gap-3 items-center">
              <div className="p-2.5 bg-emerald-600 rounded-xl text-white">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-extrabold text-emerald-400">Importación Masiva de Clientes y Sucursales</h5>
                <p className="text-[10px] text-zinc-400 mt-0.5">Sube una planilla Excel con columnas "Cliente" y "Sucursal" para llenar las bases de datos de inmediato.</p>
              </div>
            </div>
            <label className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm transition">
              {excelImportLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : <><Upload className="w-4 h-4" /> Importar Excel (.xlsx)</>}
              <input id="excel-admin-importer" type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={excelImportLoading} />
            </label>
          </div>

          <hr className="border-zinc-800" />

          {/* ── Clients Section ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-400" />
                Clientes Registrados
                <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full ml-1">
                  {localSettings.clientRecords.length}
                </span>
              </h4>
              <button
                onClick={() => { setEditingClient(null); setShowClientModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition active:scale-95">
                <Plus className="w-3.5 h-3.5" /> Nuevo Cliente
              </button>
            </div>

            {localSettings.clientRecords.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-xs italic">
                No hay clientes registrados. Haz clic en "+ Nuevo Cliente" para agregar uno.
              </div>
            ) : (
              <div className="space-y-2">
                {localSettings.clientRecords.map(cr => (
                  <div key={cr.id}
                    className="flex items-center justify-between px-4 py-3 bg-[#0f0f0f] border border-zinc-800 rounded-xl hover:border-zinc-700 transition group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-950/50 text-blue-400 border border-blue-900/40 flex items-center justify-center text-sm font-black shrink-0">
                        {cr.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-200 truncate">{cr.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {cr.region.replace("Región ", "")}
                          {" · "}
                          {cr.noSubs ? "Sin sucursales" : `${cr.subs.length} sub${cr.subs.length !== 1 ? "s" : ""}`}
                          {cr.contactPerson && ` · ${cr.contactPerson}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      {/* Sub badges */}
                      {!cr.noSubs && cr.subs.slice(0, 3).map(s => (
                        <span key={s.id} className="hidden sm:inline text-[9px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded">
                          {s.code || s.name.slice(0, 6) || "SUB"}
                        </span>
                      ))}
                      {!cr.noSubs && cr.subs.length > 3 && (
                        <span className="hidden sm:inline text-[9px] font-bold bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">
                          +{cr.subs.length - 3}
                        </span>
                      )}
                      <button onClick={() => { setEditingClient(cr); setShowClientModal(true); }}
                        className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-blue-400 rounded cursor-pointer transition" title="Editar cliente">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteClientRecord(cr.id)}
                        className="p-1.5 hover:bg-rose-950/30 text-zinc-500 hover:text-rose-400 rounded cursor-pointer transition" title="Eliminar cliente">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-zinc-800" />

          {/* Datalists */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {(["brands", "refrigerants", "equipmentTypes", "techs"] as const).map(field => {
              const labels: Record<string, string> = { brands: "Marcas", refrigerants: "Refrigerantes", equipmentTypes: "Tipos Equipos", techs: "Técnicos HVAC" };
              const placeholders: Record<string, string> = { brands: "Carrier", refrigerants: "R-32", equipmentTypes: "VRF", techs: "Sofía E." };
              const vals: Record<string, string> = { brands: newBrand, refrigerants: newRefrigerant, equipmentTypes: newEqType, techs: newTech };
              const setters: Record<string, (v: string) => void> = { brands: setNewBrand, refrigerants: setNewRefrigerant, equipmentTypes: setNewEqType, techs: setNewTech };
              const ids: Record<string, string> = { brands: "admin-new-brand-input", refrigerants: "admin-new-refrig-input", equipmentTypes: "admin-new-eq-input", techs: "admin-new-tech-input" };

              return (
                <div key={field} className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-300 mb-2 truncate">{labels[field]}</span>
                  <div className="flex gap-1 mb-2">
                    <input id={ids[field]} type="text" value={vals[field]}
                      onChange={e => setters[field](e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addGenericItem(field, vals[field], setters[field])}
                      placeholder={placeholders[field]}
                      className={inputSm} />
                    <button onClick={() => addGenericItem(field, vals[field], setters[field])}
                      className="px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold cursor-pointer">+</button>
                  </div>
                  <div className="border border-zinc-800 rounded max-h-32 overflow-y-auto pr-1 text-[11px] bg-zinc-950">
                    {localSettings[field].map(item => (
                      <div key={item} className="flex justify-between items-center px-2 py-1 border-b border-zinc-900 last:border-0">
                        <span className="text-zinc-400 truncate max-w-[120px]">{item}</span>
                        <button onClick={() => deleteGenericItem(field, item)} className="text-rose-400 hover:scale-110 cursor-pointer shrink-0">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#121212] px-6 py-4 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button id="cancel-admin-save" onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700 cursor-pointer transition">
            Cancelar
          </button>
          <button id="save-admin-settings" onClick={save} disabled={isSaving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition">
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>

      {/* Client creation / edit modal */}
      {showClientModal && (
        <ClientModal
          client={editingClient}
          onSave={handleSaveClientRecord}
          onCancel={() => { setShowClientModal(false); setEditingClient(null); }}
        />
      )}
    </div>
  );
}
