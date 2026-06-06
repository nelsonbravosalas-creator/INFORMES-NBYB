import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Let's configure body size limit to support images
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // API Route for Gemini HVAC Nameplate OCR
  app.post("/api/ocr", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No se proporcionó ninguna imagen." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(500).json({ 
          error: "API Key de Gemini no configurada. Por favor, añádela en la pestaña de Secretos en AI Studio." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      // Prepare image part
      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/png",
          data: image,
        },
      };

      const promptPart = `Eres un asistente de digitalización experto en sistemas HVAC (Calefacción, Ventilación y Aire Acondicionado).
Analiza esta foto de una placa de características (nameplate) de un equipo de refrigeración o aire acondicionado.
Extrae los siguientes datos en el formato JSON estructurado solicitado. Intenta ser muy exacto:
- brand: Marca comercial del fabricante (ej. Daikin, Carrier, Trane, LG, York, Lennox, Rheem). Si no se detecta, pon cadena vacía.
- model: Modelo exacto del equipo.
- serialNumber: Número de serie del equipo.
- refrigerantType: Tipo de refrigerante de la placa (ej. R-410A, R-22, R-134a, R-407C).
- capacity: Capacidad del equipo (ej. 36000 BTU, 3 TR, 5 HP).
- voltage: Voltaje y fases (ej. 220V/3Ph/60Hz, 110V/1Ph/60Hz).
- amperage: Corriente máxima, FLA, RLA o LRA si está indicado.

Si no puedes ver o leer algunos campos, colócalos como un campo vacío o una estimación razonable. Devuelve únicamente el objeto JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          { text: promptPart }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              brand: { type: Type.STRING, description: "Marca comercial del fabricante del aire acondicionado" },
              model: { type: Type.STRING, description: "Modelo técnico del equipo" },
              serialNumber: { type: Type.STRING, description: "Número de serie o de fabricación" },
              refrigerantType: { type: Type.STRING, description: "Tipo de refrigerante" },
              capacity: { type: Type.STRING, description: "Capacidad térmica o de refrigeración" },
              voltage: { type: Type.STRING, description: "Voltaje de alimentación y fases" },
              amperage: { type: Type.STRING, description: "Corriente nominal o máxima en amperios" },
            },
            required: ["brand", "model", "serialNumber", "refrigerantType", "capacity", "voltage", "amperage"]
          }
        }
      });

      const textResult = response.text;
      if (!textResult) {
        throw new Error("No se pudo obtener texto del modelo de IA o la placa está borrosa.");
      }

      const parsedData = JSON.parse(textResult.trim());
      return res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error("Error en OCR de Gemini:", error);
      return res.status(500).json({ 
        error: "Error al procesar la imagen con Gemini AI: " + (error.message || error) 
      });
    }
  });

  // Serve static assets OR handle development server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
