import React, { useState, useRef } from "react";
import { Camera, Image as ImageIcon, Loader2, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";

interface NameplateOCRProps {
  onDataExtracted: (extractedData: {
    brand: string;
    model: string;
    serialNumber: string;
    refrigerantType: string;
    capacity: string;
    voltage: string;
    amperage: string;
  }) => void;
  onError: (errMsg: string) => void;
}

export default function NameplateOCR({ onDataExtracted, onError }: NameplateOCRProps) {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [statusText, setStatusText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conversion of file to Base64 String
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Str = reader.result as string;
        // Strip data prefix (e.g. "data:image/jpeg;base64,") for Google GenAI binary payload
        const cleanedStr = base64Str.split(",")[1];
        resolve(cleanedStr);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      onError("Por favor, selecciona un archivo de imagen válido (JPEG, PNG).");
      return;
    }

    try {
      setLoading(true);
      setStatusText("Procesando imagen localmente...");
      const base64Data = await convertToBase64(file);
      
      setStatusText("Escaneando placa de características con Gemini AI...");
      
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Data,
          mimeType: file.type
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Fallo en el servidor al digitalizar");
      }

      const result = await response.json();
      if (result.success && result.data) {
        onDataExtracted(result.data);
        setStatusText("¡Digitalización completada!");
      } else {
        throw new Error("No se obtuvieron campos claros");
      }
    } catch (err: any) {
      console.error(err);
      onError(err.message || "Error al procesar el reconocimiento automatizado");
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div id="ocr-uploader-root" className="bg-[#18181b] p-5 rounded-2xl border border-zinc-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-100">OCR Placa de Características</h4>
            <p className="text-xs text-zinc-500">Completa la ficha técnica al instante subiendo una foto con la IA.</p>
          </div>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" /> {statusText || "Analizando..."}
          </div>
        )}
      </div>

      <div
        id="ocr-drag-drop-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 select-none ${
          dragActive 
            ? "border-blue-500 bg-blue-950/20" 
            : "border-zinc-800 hover:border-blue-400 hover:bg-zinc-800/10"
        }`}
      >
        <input
          id="ocr-file-input"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={loading}
        />
        
        {loading ? (
          <div className="py-2 flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-2" />
            <span className="text-xs font-semibold text-zinc-300">{statusText}</span>
            <span className="text-[10px] text-zinc-500 mt-1">Este proceso tarda un par de segundos...</span>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Camera className="w-8 h-8 text-zinc-650 text-zinc-500" />
              <ImageIcon className="w-8 h-8 text-zinc-650 text-zinc-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-300">
                Arrastra una foto aquí o haz click para escanear
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                Soporta capturas de cámara en tablet/móvil y archivos PNG, JPEG, WEBP.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
