import React, { useState } from "react";
import { Sparkles, X, Brain, Loader2 } from "lucide-react";
import { DuaItem } from "../data/duaDatabase";

interface AiDuaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDuaGenerated: (newDua: DuaItem) => void;
  lang: "id" | "en";
}

export const AiDuaModal: React.FC<AiDuaModalProps> = ({
  isOpen,
  onClose,
  onDuaGenerated,
  lang,
}) => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickPrompts = [
    {
      id: "Doa dimudahkan segala urusan pekerjaan & karir",
      en: "Prayer for ease in work affairs & career success",
    },
    {
      id: "Doa ketenangan jiwa saat cemas & gelisah",
      en: "Prayer for peace of mind when anxious & stressed",
    },
    {
      id: "Doa keberkahan rumah tangga & sakinah",
      en: "Prayer for household blessings & loving family",
    },
    {
      id: "Doa kelulusan ujian, hafalan kuat & kecerdasan",
      en: "Prayer for passing exams, strong memory & wisdom",
    },
    {
      id: "Doa kesembuhan penyakit kronis & kekuatan fisik",
      en: "Prayer for healing from illness & bodily strength",
    },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMessage(
        lang === "en"
          ? "Please enter your prayer request or topic"
          : "Silakan masukkan topik atau hajat doa yang diinginkan"
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/generate-dua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        let errMessage = "Gagal merumuskan doa dengan AI";
        try {
          const errorData = await response.json();
          errMessage = errorData.error || errMessage;
        } catch (_) {
          errMessage = await response.text();
        }

        // Clean JSON formatting if server returned raw JSON
        if (typeof errMessage === "string" && errMessage.includes('"code":503')) {
          errMessage =
            lang === "en"
              ? "The AI model is currently experiencing high demand. Please click 'Retry' in a few seconds."
              : "Server AI sedang mengalami lonjakan trafik (503 High Demand). Silakan klik 'Coba Lagi' dalam beberapa detik.";
        }
        throw new Error(errMessage);
      }

      const generated: DuaItem = await response.json();
      const finalDua: DuaItem = {
        ...generated,
        id: Date.now(),
        category: "AI Doa",
      };

      onDuaGenerated(finalDua);
      onClose();
    } catch (err: any) {
      console.error("AI Dua Error:", err);
      let msg = err.message || "Gagal merumuskan doa AI. Silakan coba lagi.";
      if (typeof msg === "string" && (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE"))) {
        msg =
          lang === "en"
            ? "The AI model is currently experiencing high demand (503). Please click 'Retry' in a moment."
            : "Server AI sedang mengalami lonjakan trafik tinggi (503 High Demand). Silakan klik 'Coba Lagi' di bawah.";
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center font-bold border border-violet-500/30">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                {lang === "en"
                  ? "AI Islamic Dua Generator"
                  : "AI Generator Doa Shahih"}
                <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] font-mono">
                  Gemini Flash
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === "en"
                  ? "Formulate authentic & heartfelt prayers with full harakat"
                  : "Rumuskan doa bersanad & bermakna menyentuh hati"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0">⚠️</span>
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-3.5 py-1.5 bg-rose-800/80 hover:bg-rose-700 text-white rounded-lg text-[11px] font-semibold transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <span>{lang === "en" ? "Retry Now" : "Coba Lagi Sekarang"}</span>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              {lang === "en"
                ? "Your Prayer Request or Life Situation"
                : "Hajat Doa atau Keperluan Anda"}
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                lang === "en"
                  ? "e.g., Prayer for passing job interview, prayer for inner peace and debt relief..."
                  : "Misal: Doa lulus seleksi kerja, Doa ketenangan batin saat menghadapi cobaan berat..."
              }
              className="w-full bg-slate-800/90 border border-slate-700 text-slate-100 rounded-xl p-3 focus:border-violet-500 outline-none transition"
            />
          </div>

          <div>
            <span className="block text-[11px] text-slate-400 mb-1 font-medium">
              {lang === "en" ? "Quick Suggestions:" : "Contoh Cepat:"}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((item, idx) => {
                const text = lang === "en" ? item.en : item.id;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(text)}
                    className="px-2.5 py-1 bg-slate-800/80 text-slate-300 border border-slate-700/60 rounded-lg hover:bg-slate-700 hover:text-white text-[10px] transition"
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/25 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>
                  {lang === "en"
                    ? "Formulating Authentic Dua..."
                    : "Merumuskan Doa Shahih..."}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  {lang === "en"
                    ? "Generate Prayer Now"
                    : "Buat Doa Otomatis"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
