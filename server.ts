import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust port & host resolution:
// 1. Check CLI args: --port <num> or -p <num> or --port=<num>
// 2. Check process.env.DEFAULT_APP_PORT
// 3. Check process.env.PORT (ensuring we don't conflict with Nginx on port 8080)
// 4. Fallback to port 3000 (standard AI Studio port)
function resolvePort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--port" || args[i] === "-p") && args[i + 1]) {
      const p = Number(args[i + 1]);
      if (!isNaN(p) && p > 0) return p;
    }
    if (args[i].startsWith("--port=")) {
      const p = Number(args[i].split("=")[1]);
      if (!isNaN(p) && p > 0) return p;
    }
  }

  if (process.env.DEFAULT_APP_PORT) {
    const p = Number(process.env.DEFAULT_APP_PORT);
    if (!isNaN(p) && p > 0) return p;
  }

  // Avoid binding to Nginx proxy port 8080
  if (process.env.PORT && process.env.PORT !== "8080") {
    const p = Number(process.env.PORT);
    if (!isNaN(p) && p > 0) return p;
  }

  return 3000;
}

function resolveHost(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--host" && args[i + 1]) {
      return args[i + 1];
    }
    if (args[i].startsWith("--host=")) {
      return args[i].split("=")[1];
    }
  }
  return process.env.HOST || "0.0.0.0";
}

const PORT = resolvePort();
const HOST = resolveHost();

const app = express();

app.use(express.json({ limit: "25mb" }));

// Health check endpoint for container supervisor and proxy probes
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

// Server-side Gemini client
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API: Generate Sahih Dua via Gemini
app.post("/api/generate-dua", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ai = getGenAIClient();
    const systemPrompt = `Anda adalah seorang ulama & pakar doa Al-Qur'an dan Hadits Shahih yang terpercaya.
Buatkan doa Islami yang shahih, relevan, menyentuh kalbu, dan tepat sesuai permohonan pengguna.
Kembalikan format JSON murni:
- title: Judul doa singkat (maksimal 5 kata, bahasa Indonesia)
- titleEn: Judul doa dalam bahasa Inggris
- category: Kategori yang cocok (Harian / Shalat / Rezeki / Keluarga / Perlindungan / Kesehatan / Safar / Puasa / Hajat)
- arabic: Teks doa bahasa Arab LENGKAP dengan harakat/tashkeel (fathah, kasrah, dhummah, sukun, tanwin, syaddah) yang sangat presisi
- latin: Transliterasi latin fonetik yang merdu dan mudah dibaca
- meaning: Terjemahan bahasa Indonesia yang puitis, khusyuk dan tepat
- meaningEn: Terjemahan bahasa Inggris yang akurat dan puitis
- sourceNote: Rujukan/riwayat (misal: HR. Bukhari no. ..., HR. Muslim, atau QS. ..., jika ada)`;

    // Candidate models to fallback if primary experiences temporary high demand (503)
    const candidateModels = [
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
    ];

    let lastError: any = null;

    for (const model of candidateModels) {
      // Up to 2 attempts per model with backoff
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[AI Dua] Attempting model ${model} (attempt ${attempt})...`);
          const response = await ai.models.generateContent({
            model,
            contents: `Buatkan doa Islami untuk permohonan/situasi ini: "${prompt}"`,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  titleEn: { type: Type.STRING },
                  category: { type: Type.STRING },
                  arabic: { type: Type.STRING },
                  latin: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  meaningEn: { type: Type.STRING },
                  sourceNote: { type: Type.STRING },
                },
                required: ["title", "titleEn", "category", "arabic", "latin", "meaning", "meaningEn"],
              },
            },
          });

          const text = response.text;
          if (!text) {
            throw new Error("No response text returned from AI model");
          }

          const parsed = JSON.parse(text);
          if (parsed && parsed.title && parsed.arabic) {
            return res.json(parsed);
          }
        } catch (err: any) {
          lastError = err;
          const errString = err?.message || String(err);
          const isHighDemand =
            errString.includes("503") ||
            errString.includes("high demand") ||
            errString.includes("UNAVAILABLE") ||
            errString.includes("429") ||
            errString.includes("RESOURCE_EXHAUSTED");

          console.warn(
            `[AI Dua] Model ${model} attempt ${attempt} failed: ${errString}`
          );

          if (isHighDemand && attempt === 1) {
            // Wait 600ms before retrying the same model
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
          // If 503 persists on attempt 2, break to next candidate model
          break;
        }
      }
    }

    throw lastError || new Error("Semua model AI sedang sibuk. Silakan coba kembali sesaat lagi.");
  } catch (error: any) {
    console.error("Error generating dua:", error);
    let readableMessage = error?.message || "Gagal merumuskan doa dengan AI";

    try {
      if (typeof readableMessage === "string" && readableMessage.trim().startsWith("{")) {
        const parsedJson = JSON.parse(readableMessage);
        if (parsedJson?.error?.message) {
          readableMessage = parsedJson.error.message;
        }
      }
    } catch (_) {}

    if (
      readableMessage.includes("503") ||
      readableMessage.includes("high demand") ||
      readableMessage.includes("UNAVAILABLE")
    ) {
      readableMessage =
        "Model AI sedang mengalami lonjakan permintaan (503 High Demand). Sistem telah mencoba fallback otomatis; silakan klik 'Coba Lagi' dalam beberapa saat.";
    }

    return res.status(503).json({
      error: readableMessage,
    });
  }
});

// Helper to split text into manageable sentence chunks (< 180 chars) for Google Free TTS
function splitTextForGoogleTTS(text: string, maxLen = 175): string[] {
  const parts = text
    .replace(/\r\n/g, "\n")
    .split(/([.\n!?]+)/)
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    if ((current + " " + part).trim().length <= maxLen) {
      current = (current + " " + part).trim();
    } else {
      if (current) chunks.push(current);
      if (part.length <= maxLen) {
        current = part;
      } else {
        // Fallback for very long single sentence without punctuation: split by spaces
        const words = part.split(/\s+/);
        let sub = "";
        for (const w of words) {
          if ((sub + " " + w).trim().length <= maxLen) {
            sub = (sub + " " + w).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        current = sub;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.filter((c) => c.length > 0);
}

// Fetch Google Free TTS audio chunks and merge into a unified MP3 buffer
async function fetchGoogleFreeTTS(
  text: string,
  lang = "id"
): Promise<{ audioBase64: string; mimeType: string }> {
  const targetLang = lang === "en" ? "en" : "id";
  const chunks = splitTextForGoogleTTS(text, 175);
  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encodeURIComponent(chunk)}`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!resp.ok) {
      throw new Error(`Google TTS web fetch failed with status ${resp.status}`);
    }

    const arrayBuf = await resp.arrayBuffer();
    audioBuffers.push(Buffer.from(arrayBuf));
  }

  const mergedBuffer = Buffer.concat(audioBuffers);
  return {
    audioBase64: mergedBuffer.toString("base64"),
    mimeType: "audio/mp3",
  };
}

// API: Generate Voice Narration via Google Free TTS
app.post("/api/tts-google-free", async (req, res) => {
  try {
    let { text, lang = "id" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text prompt is required" });
    }

    let cleanSpokenText = text
      .replace(/^(bacakan\s+[^:]+:|read\s+with\s+[^:]+:)\s*/i, "")
      .trim();
    cleanSpokenText = cleanSpokenText.replace(/^(doa\s+)+/i, "Doa ");
    cleanSpokenText = cleanSpokenText.replace(/^(prayer\s+)+/i, "Prayer ");

    const result = await fetchGoogleFreeTTS(cleanSpokenText, lang);
    return res.json({
      ...result,
      source: "google-free",
    });
  } catch (error: any) {
    console.error("Error generating Google Free TTS:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate Google Free TTS audio",
    });
  }
});

// API: Generate Voice Narration (TTS)
app.post("/api/tts", async (req, res) => {
  try {
    let { text, voice = "Sulafat", style, lang = "id" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text prompt is required" });
    }

    // Guard: Clean prompt instructions/directives if mistakenly included in text
    let cleanSpokenText = text
      .replace(/^(bacakan\s+[^:]+:|read\s+with\s+[^:]+:)\s*/i, "")
      .trim();

    // Guard: Ensure "Doa" or "Prayer" is not repeated at the beginning
    cleanSpokenText = cleanSpokenText.replace(/^(doa\s+)+/i, "Doa ");
    cleanSpokenText = cleanSpokenText.replace(/^(prayer\s+)+/i, "Prayer ");

    // If user explicitly chose Google Free TTS
    if (voice === "google-free") {
      const googleResult = await fetchGoogleFreeTTS(cleanSpokenText, lang);
      return res.json({
        ...googleResult,
        source: "google-free",
      });
    }

    // Try Gemini TTS with auto-fallback to Google Free TTS on error / 503 high demand
    try {
      const ai = getGenAIClient();
      const validVoices = ["Sulafat", "Zephyr", "Kore", "Aoede", "Puck", "Fenrir", "Charon"];
      const chosenVoice = validVoices.includes(voice) ? voice : "Sulafat";
      const voiceStyle =
        style && typeof style === "string"
          ? style
          : (lang === "en"
              ? "Read with a calm, reverent and clear tone"
              : "Bacakan dengan syahdu, khusyuk dan jelas");

      // Candidate models for Gemini Flash TTS (supporting user reference model & latest)
      const candidateTtsModels = [
        "gemini-3.8-flash-lite-tts",
        "gemini-2.5-flash-preview-tts",
      ];

      let audioPart: any = null;

      for (const m of candidateTtsModels) {
        try {
          console.log(`[TTS] Requesting audio from ${m} with voice ${chosenVoice}...`);
          const response = await ai.models.generateContent({
            model: m,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: cleanSpokenText,
                    speechMetadata: {
                      style: voiceStyle,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: chosenVoice,
                  },
                },
              },
            },
          });

          const p = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (p && p.data) {
            audioPart = p;
            break;
          }
        } catch (mErr: any) {
          console.warn(`[TTS] Model ${m} unavailable or busy:`, mErr?.message || mErr);
        }
      }

      if (audioPart && audioPart.data) {
        return res.json({
          audioBase64: audioPart.data,
          mimeType: audioPart.mimeType || "audio/wav",
          source: "gemini-tts",
        });
      }
    } catch (geminiErr: any) {
      console.warn("Gemini TTS busy or unavailable, falling back to Google Free TTS:", geminiErr?.message);
      // Seamlessly fallback to Google Free TTS so export/preview never fails
      const googleResult = await fetchGoogleFreeTTS(cleanSpokenText, lang);
      return res.json({
        ...googleResult,
        source: "google-free-fallback",
      });
    }

    // Fallback if no part data
    const googleResult = await fetchGoogleFreeTTS(cleanSpokenText, lang);
    return res.json({
      ...googleResult,
      source: "google-free-fallback",
    });
  } catch (error: any) {
    console.error("Error generating TTS:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate TTS audio",
    });
  }
});

// Setup Vite middleware in development or serve static in production
async function startServer() {
  const server = app.listen(PORT, HOST, () => {
    console.log(`Islamic Dua Shorts Studio running on http://${HOST}:${PORT}`);
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
    } else {
      console.error("Server error:", err);
    }
  });

  const distDir = path.join(__dirname, "dist");
  const hasDist = fs.existsSync(path.join(distDir, "index.html"));

  if (process.env.NODE_ENV === "production" && hasDist) {
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
