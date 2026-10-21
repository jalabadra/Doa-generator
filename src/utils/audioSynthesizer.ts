import { BgmOption } from "../types";

export function createAmbientBgmBuffer(
  audioCtx: AudioContext,
  duration = 10,
  toneType: BgmOption = "calm-drone"
): AudioBuffer | null {
  if (toneType === "silent" || toneType === "custom-upload") return null;

  const sampleRate = audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(2, Math.ceil(sampleRate * duration), sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  let baseFreq = 146.83; // D3 note
  if (toneType === "spiritual-warmth") baseFreq = 196.0; // G3 note
  if (toneType === "madinah-pad") baseFreq = 130.81; // C3 note

  const freqs = [baseFreq, baseFreq * 1.5, baseFreq * 2.0, baseFreq * 2.5, baseFreq * 3.0];

  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (let idx = 0; idx < freqs.length; idx++) {
      const f = freqs[idx];
      const harmonicWeight = 0.16 / (idx + 1);
      // Gentle frequency beat for organic warmth
      sample += Math.sin(2 * Math.PI * f * t) * harmonicWeight;
      sample += Math.sin(2 * Math.PI * (f * 1.004) * t) * (harmonicWeight * 0.75);
    }
    // Soft soothing breath/whisper texture
    const breath = (Math.random() * 2 - 1) * 0.012;
    left[i] = sample + breath;
    right[i] = sample * 0.96 - breath;
  }
  return buffer;
}

export async function decodeAudioPayload(
  audioData: { audioBase64: string; mimeType: string },
  audioCtx: AudioContext
): Promise<AudioBuffer> {
  const binaryString = atob(audioData.audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // If MIME type indicates WAV or standard encoded container, use native decodeAudioData
  if (audioData.mimeType.includes("wav") || audioData.mimeType.includes("audio/")) {
    try {
      const copyBuffer = bytes.buffer.slice(0);
      return await audioCtx.decodeAudioData(copyBuffer);
    } catch (e) {
      console.warn("Native decode failed, attempting PCM decode fallback:", e);
    }
  }

  // Raw PCM16 fallback
  let sampleRate = 24000;
  const match = audioData.mimeType.match(/rate=(\d+)/);
  if (match) {
    sampleRate = parseInt(match[1], 10);
  }

  const pcm16 = new Int16Array(bytes.buffer);
  const audioBuffer = audioCtx.createBuffer(1, pcm16.length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < pcm16.length; i++) {
    channelData[i] = pcm16[i] / 32768.0;
  }
  return audioBuffer;
}
