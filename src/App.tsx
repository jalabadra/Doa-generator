import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Palette,
  Mic,
  BadgePercent,
  PenTool,
  Download,
  Sparkles,
  Copy,
  Shuffle,
  Camera,
  Play,
  Square,
  Volume2,
  Film,
  Music,
  Image as ImageIcon,
  Trash2,
  Search,
  CheckCircle2,
  Upload,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { DUA_CATEGORIES, INITIAL_DUA_DATABASE, DuaItem } from "./data/duaDatabase";
import {
  AspectRatioType,
  BgTheme,
  BgType,
  BoxStyleType,
  FrameStyleType,
  Particle,
  ParticleType,
  StudioSettings,
  TextAnimType,
  VideoPresetType,
  VoiceOption,
  WatermarkPosType,
  BgmOption,
} from "./types";
import {
  createAmbientBgmBuffer,
  decodeAudioPayload,
} from "./utils/audioSynthesizer";
import {
  initParticles,
  renderStudioCanvas,
} from "./utils/canvasRenderer";
import { AiDuaModal } from "./components/AiDuaModal";
import { VideoProgressModal } from "./components/VideoProgressModal";
import { Toast, ToastState } from "./components/Toast";

const DEFAULT_SETTINGS: StudioSettings = {
  aspectRatio: "9:16",
  bgType: "gradient",
  bgTheme: "emerald-gold",
  videoPreset: "particles-glow",
  videoDimmer: 60,
  bgDimmer: 55,
  bgPosition: 50,
  particleType: "kunang-kunang",
  textAnim: "glow-pulse",
  arabicFont: "'Amiri', serif",
  latinFont: "'Inter', sans-serif",
  boxStyle: "blur",
  frameStyle: "islamic-corners",
  arabicSize: 42,
  transSize: 24,
  ttsVoice: "Sulafat",
  bgmTone: "calm-drone",
  voiceVol: 100,
  bgmVol: 25,
  channelName: "@DoaHarianShorts",
  watermarkPos: "top-pill",
  enableCta: true,
  customCtaText:
    "Bagikan video ini, semoga kita selalu dalam lindungan Allah subhanahu wa ta'ala.",
};

export default function App() {
  const [duas, setDuas] = useState<DuaItem[]>(INITIAL_DUA_DATABASE);
  const [currentDua, setCurrentDua] = useState<DuaItem>(INITIAL_DUA_DATABASE[0]);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "doa" | "desain" | "audio" | "branding" | "custom"
  >("doa");
  const [lang, setLang] = useState<"id" | "en">("id");

  // Settings State
  const [settings, setSettings] = useState<StudioSettings>(() => {
    try {
      const saved = localStorage.getItem("islamic_shorts_studio_settings");
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });

  // Custom Assets
  const [customBgImage, setCustomBgImage] = useState<HTMLImageElement | null>(null);
  const [customBgFileName, setCustomBgFileName] = useState<string | null>(null);
  const [customLogoImage, setCustomLogoImage] = useState<HTMLImageElement | null>(null);
  const [customLogoFileName, setCustomLogoFileName] = useState<string | null>(null);
  const [customBgVideo, setCustomBgVideo] = useState<HTMLVideoElement | null>(null);
  const [customBgVideoFileName, setCustomBgVideoFileName] = useState<string | null>(null);
  const [customBgmBuffer, setCustomBgmBuffer] = useState<AudioBuffer | null>(null);
  const [customBgmFileName, setCustomBgmFileName] = useState<string | null>(null);

  // Custom Dua Form State
  const [customTitle, setCustomTitle] = useState("");
  const [customArabic, setCustomArabic] = useState("");
  const [customLatin, setCustomLatin] = useState("");
  const [customMeaning, setCustomMeaning] = useState("");

  // Modals & Notifications
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isVideoProgressOpen, setIsVideoProgressOpen] = useState(false);
  const [videoModalStatus, setVideoModalStatus] = useState<"rendering" | "ready">("rendering");
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderedVideoBlob, setRenderedVideoBlob] = useState<Blob | null>(null);
  const [videoProgressPercent, setVideoProgressPercent] = useState(0);
  const [videoStatusTitle, setVideoStatusTitle] = useState("");
  const [videoStatusDetail, setVideoStatusDetail] = useState("");

  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    isError: false,
  });

  const downloadRenderedVideo = () => {
    if (!renderedVideoUrl && !renderedVideoBlob) {
      showToast(
        lang === "en"
          ? "No rendered video available"
          : "Belum ada video yang dirender",
        true
      );
      return;
    }

    const url = renderedVideoUrl || URL.createObjectURL(renderedVideoBlob!);
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = url;
    link.download = `${currentDua.title.replace(/\s+/g, "_")}_Shorts_HD.webm`;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
    }, 200);

    showToast(
      lang === "en"
        ? "HD Shorts Video downloaded successfully!"
        : "Video Shorts HD berhasil diunduh!"
    );
  };

  // Audio Playback & AudioContext
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeVoiceSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeBgmSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeAnalyserRef = useRef<AnalyserNode | null>(null);

  // Canvas & Particles References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>(initParticles(settings.particleType));
  const isRecordingRef = useRef(false);
  const recordProgressRef = useRef(0);

  const showToast = (message: string, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  };

  const updateSetting = <K extends keyof StudioSettings>(
    key: K,
    value: StudioSettings[K]
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(
          "islamic_shorts_studio_settings",
          JSON.stringify(next)
        );
      } catch (e) {}
      return next;
    });

    if (key === "particleType") {
      particlesRef.current = initParticles(value as ParticleType);
    }
  };

  // Re-size canvas on aspect ratio change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (settings.aspectRatio === "9:16") {
      canvas.width = 1080;
      canvas.height = 1920;
    } else if (settings.aspectRatio === "1:1") {
      canvas.width = 1080;
      canvas.height = 1080;
    } else {
      // 16:9
      canvas.width = 1920;
      canvas.height = 1080;
    }
  }, [settings.aspectRatio]);

  // Main Canvas Render Animation Loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      if (canvasRef.current && !isRecordingRef.current) {
        renderStudioCanvas({
          canvas: canvasRef.current,
          dua: currentDua,
          settings,
          lang,
          timeMs: Date.now(),
          particles: particlesRef.current,
          customBgImage,
          customLogoImage,
          customBgVideo,
          analyser: activeAnalyserRef.current,
          isRecording: isRecordingRef.current,
          recordProgress: recordProgressRef.current,
        });
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    currentDua,
    settings,
    lang,
    customBgImage,
    customLogoImage,
    customBgVideo,
  ]);

  // Stop all active audio
  const stopAllAudio = () => {
    if (activeVoiceSourceRef.current) {
      try {
        activeVoiceSourceRef.current.stop();
      } catch (e) {}
      activeVoiceSourceRef.current = null;
    }
    if (activeBgmSourceRef.current) {
      try {
        activeBgmSourceRef.current.stop();
      } catch (e) {}
      activeBgmSourceRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    activeAnalyserRef.current = null;
    setIsPlayingAudio(false);
  };

  // Helper to ensure the word "Doa" is spoken exactly once at the beginning
  const getSpokenTitle = (title: string, language: "id" | "en") => {
    const clean = title.trim();
    if (language === "en") {
      return clean;
    }
    // If the title already starts with "Doa" (or repeated "Doa Doa"), normalize to a single "Doa "
    if (/^doa\b/i.test(clean)) {
      return clean.replace(/^(doa\s+)+/i, "Doa ");
    }
    return `Doa ${clean}`;
  };

  // Helper to get customized or default CTA closing text (or empty if disabled)
  const getEffectiveClosing = (language: "id" | "en") => {
    if (!settings.enableCta) return "";
    if (settings.customCtaText && settings.customCtaText.trim()) {
      return settings.customCtaText.trim();
    }
    return language === "en"
      ? "Share this video, may Allah bless and protect us."
      : "Bagikan video ini, semoga kita selalu dalam lindungan Allah subhanahu wa ta'ala.";
  };

  // Browser SpeechSynthesis Fallback
  const playBrowserSpeech = () => {
    if (!("speechSynthesis" in window)) {
      showToast("Speech synthesis not supported in this browser", true);
      return;
    }
    stopAllAudio();
    const displayTitle =
      lang === "en" && currentDua.titleEn ? currentDua.titleEn : currentDua.title;
    const displayMeaning =
      lang === "en" && currentDua.meaningEn
        ? currentDua.meaningEn
        : currentDua.meaning;

    const spokenTitle = getSpokenTitle(displayTitle, lang);
    const closing = getEffectiveClosing(lang);
    const text = closing
      ? `${spokenTitle}. ${currentDua.latin}. Artinya: ${displayMeaning}. ${closing}`
      : `${spokenTitle}. ${currentDua.latin}. Artinya: ${displayMeaning}.`;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "en" ? "en-US" : "id-ID";
    utter.onend = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utter);
    setIsPlayingAudio(true);
    showToast(lang === "en" ? "Playing browser TTS" : "Memutar suara browser");
  };

  // Preview Audio Mix with TTS + BGM
  const previewAudioMix = async () => {
    if (isPlayingAudio) {
      stopAllAudio();
      return;
    }

    stopAllAudio();

    if (settings.ttsVoice === "browser") {
      playBrowserSpeech();
      return;
    }

    setIsPlayingAudio(true);
    showToast(
      lang === "en"
        ? "Synthesizing AI Voice & BGM..."
        : "Meracik Suara AI & Musik Syahdu..."
    );

    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const displayTitle =
        lang === "en" && currentDua.titleEn ? currentDua.titleEn : currentDua.title;
      const displayMeaning =
        lang === "en" && currentDua.meaningEn
          ? currentDua.meaningEn
          : currentDua.meaning;

      const spokenTitle = getSpokenTitle(displayTitle, lang);
      const closing = getEffectiveClosing(lang);
      const promptText = closing
        ? (lang === "en"
            ? `${spokenTitle}. ${currentDua.latin}. Meaning: ${displayMeaning}. \n\n${closing}`
            : `${spokenTitle}. ${currentDua.latin}. Artinya: ${displayMeaning}. \n\n${closing}`)
        : (lang === "en"
            ? `${spokenTitle}. ${currentDua.latin}. Meaning: ${displayMeaning}.`
            : `${spokenTitle}. ${currentDua.latin}. Artinya: ${displayMeaning}.`);

      const ttsStyle =
        lang === "en"
          ? "Read with a calm, reverent and clear tone"
          : "Bacakan dengan syahdu, khusyuk dan jelas";

      const ttsResponse = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: promptText,
          voice: settings.ttsVoice,
          style: ttsStyle,
          lang: lang,
        }),
      });

      if (!ttsResponse.ok) {
        throw new Error("TTS server error");
      }

      const ttsData = await ttsResponse.json();
      const voiceBuffer = await decodeAudioPayload(ttsData, audioCtx);
      const voiceDuration = voiceBuffer.duration;
      const sustainAfterVoice = 5.0;
      const fadeOutSec = 1.0;
      const totalDuration = voiceDuration + sustainAfterVoice + fadeOutSec;

      // Audio Analyser
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      activeAnalyserRef.current = analyser;

      // Voice Node
      const voiceNode = audioCtx.createBufferSource();
      voiceNode.buffer = voiceBuffer;
      const voiceGain = audioCtx.createGain();
      voiceGain.gain.value = settings.voiceVol / 100;

      voiceNode.connect(voiceGain);
      voiceGain.connect(analyser);
      analyser.connect(audioCtx.destination);

      // BGM Node
      let bgmBuffer =
        settings.bgmTone === "custom-upload"
          ? customBgmBuffer
          : createAmbientBgmBuffer(
              audioCtx,
              totalDuration + 1.0,
              settings.bgmTone
            );

      if (bgmBuffer && settings.bgmTone !== "silent") {
        const bgmNode = audioCtx.createBufferSource();
        bgmNode.buffer = bgmBuffer;
        bgmNode.loop = true;

        const bgmGain = audioCtx.createGain();
        const targetBgmVol = Math.max(0.001, settings.bgmVol / 100);
        const now = audioCtx.currentTime;

        bgmGain.gain.setValueAtTime(0.0001, now);
        bgmGain.gain.exponentialRampToValueAtTime(targetBgmVol, now + 1.0);

        const fadeOutStart = now + voiceDuration + sustainAfterVoice;
        bgmGain.gain.setValueAtTime(targetBgmVol, fadeOutStart);
        bgmGain.gain.exponentialRampToValueAtTime(0.0001, fadeOutStart + fadeOutSec);

        bgmNode.connect(bgmGain);
        bgmGain.connect(audioCtx.destination);

        bgmNode.start(now);
        bgmNode.stop(fadeOutStart + fadeOutSec + 0.2);
        activeBgmSourceRef.current = bgmNode;
      }

      voiceNode.start(audioCtx.currentTime);
      voiceNode.onended = () => {
        setTimeout(() => {
          setIsPlayingAudio(false);
          activeAnalyserRef.current = null;
        }, (sustainAfterVoice + fadeOutSec) * 1000);
      };
      activeVoiceSourceRef.current = voiceNode;

      showToast(
        lang === "en"
          ? "Playing Audio & Waveform Spectrum"
          : "Memutar Audio AI & Visual Spektrum"
      );
    } catch (err) {
      console.warn("Gemini TTS failed, fallback to browser:", err);
      playBrowserSpeech();
    }
  };

  // Generate & Download HD Video (Shorts / Reels)
  const generateAndDownloadVideo = async () => {
    stopAllAudio();
    setVideoModalStatus("rendering");
    setIsVideoProgressOpen(true);
    setVideoProgressPercent(5);
    setVideoStatusTitle(
      lang === "en" ? "Connecting AI Voice..." : "Menghubungi AI Voice..."
    );
    setVideoStatusDetail(
      lang === "en" ? "Generating speech with Gemini TTS" : "Mengontak Gemini 3.8 Flash TTS"
    );

    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    if (audioCtx.state === "suspended") await audioCtx.resume();

    let voiceBuffer: AudioBuffer | null = null;

    try {
      const displayTitle =
        lang === "en" && currentDua.titleEn ? currentDua.titleEn : currentDua.title;
      const displayMeaning =
        lang === "en" && currentDua.meaningEn
          ? currentDua.meaningEn
          : currentDua.meaning;
      const spokenTitle = getSpokenTitle(displayTitle, lang);
      const closing = getEffectiveClosing(lang);
      const promptText = closing
        ? (lang === "en"
            ? `${spokenTitle}. ${currentDua.latin}. Meaning: ${displayMeaning}. \n\n${closing}`
            : `${spokenTitle}. ${currentDua.latin}. Artinya: ${displayMeaning}. \n\n${closing}`)
        : (lang === "en"
            ? `${spokenTitle}. ${currentDua.latin}. Meaning: ${displayMeaning}.`
            : `${spokenTitle}. ${currentDua.latin}. Artinya: ${displayMeaning}.`);

      const ttsStyle =
        lang === "en"
          ? "Read with a calm, reverent and clear tone"
          : "Bacakan dengan syahdu, khusyuk dan jelas";

      const voiceToUse =
        settings.ttsVoice === "browser" ? "google-free" : settings.ttsVoice;

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: promptText,
          voice: voiceToUse,
          style: ttsStyle,
          lang: lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setVideoProgressPercent(30);
        setVideoStatusTitle(
          lang === "en" ? "Decoding Audio..." : "Memproses Data Audio..."
        );
        setVideoStatusDetail(
          lang === "en"
            ? "Converting payload to stereo buffer"
            : "Konversi audio ke buffer stereo"
        );
        voiceBuffer = await decodeAudioPayload(data, audioCtx);
      }
    } catch (e) {
      console.warn("TTS generation error in video download:", e);
    }

    const voiceDuration = voiceBuffer ? voiceBuffer.duration : 6.0;
    const sustainAfterVoice = 5.0;
    const fadeOutSec = 1.0;
    const totalDuration = voiceDuration + sustainAfterVoice + fadeOutSec;

    setVideoProgressPercent(45);
    setVideoStatusTitle(
      lang === "en"
        ? "Preparing Media Streams..."
        : "Menyiapkan Media Stream..."
    );
    setVideoStatusDetail(
      lang === "en"
        ? "Syncing 60FPS Canvas, Voice & BGM"
        : "Sinkronisasi Canvas, Suara, dan Fade Musik"
    );

    const canvas = canvasRef.current;
    if (!canvas) {
      setIsVideoProgressOpen(false);
      return;
    }

    const canvasStream = canvas.captureStream(30);
    const audioDest = audioCtx.createMediaStreamDestination();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;

    const recStartTime = audioCtx.currentTime;

    if (voiceBuffer) {
      const vSource = audioCtx.createBufferSource();
      vSource.buffer = voiceBuffer;
      const vGain = audioCtx.createGain();
      vGain.gain.value = settings.voiceVol / 100;
      vSource.connect(vGain);
      vGain.connect(analyser);
      vGain.connect(audioDest);
      vGain.connect(audioCtx.destination);
      vSource.start(recStartTime);
    }

    let bgmBuffer =
      settings.bgmTone === "custom-upload"
        ? customBgmBuffer
        : createAmbientBgmBuffer(
            audioCtx,
            totalDuration + 1.0,
            settings.bgmTone
          );

    if (bgmBuffer && settings.bgmTone !== "silent") {
      const bSource = audioCtx.createBufferSource();
      bSource.buffer = bgmBuffer;
      bSource.loop = true;

      const bGain = audioCtx.createGain();
      const targetBgmVol = Math.max(0.001, settings.bgmVol / 100);

      bGain.gain.setValueAtTime(0.0001, recStartTime);
      bGain.gain.exponentialRampToValueAtTime(targetBgmVol, recStartTime + 1.0);

      const fadeOutStart = recStartTime + voiceDuration + sustainAfterVoice;
      bGain.gain.setValueAtTime(targetBgmVol, fadeOutStart);
      bGain.gain.exponentialRampToValueAtTime(0.0001, fadeOutStart + fadeOutSec);

      bSource.connect(bGain);
      bGain.connect(audioDest);
      bGain.connect(audioCtx.destination);
      bSource.start(recStartTime);
      bSource.stop(fadeOutStart + fadeOutSec + 0.2);
    }

    const combinedTracks = [
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks(),
    ];
    const combinedStream = new MediaStream(combinedTracks);

    let mimeOptions: MediaRecorderOptions = {
      mimeType: "video/webm;codecs=vp9,opus",
    };
    if (!MediaRecorder.isTypeSupported(mimeOptions.mimeType!)) {
      if (MediaRecorder.isTypeSupported("video/webm")) {
        mimeOptions = { mimeType: "video/webm" };
      } else if (MediaRecorder.isTypeSupported("video/mp4")) {
        mimeOptions = { mimeType: "video/mp4" };
      } else {
        mimeOptions = {};
      }
    }

    const mediaRecorder = new MediaRecorder(combinedStream, mimeOptions);
    const recordedChunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      isRecordingRef.current = false;
      const blob = new Blob(recordedChunks, {
        type: mimeOptions.mimeType || "video/webm",
      });

      if (renderedVideoUrl) {
        try {
          URL.revokeObjectURL(renderedVideoUrl);
        } catch (e) {}
      }

      const url = URL.createObjectURL(blob);
      setRenderedVideoBlob(blob);
      setRenderedVideoUrl(url);

      setVideoProgressPercent(100);
      setVideoModalStatus("ready");
      setVideoStatusTitle(
        lang === "en" ? "Video Render Ready" : "Pratinjau Video Siap"
      );
      setVideoStatusDetail(
        lang === "en"
          ? "Preview and verify your video before downloading"
          : "Putar dan verifikasi video hasil render sebelum mengunduh"
      );

      showToast(
        lang === "en"
          ? "Render complete! Verify your video in the preview."
          : "Render selesai! Putar pratinjau untuk memeriksa hasil akhir."
      );
    };

    const startTimestamp = Date.now();
    isRecordingRef.current = true;
    mediaRecorder.start();

    const animateRecord = () => {
      const elapsedSec = (Date.now() - startTimestamp) / 1000;
      const progress = Math.min(elapsedSec / totalDuration, 1.0);
      recordProgressRef.current = progress;

      const percent = Math.floor(45 + progress * 53);
      setVideoProgressPercent(percent);

      let phase = lang === "en" ? "Voice Narration" : "Narasi Suara Doa";
      if (elapsedSec > voiceDuration) {
        phase = lang === "en" ? "Extra 5s Ambient BGM" : "Ekstra 5s Alunan BGM";
      }
      if (elapsedSec > voiceDuration + sustainAfterVoice) {
        phase = lang === "en" ? "Fade-Out 1s" : "Fade-Out 1s Lembut";
      }

      setVideoStatusTitle(
        lang === "en"
          ? `Rendering Video (${Math.floor(progress * 100)}%)...`
          : `Merender Frame Video (${Math.floor(progress * 100)}%)...`
      );
      setVideoStatusDetail(
        `${phase} • ${elapsedSec.toFixed(1)}s / ${totalDuration.toFixed(1)}s`
      );

      renderStudioCanvas({
        canvas,
        dua: currentDua,
        settings,
        lang,
        timeMs: Date.now(),
        particles: particlesRef.current,
        customBgImage,
        customLogoImage,
        customBgVideo,
        analyser,
        isRecording: true,
        recordProgress: progress,
      });

      if (elapsedSec < totalDuration) {
        requestAnimationFrame(animateRecord);
      } else {
        mediaRecorder.stop();
      }
    };

    animateRecord();
  };

  // Download Snapshot PNG
  const downloadPNGFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${currentDua.title.replace(/\s+/g, "_")}_Frame.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast(
      lang === "en"
        ? "PNG image frame saved!"
        : "Frame gambar PNG berhasil disimpan!"
    );
  };

  // Copy Viral YouTube / TikTok Description
  const copyDescriptionText = () => {
    const channel = settings.channelName || "@DoaHarianShorts";
    const displayTitle =
      lang === "en" && currentDua.titleEn ? currentDua.titleEn : currentDua.title;
    const displayMeaning =
      lang === "en" && currentDua.meaningEn
        ? currentDua.meaningEn
        : currentDua.meaning;

    const closing = getEffectiveClosing(lang);
    const ctaLine = closing ? `💬 ${closing}\n` : "";

    const textToCopy =
      lang === "en"
        ? `🤲 ALWAYS RECITE THIS POWERFUL PRAYER 🤲\n\n"${displayTitle}"\n\nبِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ\n\n${currentDua.arabic}\n\nTransliteration:\n${currentDua.latin}\n\nMeaning:\n"${displayMeaning}"\n\n${
            currentDua.source ? `Reference: ${currentDua.source}\n\n` : ""
          }---\n${ctaLine}🔔 Subscribe ${channel} for daily verified supplications.\n\n#DailyDua #IslamicShorts #Quran #Hadith #DuaMustajab #ViralShorts #Ameen`
        : `🤲 AMALKAN DOA MUSTAJAB INI 🤲\n\n"${displayTitle}"\n\nبِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ\n\n${currentDua.arabic}\n\nLatin:\n${currentDua.latin}\n\nArtinya:\n"${displayMeaning}"\n\n${
            currentDua.source ? `Rujukan: ${currentDua.source}\n\n` : ""
          }---\n${ctaLine}🔔 Follow & Subscribe ${channel} untuk update lantunan doa harian shahih pilihan.\n\n#DoaHarian #Shorts #YouTubeShorts #IslamicReminders #Hijrah #DoaMustajab #Reels #TikTokIslam #Aamiin`;

    try {
      navigator.clipboard.writeText(textToCopy);
      showToast(
        lang === "en"
          ? "YouTube description & hashtags copied!"
          : "Deskripsi lengkap & hashtag disalin!"
      );
    } catch (e) {
      showToast("Failed to copy description", true);
    }
  };

  // Pick Random Dua
  const pickRandomDua = () => {
    const randomIndex = Math.floor(Math.random() * duas.length);
    const chosen = duas[randomIndex];
    setCurrentDua(chosen);
    stopAllAudio();
    showToast(
      lang === "en"
        ? `Selected: ${chosen.titleEn || chosen.title}`
        : `Menampilkan: ${chosen.title}`
    );
  };

  // Apply Custom Dua Form
  const handleApplyCustomDua = () => {
    if (!customTitle.trim() || !customArabic.trim() || !customMeaning.trim()) {
      showToast(
        lang === "en"
          ? "Please fill in title, Arabic text, and meaning"
          : "Lengkapi judul, teks Arab, dan terjemahan!",
        true
      );
      return;
    }

    const newDua: DuaItem = {
      id: Date.now(),
      category: "Kustom",
      title: customTitle.trim(),
      titleEn: customTitle.trim(),
      arabic: customArabic.trim(),
      latin: customLatin.trim() || "",
      meaning: customMeaning.trim(),
      meaningEn: customMeaning.trim(),
    };

    setDuas((prev) => [newDua, ...prev]);
    setCurrentDua(newDua);
    showToast(
      lang === "en"
        ? "Custom prayer applied to Canvas!"
        : "Doa kustom berhasil diterapkan ke Video Canvas!"
    );
  };

  // Upload Handlers
  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setCustomBgImage(img);
        setCustomBgFileName(file.name);
        updateSetting("bgType", "custom-image");
        showToast(
          lang === "en"
            ? "Custom background image loaded!"
            : "Gambar latar kustom berhasil dimuat!"
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setCustomLogoImage(img);
        setCustomLogoFileName(file.name);
        showToast(
          lang === "en"
            ? "Channel logo badge loaded!"
            : "Logo channel berhasil dipasang!"
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleBgVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const vid = document.createElement("video");
    vid.autoplay = true;
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.src = URL.createObjectURL(file);
    vid.onloadeddata = () => {
      vid.play().catch(() => {});
      setCustomBgVideo(vid);
      setCustomBgVideoFileName(file.name);
      updateSetting("bgType", "video-loop");
      updateSetting("videoPreset", "custom-file");
      showToast(
        lang === "en"
          ? "Custom loop video ready!"
          : "Video latar loop berhasil dipasang!"
      );
    };
  };

  const handleBgmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast(
        lang === "en" ? "Reading music file..." : "Membaca file audio BGM..."
      );
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const arrayBuf = await file.arrayBuffer();
      const decoded = await audioCtxRef.current.decodeAudioData(arrayBuf);
      setCustomBgmBuffer(decoded);
      setCustomBgmFileName(file.name);
      updateSetting("bgmTone", "custom-upload");
      showToast(
        lang === "en"
          ? `BGM loaded (${decoded.duration.toFixed(1)}s)`
          : `Musik disiapkan! Durasi: ${decoded.duration.toFixed(1)}s`
      );
    } catch (err) {
      showToast("Failed to load audio file", true);
    }
  };

  // Filtered Duas
  const filteredDuas = duas.filter((d) => {
    const matchesCat = activeCategory === "Semua" || d.category === activeCategory;
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      d.title.toLowerCase().includes(query) ||
      d.latin.toLowerCase().includes(query) ||
      d.meaning.toLowerCase().includes(query) ||
      (d.titleEn && d.titleEn.toLowerCase().includes(query));
    return matchesCat && matchesQuery;
  });

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950 font-sans">
      {/* Top Header */}
      <header className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-3 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base sm:text-lg leading-tight bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-200 bg-clip-text text-transparent">
                  Islamic Dua Shorts Studio Pro
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold tracking-wide uppercase">
                  AI v3.8
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === "en"
                  ? "Shorts / Reels / TikTok Vertical Video Generator + Gemini AI Voice & Ambient BGM"
                  : "Generator Video Vertikal Doa Shahih Shorts/Reels/TikTok + Audio AI & Musik Syahdu"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "id" ? "en" : "id")}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 text-xs font-bold rounded-xl flex items-center gap-2 transition active:scale-95"
              title="Ganti Bahasa / Switch Language"
            >
              <span>{lang === "id" ? "🇮🇩 ID" : "🇬🇧 EN"}</span>
            </button>
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border border-violet-400/30 text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{lang === "en" ? "AI Create Dua" : "AI Buat Doa"}</span>
            </button>
            <button
              onClick={copyDescriptionText}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-xl flex items-center gap-2 transition active:scale-95"
              title="Salin Deskripsi Lengkap YouTube / TikTok"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">
                {lang === "en" ? "Copy YT Description" : "Salin Deskripsi YT"}
              </span>
            </button>
            {renderedVideoUrl && (
              <button
                onClick={() => {
                  setVideoModalStatus("ready");
                  setIsVideoProgressOpen(true);
                }}
                className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                title={
                  lang === "en"
                    ? "Preview the rendered video"
                    : "Pratinjau video hasil render"
                }
              >
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span className="hidden sm:inline">
                  {lang === "en" ? "Preview Video" : "Pratinjau Video"}
                </span>
              </button>
            )}
            <button
              onClick={generateAndDownloadVideo}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition transform active:scale-95"
            >
              <Film className="w-4 h-4" />
              <span>{lang === "en" ? "Render Video HD" : "Render Video HD"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Controls & Configuration */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto text-xs font-semibold no-scrollbar">
            <button
              onClick={() => setActiveTab("doa")}
              className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === "doa"
                  ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>
                {lang === "en"
                  ? `Dua Bank (${duas.length})`
                  : `Bank Doa (${duas.length})`}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("desain")}
              className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === "desain"
                  ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>{lang === "en" ? "Visual Design" : "Desain Visual"}</span>
            </button>
            <button
              onClick={() => setActiveTab("audio")}
              className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === "audio"
                  ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{lang === "en" ? "Voice & Music" : "Suara & Musik"}</span>
            </button>
            <button
              onClick={() => setActiveTab("branding")}
              className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === "branding"
                  ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BadgePercent className="w-4 h-4" />
              <span>{lang === "en" ? "Account Brand" : "Branding Akun"}</span>
            </button>
            <button
              onClick={() => setActiveTab("custom")}
              className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === "custom"
                  ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>{lang === "en" ? "Custom Dua" : "Doa Sendiri"}</span>
            </button>
          </div>

          {/* TAB 1: BANK DOA */}
          {activeTab === "doa" && (
            <div className="glass-panel rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>
                      {lang === "en"
                        ? "Verified Sahih Dua Collection"
                        : "Pilih Koleksi Doa Shahih"}
                    </span>
                  </h2>
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    {filteredDuas.length} Doa
                  </span>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      lang === "en"
                        ? "Search prayer (eating, sleep, debt)..."
                        : "Cari doa (shalat, rezeki, sakit)..."
                    }
                    className="w-full bg-slate-800/90 border border-slate-700/80 text-xs text-slate-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                {DUA_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition font-semibold ${
                      activeCategory === cat
                        ? "bg-emerald-500 text-slate-950 font-bold"
                        : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Dua List Cards */}
              <div className="max-h-[380px] overflow-y-auto pr-1.5 space-y-2">
                {filteredDuas.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    {lang === "en"
                      ? "No prayers found. Try a different search term or use AI Dua Generator."
                      : "Doa tidak ditemukan. Coba gunakan kata kunci lain atau tombol AI Buat Doa."}
                  </div>
                ) : (
                  filteredDuas.map((dua) => {
                    const isSelected = currentDua.id === dua.id;
                    const displayTitle =
                      lang === "en" && dua.titleEn ? dua.titleEn : dua.title;
                    return (
                      <div
                        key={dua.id}
                        onClick={() => {
                          setCurrentDua(dua);
                          stopAllAudio();
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition flex justify-between items-center ${
                          isSelected
                            ? "bg-emerald-950/70 border-emerald-500/80 text-emerald-200 shadow-md shadow-emerald-950/40"
                            : "bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800/80 hover:border-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <span
                            className={`w-6 h-6 rounded-lg ${
                              isSelected
                                ? "bg-emerald-500 text-slate-950"
                                : "bg-slate-800 text-amber-400 border border-slate-700"
                            } flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0`}
                          >
                            {dua.id}
                          </span>
                          <div className="truncate">
                            <h4 className="font-bold truncate text-slate-100">
                              {displayTitle}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate italic">
                              "{dua.latin}"
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 flex-shrink-0">
                          {dua.category}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DESAIN VISUAL */}
          {activeTab === "desain" && (
            <div className="glass-panel rounded-2xl p-5 shadow-xl space-y-5">
              <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <span>
                  {lang === "en"
                    ? "Video Ratio, Background & Styling"
                    : "Kustomisasi Gaya Video & Rasio Tampilan"}
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Aspect Ratio */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">
                    {lang === "en" ? "Video Aspect Ratio" : "Format Rasio Video"}
                  </label>
                  <select
                    value={settings.aspectRatio}
                    onChange={(e) =>
                      updateSetting("aspectRatio", e.target.value as AspectRatioType)
                    }
                    className="w-full bg-slate-800/90 border border-slate-700 text-amber-300 font-semibold rounded-xl p-2.5 focus:border-amber-500 outline-none"
                  >
                    <option value="9:16">
                      9:16 Shorts / Reels / TikTok (1080x1920)
                    </option>
                    <option value="1:1">
                      1:1 Square Feed Instagram (1080x1080)
                    </option>
                    <option value="16:9">
                      16:9 Landscape Video (1920x1080)
                    </option>
                  </select>
                </div>

                {/* Background Type */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">
                    {lang === "en" ? "Background Type" : "Tipe Background"}
                  </label>
                  <select
                    value={settings.bgType}
                    onChange={(e) =>
                      updateSetting("bgType", e.target.value as BgType)
                    }
                    className="w-full bg-slate-800/90 border border-slate-700 text-emerald-300 font-semibold rounded-xl p-2.5 focus:border-emerald-500 outline-none"
                  >
                    <option value="gradient">
                      {lang === "en"
                        ? "Static Luxury Gradient"
                        : "Warna Gradien Statis / Elegan"}
                    </option>
                    <option value="video-loop">
                      🎥 {lang === "en"
                        ? "Cinematic Motion Video Loop"
                        : "Video Loop Bergerak (Sinematik)"}
                    </option>
                    <option value="custom-image">
                      🖼️ {lang === "en"
                        ? "Custom Photo / Image (JPG/PNG)"
                        : "Gambar / Foto Sendiri (JPG/PNG)"}
                    </option>
                  </select>
                </div>

                {/* Gradient Presets */}
                {settings.bgType === "gradient" && (
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1.5 font-medium">
                      {lang === "en" ? "Gradient Color Theme" : "Tema Warna Gradien"}
                    </label>
                    <select
                      value={settings.bgTheme}
                      onChange={(e) =>
                        updateSetting("bgTheme", e.target.value as BgTheme)
                      }
                      className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 rounded-xl p-2.5 focus:border-amber-500 outline-none"
                    >
                      <option value="emerald-gold">Emerald Gold (Mewah Islami)</option>
                      <option value="night-sky">Night Sky (Langit Malam & Bintang)</option>
                      <option value="warm-sunset">Warm Sunset (Senja Elegan)</option>
                      <option value="royal-purple">Royal Purple (Ungu Spiritual)</option>
                      <option value="deep-ocean">Deep Ocean (Biru Samudera Jernih)</option>
                      <option value="desert-sand">Desert Sand (Padang Pasir Madinah)</option>
                      <option value="mystic-twilight">Mystic Twilight (Petang Syahdu)</option>
                      <option value="slate-minimal">Dark Minimalist (Modern Karbon)</option>
                    </select>
                  </div>
                )}

                {/* Video Loop Panel */}
                {settings.bgType === "video-loop" && (
                  <div className="sm:col-span-2 p-3.5 border border-dashed border-emerald-500/40 rounded-xl bg-emerald-950/20 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="flex-1 w-full">
                        <label className="block text-emerald-300 mb-1.5 font-semibold flex items-center gap-2">
                          <Film className="w-4 h-4" />
                          <span>
                            {lang === "en"
                              ? "Select Cinematic Video Loop Preset"
                              : "Pilih Preset Video Loop Sinematik"}
                          </span>
                        </label>
                        <select
                          value={settings.videoPreset}
                          onChange={(e) =>
                            updateSetting(
                              "videoPreset",
                              e.target.value as VideoPresetType
                            )
                          }
                          className="w-full bg-slate-800/90 border border-slate-700 text-amber-300 font-medium rounded-xl p-2.5 focus:border-emerald-500 outline-none"
                        >
                          <option value="particles-glow">
                            Cahaya Emas & Partikel Mengambang (Loop)
                          </option>
                          <option value="night-cosmos">
                            Pergerakan Bintang Kosmik Malam (Loop)
                          </option>
                          <option value="spiritual-aura">
                            Aura Ombak Cahaya Spiritual (Loop)
                          </option>
                          <option value="sacred-geometry">
                            Geometri Roda Sakral Islami (Loop)
                          </option>
                          <option value="custom-file">
                            ➜ Upload File Video Sendiri (MP4/WebM)
                          </option>
                        </select>
                      </div>

                      <div className="flex-1 w-full">
                        <label className="block text-slate-400 mb-1.5 font-medium">
                          {lang === "en"
                            ? "Upload Custom Loop Video"
                            : "Upload File Video Anda"}
                        </label>
                        <label className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition border border-slate-600 cursor-pointer">
                          <Film className="w-4 h-4 text-emerald-400" />
                          <span>
                            {customBgVideoFileName ||
                              (lang === "en"
                                ? "Select Loop Video File"
                                : "Pilih File Video Loop")}
                          </span>
                          <input
                            type="file"
                            accept="video/mp4,video/webm"
                            onChange={handleBgVideoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Video Dimmer */}
                    <div className="w-full border-t border-slate-700/80 pt-3">
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>
                          {lang === "en"
                            ? "Video Darkness Level (Dimmer)"
                            : "Tingkat Kegelapan Video (Dimmer)"}
                        </span>
                        <span className="text-amber-400 font-mono">
                          {settings.videoDimmer}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="90"
                        value={settings.videoDimmer}
                        onChange={(e) =>
                          updateSetting("videoDimmer", parseInt(e.target.value, 10))
                        }
                        className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Custom Image Panel */}
                {settings.bgType === "custom-image" && (
                  <div className="sm:col-span-2 p-3.5 border border-dashed border-slate-700 rounded-xl bg-slate-800/40 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="flex-1 w-full">
                        <label className="block text-slate-400 mb-1.5 font-medium">
                          {lang === "en"
                            ? "Upload Your Background Photo"
                            : "Upload Gambar Latar Anda Sendiri"}
                        </label>
                        <label className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition border border-slate-600 cursor-pointer">
                          <ImageIcon className="w-4 h-4 text-amber-400" />
                          <span>
                            {customBgFileName ||
                              (lang === "en"
                                ? "Select Image File (JPG/PNG)"
                                : "Pilih File Gambar (JPG/PNG)")}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBgImageUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="flex-1 w-full">
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>
                            {lang === "en"
                              ? "Background Dimmer"
                              : "Lapisan Gelap (Dimmer)"}
                          </span>
                          <span className="text-amber-400 font-mono">
                            {settings.bgDimmer}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={settings.bgDimmer}
                          onChange={(e) =>
                            updateSetting("bgDimmer", parseInt(e.target.value, 10))
                          }
                          className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Pan / Crop */}
                    <div className="w-full border-t border-slate-700/80 pt-3">
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>
                          {lang === "en"
                            ? "Pan / Crop Focus Alignment"
                            : "Geser Posisi Fokus Latar (Pan / Crop)"}
                        </span>
                        <span className="text-emerald-400 font-mono text-[10px]">
                          {settings.bgPosition < 40
                            ? "Kiri / Atas"
                            : settings.bgPosition > 60
                            ? "Kanan / Bawah"
                            : "Tengah"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.bgPosition}
                        onChange={(e) =>
                          updateSetting("bgPosition", parseInt(e.target.value, 10))
                        }
                        className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Particle FX */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">
                    {lang === "en" ? "Screen Particle Effects" : "Efek Partikel Layar"}
                  </label>
                  <select
                    value={settings.particleType}
                    onChange={(e) =>
                      updateSetting("particleType", e.target.value as ParticleType)
                    }
                    className="w-full bg-slate-800/90 border border-slate-700 text-emerald-300 font-semibold rounded-xl p-2.5 focus:border-emerald-500 outline-none"
                  >
                    <option value="kunang-kunang">
                      Kunang-Kunang Berpendar (Fireflies)
                    </option>
                    <option value="bokeh">
                      Bokeh Cahaya Syahdu (Soft Orbs)
                    </option>
                    <option value="debu-emas">
                      Debu Emas Berkilau (Golden Dust)
                    </option>
                    <option value="salju">
                      Kepingan Salju Lembut (Gentle Snow)
                    </option>
                    <option value="bintang">
                      Bintang Malam (Twinkling Stars)
                    </option>
                    <option value="none">
                      Tanpa Partikel (Bersih)
                    </option>
                  </select>
                </div>

                {/* Arabic Text Animation */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">
                    {lang === "en" ? "Arabic Text Animation" : "Animasi Teks Arab"}
                  </label>
                  <select
                    value={settings.textAnim}
                    onChange={(e) =>
                      updateSetting("textAnim", e.target.value as TextAnimType)
                    }
                    className="w-full bg-slate-800/90 border border-slate-700 text-amber-300 font-semibold rounded-xl p-2.5 focus:border-amber-500 outline-none"
                  >
                    <option value="glow-pulse">
                      Pendaran Khusyuk (Pulsing Glow)
                    </option>
                    <option value="gold-sheen">
                      Kilau Cahaya Emas (Shimmering Light)
                    </option>
                    <option value="none">
                      Statis (Tanpa Animasi Teks)
                    </option>
                  </select>
                </div>

                {/* Arabic Font */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">
                    {lang === "en" ? "Arabic Calligraphy Font" : "Jenis Kaligrafi Arab"}
                  </label>
                  <select
                    value={settings.arabicFont}
                    onChange={(e) =>
                      updateSetting("arabicFont", e.target.value)
                    }
                    className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 rounded-xl p-2.5 focus:border-amber-500 outline-none"
                  >
                    <option value="'Amiri', serif">Amiri (Naskh Tradisional Harakat)</option>
                    <option value="'Noto Naskh Arabic', serif">Noto Naskh (Modern & Jelas)</option>
                    <option value="'Scheherazade New', serif">Scheherazade New (Lentur & Anggun)</option>
                    <option value="'Reem Kufi', sans-serif">Reem Kufi (Artistik Geometris)</option>
                  </select>
                </div>

                {/* Latin Font */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">
                    {lang === "en" ? "Latin Translation Font" : "Font Terjemahan & Judul"}
                  </label>
                  <select
                    value={settings.latinFont}
                    onChange={(e) =>
                      updateSetting("latinFont", e.target.value)
                    }
                    className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 rounded-xl p-2.5 focus:border-amber-500 outline-none"
                  >
                    <option value="'Inter', sans-serif">Inter (Modern & Jelas)</option>
                    <option value="'Poppins', sans-serif">Poppins (Elegan & Populer)</option>
                    <option value="'Montserrat', sans-serif">Montserrat (Tegas & Rapi)</option>
                    <option value="'Playfair Display', serif">Playfair Display (Klasik Estetik)</option>
                  </select>
                </div>

                {/* Box Style */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">
                    {lang === "en" ? "Translation Box Style" : "Gaya Kotak Terjemahan"}
                  </label>
                  <select
                    value={settings.boxStyle}
                    onChange={(e) =>
                      updateSetting("boxStyle", e.target.value as BoxStyleType)
                    }
                    className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 rounded-xl p-2.5 focus:border-amber-500 outline-none"
                  >
                    <option value="blur">Kotak Glassmorphism Transparan</option>
                    <option value="solid">Kotak Gelap Solid Elegan</option>
                    <option value="gold-border">Garis Emas Minimalis</option>
                  </select>
                </div>

                {/* Frame Style */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">
                    {lang === "en" ? "Frame & Border Decoration" : "Dekorasi Bingkai"}
                  </label>
                  <select
                    value={settings.frameStyle}
                    onChange={(e) =>
                      updateSetting("frameStyle", e.target.value as FrameStyleType)
                    }
                    className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 rounded-xl p-2.5 focus:border-amber-500 outline-none"
                  >
                    <option value="islamic-corners">Sudut Ornamen Islami Emas</option>
                    <option value="simple-border">Garis Tepi Minimalis</option>
                    <option value="none">Tanpa Bingkai</option>
                  </select>
                </div>

                {/* Text Size Sliders */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>{lang === "en" ? "Arabic Text Size" : "Ukuran Teks Arab"}</span>
                    <span className="text-amber-400 font-mono">
                      {settings.arabicSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="26"
                    max="62"
                    value={settings.arabicSize}
                    onChange={(e) =>
                      updateSetting("arabicSize", parseInt(e.target.value, 10))
                    }
                    className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>
                      {lang === "en"
                        ? "Translation Font Size"
                        : "Ukuran Terjemahan"}
                    </span>
                    <span className="text-emerald-400 font-mono">
                      {settings.transSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="34"
                    value={settings.transSize}
                    onChange={(e) =>
                      updateSetting("transSize", parseInt(e.target.value, 10))
                    }
                    className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUARA & MUSIK */}
          {activeTab === "audio" && (
            <div className="glass-panel rounded-2xl p-5 shadow-xl space-y-5">
              <h2 className="text-sm font-bold text-teal-400 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                <span>
                  {lang === "en"
                    ? "AI Voice TTS & Ambient BGM Audio"
                    : "Pengaturan AI Voice TTS & Audio BGM"}
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* TTS Voice */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">
                    {lang === "en" ? "AI Voice Character" : "Karakter AI Voice"}
                  </label>
                  <select
                    value={settings.ttsVoice}
                    onChange={(e) =>
                      updateSetting("ttsVoice", e.target.value as VoiceOption)
                    }
                    className="w-full bg-slate-800/90 border border-slate-700 text-amber-300 font-semibold rounded-xl p-2.5 focus:border-amber-500 outline-none"
                  >
                    <option value="Sulafat">
                      Sulafat (Hangat & Tenang - Rekomendasi Utama)
                    </option>
                    <option value="Zephyr">Zephyr (Jernih & Terang)</option>
                    <option value="Kore">Kore (Wibawa & Mantap)</option>
                    <option value="Aoede">Aoede (Lembut & Khusyuk)</option>
                    <option value="Puck">Puck (Segar & Dinamis)</option>
                    <option value="google-free">
                      {lang === "en"
                        ? "Google TTS Free (Unlimited · No Quota)"
                        : "Google TTS Gratis (Alternatif Bebas Kuota)"}
                    </option>
                    <option value="browser">
                      Web Speech API (Browser Lokal)
                    </option>
                  </select>
                </div>

                {/* BGM Tone */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">
                    {lang === "en" ? "Ambient Background Music" : "Musik Latar Syahdu"}
                  </label>
                  <select
                    value={settings.bgmTone}
                    onChange={(e) => {
                      updateSetting("bgmTone", e.target.value as BgmOption);
                      stopAllAudio();
                    }}
                    className="w-full bg-slate-800/90 border border-slate-700 text-teal-300 font-semibold rounded-xl p-2.5 focus:border-teal-500 outline-none"
                  >
                    <option value="calm-drone">
                      Seruling & Pad Meditasi (Tenang)
                    </option>
                    <option value="spiritual-warmth">
                      Harmoni Hangat Spiritual
                    </option>
                    <option value="madinah-pad">
                      Suasana Senja Madinah (C3 Pad)
                    </option>
                    <option value="silent">Tanpa Musik (Hening)</option>
                    <option value="custom-upload">
                      ➜ Gunakan Musik BGM Sendiri
                    </option>
                  </select>
                </div>

                {/* Custom BGM Upload */}
                <div className="sm:col-span-2 p-3.5 border border-dashed border-slate-700 rounded-xl bg-slate-800/40 flex flex-col gap-2">
                  <label className="block text-slate-400 font-medium">
                    {lang === "en"
                      ? "Upload Custom BGM Audio File (MP3 / WAV / M4A)"
                      : "Upload File Musik BGM (MP3 / WAV / M4A)"}
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition border border-slate-600 cursor-pointer">
                      <Music className="w-4 h-4 text-teal-400" />
                      <span>
                        {customBgmFileName ||
                          (lang === "en"
                            ? "Select Audio File"
                            : "Pilih File Musik")}
                      </span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleBgmUpload}
                        className="hidden"
                      />
                    </label>

                    {customBgmBuffer && (
                      <button
                        onClick={() => {
                          setCustomBgmBuffer(null);
                          setCustomBgmFileName(null);
                          updateSetting("bgmTone", "calm-drone");
                          stopAllAudio();
                        }}
                        className="p-2 text-rose-400 hover:text-rose-300 bg-slate-800 border border-slate-700 rounded-lg"
                        title="Hapus BGM kustom"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500">
                    {lang === "en"
                      ? "Includes automatic 1s fade-in, 5s sustain after prayer voiceover, and 1s gentle fade-out."
                      : "Otomatis menggunakan fade-in 1s di awal, melanjutkan alunan instrumen 5s setelah suara doa selesai, dan ditutup fade-out 1s."}
                  </p>
                </div>

                {/* Volume Sliders */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>
                      {lang === "en" ? "AI Voice Volume" : "Volume Suara AI"}
                    </span>
                    <span className="text-amber-400 font-mono">
                      {settings.voiceVol}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={settings.voiceVol}
                    onChange={(e) =>
                      updateSetting("voiceVol", parseInt(e.target.value, 10))
                    }
                    className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>
                      {lang === "en" ? "BGM Music Volume" : "Volume Musik Latar (BGM)"}
                    </span>
                    <span className="text-teal-400 font-mono">
                      {settings.bgmVol}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={settings.bgmVol}
                    onChange={(e) =>
                      updateSetting("bgmVol", parseInt(e.target.value, 10))
                    }
                    className="w-full accent-teal-500 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* CTA Closing Customization Section */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-slate-200 text-xs">
                      {lang === "en"
                        ? "Call-To-Action (CTA) at Video End"
                        : "Kalimat Penutup & Call-To-Action (CTA)"}
                    </span>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => updateSetting("enableCta", !settings.enableCta)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      settings.enableCta ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                    title={
                      settings.enableCta
                        ? (lang === "en" ? "CTA Active" : "CTA Aktif")
                        : (lang === "en" ? "CTA Disabled" : "CTA Nonaktif")
                    }
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.enableCta ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {lang === "en"
                    ? "Custom sentence spoken at the end of the prayer audio and displayed in viral descriptions."
                    : "Kalimat penutup yang disuarakan di akhir audio doa untuk mengajak audiens berbagi, mengamalkan, atau mengikuti channel."}
                </p>

                {settings.enableCta ? (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-slate-300">
                          {lang === "en" ? "Custom CTA Text:" : "Teks CTA Kustom:"}
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            updateSetting(
                              "customCtaText",
                              lang === "en"
                                ? "Share this video, may Allah bless and protect us."
                                : "Bagikan video ini, semoga kita selalu dalam lindungan Allah subhanahu wa ta'ala."
                            )
                          }
                          className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                          title="Reset ke kalimat bawaan"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{lang === "en" ? "Reset Default" : "Reset Bawaan"}</span>
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={settings.customCtaText}
                        onChange={(e) => updateSetting("customCtaText", e.target.value)}
                        placeholder={
                          lang === "en"
                            ? "e.g., Save and share this prayer with your family..."
                            : "Misal: Bagikan video ini, semoga menjadi amal jariyah..."
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-2.5 text-xs focus:border-emerald-500 outline-none transition"
                      />
                    </div>

                    {/* Quick Template Chips */}
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Quick Preset Templates:" : "Template Cepat Siap Pakai:"}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          {
                            label: lang === "en" ? "Jariyah Charity" : "Amal Jariyah",
                            text:
                              lang === "en"
                                ? "Share this video as continuous charity for our brothers and sisters."
                                : "Bagikan video ini agar menjadi amal jariyah dan bermanfaat bagi sesama.",
                          },
                          {
                            label: lang === "en" ? "Protection" : "Lindungan Allah",
                            text:
                              lang === "en"
                                ? "Share this video, may Allah bless and protect us."
                                : "Bagikan video ini, semoga kita selalu dalam lindungan Allah subhanahu wa ta'ala.",
                          },
                          {
                            label: lang === "en" ? "Comment Aamiin" : "Ketik Aamiin",
                            text:
                              lang === "en"
                                ? "Comment Ameen and follow for more verified daily prayers."
                                : "Ketik Aamiin di kolom komentar dan ikuti channel ini untuk doa harian lainnya.",
                          },
                          {
                            label: lang === "en" ? "Practice Daily" : "Simpan & Amalkan",
                            text:
                              lang === "en"
                                ? "Save this prayer and recite it daily, may Allah grant all our wishes."
                                : "Simpan doa ini dan amalkan setiap hari, semoga Allah mengabulkan segala hajat kita.",
                          },
                          {
                            label: lang === "en" ? "English Global" : "Versi Inggris",
                            text:
                              "Save and share this prayer with your loved ones, may Allah bless you all.",
                          },
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => updateSetting("customCtaText", preset.text)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-emerald-500/50 rounded-lg text-[10px] font-medium transition active:scale-95"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs italic flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    <span>
                      {lang === "en"
                        ? "CTA disabled. Audio will smoothly stop immediately after prayer meaning."
                        : "CTA dinonaktifkan. Suara akan langsung selesai lembut setelah pembacaan arti doa."}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Volume2 className="w-5 h-5 text-amber-400" />
                  <span>
                    {lang === "en"
                      ? "Test the combined prayer voice narration and ambient music before rendering."
                      : "Uji coba kombinasi suara doa & alunan musik sebelum merender video."}
                  </span>
                </div>
                <button
                  onClick={previewAudioMix}
                  className={`px-4 py-2 border font-bold rounded-xl flex items-center gap-2 transition active:scale-95 whitespace-nowrap ${
                    isPlayingAudio
                      ? "bg-rose-950/60 text-rose-300 border-rose-500/40"
                      : "bg-slate-800 hover:bg-slate-700 text-emerald-400 border-emerald-500/40"
                  }`}
                >
                  {isPlayingAudio ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      <span>{lang === "en" ? "Stop Audio" : "Hentikan"}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>{lang === "en" ? "Play Audio" : "Mainkan Audio"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: BRANDING AKUN */}
          {activeTab === "branding" && (
            <div className="glass-panel rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <BadgePercent className="w-4 h-4" />
                  <span>
                    {lang === "en"
                      ? "Creator Channel Identity & Watermark"
                      : "Identitas & Branding Akun Kreator"}
                  </span>
                </h2>
                <span className="text-[11px] text-slate-400">
                  {lang === "en" ? "Saved automatically" : "Tersimpan otomatis"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    {lang === "en" ? "Social Media Handle" : "Username Media Sosial"}
                  </label>
                  <input
                    type="text"
                    value={settings.channelName}
                    onChange={(e) => updateSetting("channelName", e.target.value)}
                    placeholder="@NamaChannelKamu"
                    className="w-full bg-slate-800/90 border border-slate-700 text-amber-300 font-semibold rounded-xl p-2.5 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    {lang === "en" ? "Watermark Position" : "Posisi Tampilan Watermark"}
                  </label>
                  <select
                    value={settings.watermarkPos}
                    onChange={(e) =>
                      updateSetting(
                        "watermarkPos",
                        e.target.value as WatermarkPosType
                      )
                    }
                    className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 rounded-xl p-2.5 focus:border-amber-500 outline-none"
                  >
                    <option value="top-pill">
                      {lang === "en"
                        ? "Modern Top Pill (Recommended)"
                        : "Pil Modern di Atas (Rekomendasi)"}
                    </option>
                    <option value="bottom-corner">
                      {lang === "en"
                        ? "Minimalist Bottom Left Corner"
                        : "Pojok Kiri Bawah Minimalis"}
                    </option>
                    <option value="hidden">
                      {lang === "en" ? "Hide Watermark" : "Sembunyikan Watermark"}
                    </option>
                  </select>
                </div>

                <div className="sm:col-span-2 p-3.5 border border-dashed border-slate-700 rounded-xl bg-slate-800/40 flex flex-col gap-2">
                  <label className="block text-slate-400 font-medium">
                    {lang === "en"
                      ? "Upload Channel Logo (PNG Transparent / JPG)"
                      : "Upload Logo Channel (PNG Transparan / JPG)"}
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg flex items-center justify-center gap-2 border border-slate-600 cursor-pointer">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>
                        {customLogoFileName ||
                          (lang === "en"
                            ? "Select Logo File"
                            : "Pilih File Logo")}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {customLogoImage && (
                      <button
                        onClick={() => {
                          setCustomLogoImage(null);
                          setCustomLogoFileName(null);
                        }}
                        className="p-2 text-rose-400 hover:text-rose-300 bg-slate-800 border border-slate-700 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500">
                    {lang === "en"
                      ? "Your channel logo is automatically masked inside a circular badge next to your handle."
                      : "Logo channel akan dipasang manis dengan lingkaran di samping username pada frame video."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DOA KUSTOM */}
          {activeTab === "custom" && (
            <div className="glass-panel rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <PenTool className="w-4 h-4" />
                  <span>
                    {lang === "en" ? "Write Custom Prayer" : "Tulis Doa Sendiri"}
                  </span>
                </h2>
                <span className="text-[11px] text-slate-400">
                  {lang === "en" ? "Personal intentions" : "Bebas menulis doa pribadi"}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === "en" ? "Prayer Title" : "Judul Doa"}
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={
                      lang === "en"
                        ? "e.g., Prayer for exam success / guidance"
                        : "Contoh: Doa Diberi Kelancaran Ujian / Tugas"
                    }
                    className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 rounded-xl p-2.5 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === "en"
                      ? "Arabic Text (With Harakat)"
                      : "Teks Arab (Lengkap Harakat)"}
                  </label>
                  <textarea
                    dir="rtl"
                    rows={3}
                    value={customArabic}
                    onChange={(e) => setCustomArabic(e.target.value)}
                    placeholder="الـلَّـهُـمَّ..."
                    className="w-full bg-slate-800/90 border border-slate-700 text-base text-amber-300 rounded-xl p-2.5 font-arabic-amiri focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === "en" ? "Latin Transliteration" : "Transliterasi Latin"}
                  </label>
                  <input
                    type="text"
                    value={customLatin}
                    onChange={(e) => setCustomLatin(e.target.value)}
                    placeholder="Allahumma inni as-aluka..."
                    className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 rounded-xl p-2.5 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    {lang === "en" ? "Translation / Meaning" : "Terjemahan Bahasa"}
                  </label>
                  <textarea
                    rows={2}
                    value={customMeaning}
                    onChange={(e) => setCustomMeaning(e.target.value)}
                    placeholder={
                      lang === "en"
                        ? "O Allah, I ask You for..."
                        : "Ya Allah, sesungguhnya aku memohon kepada-Mu..."
                    }
                    className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 rounded-xl p-2.5 focus:border-amber-500 outline-none"
                  />
                </div>
                <button
                  onClick={handleApplyCustomDua}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 font-black rounded-xl transition shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {lang === "en"
                      ? "Apply to Video Canvas"
                      : "Terapkan ke Canvas Video"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Action Toolbar */}
          <div className="glass-panel rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={downloadPNGFrame}
                className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition active:scale-95"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span>{lang === "en" ? "Save PNG" : "Simpan Gambar (PNG)"}</span>
              </button>
              <button
                onClick={pickRandomDua}
                className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition active:scale-95"
                title="Pilih Doa Acak"
              >
                <Shuffle className="w-4 h-4 text-emerald-400" />
                <span>{lang === "en" ? "Random" : "Acak"}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {renderedVideoUrl && (
                <button
                  onClick={() => {
                    setVideoModalStatus("ready");
                    setIsVideoProgressOpen(true);
                  }}
                  className="w-full sm:w-auto px-4 py-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-emerald-500/10"
                >
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  <span>
                    {lang === "en" ? "Preview Render" : "Pratinjau Video"}
                  </span>
                </button>
              )}

              <button
                onClick={generateAndDownloadVideo}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 hover:from-emerald-600 hover:to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition transform active:scale-95"
              >
                <Film className="w-4 h-4" />
                <span>{lang === "en" ? "Render Video HD" : "Render Video HD"}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Live Canvas Preview */}
        <section className="lg:col-span-5 flex flex-col items-center justify-start gap-3">
          <div className="flex items-center justify-between w-full max-w-[340px] px-1">
            <span className="text-xs font-semibold text-slate-300 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800 shadow-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {lang === "en"
                  ? "Live Canvas Preview (HD)"
                  : "Live Canvas Preview (HD)"}
              </span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
              {settings.aspectRatio === "9:16"
                ? "1080 × 1920 (9:16)"
                : settings.aspectRatio === "1:1"
                ? "1080 × 1080 (1:1)"
                : "1920 × 1080 (16:9)"}
            </span>
          </div>

          {/* Canvas Wrapper */}
          <div
            className={`preview-wrapper rounded-3xl overflow-hidden border-4 border-slate-800/90 relative bg-slate-950 ${
              settings.aspectRatio === "9:16"
                ? "w-[320px] h-[568px]"
                : settings.aspectRatio === "1:1"
                ? "w-[340px] h-[340px]"
                : "w-[380px] h-[214px]"
            }`}
          >
            <canvas
              ref={canvasRef}
              width={settings.aspectRatio === "16:9" ? 1920 : 1080}
              height={
                settings.aspectRatio === "9:16"
                  ? 1920
                  : 1080
              }
              className="w-full h-full object-cover rounded-2xl block"
            />
          </div>

          <p className="text-[11px] text-slate-500 text-center max-w-xs leading-relaxed">
            {lang === "en"
              ? "Crisp high-definition export ready for YouTube Shorts, TikTok & IG Reels with synchronized BGM and audio spectrum."
              : "Video siap tayang di YouTube Shorts, TikTok & IG Reels dengan visual tajam, animasi partikel, dan BGM sinkron."}
          </p>
        </section>
      </main>

      {/* AI Dua Modal */}
      <AiDuaModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onDuaGenerated={(newDua) => {
          setDuas((prev) => [newDua, ...prev]);
          setCurrentDua(newDua);
          showToast(
            lang === "en"
              ? `AI Dua Created: ${newDua.titleEn || newDua.title}`
              : `Doa AI Berhasil Dibuat: ${newDua.title}`
          );
        }}
        lang={lang}
      />

      {/* Video Render Progress & In-Modal Preview */}
      <VideoProgressModal
        isOpen={isVideoProgressOpen}
        status={videoModalStatus}
        progressPercent={videoProgressPercent}
        statusTitle={videoStatusTitle}
        statusDetail={videoStatusDetail}
        lang={lang}
        videoUrl={renderedVideoUrl}
        videoBlob={renderedVideoBlob}
        aspectRatio={settings.aspectRatio}
        duaTitle={
          lang === "en" && currentDua.titleEn
            ? currentDua.titleEn
            : currentDua.title
        }
        onClose={() => setIsVideoProgressOpen(false)}
        onDownload={downloadRenderedVideo}
        onReRender={generateAndDownloadVideo}
      />

      {/* Toast Notification */}
      <Toast toast={toast} />
    </div>
  );
}
