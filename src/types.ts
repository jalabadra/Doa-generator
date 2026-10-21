import { DuaItem } from "./data/duaDatabase";

export type AspectRatioType = "9:16" | "1:1" | "16:9";
export type BgType = "gradient" | "video-loop" | "custom-image";
export type BgTheme = "emerald-gold" | "night-sky" | "warm-sunset" | "royal-purple" | "deep-ocean" | "slate-minimal" | "desert-sand" | "mystic-twilight";
export type VideoPresetType = "particles-glow" | "night-cosmos" | "spiritual-aura" | "sacred-geometry" | "custom-file";
export type ParticleType = "kunang-kunang" | "bokeh" | "debu-emas" | "salju" | "bintang" | "none";
export type TextAnimType = "glow-pulse" | "gold-sheen" | "none";
export type BoxStyleType = "blur" | "solid" | "gold-border" | "none";
export type FrameStyleType = "islamic-corners" | "simple-border" | "none";
export type WatermarkPosType = "top-pill" | "bottom-corner" | "hidden";
export type VoiceOption = "Sulafat" | "Zephyr" | "Kore" | "Aoede" | "Puck" | "Fenrir" | "Charon" | "browser" | "google-free";
export type BgmOption = "calm-drone" | "spiritual-warmth" | "madinah-pad" | "silent" | "custom-upload";

export interface StudioSettings {
  aspectRatio: AspectRatioType;
  bgType: BgType;
  bgTheme: BgTheme;
  videoPreset: VideoPresetType;
  videoDimmer: number; // 20 - 90
  bgDimmer: number; // 10 - 90
  bgPosition: number; // 0 - 100
  particleType: ParticleType;
  textAnim: TextAnimType;
  arabicFont: string;
  latinFont: string;
  boxStyle: BoxStyleType;
  frameStyle: FrameStyleType;
  arabicSize: number; // 26 - 64
  transSize: number; // 16 - 36
  ttsVoice: VoiceOption;
  bgmTone: BgmOption;
  voiceVol: number; // 20 - 100
  bgmVol: number; // 0 - 80
  channelName: string;
  watermarkPos: WatermarkPosType;
  enableCta: boolean;
  customCtaText: string;
}

export interface Particle {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  phase: number;
  alpha: number;
  twinkleSpeed?: number;
}
