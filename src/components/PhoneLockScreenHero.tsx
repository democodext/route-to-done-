import { Camera, Download, Flashlight, Monitor, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  getThemeMeta,
  getWallpaperPalette,
  WALLPAPER_THEMES,
  WallpaperModel,
  WallpaperTheme,
} from '../engine/wallpaper';
import { THEME_ARTWORK_URLS } from '../engine/wallpaperArt';

interface PhoneLockScreenHeroProps {
  model: WallpaperModel;
  canDownload: boolean;
  needsRegenerate: boolean;
  theme: WallpaperTheme;
  showClockGuide: boolean;
  onThemeChange: (theme: WallpaperTheme) => void;
  onToggleClockGuide: () => void;
  onRegenerateWallpaper: () => void;
  onDownloadPhonePng: () => void;
  onDownloadDesktopPng: () => void;
}

function getPreviewScrimGradient(theme: WallpaperTheme): string {
  if (theme === 'solar') {
    return 'linear-gradient(180deg, rgba(253,247,238,0.08) 0%, rgba(253,247,238,0.38) 28%, rgba(252,244,234,0.66) 56%, rgba(249,236,222,0.72) 84%, rgba(245,224,204,0.48) 100%)';
  }
  if (theme === 'obsidian') {
    return 'linear-gradient(180deg, rgba(4,7,6,0.10) 0%, rgba(4,7,6,0.30) 28%, rgba(4,8,7,0.58) 55%, rgba(4,7,6,0.74) 84%, rgba(4,6,6,0.64) 100%)';
  }
  if (theme === 'dreamscape') {
    return 'linear-gradient(180deg, rgba(18,22,54,0.08) 0%, rgba(18,22,54,0.28) 30%, rgba(18,21,52,0.54) 58%, rgba(15,18,44,0.74) 84%, rgba(12,15,38,0.78) 100%)';
  }
  return 'linear-gradient(180deg, rgba(5,9,22,0.05) 0%, rgba(6,10,26,0.30) 28%, rgba(6,10,26,0.54) 58%, rgba(5,8,20,0.68) 84%, rgba(4,7,17,0.72) 100%)';
}

function getPreviewClockDateLabel(): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

export function PhoneLockScreenHero({
  model,
  canDownload,
  needsRegenerate,
  theme,
  showClockGuide,
  onThemeChange,
  onToggleClockGuide,
  onRegenerateWallpaper,
  onDownloadPhonePng,
  onDownloadDesktopPng,
}: PhoneLockScreenHeroProps) {
  const palette = getWallpaperPalette(theme);
  const meta = getThemeMeta(theme);

  return (
    <aside
      aria-label="Smartphone lock-screen wallpaper preview"
      className="lg:sticky lg:top-20"
    >
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
        {/* Realistic, Prominent 9:19 Titanium Smartphone Showcase */}
        <div className="sm:col-span-7 flex flex-col items-center">
          <div
            data-testid="phone-lockscreen-preview"
            data-theme={theme}
            className="relative w-full max-w-[330px] aspect-[9/19] rounded-[46px] p-[9px] bg-gradient-to-b from-[#2A2D34] via-[#15171C] to-[#20232A] shadow-[0_32px_70px_-20px_rgba(20,21,24,0.48)] ring-1 ring-black/25 flex flex-col"
          >
            {/* Subtle hardware side buttons */}
            <span
              aria-hidden="true"
              className="hidden sm:block absolute -right-[2px] top-32 w-[2px] h-14 rounded-r bg-[#3B3F4A]"
            />
            <span
              aria-hidden="true"
              className="hidden sm:block absolute -left-[2px] top-28 w-[2px] h-9 rounded-l bg-[#3B3F4A]"
            />
            <span
              aria-hidden="true"
              className="hidden sm:block absolute -left-[2px] top-40 w-[2px] h-9 rounded-l bg-[#3B3F4A]"
            />

            <div
              style={{ color: palette.ink }}
              className="relative flex-1 rounded-[37px] overflow-hidden flex flex-col justify-between px-6 pt-3 pb-2.5 bg-[#0A0C14]"
            >
              {/* Art-Directed Generated Background Artwork + Contrast Scrim */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme}
                  initial={{ opacity: 0.2 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0.2 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="pointer-events-none absolute inset-0"
                >
                  <img
                    src={THEME_ARTWORK_URLS[theme]}
                    alt={`${meta.name} wallpaper artwork`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{ backgroundImage: getPreviewScrimGradient(theme) }}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Top ~28.5% Clear Clock & Notification Safe Region */}
              <div className="relative z-10 h-[28.5%] flex flex-col items-center justify-start pt-0.5 shrink-0">
                <div
                  aria-hidden="true"
                  className="w-[72px] h-[17px] rounded-full bg-black/92 ring-1 ring-white/10 mb-3 flex items-center justify-end pr-2"
                >
                  <span className="w-2 h-2 rounded-full bg-[#1C2432] ring-1 ring-[#7DD3FC]/30" />
                </div>
                {showClockGuide ? (
                  <div className="text-center select-none pointer-events-none opacity-85">
                    <div
                      style={{ color: palette.muted }}
                      className="text-[10px] font-medium tracking-wide"
                    >
                      {getPreviewClockDateLabel()}
                    </div>
                    <div className="font-display text-[36px] font-semibold tracking-tight leading-none mt-0.5 tabular-nums">
                      09:41
                    </div>
                  </div>
                ) : (
                  <div
                    style={{ color: palette.subtle }}
                    className="mt-5 text-[9px] font-mono tracking-wide"
                  >
                    Clock-safe upper space
                  </div>
                )}
              </div>

              {/* Lock-Screen Editorial Content Blending Into Artwork */}
              <div className="relative z-10 flex-1 flex flex-col justify-between min-h-0 pt-1">
                <div>
                  <div className="flex items-end gap-2.5">
                    <span className="font-display text-[46px] font-bold leading-[0.86] tracking-tight tabular-nums">
                      {model.daysRemaining}
                    </span>
                    <div className="pb-0.5 min-w-0">
                      <div
                        style={{ color: palette.accent }}
                        className="text-[8.5px] font-bold tracking-[0.14em] uppercase"
                      >
                        {model.daysRemaining === 1 ? 'DAY LEFT' : 'DAYS LEFT'}
                      </div>
                      <div
                        style={{ color: palette.muted }}
                        className="font-mono text-[9px] tracking-wider tabular-nums mt-0.5 truncate"
                      >
                        {model.deadlineLabel}
                      </div>
                    </div>
                  </div>

                  <h3 className="mt-2 font-display text-[17px] font-semibold leading-[1.2] tracking-tight line-clamp-2 text-balance">
                    {model.goalName}
                  </h3>

                  {model.conflictNote && (
                    <p
                      style={{ color: palette.accent }}
                      className="mt-1 text-[9px] font-semibold leading-tight"
                    >
                      {model.conflictNote}
                    </p>
                  )}
                </div>

                {model.isReady && model.stations.length > 0 ? (
                  <>
                    {/* Subtle Vertical Milestone Journey */}
                    <div className="my-auto py-1">
                      <ul className="relative space-y-1.5">
                        {model.stations.map((station, idx) => {
                          const isLast = idx === model.stations.length - 1;
                          const isDone = station.state === 'done';
                          const isCurrent = station.state === 'current';
                          const isDest = station.state === 'destination';

                          return (
                            <li key={station.id} className="relative pl-5">
                              {!isLast && (
                                <span
                                  aria-hidden="true"
                                  style={{
                                    backgroundColor: isDone ? palette.railActive : palette.railIdle,
                                  }}
                                  className={`absolute left-[4.5px] top-2.5 bottom-[-7px] ${
                                    isDone ? 'w-[1.5px]' : 'w-px'
                                  }`}
                                />
                              )}

                              {isCurrent ? (
                                <span
                                  aria-hidden="true"
                                  style={{ backgroundColor: palette.accentHalo }}
                                  className="absolute left-0 top-1.5 w-[10px] h-[10px] rounded-full flex items-center justify-center"
                                >
                                  <span
                                    style={{ backgroundColor: palette.accent }}
                                    className="w-[4.5px] h-[4.5px] rounded-full"
                                  />
                                </span>
                              ) : isDone ? (
                                <span
                                  aria-hidden="true"
                                  style={{ backgroundColor: palette.done }}
                                  className="absolute left-[1.5px] top-[5px] w-[7px] h-[7px] rounded-full"
                                />
                              ) : isDest ? (
                                <span
                                  aria-hidden="true"
                                  style={{ backgroundColor: palette.accent }}
                                  className="absolute left-[1.5px] top-[5px] w-[7px] h-[7px] rotate-45"
                                />
                              ) : (
                                <span
                                  aria-hidden="true"
                                  style={{ backgroundColor: palette.subtle }}
                                  className="absolute left-[2.5px] top-[6px] w-[4.5px] h-[4.5px] rounded-full"
                                />
                              )}

                              {isCurrent ? (
                                <div
                                  style={{
                                    backgroundColor: palette.currentTint,
                                    borderColor: palette.currentBorder,
                                  }}
                                  className="rounded-lg border px-2.5 py-1.5 backdrop-blur-xs"
                                >
                                  <div className="flex items-baseline justify-between gap-2">
                                    <span className="font-display text-[10.5px] font-semibold leading-tight truncate">
                                      {station.shortLabel}
                                    </span>
                                    <span
                                      style={{ color: palette.accent }}
                                      className="font-mono text-[8px] font-medium shrink-0 tabular-nums"
                                    >
                                      {station.targetDate}
                                    </span>
                                  </div>
                                  {station.topicsPreview && (
                                    <div
                                      style={{ color: palette.muted }}
                                      className="mt-0.5 text-[8.5px] leading-tight line-clamp-1"
                                    >
                                      {station.topicsPreview}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-baseline justify-between gap-2 leading-tight py-[1px]">
                                  <span
                                    style={{ color: isDest ? palette.ink : palette.muted }}
                                    className={`truncate ${
                                      isDest
                                        ? 'font-display font-semibold text-[10.5px]'
                                        : 'text-[10px]'
                                    }`}
                                  >
                                    {isDest ? 'Exam Day' : station.shortLabel}
                                  </span>
                                  {isDone ? (
                                    <span
                                      style={{ color: palette.done }}
                                      className="text-[8.5px] font-semibold shrink-0"
                                    >
                                      Done
                                    </span>
                                  ) : isDest ? (
                                    <span
                                      style={{ color: palette.accent }}
                                      className="font-mono text-[8.5px] font-medium shrink-0 tabular-nums"
                                    >
                                      {station.targetDate}
                                    </span>
                                  ) : null}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Short Next Action + Motivational Line */}
                    <div className="pt-1">
                      <div
                        style={{ backgroundColor: palette.rule }}
                        className="w-7 h-px mb-1.5"
                      />
                      {model.nextAction && (
                        <>
                          <div
                            style={{ color: palette.accent }}
                            className="font-mono text-[7.5px] font-semibold tracking-wider uppercase"
                          >
                            NEXT ACTION
                          </div>
                          <p className="mt-0.5 text-[9.5px] font-medium leading-snug line-clamp-3">
                            {model.nextAction}
                          </p>
                        </>
                      )}
                      <p
                        style={{ color: palette.subtle }}
                        className="mt-1.5 text-[9px] font-medium leading-tight"
                      >
                        {meta.closingLine}
                      </p>
                    </div>
                  </>
                ) : (
                  /* Serene pure artwork preview when no route is generated yet */
                  <div className="mt-auto pb-2">
                    <div
                      style={{ backgroundColor: palette.rule }}
                      className="w-7 h-px mb-2"
                    />
                    <p
                      style={{ color: palette.muted }}
                      className="text-[9.5px] font-medium leading-tight"
                    >
                      {meta.closingLine}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom OS Controls + Home-Bar Safe Zone */}
              <div className="relative z-10 h-[7.5%] flex flex-col justify-end shrink-0">
                {showClockGuide && (
                  <div className="flex items-center justify-between px-3 mb-1.5 opacity-55 pointer-events-none">
                    <span
                      aria-hidden="true"
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        palette.isLight ? 'bg-black/15 text-black' : 'bg-white/15 text-white'
                      }`}
                    >
                      <Flashlight className="w-3 h-3" />
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        palette.isLight ? 'bg-black/15 text-black' : 'bg-white/15 text-white'
                      }`}
                    >
                      <Camera className="w-3 h-3" />
                    </span>
                  </div>
                )}
                <div className="flex justify-center pb-0.5">
                  <div
                    aria-hidden="true"
                    className={`w-22 h-1 rounded-full ${
                      palette.isLight ? 'bg-black/25' : 'bg-white/30'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Studio Controls Column: 4 Visual Artwork Theme Cards + Download Controls */}
        <div className="sm:col-span-5 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="font-mono text-xs text-[#6B6E76] tracking-wide">
                Artwork theme
              </span>
              <label className="inline-flex items-center gap-1.5 text-xs text-[#5A5D66] hover:text-[#141518] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showClockGuide}
                  onChange={onToggleClockGuide}
                  className="w-3.5 h-3.5 rounded border-[#141518]/30 text-[#141518] focus:ring-[#141518]"
                />
                <span>Clock overlay</span>
              </label>
            </div>

            <div
              role="group"
              aria-label="Wallpaper theme"
              className="grid grid-cols-2 sm:grid-cols-1 gap-2.5"
            >
              {WALLPAPER_THEMES.map((item) => {
                const active = item.id === theme;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onThemeChange(item.id)}
                    className={`group flex items-center gap-3 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-white border-[#141518] shadow-xs'
                        : 'bg-[#FAF9F6] border-[#141518]/12 hover:bg-white hover:border-[#141518]/30'
                    }`}
                  >
                    <div className="w-11 h-16 rounded-lg overflow-hidden shrink-0 bg-[#141518] ring-1 ring-black/10">
                      <img
                        src={THEME_ARTWORK_URLS[item.id]}
                        alt=""
                        aria-hidden="true"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-xs font-semibold text-[#141518] truncate">
                        {item.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#5A5D66] truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#141518]/12 space-y-2">
            {needsRegenerate && (
              <button
                type="button"
                onClick={onRegenerateWallpaper}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#9A3412] bg-[#FAF3E1] border border-[#DFC994] hover:bg-[#F4E9CC] rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Regenerate Wallpaper</span>
              </button>
            )}

            <button
              type="button"
              disabled={!canDownload}
              onClick={onDownloadPhonePng}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-[#FAF9F6] bg-[#141518] hover:bg-[#272930] disabled:bg-[#E2DFD7] disabled:text-[#888B92] disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141518]"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Download Wallpaper (PNG)</span>
            </button>

            <button
              type="button"
              disabled={!canDownload}
              onClick={onDownloadDesktopPng}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-[#5A5D66] hover:text-[#141518] bg-[#FAF9F6] border border-[#141518]/15 hover:bg-white disabled:opacity-45 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Desktop Wallpaper (16:9 PNG)</span>
            </button>

            <p className="pt-0.5 text-[11px] font-mono text-[#6B6E76] text-center">
              Exports crisp 2160 × 4560 PNG
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
