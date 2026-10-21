import { DuaItem } from "../data/duaDatabase";
import { Particle, ParticleType, StudioSettings } from "../types";

let proceduralCanvas: HTMLCanvasElement | null = null;
let proceduralCtx: CanvasRenderingContext2D | null = null;

function initProceduralCanvas() {
  if (!proceduralCanvas) {
    proceduralCanvas = document.createElement("canvas");
    proceduralCanvas.width = 540;
    proceduralCanvas.height = 960;
    proceduralCtx = proceduralCanvas.getContext("2d");
  }
}

export function renderProceduralVideoLoop(
  type: string,
  timeMs: number
): HTMLCanvasElement {
  if (!proceduralCtx) initProceduralCanvas();
  const pCtx = proceduralCtx!;
  const w = 540;
  const h = 960;
  const t = timeMs * 0.001;

  if (type === "particles-glow") {
    const g = pCtx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#021814");
    g.addColorStop(0.5, "#062b21");
    g.addColorStop(1, "#1b1204");
    pCtx.fillStyle = g;
    pCtx.fillRect(0, 0, w, h);

    for (let i = 0; i < 5; i++) {
      const cx = w * 0.5 + Math.sin(t * 0.8 + i * 1.3) * (w * 0.35);
      const cy = h * 0.5 + Math.cos(t * 0.6 + i * 1.1) * (h * 0.35);
      const rad = 140 + Math.sin(t + i) * 30;

      const rg = pCtx.createRadialGradient(cx, cy, 10, cx, cy, rad);
      rg.addColorStop(0, "rgba(251, 191, 36, 0.3)");
      rg.addColorStop(0.6, "rgba(16, 185, 129, 0.12)");
      rg.addColorStop(1, "rgba(0, 0, 0, 0)");
      pCtx.fillStyle = rg;
      pCtx.beginPath();
      pCtx.arc(cx, cy, rad, 0, Math.PI * 2);
      pCtx.fill();
    }
  } else if (type === "night-cosmos") {
    const g = pCtx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#04060c");
    g.addColorStop(0.5, "#0a1226");
    g.addColorStop(1, "#181432");
    pCtx.fillStyle = g;
    pCtx.fillRect(0, 0, w, h);

    const nX = w * 0.5 + Math.cos(t * 0.4) * 80;
    const nY = h * 0.4 + Math.sin(t * 0.5) * 80;
    const neb = pCtx.createRadialGradient(nX, nY, 30, nX, nY, 280);
    neb.addColorStop(0, "rgba(124, 58, 237, 0.28)");
    neb.addColorStop(0.5, "rgba(14, 165, 233, 0.16)");
    neb.addColorStop(1, "rgba(0,0,0,0)");
    pCtx.fillStyle = neb;
    pCtx.beginPath();
    pCtx.arc(nX, nY, 280, 0, Math.PI * 2);
    pCtx.fill();
  } else if (type === "sacred-geometry") {
    const g = pCtx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#071724");
    g.addColorStop(0.5, "#0d2b2c");
    g.addColorStop(1, "#1c1c0a");
    pCtx.fillStyle = g;
    pCtx.fillRect(0, 0, w, h);

    pCtx.save();
    pCtx.translate(w / 2, h / 2);
    pCtx.rotate(t * 0.1);
    for (let i = 0; i < 8; i++) {
      pCtx.rotate((Math.PI * 2) / 8);
      pCtx.strokeStyle = "rgba(251, 191, 36, 0.1)";
      pCtx.lineWidth = 1.5;
      pCtx.beginPath();
      pCtx.arc(0, 100 + Math.sin(t) * 20, 90, 0, Math.PI * 2);
      pCtx.stroke();
    }
    pCtx.restore();
  } else {
    // spiritual-aura
    const g = pCtx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#190a28");
    g.addColorStop(0.5, "#06202a");
    g.addColorStop(1, "#063828");
    pCtx.fillStyle = g;
    pCtx.fillRect(0, 0, w, h);

    pCtx.save();
    for (let j = 0; j < 3; j++) {
      pCtx.beginPath();
      pCtx.moveTo(0, h * 0.6 + j * 60);
      for (let x = 0; x <= w; x += 20) {
        const y = h * 0.6 + j * 60 + Math.sin(x * 0.01 + t * 1.2 + j) * 35;
        pCtx.lineTo(x, y);
      }
      pCtx.lineTo(w, h);
      pCtx.lineTo(0, h);
      pCtx.closePath();
      pCtx.fillStyle =
        j === 0
          ? "rgba(16, 185, 129, 0.1)"
          : j === 1
          ? "rgba(245, 158, 11, 0.08)"
          : "rgba(56, 189, 248, 0.07)";
      pCtx.fill();
    }
    pCtx.restore();
  }

  return proceduralCanvas!;
}

export function initParticles(type: ParticleType): Particle[] {
  if (type === "none") return [];
  const list: Particle[] = [];
  const count = type === "bokeh" ? 26 : type === "debu-emas" ? 65 : 45;

  for (let i = 0; i < count; i++) {
    if (type === "kunang-kunang") {
      list.push({
        x: Math.random() * 1080,
        y: Math.random() * 1920,
        radius: Math.random() * 3.5 + 1.5,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: -Math.random() * 0.9 - 0.2,
        phase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.6 + 0.3,
      });
    } else if (type === "bokeh") {
      list.push({
        x: Math.random() * 1080,
        y: Math.random() * 1920,
        radius: Math.random() * 45 + 15,
        speedY: -Math.random() * 0.4 - 0.1,
        speedX: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.16 + 0.05,
      });
    } else if (type === "salju") {
      list.push({
        x: Math.random() * 1080,
        y: Math.random() * 1920,
        radius: Math.random() * 2.8 + 1.2,
        speedY: Math.random() * 1.5 + 0.8,
        speedX: Math.sin(Math.random() * 5) * 0.5,
        phase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.6 + 0.4,
      });
    } else if (type === "debu-emas") {
      list.push({
        x: Math.random() * 1080,
        y: Math.random() * 1920,
        radius: Math.random() * 2 + 0.8,
        speedY: -Math.random() * 1.1 - 0.3,
        speedX: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.7 + 0.3,
      });
    } else {
      // bintang
      list.push({
        x: Math.random() * 1080,
        y: Math.random() * 1920,
        radius: Math.random() * 2.2 + 0.8,
        speedY: Math.random() * 0.2 + 0.05,
        speedX: 0,
        phase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.05 + 0.02,
      });
    }
  }
  return list;
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawIslamicCorner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.save();
  ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y - size / 2);
  ctx.lineTo(x + size / 2, y);
  ctx.lineTo(x, y + size / 2);
  ctx.lineTo(x - size / 2, y);
  ctx.closePath();
  ctx.stroke();

  // Internal delicate star point
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
  ctx.fill();
  ctx.restore();
}

export function getWrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export interface RenderCanvasOptions {
  canvas: HTMLCanvasElement;
  dua: DuaItem;
  settings: StudioSettings;
  lang: "id" | "en";
  timeMs?: number;
  particles?: Particle[];
  customBgImage?: HTMLImageElement | null;
  customLogoImage?: HTMLImageElement | null;
  customBgVideo?: HTMLVideoElement | null;
  analyser?: AnalyserNode | null;
  isRecording?: boolean;
  recordProgress?: number;
}

export function renderStudioCanvas({
  canvas,
  dua,
  settings,
  lang,
  timeMs = Date.now(),
  particles = [],
  customBgImage = null,
  customLogoImage = null,
  customBgVideo = null,
  analyser = null,
  isRecording = false,
  recordProgress = 0,
}: RenderCanvasOptions) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  ctx.save();

  // 1. BACKGROUND RENDERING
  if (settings.bgType === "video-loop") {
    const vDimmer = settings.videoDimmer / 100;
    if (
      settings.videoPreset === "custom-file" &&
      customBgVideo &&
      customBgVideo.readyState >= 2
    ) {
      const vW = customBgVideo.videoWidth || 1080;
      const vH = customBgVideo.videoHeight || 1920;
      const ratio = Math.max(W / vW, H / vH);
      const sw = vW * ratio;
      const sh = vH * ratio;
      const sx = (W - sw) / 2;
      const sy = (H - sh) / 2;
      ctx.drawImage(customBgVideo, 0, 0, vW, vH, sx, sy, sw, sh);
    } else {
      const pCanvas = renderProceduralVideoLoop(settings.videoPreset, timeMs);
      ctx.drawImage(pCanvas, 0, 0, pCanvas.width, pCanvas.height, 0, 0, W, H);
    }
    // Dimmer
    ctx.fillStyle = `rgba(5, 8, 15, ${vDimmer})`;
    ctx.fillRect(0, 0, W, H);
  } else if (settings.bgType === "custom-image" && customBgImage) {
    const ratio = Math.max(W / customBgImage.width, H / customBgImage.height);
    const offsetMult = settings.bgPosition / 100;
    const sw = customBgImage.width * ratio;
    const sh = customBgImage.height * ratio;
    const shiftX = -(sw - W) * offsetMult;
    const shiftY = -(sh - H) * offsetMult;

    ctx.drawImage(
      customBgImage,
      0,
      0,
      customBgImage.width,
      customBgImage.height,
      shiftX,
      shiftY,
      sw,
      sh
    );

    const dimmer = settings.bgDimmer / 100;
    ctx.fillStyle = `rgba(8, 12, 20, ${dimmer})`;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Gradient Background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    const theme = settings.bgTheme;
    if (theme === "emerald-gold") {
      grad.addColorStop(0, "#022c22");
      grad.addColorStop(0.45, "#064e3b");
      grad.addColorStop(1, "#78350f");
    } else if (theme === "night-sky") {
      grad.addColorStop(0, "#090d16");
      grad.addColorStop(0.5, "#111827");
      grad.addColorStop(1, "#1e1b4b");
    } else if (theme === "warm-sunset") {
      grad.addColorStop(0, "#381403");
      grad.addColorStop(0.5, "#78350f");
      grad.addColorStop(1, "#701a75");
    } else if (theme === "royal-purple") {
      grad.addColorStop(0, "#2e1065");
      grad.addColorStop(0.5, "#3b0764");
      grad.addColorStop(1, "#0284c7");
    } else if (theme === "deep-ocean") {
      grad.addColorStop(0, "#082f49");
      grad.addColorStop(0.5, "#0c4a6e");
      grad.addColorStop(1, "#134e4a");
    } else if (theme === "desert-sand") {
      grad.addColorStop(0, "#2d1604");
      grad.addColorStop(0.5, "#572f0b");
      grad.addColorStop(1, "#1c3228");
    } else if (theme === "mystic-twilight") {
      grad.addColorStop(0, "#1f0933");
      grad.addColorStop(0.5, "#10233b");
      grad.addColorStop(1, "#062e2c");
    } else {
      // slate-minimal
      grad.addColorStop(0, "#09090b");
      grad.addColorStop(0.5, "#18181b");
      grad.addColorStop(1, "#27272a");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // 2. PARTICLES ANIMATION
  if (settings.particleType !== "none" && particles.length > 0) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (settings.particleType === "kunang-kunang") {
        p.x += p.speedX + Math.sin(timeMs / 600 + p.phase) * 0.6;
        p.y += p.speedY;
        if (p.y < 0) p.y = H;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;

        const pulseAlpha =
          p.alpha * (Math.sin(timeMs / 400 + p.phase) * 0.35 + 0.65);
        ctx.fillStyle = `rgba(253, 224, 71, ${pulseAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(16, 185, 129, ${pulseAlpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (settings.particleType === "bokeh") {
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y < -50) p.y = H + 50;
        if (p.x < -50) p.x = W + 50;
        if (p.x > W + 50) p.x = -50;

        const bokehGrad = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          p.radius
        );
        bokehGrad.addColorStop(0, `rgba(251, 191, 36, ${p.alpha})`);
        bokehGrad.addColorStop(0.7, `rgba(52, 211, 153, ${p.alpha * 0.4})`);
        bokehGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = bokehGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (settings.particleType === "salju") {
        p.y += p.speedY;
        p.x += Math.sin(timeMs / 800 + i) * 0.4;
        if (p.y > H) p.y = -10;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;

        ctx.fillStyle = `rgba(241, 245, 249, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (settings.particleType === "debu-emas") {
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y < 0) p.y = H;

        ctx.fillStyle = `rgba(251, 191, 36, ${
          p.alpha * (Math.sin(timeMs / 300 + i) * 0.3 + 0.7)
        })`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // bintang
        p.y -= p.speedY;
        if (p.y < 0) p.y = H;
        const starTwinkle =
          p.alpha * (Math.sin(timeMs * (p.twinkleSpeed || 0.03)) * 0.4 + 0.6);
        ctx.fillStyle = `rgba(254, 240, 138, ${starTwinkle})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 3. AMBIENT GLOW OVERLAYS
  const pulse = Math.sin(timeMs / 1200) * 0.15 + 0.85;
  const glowGrad1 = ctx.createRadialGradient(
    W * 0.2,
    H * 0.15,
    10,
    W * 0.2,
    H * 0.15,
    W * 0.5
  );
  glowGrad1.addColorStop(0, `rgba(251, 191, 36, ${0.22 * pulse})`);
  glowGrad1.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowGrad1;
  ctx.fillRect(0, 0, W, H);

  const glowGrad2 = ctx.createRadialGradient(
    W * 0.8,
    H * 0.85,
    10,
    W * 0.8,
    H * 0.85,
    W * 0.5
  );
  glowGrad2.addColorStop(0, `rgba(16, 185, 129, ${0.2 * pulse})`);
  glowGrad2.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowGrad2;
  ctx.fillRect(0, 0, W, H);

  // 4. FRAME & CORNER FILIGREE
  if (
    settings.frameStyle === "simple-border" ||
    settings.frameStyle === "islamic-corners"
  ) {
    ctx.strokeStyle = "rgba(245, 158, 11, 0.28)";
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, W - 72, H - 72);

    if (settings.frameStyle === "islamic-corners") {
      drawIslamicCorner(ctx, 50, 50, 42);
      drawIslamicCorner(ctx, W - 50, 50, 42);
      drawIslamicCorner(ctx, 50, H - 50, 42);
      drawIslamicCorner(ctx, W - 50, H - 50, 42);
    }
  }

  // Layout Spacing & Vertical Stacking
  const is916 = H > W;
  const is11 = Math.abs(W - H) < 10;

  const badgeY = is916 ? 110 : is11 ? 55 : 45;
  const titleY = is916 ? 320 : is11 ? 180 : 160;
  const bismillahY = is916 ? 480 : is11 ? 275 : 250;
  const arabicY = is916 ? 650 : is11 ? 385 : 355;

  const latinFont = settings.latinFont;
  const arabicFont = settings.arabicFont;

  // 5. WATERMARK PILL & LOGO
  if (settings.watermarkPos !== "hidden") {
    const badgeW = Math.min(460, W * 0.72);
    const badgeH = 70;
    let bX = (W - badgeW) / 2;
    let bY = badgeY;

    if (settings.watermarkPos === "bottom-corner") {
      bX = 50;
      bY = H - (is916 ? 90 : 65);
    }

    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, bX, bY, badgeW, badgeH, 35);
    ctx.fill();
    ctx.stroke();

    if (customLogoImage) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(bX + 38, bY + badgeH / 2, 24, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        customLogoImage,
        bX + 14,
        bY + (badgeH - 48) / 2,
        48,
        48
      );
      ctx.restore();
    } else {
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(bX + 34, bY + badgeH / 2, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#fef08a";
    ctx.font = `bold 24px ${latinFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      settings.channelName || "@DoaHarianShorts",
      bX + badgeW / 2 + 12,
      bY + badgeH / 2
    );
  }

  // 6. DUA TITLE
  const displayTitle =
    lang === "en" && dua.titleEn ? dua.titleEn : dua.title;
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${is916 ? 50 : 38}px ${latinFont}`;
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 18;
  ctx.fillText(displayTitle, W / 2, titleY);
  ctx.shadowBlur = 0;

  // Gold Separator Line
  const lineGrad = ctx.createLinearGradient(
    W / 2 - 170,
    0,
    W / 2 + 170,
    0
  );
  lineGrad.addColorStop(0, "rgba(245, 158, 11, 0)");
  lineGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.95)");
  lineGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(W / 2 - 170, titleY + 42, 340, 3.5);

  // 7. BISMILLAH CALLIGRAPHY
  ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
  ctx.font = `bold ${is916 ? 46 : 34}px ` + arabicFont;
  ctx.fillText("﷽", W / 2, bismillahY);

  // 8. MAIN ARABIC TEXT & GLOW
  const arabicScale = is916 ? 1.95 : 1.4;
  const effectiveArabicSize = settings.arabicSize * arabicScale;
  const arabicLineHeight = effectiveArabicSize * 1.5;
  let arabicColor: string | CanvasGradient = "#fef3c7";

  if (settings.textAnim === "gold-sheen") {
    const sheenGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
    const pos = (Math.sin(timeMs / 800) + 1) / 2;
    sheenGrad.addColorStop(0, "#fef08a");
    sheenGrad.addColorStop(Math.max(0, pos - 0.15), "#fde047");
    sheenGrad.addColorStop(pos, "#ffffff");
    sheenGrad.addColorStop(Math.min(1, pos + 0.15), "#f59e0b");
    sheenGrad.addColorStop(1, "#fef08a");
    arabicColor = sheenGrad;
  } else if (settings.textAnim === "glow-pulse") {
    const glowPulse = Math.sin(timeMs / 500) * 12 + 18;
    ctx.shadowColor = "rgba(245, 158, 11, 0.75)";
    ctx.shadowBlur = glowPulse;
  } else {
    ctx.shadowColor = "rgba(245, 158, 11, 0.45)";
    ctx.shadowBlur = 24;
  }

  ctx.fillStyle = arabicColor;
  ctx.font = `bold ${effectiveArabicSize}px ${arabicFont}`;
  const arabicLines = getWrapLines(
    ctx,
    dua.arabic,
    W - (is916 ? 160 : 200)
  );
  arabicLines.forEach((line, index) => {
    ctx.fillText(line, W / 2, arabicY + index * arabicLineHeight);
  });
  ctx.shadowBlur = 0;

  // Dynamic Spacing Calculation for Transliteration & Translation
  const arabicBlockBottom =
    arabicY + arabicLines.length * arabicLineHeight;
  const latinY = is916
    ? Math.max(1040, arabicBlockBottom + 50)
    : Math.max(570, arabicBlockBottom + 35);
  const latinLineHeight = is916 ? 46 : 32;

  // 9. TRANSLITERATION (LATIN)
  ctx.fillStyle = "#a7f3d0";
  ctx.font = `italic ${is916 ? 32 : 23}px ${latinFont}`;
  const latinLines = getWrapLines(ctx, `"${dua.latin}"`, W - 180);
  latinLines.forEach((line, index) => {
    ctx.fillText(line, W / 2, latinY + index * latinLineHeight);
  });

  // 10. TRANSLATION BOX
  const latinBlockBottom = latinY + latinLines.length * latinLineHeight;
  const boxY = is916
    ? Math.max(1220, latinBlockBottom + 50)
    : Math.max(680, latinBlockBottom + 30);
  const displayMeaning =
    lang === "en" && dua.meaningEn ? dua.meaningEn : dua.meaning;
  const boxMargin = is916 ? 90 : 120;
  const boxW = W - boxMargin * 2;
  const boxPadding = is916 ? 46 : 30;
  const transScale = is916 ? 1.5 : 1.1;

  ctx.font = `400 ${settings.transSize * transScale}px ${latinFont}`;
  const lines = getWrapLines(
    ctx,
    `"${displayMeaning}"`,
    boxW - boxPadding * 2
  );
  const calculatedBoxH =
    lines.length * (settings.transSize * transScale * 1.35) +
    boxPadding * 2;

  if (settings.boxStyle === "blur") {
    ctx.fillStyle = "rgba(15, 23, 42, 0.74)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, boxMargin, boxY, boxW, calculatedBoxH, 26);
    ctx.fill();
    ctx.stroke();
  } else if (settings.boxStyle === "solid") {
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, boxMargin, boxY, boxW, calculatedBoxH, 26);
    ctx.fill();
    ctx.stroke();
  } else if (settings.boxStyle === "gold-border") {
    ctx.strokeStyle = "rgba(245, 158, 11, 0.75)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, boxMargin, boxY, boxW, calculatedBoxH, 22);
    ctx.stroke();
  }

  ctx.fillStyle = "#f8fafc";
  lines.forEach((line, idx) => {
    ctx.fillText(
      line,
      W / 2,
      boxY +
        boxPadding +
        idx * (settings.transSize * transScale * 1.35) +
        settings.transSize * transScale * 0.5
    );
  });

  // 11. SPIRITUAL FOOTER
  const footerText1 =
    lang === "en"
      ? "• MAY ALLAH ACCEPT OUR PRAYERS •"
      : "• AAMIIN YA RABBAL 'ALAMIN •";
  const footerText2 =
    lang === "en"
      ? "❤️ Share this video, may Allah bless and protect us"
      : "❤️ Bagikan video ini, semoga kita selalu dalam lindungan Allah SWT";

  ctx.fillStyle = "rgba(251, 191, 36, 0.92)";
  ctx.font = `bold ${is916 ? 26 : 20}px ${latinFont}`;
  ctx.fillText(footerText1, W / 2, H - (is916 ? 170 : 85));

  ctx.fillStyle = "#94a3b8";
  ctx.font = `${is916 ? 22 : 16}px ${latinFont}`;
  ctx.fillText(footerText2, W / 2, H - (is916 ? 120 : 50));

  // 12. AUDIO FREQUENCY SPECTRUM VISUALIZER
  if (analyser) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const barWidth = is916 ? 8 : 6;
    const barGap = is916 ? 6 : 4;
    const numBars = is916 ? 40 : 32;
    const totalWidth = numBars * barWidth + (numBars - 1) * barGap;
    const startX = (W - totalWidth) / 2;
    const waveY = H - (is916 ? 230 : 125);

    ctx.fillStyle = "#10b981";
    for (let i = 0; i < numBars; i++) {
      const value = dataArray[i * 2] || 0;
      const barHeight = (value / 255) * (is916 ? 65 : 40) + 5;
      const x = startX + i * (barWidth + barGap);
      drawRoundedRect(ctx, x, waveY - barHeight / 2, barWidth, barHeight, 3);
      ctx.fill();
    }
  }

  // 13. RECORDING BAR
  if (isRecording) {
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(0, 0, W * recordProgress, 14);
  }

  ctx.restore();
}
