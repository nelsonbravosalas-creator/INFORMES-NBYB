import React, { useRef, useEffect, useState } from "react";
import { Pen, Trash2 } from "lucide-react";

interface SignaturePadProps {
  id: string;
  label: string;
  initialValue?: string;
  onSave: (base64Data: string) => void;
}

export default function SignaturePad({ id, label, initialValue, onSave }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(!!initialValue);

  // Initialize canvas with initial image if available
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and set sizing
    ctx.strokeStyle = "#0088cc"; // Royal premium blue stroke
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialValue;
    }
  }, [initialValue]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getEventCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getEventCoords(e, canvas);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    onSave("");
  };

  const getEventCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    
    // Support scale ratio handling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  return (
    <div id={`${id}-container`} className="flex flex-col bg-[#121214] p-4 rounded-xl border border-dashed border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Pen className="w-3.5 h-3.5 text-blue-400" /> {label}
        </span>
        {hasContent && (
          <button
            id={`${id}-clear-btn`}
            type="button"
            onClick={clear}
            className="text-xs text-rose-400 hover:text-rose-300 transition flex items-center gap-1 font-medium bg-rose-950/20 px-2.5 py-1 rounded cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Borrar Firma
          </button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-lg bg-zinc-950 border border-zinc-800 touch-none">
        <canvas
          id={id}
          ref={canvasRef}
          width={400}
          height={160}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-40 cursor-crosshair block bg-zinc-950"
        />
        {!hasContent && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-zinc-500 text-xs select-none">
            Firme aquí (Dedo, Mouse o Stylus)
          </div>
        )}
      </div>
    </div>
  );
}
