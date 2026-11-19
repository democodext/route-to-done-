import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { PhoneLockScreenHero } from './components/PhoneLockScreenHero';
import { StepDeadline } from './components/StepDeadline';
import { StepRoute } from './components/StepRoute';
import { StepSyllabus } from './components/StepSyllabus';
import { TopBar } from './components/TopBar';
import { parseSyllabusText } from './engine/parser';
import { generateStudyPlan } from './engine/planner';
import { PlannerConfig, StudyPlanResult, SyllabusTopic } from './engine/types';
import {
  buildWallpaperModel,
  exportCanvasAsPng,
  normalizeTheme,
  renderDesktopWallpaperCanvas,
  renderPhoneWallpaperCanvas,
  WallpaperTheme,
} from './engine/wallpaper';
import { loadThemeArtwork } from './engine/wallpaperArt';

const STORAGE_KEY = 'route_to_done_editorial_v2';

type TopicOverrides = Record<string, Partial<SyllabusTopic>>;

interface PersistedEditorialState {
  goalName: string;
  config: PlannerConfig;
  syllabusText: string;
  topicOverrides: TopicOverrides;
  completedMilestoneIds: string[];
  hasGenerated: boolean;
  theme: WallpaperTheme;
}

function getLocalTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DEFAULT_CONFIG: PlannerConfig = {
  startDate: getLocalTodayIso(),
  deadlineDate: '2026-12-15',
  currentProgressNote: '',
  weekdayHours: 2,
  weekendHours: 2,
  unavailableWeekdays: [],
  unavailableDates: [],
  examFormat: 'UNKNOWN',
  defaultHoursPerTopic: 2.5,
};

function getTopicKey(topic: SyllabusTopic): string {
  return `${topic.chapter ?? ''}::${topic.name}`;
}

function loadInitialState(): PersistedEditorialState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedEditorialState>;
      if (parsed && parsed.config) {
        return {
          goalName: typeof parsed.goalName === 'string' ? parsed.goalName : '',
          config: { ...DEFAULT_CONFIG, ...parsed.config },
          syllabusText: typeof parsed.syllabusText === 'string' ? parsed.syllabusText : '',
          topicOverrides: parsed.topicOverrides ?? {},
          completedMilestoneIds: Array.isArray(parsed.completedMilestoneIds)
            ? parsed.completedMilestoneIds
            : [],
          hasGenerated: Boolean(parsed.hasGenerated),
          theme: normalizeTheme(parsed.theme),
        };
      }
    }
  } catch {
    // Ignore storage read issues
  }

  return {
    goalName: '',
    config: DEFAULT_CONFIG,
    syllabusText: '',
    topicOverrides: {},
    completedMilestoneIds: [],
    hasGenerated: false,
    theme: 'midnight_horizon',
  };
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [goalName, setGoalName] = useState(initial.goalName);
  const [config, setConfig] = useState<PlannerConfig>(initial.config);
  const [syllabusText, setSyllabusText] = useState(initial.syllabusText);
  const [topicOverrides, setTopicOverrides] = useState<TopicOverrides>(initial.topicOverrides);
  const [completedMilestoneIds, setCompletedMilestoneIds] = useState<string[]>(
    initial.completedMilestoneIds
  );
  const [hasGenerated, setHasGenerated] = useState(initial.hasGenerated);
  const [theme, setTheme] = useState<WallpaperTheme>(initial.theme);
  const [showClockGuide, setShowClockGuide] = useState(true);
  const [needsRegenerate, setNeedsRegenerate] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const parsedTopics = useMemo(() => {
    const base = parseSyllabusText(syllabusText);
    return base.map((topic) => {
      const override = topicOverrides[getTopicKey(topic)];
      return override ? { ...topic, ...override } : topic;
    });
  }, [syllabusText, topicOverrides]);

  const [committedPlan, setCommittedPlan] = useState<StudyPlanResult>(() => {
    if (!initial.hasGenerated) {
      return generateStudyPlan([], initial.config);
    }
    const base = parseSyllabusText(initial.syllabusText).map((t) => {
      const o = (initial.topicOverrides ?? {})[getTopicKey(t)];
      return o ? { ...t, ...o } : t;
    });
    return generateStudyPlan(base, initial.config);
  });

  const [committedGoalName, setCommittedGoalName] = useState(initial.goalName);
  const [committedConfig, setCommittedConfig] = useState<PlannerConfig>(initial.config);

  useEffect(() => {
    try {
      const payload: PersistedEditorialState = {
        goalName,
        config,
        syllabusText,
        topicOverrides,
        completedMilestoneIds,
        hasGenerated,
        theme,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota issues
    }
  }, [goalName, config, syllabusText, topicOverrides, completedMilestoneIds, hasGenerated, theme]);

  const markDirty = () => {
    if (hasGenerated) {
      setNeedsRegenerate(true);
    }
  };

  const handleGoalNameChange = (name: string) => {
    setGoalName(name);
    if (hasGenerated) {
      setCommittedGoalName(name);
    }
  };

  const handleConfigChange = (next: PlannerConfig) => {
    setConfig(next);
    markDirty();
  };

  const handleSyllabusTextChange = (next: string) => {
    setSyllabusText(next);
    markDirty();
  };

  const handleAddTopicLine = (chapter: string, topicName: string) => {
    const lines = syllabusText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (chapter) {
      const lastHeader = [...lines].reverse().find((l) => /^#{1,4}\s+/.test(l.trim()));
      const expectedHeader = `# ${chapter}`;
      if (lastHeader?.trim().toLowerCase() !== expectedHeader.toLowerCase()) {
        lines.push(expectedHeader);
      }
    }
    lines.push(topicName);
    setSyllabusText(lines.join('\n'));
    markDirty();
  };

  const handleUpdateTopic = (id: string, patch: Partial<SyllabusTopic>) => {
    const target = parsedTopics.find((t) => t.id === id);
    if (!target) return;
    const key = getTopicKey(target);
    setTopicOverrides((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), ...patch },
    }));
    markDirty();
  };

  const handleRemoveTopic = (target: SyllabusTopic) => {
    const lines = syllabusText.split(/\r?\n/);
    let removed = false;
    const filtered = lines.filter((line) => {
      if (removed) return true;
      const trimmed = line.trim().replace(/^[-*•]\s+/, '').trim();
      const base = trimmed.split('|')[0].replace(/\s*\[[^\]]+\]\s*$/, '').trim();
      if (base === target.name) {
        removed = true;
        return false;
      }
      return true;
    });
    setSyllabusText(filtered.join('\n').trim());
    markDirty();
  };

  const handleGenerateRoute = () => {
    const errors: string[] = [];
    if (!goalName.trim()) {
      errors.push('Enter a goal name in Step 1.');
    }

    const result = generateStudyPlan(parsedTopics, config);
    if (!result.isValid) {
      errors.push(...result.validationErrors);
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setCommittedPlan(result);
    setCommittedGoalName(goalName.trim());
    setCommittedConfig(config);
    setHasGenerated(true);
    setNeedsRegenerate(false);
  };

  const handleToggleMilestone = (id: string) => {
    setCompletedMilestoneIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const activePlan = hasGenerated ? committedPlan : generateStudyPlan([], config);
  const wallpaperModel = useMemo(
    () =>
      buildWallpaperModel(
        hasGenerated ? committedGoalName || goalName : goalName,
        hasGenerated ? committedConfig.startDate : config.startDate,
        hasGenerated ? committedConfig.deadlineDate : config.deadlineDate,
        activePlan,
        completedMilestoneIds
      ),
    [
      hasGenerated,
      committedGoalName,
      goalName,
      committedConfig,
      config.startDate,
      config.deadlineDate,
      activePlan,
      completedMilestoneIds,
    ]
  );

  const canDownload =
    wallpaperModel.isReady &&
    parsedTopics.length > 0 &&
    goalName.trim().length > 0;

  const handleDownloadPhonePng = async () => {
    if (!canDownload) return;
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const artworkImage = await loadThemeArtwork(theme).catch(() => null);
    const canvas = document.createElement('canvas');
    renderPhoneWallpaperCanvas(canvas, wallpaperModel, theme, artworkImage);
    const slug = (wallpaperModel.goalName || 'route-to-done')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    await exportCanvasAsPng(canvas, `${slug || 'route-to-done'}-lockscreen.png`);
  };

  const handleDownloadDesktopPng = async () => {
    if (!canDownload) return;
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const artworkImage = await loadThemeArtwork(theme).catch(() => null);
    const canvas = document.createElement('canvas');
    renderDesktopWallpaperCanvas(canvas, wallpaperModel, theme, artworkImage);
    const slug = (wallpaperModel.goalName || 'route-to-done')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    await exportCanvasAsPng(canvas, `${slug || 'route-to-done'}-desktop.png`);
  };

  return (
    <div id="top" className="min-h-screen bg-[#F4F2ED] text-[#141518] flex flex-col overflow-x-clip">
      <TopBar
        canDownload={canDownload}
        onDownloadWallpaper={handleDownloadPhonePng}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Left column: Luxury Editorial Hero + Three-Step Planner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-8"
          >
            <div className="max-w-xl">
              <h1 className="font-display text-3xl sm:text-[42px] font-bold tracking-tight text-[#141518] text-balance leading-[1.08]">
                Your exam deadline, crafted into a lock-screen route.
              </h1>
              <p className="mt-3 text-base text-[#5A5D66] leading-relaxed">
                Set your target date, enter your real syllabus progress, build an honest backward plan, and export a 2160 × 4560 phone wallpaper.
              </p>
            </div>

            <StepDeadline
              goalName={goalName}
              config={config}
              onGoalNameChange={handleGoalNameChange}
              onConfigChange={handleConfigChange}
            />

            <StepSyllabus
              syllabusText={syllabusText}
              topics={parsedTopics}
              onSyllabusTextChange={handleSyllabusTextChange}
              onAddTopicLine={handleAddTopicLine}
              onUpdateTopic={handleUpdateTopic}
              onRemoveTopic={handleRemoveTopic}
            />

            <StepRoute
              hasGenerated={hasGenerated}
              needsRegenerate={needsRegenerate}
              validationErrors={validationErrors}
              plan={activePlan}
              completedMilestoneIds={completedMilestoneIds}
              onGenerateRoute={handleGenerateRoute}
              onToggleMilestone={handleToggleMilestone}
            />
          </motion.div>

          {/* Right column: Wallpaper Studio Showcase */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <PhoneLockScreenHero
              model={wallpaperModel}
              canDownload={canDownload}
              needsRegenerate={needsRegenerate}
              theme={theme}
              showClockGuide={showClockGuide}
              onThemeChange={setTheme}
              onToggleClockGuide={() => setShowClockGuide((v) => !v)}
              onRegenerateWallpaper={handleGenerateRoute}
              onDownloadPhonePng={handleDownloadPhonePng}
              onDownloadDesktopPng={handleDownloadDesktopPng}
            />
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-[#141518]/10 bg-[#EFECE5] mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#6B6E76]">
          <span>Route to Done — Countdown lock-screen studio</span>
          <span>Saved locally in your browser · Zero invented syllabus data</span>
        </div>
      </footer>
    </div>
  );
}
