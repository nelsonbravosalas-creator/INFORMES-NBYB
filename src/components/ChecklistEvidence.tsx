import { InspectionChecklistItem } from "../types";
import { Camera, Trash, CheckSquare, AlertCircle, HelpCircle, MessageSquare, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

interface ChecklistEvidenceProps {
  checklist: InspectionChecklistItem[];
  onChange: (updatedChecklist: InspectionChecklistItem[]) => void;
}

export default function ChecklistEvidence({ checklist, onChange }: ChecklistEvidenceProps) {
  const [activeCategory, setActiveCategory] = useState<string>("Filtros y Limpieza");

  // Get unique categories for tab filter
  const categories = Array.from(new Set(checklist.map(item => item.category)));

  const handleStatusChange = (itemId: string, status: "cumple" | "no_cumple" | "na") => {
    const updated = checklist.map(item => {
      if (item.id === itemId) {
        return { ...item, status };
      }
      return item;
    });
    onChange(updated);
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    const updated = checklist.map(item => {
      if (item.id === itemId) {
        return { ...item, notes };
      }
      return item;
    });
    onChange(updated);
  };

  const handleAddPhotos = (itemId: string, files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64Str = reader.result as string;
        
        // Update item with new photo
        const updated = checklist.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              images: [...(item.images || []), base64Str]
            };
          }
          return item;
        });
        onChange(updated);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (itemId: string, photoIdx: number) => {
    const updated = checklist.map(item => {
      if (item.id === itemId) {
        const updatedPics = [...item.images];
        updatedPics.splice(photoIdx, 1);
        return {
          ...item,
          images: updatedPics
        };
      }
      return item;
    });
    onChange(updated);
  };

  const filteredChecklist = checklist.filter(item => item.category === activeCategory);

  return (
    <div id="checklist-evidence-container" className="space-y-6">
      {/* Category Selection Tabs */}
      <div className="flex border-b border-zinc-800 overflow-x-auto gap-1 pb-px scrollbar-thin">
        {categories.map((cat) => (
          <button
            id={`tab-cat-${cat.replace(/\s+/g, "-")}`}
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap rounded-t-lg -mb-px border-b-2 ${
              activeCategory === cat
                ? "border-blue-500 text-blue-400 bg-blue-950/20"
                : "border-transparent text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Checklist Items list */}
      <div id="checklist-items-grid" className="space-y-5">
        {filteredChecklist.map((item) => (
          <div
            id={`checklist-card-${item.id}`}
            key={item.id}
            className="p-5 bg-[#18181b] border border-zinc-800 rounded-xl shadow-sm space-y-4"
          >
            {/* Header: Label and quick status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex-1">
                {item.label}
              </span>

              {/* Status Segment Control Buttons */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 w-fit self-start sm:self-center">
                <button
                  id={`status-cumple-${item.id}`}
                  type="button"
                  onClick={() => handleStatusChange(item.id, "cumple")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition duration-150 flex items-center gap-1 ${
                    item.status === "cumple"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Cumple
                </button>
                <button
                  id={`status-nocumple-${item.id}`}
                  type="button"
                  onClick={() => handleStatusChange(item.id, "no_cumple")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition duration-150 flex items-center gap-1 ${
                    item.status === "no_cumple"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" /> Falla
                </button>
                <button
                  id={`status-na-${item.id}`}
                  type="button"
                  onClick={() => handleStatusChange(item.id, "na")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition duration-150 flex items-center gap-1 ${
                    item.status === "na"
                      ? "bg-slate-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" /> N/A
                </button>
              </div>
            </div>

            {/* Inputs: Notes and Evidence Pics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Review notes */}
              <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-zinc-500" /> Observaciones o Hallazgos
                </span>
                <textarea
                  id={`note-input-${item.id}`}
                  value={item.notes || ""}
                  onChange={(e) => handleNotesChange(item.id, e.target.value)}
                  placeholder="Describa el hallazgo o reparaciones sugeridas..."
                  className="w-full text-xs min-h-[76px] rounded-lg border border-zinc-800 p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[#0f0f0f] dark:text-zinc-200"
                />
              </div>

              {/* Photos Evidence */}
              <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-blue-400" /> Evidencia Fotográfica ({item.images?.length || 0})
                </span>
                
                <div className="flex gap-2.5 flex-wrap items-center">
                  {/* Photo Add Button */}
                  <label className="flex items-center justify-center border border-dashed border-zinc-800 hover:border-blue-500 bg-[#0f0f0f] hover:bg-zinc-800/10 transition w-16 h-16 rounded-xl cursor-pointer">
                    <input
                      id={`chk-pic-add-${item.id}`}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleAddPhotos(item.id, e.target.files)}
                    />
                    <div className="flex flex-col items-center">
                      <Camera className="w-5 h-5 text-blue-500" />
                      <span className="text-[8px] text-zinc-500 font-bold mt-1">Añadir</span>
                    </div>
                  </label>

                  {/* Previews */}
                  {(item.images || []).map((pic, idx) => (
                    <div
                      id={`photo-thumb-${item.id}-${idx}`}
                      key={idx}
                      className="relative w-16 h-16 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden group"
                    >
                      <img src={pic} alt="Evidencia" className="w-full h-full object-cover" />
                      
                      {/* Delete Overlay */}
                      <button
                        id={`photo-del-${item.id}-${idx}`}
                        type="button"
                        onClick={() => handleRemovePhoto(item.id, idx)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-rose-400 hover:text-rose-300"
                        title="Borrar foto de evidencia"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
