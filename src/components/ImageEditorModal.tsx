import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw, RotateCw, SlidersHorizontal, Trash2, X } from "lucide-react";

interface ImageEditorModalProps {
  source: string;
  title?: string;
  onCancel: () => void;
  onConfirm: (editedImage: string) => void;
}

const outputMime = "image/jpeg";
const outputQuality = 0.92;
const standardMaxSize = 1600;

export default function ImageEditorModal({
  source,
  title = "Editor de imagen",
  onCancel,
  onConfirm,
}: ImageEditorModalProps) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [maxSize, setMaxSize] = useState(standardMaxSize);
  const [crop, setCrop] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    setImageReady(false);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setImageReady(true);
    };
    image.onerror = () => {
      imageRef.current = null;
      setImageReady(false);
    };
    image.src = source;
  }, [source]);

  const drawEditedImage = (targetCanvas: HTMLCanvasElement, preview = false) => {
    const image = imageRef.current;
    if (!image) return false;

    const cropLeft = Math.round((crop.left / 100) * image.naturalWidth);
    const cropRight = Math.round((crop.right / 100) * image.naturalWidth);
    const cropTop = Math.round((crop.top / 100) * image.naturalHeight);
    const cropBottom = Math.round((crop.bottom / 100) * image.naturalHeight);
    const cropWidth = Math.max(1, image.naturalWidth - cropLeft - cropRight);
    const cropHeight = Math.max(1, image.naturalHeight - cropTop - cropBottom);
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const swapsAxes = normalizedRotation === 90 || normalizedRotation === 270;

    const rotatedWidth = swapsAxes ? cropHeight : cropWidth;
    const rotatedHeight = swapsAxes ? cropWidth : cropHeight;
    const outputScale = preview
      ? Math.min(1, 920 / rotatedWidth, 560 / rotatedHeight)
      : Math.min(1, maxSize / Math.max(rotatedWidth, rotatedHeight));

    targetCanvas.width = Math.max(1, Math.round(rotatedWidth * outputScale));
    targetCanvas.height = Math.max(1, Math.round(rotatedHeight * outputScale));

    const ctx = targetCanvas.getContext("2d");
    if (!ctx) return false;

    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.fillStyle = "#0b0b0d";
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.save();
    ctx.translate(targetCanvas.width / 2, targetCanvas.height / 2);
    ctx.rotate((normalizedRotation * Math.PI) / 180);
    ctx.drawImage(
      image,
      cropLeft,
      cropTop,
      cropWidth,
      cropHeight,
      -(cropWidth * outputScale) / 2,
      -(cropHeight * outputScale) / 2,
      cropWidth * outputScale,
      cropHeight * outputScale
    );
    ctx.restore();
    return true;
  };

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !imageReady) return;
    drawEditedImage(canvas, true);
  }, [imageReady, rotation, maxSize, crop]);

  const setCropSide = (side: keyof typeof crop, value: number) => {
    const next = Math.max(0, Math.min(40, value));
    setCrop(current => ({ ...current, [side]: next }));
  };

  const resetEdits = () => {
    setRotation(0);
    setMaxSize(standardMaxSize);
    setCrop({ top: 0, right: 0, bottom: 0, left: 0 });
  };

  const confirm = () => {
    const canvas = document.createElement("canvas");
    if (!drawEditedImage(canvas)) return;
    onConfirm(canvas.toDataURL(outputMime, outputQuality));
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-5xl max-h-[94vh] overflow-hidden bg-[#151518] border border-zinc-700 rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-extrabold text-zinc-100 uppercase tracking-wide">{title}</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Recorte bordes, rote y ajuste el tamano antes de adjuntar.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            title="Cerrar editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] min-h-0">
          <div className="bg-[#0b0b0d] min-h-[320px] max-h-[62vh] lg:max-h-[72vh] overflow-auto flex items-center justify-center p-4">
            <canvas
              ref={previewRef}
              className="max-w-full h-auto rounded-xl border border-zinc-800 shadow-lg bg-black"
            />
            {!imageReady && <span className="text-xs text-zinc-500">Cargando imagen...</span>}
          </div>

          <aside className="border-t lg:border-t-0 lg:border-l border-zinc-800 p-4 space-y-4 overflow-y-auto">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-orange-400" /> Rotacion
              </span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setRotation(value => value - 90)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200"
                >
                  <RotateCcw className="w-4 h-4" /> -90
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(value => value + 90)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200"
                >
                  <RotateCw className="w-4 h-4" /> +90
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">Actual: {((rotation % 360) + 360) % 360} grados</p>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" /> Recortar bordes
              </span>
              {(["top", "right", "bottom", "left"] as const).map(side => (
                <label key={side} className="block mt-3">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase">
                    <span>{side === "top" ? "Superior" : side === "right" ? "Derecho" : side === "bottom" ? "Inferior" : "Izquierdo"}</span>
                    <span>{crop[side]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={crop[side]}
                    onChange={event => setCropSide(side, Number(event.target.value))}
                    className="w-full accent-orange-500"
                  />
                </label>
              ))}
            </div>

            <div>
              <label className="block">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase">
                  <span>Tamano maximo</span>
                  <span>{maxSize}px</span>
                </div>
                <input
                  type="range"
                  min={800}
                  max={2400}
                  step={100}
                  value={maxSize}
                  onChange={event => setMaxSize(Number(event.target.value))}
                  className="w-full accent-orange-500"
                />
              </label>
              <p className="text-[10px] text-zinc-500 mt-1">Mantiene proporcion y reduce peso sin deformar.</p>
            </div>

            <button
              type="button"
              onClick={resetEdits}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-200"
            >
              <Trash2 className="w-4 h-4 text-zinc-400" /> Borrar edicion y dejar estandar
            </button>
          </aside>
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-zinc-800 flex flex-col sm:flex-row justify-end gap-2 bg-[#111114]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-zinc-700 text-xs font-bold text-zinc-300 hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!imageReady}
            className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wide flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> OK y adjuntar
          </button>
        </div>
      </div>
    </div>
  );
}
