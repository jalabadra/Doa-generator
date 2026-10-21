import React, { useRef, useState, useEffect } from "react";
import {
  Film,
  Download,
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Volume2,
} from "lucide-react";
import { AspectRatioType } from "../types";

interface VideoProgressModalProps {
  isOpen: boolean;
  status: "rendering" | "ready";
  progressPercent: number;
  statusTitle: string;
  statusDetail: string;
  lang: "id" | "en";
  videoUrl: string | null;
  videoBlob: Blob | null;
  aspectRatio: AspectRatioType;
  duaTitle: string;
  onClose: () => void;
  onDownload: () => void;
  onReRender: () => void;
}

export const VideoProgressModal: React.FC<VideoProgressModalProps> = ({
  isOpen,
  status,
  progressPercent,
  statusTitle,
  statusDetail,
  lang,
  videoUrl,
  videoBlob,
  aspectRatio,
  duaTitle,
  onClose,
  onDownload,
  onReRender,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (status === "ready" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }, [status, videoUrl]);

  if (!isOpen) return null;

  const fileSizeMB = videoBlob
    ? (videoBlob.size / (1024 * 1024)).toFixed(2)
    : "0";

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  // Rendering in-progress state
  if (status === "rendering") {
    return (
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <Film className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">
              {statusTitle ||
                (lang === "en"
                  ? "Rendering HD Video..."
                  : "Merender Video HD...")}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{statusDetail}</p>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-full transition-all duration-150 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between w-full text-[11px] text-slate-400 font-mono">
            <span>
              {aspectRatio === "9:16"
                ? "1080×1920 (9:16 Shorts)"
                : aspectRatio === "1:1"
                ? "1080×1080 (1:1 Square)"
                : "1920×1080 (16:9 Landscape)"}
            </span>
            <span className="text-amber-400 font-bold">{progressPercent}%</span>
          </div>
          <p className="text-[11px] text-slate-500 italic mt-1">
            {lang === "en"
              ? "Pratinjau video akan otomatis diputar setelah proses selesai."
              : "Pratinjau video akan otomatis diputar setelah proses selesai."}
          </p>
        </div>
      </div>
    );
  }

  // Ready / Preview state
  return (
    <div
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 max-h-[94vh] overflow-y-auto no-scrollbar transition">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  {lang === "en"
                    ? "Video Preview Ready"
                    : "Pratinjau Video Siap"}
                </h3>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Render 100%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {duaTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
            title={lang === "en" ? "Close" : "Tutup"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Box */}
        <div className="relative mx-auto w-full flex flex-col items-center justify-center bg-slate-950/90 rounded-2xl border border-slate-800 p-2 shadow-inner">
          <div
            className={`relative rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-xl ${
              aspectRatio === "9:16"
                ? "w-full max-w-[260px] sm:max-w-[280px] aspect-[9/16] max-h-[50vh]"
                : aspectRatio === "1:1"
                ? "w-full max-w-[340px] aspect-square max-h-[46vh]"
                : "w-full max-w-[460px] aspect-video max-h-[46vh]"
            }`}
          >
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                autoPlay
                loop
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-xs text-slate-500 flex flex-col items-center gap-2 p-6">
                <Film className="w-8 h-8 text-slate-600" />
                <span>
                  {lang === "en"
                    ? "No video data available"
                    : "Data video tidak tersedia"}
                </span>
              </div>
            )}
          </div>

          {/* Quick playback helper buttons */}
          <div className="flex items-center justify-center gap-2 mt-2 w-full">
            <button
              onClick={handleTogglePlay}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Putar</span>
                </>
              )}
            </button>
            <button
              onClick={handleRestart}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>{lang === "en" ? "Replay" : "Ulangi"}</span>
            </button>
          </div>
        </div>

        {/* Video Metadata specs */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
          <div className="flex items-center gap-2">
            <span>
              {aspectRatio === "9:16"
                ? "Shorts 1080×1920"
                : aspectRatio === "1:1"
                ? "Square 1080×1080"
                : "Landscape 1920×1080"}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>60 FPS</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>{fileSizeMB} MB</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Audio AI + BGM</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
          <button
            onClick={onReRender}
            className="py-3 px-3.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
            title={lang === "en" ? "Render Again" : "Render Ulang"}
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">
              {lang === "en" ? "Re-render" : "Render Ulang"}
            </span>
          </button>

          <button
            onClick={onDownload}
            className="flex-1 py-3 px-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition transform active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>
              {lang === "en" ? "Download Video Now" : "Unduh Video Sekarang"}
            </span>
          </button>

          <button
            onClick={onClose}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            <span>{lang === "en" ? "Close" : "Tutup"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
