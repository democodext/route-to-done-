import { formatHumanDate, formatShortDate, parseIsoDate } from './planner';
import { StageId, StudyPlanResult } from './types';

export type WallpaperTheme =
  | 'midnight_horizon'
  | 'solar'
  | 'obsidian'
  | 'dreamscape';

export interface ThemeMeta {
  id: WallpaperTheme;
  name: string;
  subtitle: string;
  closingLine: string;
  swatch: [string, string, string];
}

export const WALLPAPER_WIDTH = 2160;
export const WALLPAPER_HEIGHT = 4560;

export const WALLPAPER_THEMES: ThemeMeta[] = [
  {
    id: 'midnight_horizon',
    name: 'Midnight Horizon',
    subtitle: 'Alpine Aurora Night',
    closingLine: 'Stay steady. The horizon is yours.',
    swatch: ['#090E23', '#1E3A5F', '#4ADE80'],
  },
  {
    id: 'solar',
    name: 'Solar',
    subtitle: 'Architectural Sunlight',
    closingLine: 'Warm light. Unhurried progress.',
    swatch: ['#FAF2E8', '#E9B996', '#B84323'],
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    subtitle: 'Sculpted Emerald',
    closingLine: 'Cut the noise. Build the margin.',
    swatch: ['#070909', '#1D332B', '#34D399'],
  },
  {
    id: 'dreamscape',
    name: 'Dreamscape',
    subtitle: 'Twilight Clouds',
    closingLine: 'Quiet momentum, day after day.',
    swatch: ['#3F4A84', '#9489C8', '#F2B59D'],
  },
];

export function normalizeTheme(rawTheme: unknown): WallpaperTheme {
  if (rawTheme === 'solar' || rawTheme === 'sunrise' || rawTheme === 'paper') {
    return 'solar';
  }
  if (rawTheme === 'obsidian') {
    return 'obsidian';
  }
  if (rawTheme === 'dreamscape' || rawTheme === 'aurora') {
    return 'dreamscape';
  }
  return 'midnight_horizon';
}

export interface RouteStation {
  id: string;
  indexLabel: string;
  stageId: StageId | 'destination';
  shortLabel: string;
  targetDate: string;
  topicsPreview: string;
  statusTag: string | null;
  state: 'done' | 'current' | 'upcoming' | 'destination';
}

export interface WallpaperModel {
  isReady: boolean;
  goalName: string;
  daysRemaining: number;
  deadlineLabel: string;
  shortDeadlineLabel: string;
  stations: RouteStation[];
  currentStation: {
    indexLabel: string;
    title: string;
    targetDate: string;
    topicsPreview: string;
    nextAction: string;
  } | null;
  nextAction: string | null;
  hasConflict: boolean;
  conflictNote: string | null;
}

const SHORT_STAGE_LABELS: Record<StageId, string> = {
  audit: 'Syllabus Audit',
  learning: 'Core Topics',
  completion: 'Full Syllabus',
  revision: 'Revision',
  mocks: 'Mock Tests',
  final_prep: 'Final Prep',
};

export function getThemeMeta(theme: WallpaperTheme): ThemeMeta {
  return WALLPAPER_THEMES.find((t) => t.id === theme) ?? WALLPAPER_THEMES[0];
}

export function computeDaysRemaining(startDate: string, deadlineDate: string): number {
  const start = parseIsoDate(startDate);
  const deadline = parseIsoDate(deadlineDate);
  if (!start || !deadline) return 0;
  return Math.max(0, Math.round((deadline.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

export function condenseNextAction(action: string, maxChars = 136): string {
  const clean = action.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  const sliced = clean.slice(0, maxChars - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > 50 ? sliced.slice(0, lastSpace) : sliced).trimEnd() + '…';
}

export function buildWallpaperModel(
  goalName: string,
  startDate: string,
  deadlineDate: string,
  plan: StudyPlanResult,
  completedMilestoneIds: string[]
): WallpaperModel {
  const cleanGoal = goalName.trim();
  const daysRemaining = computeDaysRemaining(startDate, deadlineDate);
  const deadlineLabel = deadlineDate ? formatHumanDate(deadlineDate).toUpperCase() : 'NO DATE SET';
  const shortDeadlineLabel = deadlineDate ? formatShortDate(deadlineDate) : 'Exam Day';

  if (!plan.isValid || plan.milestones.length === 0) {
    return {
      isReady: false,
      goalName: cleanGoal || 'Your Exam Goal',
      daysRemaining,
      deadlineLabel,
      shortDeadlineLabel,
      stations: [],
      currentStation: null,
      nextAction: null,
      hasConflict: false,
      conflictNote: null,
    };
  }

  const activeMilestones = plan.milestones.filter(
    (m) => m.estimatedHours > 0 || m.stageId === 'audit'
  );

  const completedSet = new Set(completedMilestoneIds);
  const firstPendingIdx = activeMilestones.findIndex((m) => !completedSet.has(m.id));
  const activeIdx =
    firstPendingIdx === -1 ? Math.max(0, activeMilestones.length - 1) : firstPendingIdx;

  const stations: RouteStation[] = activeMilestones.map((ms, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    let state: RouteStation['state'] = 'upcoming';
    let statusTag: string | null = null;

    if (completedSet.has(ms.id)) {
      state = 'done';
      statusTag = 'Completed';
    } else if (idx === activeIdx) {
      state = 'current';
      statusTag = 'Current';
    }

    const topicsPreview =
      ms.exactTopics.slice(0, 2).join(' · ') +
      (ms.exactTopics.length > 2 ? ` (+${ms.exactTopics.length - 2})` : '');

    return {
      id: ms.id,
      indexLabel: num,
      stageId: ms.stageId,
      shortLabel: SHORT_STAGE_LABELS[ms.stageId],
      targetDate: ms.targetDate,
      topicsPreview,
      statusTag,
      state,
    };
  });

  stations.push({
    id: 'ms-destination',
    indexLabel: String(stations.length + 1).padStart(2, '0'),
    stageId: 'destination',
    shortLabel: 'Exam Day',
    targetDate: shortDeadlineLabel,
    topicsPreview: '',
    statusTag: 'Destination',
    state: 'destination',
  });

  const activeMs = activeMilestones[activeIdx];
  const currentNum = String(activeIdx + 1).padStart(2, '0');
  const activeTopicsPreview =
    activeMs.exactTopics.slice(0, 2).join(' · ') +
    (activeMs.exactTopics.length > 2 ? ` (+${activeMs.exactTopics.length - 2})` : '');

  const conciseAction = condenseNextAction(activeMs.nextAction);

  return {
    isReady: true,
    goalName: cleanGoal || 'Exam Preparation',
    daysRemaining,
    deadlineLabel,
    shortDeadlineLabel,
    stations,
    currentStation: {
      indexLabel: currentNum,
      title: SHORT_STAGE_LABELS[activeMs.stageId],
      targetDate: activeMs.targetDate,
      topicsPreview: activeTopicsPreview,
      nextAction: conciseAction,
    },
    nextAction: conciseAction,
    hasConflict: plan.gapAnalysis.hasGap,
    conflictNote: plan.gapAnalysis.hasGap
      ? `Tight pace · ${plan.gapAnalysis.gapHours}h short of full plan`
      : null,
  };
}

export interface PaletteTokens {
  ink: string;
  muted: string;
  subtle: string;
  accent: string;
  accentHalo: string;
  done: string;
  railIdle: string;
  railActive: string;
  rule: string;
  currentTint: string;
  currentBorder: string;
  isLight: boolean;
}

export function getWallpaperPalette(theme: WallpaperTheme): PaletteTokens {
  if (theme === 'solar') {
    return {
      ink: '#1A1411',
      muted: '#3A2C23',
      subtle: '#4B3B30',
      accent: '#B43F20',
      accentHalo: 'rgba(180, 63, 32, 0.22)',
      done: '#215B42',
      railIdle: 'rgba(58, 44, 35, 0.30)',
      railActive: 'rgba(33, 91, 66, 0.76)',
      rule: 'rgba(180, 63, 32, 0.36)',
      currentTint: 'rgba(255, 251, 246, 0.84)',
      currentBorder: 'rgba(180, 63, 32, 0.34)',
      isLight: true,
    };
  }
  if (theme === 'obsidian') {
    return {
      ink: '#F4F7F5',
      muted: '#C3D3CC',
      subtle: '#94ABA1',
      accent: '#34D399',
      accentHalo: 'rgba(52, 211, 153, 0.26)',
      done: '#6EE7B7',
      railIdle: 'rgba(195, 211, 204, 0.26)',
      railActive: 'rgba(52, 211, 153, 0.74)',
      rule: 'rgba(52, 211, 153, 0.36)',
      currentTint: 'rgba(8, 22, 17, 0.78)',
      currentBorder: 'rgba(52, 211, 153, 0.34)',
      isLight: false,
    };
  }
  if (theme === 'dreamscape') {
    return {
      ink: '#FAF8FF',
      muted: '#E4E5FA',
      subtle: '#C8CBEF',
      accent: '#DDD6FE',
      accentHalo: 'rgba(221, 214, 254, 0.28)',
      done: '#7DD3FC',
      railIdle: 'rgba(228, 229, 250, 0.28)',
      railActive: 'rgba(125, 211, 252, 0.78)',
      rule: 'rgba(221, 214, 254, 0.40)',
      currentTint: 'rgba(15, 19, 49, 0.62)',
      currentBorder: 'rgba(221, 214, 254, 0.36)',
      isLight: false,
    };
  }
  // midnight_horizon
  return {
    ink: '#F8FAFC',
    muted: '#D5DFEA',
    subtle: '#A3B3C6',
    accent: '#7DD3FC',
    accentHalo: 'rgba(125, 211, 252, 0.28)',
    done: '#6EE7B7',
    railIdle: 'rgba(213, 223, 234, 0.26)',
    railActive: 'rgba(110, 231, 183, 0.74)',
    rule: 'rgba(125, 211, 252, 0.36)',
    currentTint: 'rgba(8, 13, 30, 0.68)',
    currentBorder: 'rgba(125, 211, 252, 0.32)',
    isLight: false,
  };
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetW: number,
  targetH: number
) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) return;

  const targetRatio = targetW / targetH;
  const srcRatio = srcW / srcH;

  let drawW = targetW;
  let drawH = targetH;
  let offsetX = 0;
  let offsetY = 0;

  if (srcRatio > targetRatio) {
    drawH = targetH;
    drawW = targetH * srcRatio;
    offsetX = (targetW - drawW) / 2;
  } else {
    drawW = targetW;
    drawH = targetW / srcRatio;
    offsetY = (targetH - drawH) / 2;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

function drawFallbackBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: WallpaperTheme
) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (theme === 'solar') {
    grad.addColorStop(0, '#FDF7EE');
    grad.addColorStop(1, '#F1C1A6');
  } else if (theme === 'obsidian') {
    grad.addColorStop(0, '#040607');
    grad.addColorStop(1, '#081813');
  } else if (theme === 'dreamscape') {
    grad.addColorStop(0, '#1B2258');
    grad.addColorStop(1, '#2D2768');
  } else {
    grad.addColorStop(0, '#070B19');
    grad.addColorStop(1, '#0D1C3D');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawContrastScrim(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: WallpaperTheme
) {
  const scrim = ctx.createLinearGradient(0, 0, 0, h);

  if (theme === 'solar') {
    // Keep sunlit travertine architecture vivid while providing soft cream clarity behind typography
    scrim.addColorStop(0, 'rgba(253, 247, 238, 0.08)');
    scrim.addColorStop(0.28, 'rgba(253, 247, 238, 0.38)');
    scrim.addColorStop(0.56, 'rgba(252, 244, 234, 0.66)');
    scrim.addColorStop(0.84, 'rgba(249, 236, 222, 0.72)');
    scrim.addColorStop(1, 'rgba(245, 224, 204, 0.48)');
  } else if (theme === 'obsidian') {
    scrim.addColorStop(0, 'rgba(4, 7, 6, 0.10)');
    scrim.addColorStop(0.28, 'rgba(4, 7, 6, 0.30)');
    scrim.addColorStop(0.55, 'rgba(4, 8, 7, 0.58)');
    scrim.addColorStop(0.84, 'rgba(4, 7, 6, 0.74)');
    scrim.addColorStop(1, 'rgba(4, 6, 6, 0.64)');
  } else if (theme === 'dreamscape') {
    // Preserve lavender sky on top, deepen lower golden horizon slightly so light ink stays crisp
    scrim.addColorStop(0, 'rgba(18, 22, 54, 0.08)');
    scrim.addColorStop(0.30, 'rgba(18, 22, 54, 0.28)');
    scrim.addColorStop(0.58, 'rgba(18, 21, 52, 0.54)');
    scrim.addColorStop(0.84, 'rgba(15, 18, 44, 0.74)');
    scrim.addColorStop(1, 'rgba(12, 15, 38, 0.78)');
  } else {
    // midnight_horizon: leave upper starry aurora pristine, gentle mist behind lower mountains
    scrim.addColorStop(0, 'rgba(5, 9, 22, 0.05)');
    scrim.addColorStop(0.28, 'rgba(6, 10, 26, 0.30)');
    scrim.addColorStop(0.58, 'rgba(6, 10, 26, 0.54)');
    scrim.addColorStop(0.84, 'rgba(5, 8, 20, 0.68)');
    scrim.addColorStop(1, 'rgba(4, 7, 17, 0.72)');
  }

  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, w, h);
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  let truncated = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
        if (lines.length === maxLines) {
          truncated = true;
          current = '';
          break;
        }
        current = word;
      } else {
        // Single long word exceeds maxWidth
        lines.push(word);
        if (lines.length === maxLines) {
          truncated = true;
          current = '';
          break;
        }
        current = '';
      }
    }
  }

  if (current) {
    if (lines.length < maxLines) {
      lines.push(current);
    } else {
      truncated = true;
    }
  }

  if (lines.length > 0 && (truncated || ctx.measureText(lines[lines.length - 1]).width > maxWidth)) {
    let last = lines[lines.length - 1];
    while (last.length > 3 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = `${last}…`;
  }

  return lines;
}

/**
 * Renders a native ultra-high-resolution 9:19 portrait phone lock-screen wallpaper (2160 × 4560 px).
 * Top 30% stays serene and unobstructed for the phone clock and notifications.
 */
export function renderPhoneWallpaperCanvas(
  canvas: HTMLCanvasElement,
  model: WallpaperModel,
  theme: WallpaperTheme,
  artworkImage?: HTMLImageElement | null
): void {
  const W = WALLPAPER_WIDTH; // 2160
  const H = WALLPAPER_HEIGHT; // 4560
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (artworkImage && (artworkImage.naturalWidth > 0 || artworkImage.width > 0)) {
    drawImageCover(ctx, artworkImage, W, H);
  } else {
    drawFallbackBackdrop(ctx, W, H, theme);
  }
  drawContrastScrim(ctx, W, H, theme);

  const p = getWallpaperPalette(theme);
  const meta = getThemeMeta(theme);

  const padX = 200;
  const contentW = W - padX * 2;

  // Sculptural Countdown Hero starting cleanly below the ~30.5% OS clock-safe area
  let cursorY = 1570;

  // Monumental Sora Countdown Numeral
  ctx.fillStyle = p.ink;
  ctx.font = '700 288px "Sora", sans-serif';
  const countStr = String(model.daysRemaining);
  ctx.fillText(countStr, padX, cursorY);

  const countW = ctx.measureText(countStr).width;
  const dayWord = model.daysRemaining === 1 ? 'DAY LEFT' : 'DAYS LEFT';

  ctx.fillStyle = p.accent;
  ctx.font = '700 42px "Inter", sans-serif';
  ctx.fillText(dayWord, padX + countW + 54, cursorY - 114);

  ctx.fillStyle = p.muted;
  ctx.font = '500 42px "JetBrains Mono", monospace';
  ctx.fillText(model.deadlineLabel, padX + countW + 54, cursorY - 46);

  cursorY += 136;

  // Goal Title in Sora
  ctx.fillStyle = p.ink;
  ctx.font = '600 98px "Sora", sans-serif';
  const goalLines = wrapTextLines(ctx, model.goalName, contentW, 2);
  for (const line of goalLines) {
    ctx.fillText(line, padX, cursorY);
    cursorY += 120;
  }

  if (model.conflictNote) {
    ctx.fillStyle = p.accent;
    ctx.font = '600 42px "Inter", sans-serif';
    ctx.fillText(model.conflictNote, padX, cursorY + 8);
    cursorY += 76;
  }

  cursorY += 96;

  const footerTopY = 3646;
  const stations = model.stations;

  if (stations.length > 0) {
    const railX = padX + 26;
    const journeyEndLimit = footerTopY - 118;
    const hasCurrent = stations.some((s) => s.state === 'current');
    const currentExtra = 86;
    const availableH = Math.max(660, journeyEndLimit - cursorY);
    const stepH = Math.min(
      202,
      Math.floor((availableH - (hasCurrent ? currentExtra : 0)) / Math.max(1, stations.length - 1))
    );

    const yPositions: number[] = [];
    let sy = cursorY + 22;
    for (let i = 0; i < stations.length; i++) {
      yPositions.push(sy);
      sy += stepH + (stations[i].state === 'current' ? currentExtra : 0);
    }

    // Whisper-thin vertical journey rail
    for (let i = 0; i < stations.length - 1; i++) {
      ctx.strokeStyle = stations[i].state === 'done' ? p.railActive : p.railIdle;
      ctx.lineWidth = stations[i].state === 'done' ? 4.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(railX, yPositions[i]);
      ctx.lineTo(railX, yPositions[i + 1]);
      ctx.stroke();
    }

    const labelX = railX + 78;
    stations.forEach((station, idx) => {
      const cy = yPositions[idx];

      if (station.state === 'current') {
        const cardH = station.topicsPreview ? 192 : 140;
        ctx.fillStyle = p.currentTint;
        ctx.strokeStyle = p.currentBorder;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(railX + 44, cy - 62, W - padX - (railX + 44), cardH, 30);
        ctx.fill();
        ctx.stroke();

        // Luminous halo + accent node
        ctx.fillStyle = p.accentHalo;
        ctx.beginPath();
        ctx.arc(railX, cy, 31, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.arc(railX, cy, 13.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.ink;
        ctx.font = '600 58px "Sora", sans-serif';
        ctx.fillText(station.shortLabel, labelX, cy + 14);

        ctx.fillStyle = p.accent;
        ctx.font = '500 40px "JetBrains Mono", monospace';
        const dw = ctx.measureText(station.targetDate).width;
        ctx.fillText(station.targetDate, W - padX - 34 - dw, cy + 12);

        if (station.topicsPreview) {
          ctx.fillStyle = p.muted;
          ctx.font = '500 44px "Inter", sans-serif';
          const topicLine =
            wrapTextLines(ctx, station.topicsPreview, W - padX - labelX - 44, 1)[0] ?? '';
          ctx.fillText(topicLine, labelX, cy + 84);
        }
      } else if (station.state === 'done') {
        ctx.fillStyle = p.done;
        ctx.beginPath();
        ctx.arc(railX, cy, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.muted;
        ctx.font = '500 54px "Inter", sans-serif';
        ctx.fillText(station.shortLabel, labelX, cy + 16);

        ctx.fillStyle = p.done;
        ctx.font = '600 42px "Inter", sans-serif';
        const tag = 'Done';
        const tw = ctx.measureText(tag).width;
        ctx.fillText(tag, W - padX - tw, cy + 14);
      } else if (station.state === 'destination') {
        ctx.save();
        ctx.translate(railX, cy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = p.accent;
        ctx.fillRect(-10, -10, 20, 20);
        ctx.restore();

        ctx.fillStyle = p.ink;
        ctx.font = '600 56px "Sora", sans-serif';
        ctx.fillText('Exam Day', labelX, cy + 16);

        ctx.fillStyle = p.accent;
        ctx.font = '500 42px "JetBrains Mono", monospace';
        const dw = ctx.measureText(station.targetDate).width;
        ctx.fillText(station.targetDate, W - padX - dw, cy + 14);
      } else {
        ctx.fillStyle = p.subtle;
        ctx.beginPath();
        ctx.arc(railX, cy, 8.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.muted;
        ctx.font = '500 54px "Inter", sans-serif';
        ctx.fillText(station.shortLabel, labelX, cy + 16);
      }
    });
  }

  // Concise Next Action + Motivational Line (above bottom 8.5% OS safe zone)
  let fy = footerTopY;
  ctx.strokeStyle = p.rule;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(padX, fy);
  ctx.lineTo(padX + 156, fy);
  ctx.stroke();

  if (model.nextAction) {
    fy += 78;
    ctx.fillStyle = p.accent;
    ctx.font = '600 38px "JetBrains Mono", monospace';
    ctx.fillText('NEXT ACTION', padX, fy);

    fy += 74;
    ctx.fillStyle = p.ink;
    ctx.font = '500 54px "Inter", sans-serif';
    const actionLines = wrapTextLines(ctx, model.nextAction, contentW, 3);
    for (const line of actionLines) {
      ctx.fillText(line, padX, fy);
      fy += 70;
    }
  }

  ctx.fillStyle = p.subtle;
  ctx.font = '500 46px "Inter", sans-serif';
  ctx.fillText(meta.closingLine, padX, 4158);
}

/**
 * Renders an optional 16:9 desktop wallpaper (2560 x 1440 px) using the selected art-directed theme.
 */
export function renderDesktopWallpaperCanvas(
  canvas: HTMLCanvasElement,
  model: WallpaperModel,
  theme: WallpaperTheme,
  artworkImage?: HTMLImageElement | null
): void {
  const W = 2560;
  const H = 1440;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (artworkImage && (artworkImage.naturalWidth > 0 || artworkImage.width > 0)) {
    drawImageCover(ctx, artworkImage, W, H);
  } else {
    drawFallbackBackdrop(ctx, W, H, theme);
  }
  drawContrastScrim(ctx, W, H, theme);

  const p = getWallpaperPalette(theme);
  const meta = getThemeMeta(theme);

  const padX = 220;
  const leftW = 1040;
  let y = 340;

  ctx.fillStyle = p.ink;
  ctx.font = '700 184px "Sora", sans-serif';
  const countStr = String(model.daysRemaining);
  ctx.fillText(countStr, padX, y);
  const countW = ctx.measureText(countStr).width;

  const dayWord = model.daysRemaining === 1 ? 'DAY LEFT' : 'DAYS LEFT';
  ctx.fillStyle = p.accent;
  ctx.font = '700 26px "Inter", sans-serif';
  ctx.fillText(dayWord, padX + countW + 32, y - 68);

  ctx.fillStyle = p.muted;
  ctx.font = '500 26px "JetBrains Mono", monospace';
  ctx.fillText(model.deadlineLabel, padX + countW + 32, y - 26);

  y += 100;
  ctx.fillStyle = p.ink;
  ctx.font = '600 74px "Sora", sans-serif';
  const goalLines = wrapTextLines(ctx, model.goalName, leftW, 2);
  for (const line of goalLines) {
    ctx.fillText(line, padX, y);
    y += 88;
  }

  if (model.conflictNote) {
    ctx.fillStyle = p.accent;
    ctx.font = '600 26px "Inter", sans-serif';
    ctx.fillText(model.conflictNote, padX, y + 10);
    y += 50;
  }

  let ay = 980;
  ctx.strokeStyle = p.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, ay);
  ctx.lineTo(padX + 96, ay);
  ctx.stroke();

  if (model.nextAction) {
    ay += 48;
    ctx.fillStyle = p.accent;
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText('NEXT ACTION', padX, ay);

    ay += 44;
    ctx.fillStyle = p.ink;
    ctx.font = '500 30px "Inter", sans-serif';
    const nextLines = wrapTextLines(ctx, model.nextAction, leftW, 2);
    for (const line of nextLines) {
      ctx.fillText(line, padX, ay);
      ay += 42;
    }
  }

  ctx.fillStyle = p.subtle;
  ctx.font = '500 27px "Inter", sans-serif';
  ctx.fillText(meta.closingLine, padX, 1230);

  const rightX = 1520;
  const rightW = W - rightX - padX;
  const ry = 320;
  const stations = model.stations;
  const stepH = Math.min(130, Math.floor(820 / Math.max(1, stations.length - 1)));
  const railX = rightX + 20;

  for (let i = 0; i < stations.length - 1; i++) {
    ctx.strokeStyle = stations[i].state === 'done' ? p.railActive : p.railIdle;
    ctx.lineWidth = stations[i].state === 'done' ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(railX, ry + i * stepH);
    ctx.lineTo(railX, ry + (i + 1) * stepH);
    ctx.stroke();
  }

  stations.forEach((station, idx) => {
    const cy = ry + idx * stepH;
    const labelX = railX + 52;

    if (station.state === 'current') {
      ctx.fillStyle = p.currentTint;
      ctx.strokeStyle = p.currentBorder;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(railX + 30, cy - 38, rightW - 30, station.topicsPreview ? 112 : 80, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = p.accentHalo;
      ctx.beginPath();
      ctx.arc(railX, cy, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.accent;
      ctx.beginPath();
      ctx.arc(railX, cy, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.ink;
      ctx.font = '600 35px "Sora", sans-serif';
      ctx.fillText(station.shortLabel, labelX, cy + 10);

      ctx.fillStyle = p.accent;
      ctx.font = '500 26px "JetBrains Mono", monospace';
      const dw = ctx.measureText(station.targetDate).width;
      ctx.fillText(station.targetDate, rightX + rightW - 22 - dw, cy + 8);

      if (station.topicsPreview) {
        ctx.fillStyle = p.muted;
        ctx.font = '500 26px "Inter", sans-serif';
        ctx.fillText(station.topicsPreview, labelX, cy + 48);
      }
    } else if (station.state === 'done') {
      ctx.fillStyle = p.done;
      ctx.beginPath();
      ctx.arc(railX, cy, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.muted;
      ctx.font = '500 31px "Inter", sans-serif';
      ctx.fillText(station.shortLabel, labelX, cy + 10);

      ctx.fillStyle = p.done;
      ctx.font = '600 24px "Inter", sans-serif';
      const dw = ctx.measureText('Done').width;
      ctx.fillText('Done', rightX + rightW - dw, cy + 8);
    } else if (station.state === 'destination') {
      ctx.save();
      ctx.translate(railX, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = p.accent;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();

      ctx.fillStyle = p.ink;
      ctx.font = '600 34px "Sora", sans-serif';
      ctx.fillText('Exam Day', labelX, cy + 10);

      ctx.fillStyle = p.accent;
      ctx.font = '500 25px "JetBrains Mono", monospace';
      const dw = ctx.measureText(station.targetDate).width;
      ctx.fillText(station.targetDate, rightX + rightW - dw, cy + 8);
    } else {
      ctx.fillStyle = p.subtle;
      ctx.beginPath();
      ctx.arc(railX, cy, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.muted;
      ctx.font = '500 31px "Inter", sans-serif';
      ctx.fillText(station.shortLabel, labelX, cy + 10);
    }
  });
}

export async function exportCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  if (blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
