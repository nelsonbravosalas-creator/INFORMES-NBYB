/**
 * POST /api/ocr — Migración del endpoint Express server.ts a Vercel Function
 *
 * Recibe { image: base64, mimeType }, devuelve datos estructurados de la placa
 * de equipo HVAC extraídos por Gemini AI.
 */
import { GoogleGenAI, Type } from "@google/genai";
import { json, error, serverError } from "./_lib/db.js";
import { authenticate } from "./_lib/auth.js";
import { checkRateLimit } from "./_lib/rateLimit.js";

export async function fetch(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return error("Método no permitido", 405);
  }

  const auth = authenticate(req);
  if (!auth) return error("No autenticado", 401);

  // Máx. 30 reconocimientos / hora por usuario — evita abuso de la cuota paga de Gemini
  const allowed = await checkRateLimit(`ocr:user:${auth.sub}`, 30, 60 * 60);
  if (!allowed) {
    return error("Límite de reconocimientos OCR alcanzado. Intenta más tarde.", 429);
  }

  try {
    const { image, mimeType } = (await req.json()) as { image?: string; mimeType?: string };

    if (!image) {
      return error("No se proporcionó ninguna imagen.", 400);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return error(
        "API Key de Gemini no configurada. Configúrala en Vercel → Settings → Environment Variables",
        500
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "informes-nbyb-vercel" } },
    });

    const promptPart = `Eres un asistente de digitalización experto en sistemas HVAC.
Analiza esta foto de una placa de características (nameplate) de un equipo de refrigeración o aire acondicionado.
Extrae los siguientes datos en el formato JSON estructurado solicitado. Intenta ser muy exacto.
Si no puedes ver o leer algunos campos, colócalos como un campo vacío o una estimación razonable.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { inlineData: { mimeType: mimeType || "image/png", data: image } },
        { text: promptPart },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brand: { type: Type.STRING },
            model: { type: Type.STRING },
            serialNumber: { type: Type.STRING },
            refrigerantType: { type: Type.STRING },
            capacity: { type: Type.STRING },
            voltage: { type: Type.STRING },
            amperage: { type: Type.STRING },
          },
          required: ["brand", "model", "serialNumber", "refrigerantType", "capacity", "voltage", "amperage"],
        },
      },
    });

    const textResult = response.text;
    if (!textResult) {
      return error("La IA no pudo extraer datos de la imagen (placa borrosa).", 422);
    }

    const data = JSON.parse(textResult.trim());
    return json({ success: true, data });
  } catch (err: any) {
    return serverError("OCR error:", err);
  }
}
