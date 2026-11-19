import {
  GapAnalysis,
  LockScreenSummary,
  Milestone,
  PlannerConfig,
  STAGE_LABELS,
  StudyDaySlot,
  StudyPlanResult,
  SyllabusTopic,
} from './types';

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseIsoDate(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

export function formatIsoDate(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatHumanDate(dateStr: string): string {
  const dt = parseIsoDate(dateStr);
  if (!dt) return dateStr;
  return `${dt.getUTCDate()} ${MONTH_NAMES[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

export function formatShortDate(dateStr: string): string {
  const dt = parseIsoDate(dateStr);
  if (!dt) return dateStr;
  return `${dt.getUTCDate()} ${MONTH_NAMES[dt.getUTCMonth()]}`;
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

/**
 * Computes available study days from startDate (inclusive) up to the day
 * BEFORE deadlineDate (exam day is reserved for taking the exam).
 */
export function computeStudyDays(config: PlannerConfig): StudyDaySlot[] {
  const start = parseIsoDate(config.startDate);
  const deadline = parseIsoDate(config.deadlineDate);
  if (!start || !deadline || start >= deadline) return [];

  const unavailableSet = new Set(config.unavailableDates);
  const unavailableWeekdays = new Set(config.unavailableWeekdays);
  const slots: StudyDaySlot[] = [];

  const cursor = new Date(start.getTime());
  while (cursor < deadline) {
    const iso = formatIsoDate(cursor);
    const dayIdx = cursor.getUTCDay();
    const isWeekend = dayIdx === 0 || dayIdx === 6;
    const isUnavailable = unavailableSet.has(iso) || unavailableWeekdays.has(dayIdx);

    if (!isUnavailable) {
      const hours = isWeekend ? config.weekendHours : config.weekdayHours;
      if (hours > 0) {
        slots.push({
          date: iso,
          weekday: WEEKDAY_NAMES[dayIdx],
          availableHours: round1(hours),
        });
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return slots;
}

function getTopicDisplayName(topic: SyllabusTopic): string {
  return topic.chapter ? `${topic.chapter}: ${topic.name}` : topic.name;
}

function getTopicHours(topic: SyllabusTopic, defaultHoursPerTopic: number): number {
  if (topic.status === 'completed') return 0;
  const base = topic.estimatedHours ?? defaultHoursPerTopic;
  if (topic.status === 'in_progress') {
    return round1(Math.max(0.5, base * 0.6));
  }
  return round1(Math.max(0.5, base));
}

function importanceRank(topic: SyllabusTopic): number {
  if (topic.importance === 'high') return 3;
  if (topic.importance === 'medium') return 2;
  if (topic.importance === 'low') return 1;
  return 0;
}

function priorityScore(topic: SyllabusTopic): number {
  // Strictly uses user-supplied flags only. Never invents importance.
  let score = 0;
  if (topic.isWeak) score += 100;
  score += importanceRank(topic) * 20;
  if (topic.status === 'unfinished') score += 5;
  if (topic.status === 'not_provided') score += 4;
  if (topic.status === 'in_progress') score += 2;
  return score;
}

interface DayCursorAllocation {
  startDate: string;
  endDate: string;
  targetDateLabel: string;
}

/**
 * Maps the 6 stages onto real studyDays:
 * - Stages 1–3 (Audit, Learning, Completion) start immediately on the first study day.
 * - Stages 4–6 (Revision, Mock Tests, Final Exam Prep) are anchored backward from the final study day before the exam.
 * - When surplus buffer exists, it naturally sits between finishing the syllabus (Stage 3) and starting Revision (Stage 4).
 * - When over capacity (gap), all 6 stages map proportionally across available study days while preserving exact required hours in the plan.
 */
function mapHoursToBackwardWindows(
  studyDays: StudyDaySlot[],
  stageHours: number[]
): DayCursorAllocation[] {
  const totalAvailable = studyDays.reduce((acc, d) => acc + d.availableHours, 0);
  const totalPlanned = stageHours.reduce((acc, h) => acc + h, 0);

  if (studyDays.length === 0) {
    return stageHours.map(() => ({
      startDate: '',
      endDate: '',
      targetDateLabel: 'No study days available',
    }));
  }

  const dayBounds: { startH: number; endH: number; date: string }[] = [];
  let running = 0;
  for (const day of studyDays) {
    dayBounds.push({
      startH: running,
      endH: running + day.availableHours,
      date: day.date,
    });
    running += day.availableHours;
  }

  const findDateAtHour = (hourPos: number, preferEnd: boolean): string => {
    const clamped = Math.max(0, Math.min(totalAvailable, hourPos));
    for (let i = 0; i < dayBounds.length; i++) {
      const b = dayBounds[i];
      if (preferEnd ? clamped <= b.endH + 0.001 : clamped < b.endH - 0.001) {
        return b.date;
      }
    }
    return dayBounds[dayBounds.length - 1].date;
  };

  const toAllocation = (startH: number, span: number): DayCursorAllocation => {
    const sDate = findDateAtHour(startH, false);
    const eDate = span <= 0.05 ? sDate : findDateAtHour(startH + span, true);
    const label =
      sDate === eDate
        ? formatShortDate(sDate)
        : `${formatShortDate(sDate)} → ${formatShortDate(eDate)}`;
    return {
      startDate: sDate,
      endDate: eDate,
      targetDateLabel: label,
    };
  };

  // Over-capacity: scale positions proportionally across the full timeline
  if (totalPlanned > totalAvailable && totalAvailable > 0) {
    const scale = totalAvailable / totalPlanned;
    let cursor = 0;
    return stageHours.map((h) => {
      const span = h * scale;
      const alloc = toAllocation(cursor, span);
      cursor += span;
      return alloc;
    });
  }

  // Fits within capacity:
  // Front-load Stages 1–3 from startDate; back-anchor Stages 4–6 ending at totalAvailable
  const frontHours = stageHours.slice(0, 3);
  const backHours = stageHours.slice(3);

  const frontAllocs: DayCursorAllocation[] = [];
  let frontCursor = 0;
  for (const h of frontHours) {
    frontAllocs.push(toAllocation(frontCursor, h));
    frontCursor += h;
  }

  const backTotal = backHours.reduce((acc, h) => acc + h, 0);
  let backCursor = Math.max(frontCursor, totalAvailable - backTotal);
  const backAllocs: DayCursorAllocation[] = [];
  for (const h of backHours) {
    backAllocs.push(toAllocation(backCursor, h));
    backCursor += h;
  }

  return [...frontAllocs, ...backAllocs];
}

function buildMockCondition(examFormat: string): {
  condition: string;
  nextAction: string;
} {
  if (!examFormat || examFormat.trim().toUpperCase() === 'UNKNOWN') {
    return {
      condition:
        'Exam format is UNKNOWN: confirm official format/marking scheme and complete 2 timed mixed-format practice sets with 100% of errors logged and re-solved.',
      nextAction:
        'Verify your official exam format (question types and duration), then start a 45-minute timed mixed drill on your highest-priority weak topics.',
    };
  }
  return {
    condition: `Complete timed ${examFormat} practice sets covering all syllabus topics, review every mistake in an error log, and re-solve missed items cleanly.`,
    nextAction: `Set a timer matching your ${examFormat} conditions and complete the first full practice section without notes.`,
  };
}

export function generateStudyPlan(
  topics: SyllabusTopic[],
  config: PlannerConfig
): StudyPlanResult {
  const validationErrors: string[] = [];

  const startDt = parseIsoDate(config.startDate);
  const deadlineDt = parseIsoDate(config.deadlineDate);

  if (!startDt) validationErrors.push('Start date must be a valid date (YYYY-MM-DD).');
  if (!deadlineDt) validationErrors.push('Target exam deadline must be a valid date (YYYY-MM-DD).');
  if (startDt && deadlineDt && startDt >= deadlineDt) {
    validationErrors.push('Target exam deadline must be after the start date.');
  }
  if (topics.length === 0) {
    validationErrors.push('Provide at least one syllabus chapter or topic to build a plan.');
  }
  if (config.weekdayHours < 0 || config.weekendHours < 0) {
    validationErrors.push('Available study hours cannot be negative.');
  }
  if (config.weekdayHours === 0 && config.weekendHours === 0) {
    validationErrors.push('Available study hours must be greater than 0 on weekdays or weekends.');
  }
  if (config.defaultHoursPerTopic <= 0) {
    validationErrors.push('Default hours per topic must be greater than 0.');
  }

  const studyDays = computeStudyDays(config);
  if (validationErrors.length === 0 && studyDays.length === 0) {
    validationErrors.push(
      'No available study days remain between the start date and exam deadline after excluding unavailable days.'
    );
  }

  const daysRemaining =
    startDt && deadlineDt
      ? Math.max(0, Math.round((deadlineDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

  if (validationErrors.length > 0) {
    const emptyGap: GapAnalysis = {
      hasGap: false,
      totalAvailableHours: 0,
      totalRequiredHours: 0,
      gapHours: 0,
      surplusHours: 0,
      auditHours: 0,
      learningHoursNeeded: 0,
      reservedRevisionHours: 0,
      reservedMockHours: 0,
      finalPrepHours: 0,
      additionalDailyHoursNeeded: 0,
      explanation: validationErrors[0],
      prioritySuggestions: [],
    };
    const emptySummary: LockScreenSummary = {
      deadlineLabel: formatHumanDate(config.deadlineDate),
      daysRemaining,
      studyDaysAvailable: studyDays.length,
      statusLine: 'Action required: complete planner inputs',
      activeStage: 'Awaiting valid inputs',
      nextMilestoneDate: '—',
      focusTopics: [],
      oneNextAction: validationErrors[0],
      plainText: `ROUTE TO DONE | Exam: ${formatHumanDate(config.deadlineDate)}\nAction needed: ${validationErrors[0]}`,
    };
    return {
      isValid: false,
      validationErrors,
      studyDays,
      milestones: [],
      gapAnalysis: emptyGap,
      lockScreenSummary: emptySummary,
      markdownExport: '',
    };
  }

  const totalAvailableHours = round1(
    studyDays.reduce((acc, d) => acc + d.availableHours, 0)
  );

  // Partition topics strictly based on user-provided statuses & priority tags
  const completedTopics = topics.filter((t) => t.status === 'completed');
  const activeTopics = topics.filter((t) => t.status !== 'completed');

  const unverifiedTopics = topics.filter((t) => t.status === 'not_provided');

  // Stage 2 (Learning Unfinished Topics): Weak, High-Importance, or Unfinished/Not-Provided topics
  // Stage 3 (Completing the Syllabus): Remaining In-Progress and standard-priority unfinished topics
  const sortedActive = [...activeTopics].sort((a, b) => priorityScore(b) - priorityScore(a));

  const priorityLearningTopics = sortedActive.filter(
    (t) => t.isWeak || t.importance === 'high' || t.status === 'unfinished' || t.status === 'not_provided'
  );
  // Split cleanly: priority weak/important/core unfinished go to Stage 2; remaining unfinished/in-progress go to Stage 3
  let stage2Topics: SyllabusTopic[] = [];
  let stage3Topics: SyllabusTopic[] = [];

  if (sortedActive.length === 0) {
    stage2Topics = [];
    stage3Topics = [];
  } else if (sortedActive.length === 1) {
    stage2Topics = sortedActive;
    stage3Topics = [];
  } else {
    const prioritized = sortedActive.filter((t) => t.isWeak || t.importance === 'high');
    const inProgress = sortedActive.filter((t) => t.status === 'in_progress' && !t.isWeak && t.importance !== 'high');
    const others = sortedActive.filter(
      (t) => !t.isWeak && t.importance !== 'high' && t.status !== 'in_progress'
    );

    if (prioritized.length > 0 && (inProgress.length > 0 || others.length > 0)) {
      stage2Topics = prioritized;
      stage3Topics = [...others, ...inProgress];
    } else {
      const splitIdx = Math.ceil(sortedActive.length * 0.6);
      stage2Topics = sortedActive.slice(0, splitIdx);
      stage3Topics = sortedActive.slice(splitIdx);
    }
  }

  // Calculate realistic hour budgets for each of the 6 stages
  const avgDailyHours = round1(totalAvailableHours / studyDays.length);
  const auditHours = round1(Math.min(Math.max(1.0, topics.length * 0.15), Math.max(1.5, avgDailyHours)));

  const stage2Hours = round1(
    stage2Topics.reduce((sum, t) => sum + getTopicHours(t, config.defaultHoursPerTopic), 0)
  );
  const stage3Hours = round1(
    stage3Topics.reduce((sum, t) => sum + getTopicHours(t, config.defaultHoursPerTopic), 0)
  );
  const learningHoursNeeded = round1(stage2Hours + stage3Hours);

  // Reserve realistic time for Revision, Mock Tests, and Final Exam Prep
  // Scales realistically with total syllabus scope (never zero, even if learning is small)
  const syllabusStudyBase = Math.max(
    learningHoursNeeded,
    topics.length * config.defaultHoursPerTopic * 0.5
  );
  const reservedRevisionHours = round1(Math.max(2.0, syllabusStudyBase * 0.25));
  const reservedMockHours = round1(Math.max(2.0, syllabusStudyBase * 0.2));
  const finalPrepHours = round1(Math.min(Math.max(1.5, avgDailyHours), 4.0));

  const totalRequiredHours = round1(
    auditHours +
      learningHoursNeeded +
      reservedRevisionHours +
      reservedMockHours +
      finalPrepHours
  );

  const gapHours = round1(Math.max(0, totalRequiredHours - totalAvailableHours));
  const surplusHours = round1(Math.max(0, totalAvailableHours - totalRequiredHours));
  const hasGap = gapHours > 0;
  const additionalDailyHoursNeeded =
    hasGap && studyDays.length > 0 ? round1(gapHours / studyDays.length) : 0;

  // Build non-fabricated Gap Analysis & Priority Suggestions
  const weakOrImportantNames = sortedActive
    .filter((t) => t.isWeak || t.importance === 'high')
    .map(getTopicDisplayName);
  const unflaggedNames = sortedActive
    .filter((t) => !t.isWeak && t.importance !== 'high')
    .map(getTopicDisplayName);

  const prioritySuggestions: string[] = [];
  if (hasGap) {
    prioritySuggestions.push(
      `Capacity math: ${totalRequiredHours}h required vs ${totalAvailableHours}h available (${gapHours}h deficit across ${studyDays.length} study days). Adding +${additionalDailyHoursNeeded}h per study day closes the gap without compressing coverage.`
    );
    if (config.unavailableDates.length > 0 || config.unavailableWeekdays.length > 0) {
      prioritySuggestions.push(
        `Reclaiming unavailable days (currently ${config.unavailableDates.length} specific dates and ${config.unavailableWeekdays.length} weekly off-days) increases available hours without extending daily sessions.`
      );
    }
    if (weakOrImportantNames.length > 0) {
      prioritySuggestions.push(
        `Protect full mastery hours for explicitly flagged weak/important topics (${weakOrImportantNames.slice(0, 4).join(', ')}${weakOrImportantNames.length > 4 ? ` +${weakOrImportantNames.length - 4} more` : ''}).`
      );
    }
    if (unflaggedNames.length > 0) {
      prioritySuggestions.push(
        `Do not drop remaining topics (${unflaggedNames.slice(0, 4).join(', ')}${unflaggedNames.length > 4 ? ` +${unflaggedNames.length - 4} more` : ''}); switch them to targeted summary + core problem coverage instead of full deep-dive reading.`
      );
    }
    prioritySuggestions.push(
      `Protect the ${reservedRevisionHours}h Revision and ${reservedMockHours}h Mock Test reserve—cutting practice below that threshold increases recall failure on exam day.`
    );
  }

  const gapAnalysis: GapAnalysis = {
    hasGap,
    totalAvailableHours,
    totalRequiredHours,
    gapHours,
    surplusHours,
    auditHours,
    learningHoursNeeded,
    reservedRevisionHours,
    reservedMockHours,
    finalPrepHours,
    additionalDailyHoursNeeded,
    explanation: hasGap
      ? `Your plan requires ${totalRequiredHours}h (${learningHoursNeeded}h topic study + ${round1(
          reservedRevisionHours + reservedMockHours
        )}h reserved revision & mocks + ${round1(
          auditHours + finalPrepHours
        )}h audit & final prep), which exceeds your ${totalAvailableHours}h available capacity by ${gapHours}h. No topics have been removed.`
      : `Your ${totalAvailableHours}h available capacity fits all ${totalRequiredHours}h required across all 6 stages, leaving a ${surplusHours}h buffer for spillover or deeper weak-topic practice.`,
    prioritySuggestions,
  };

  // Map stages backward onto actual study days
  const stageHourArray = [
    auditHours,
    stage2Hours,
    stage3Hours,
    reservedRevisionHours,
    reservedMockHours,
    finalPrepHours,
  ];
  const dateWindows = mapHoursToBackwardWindows(studyDays, stageHourArray);

  const allTopicNames = topics.map(getTopicDisplayName);
  const weakFirstTopicNames = [
    ...sortedActive.filter((t) => t.isWeak || t.importance === 'high'),
    ...sortedActive.filter((t) => !t.isWeak && t.importance !== 'high'),
    ...completedTopics,
  ].map(getTopicDisplayName);

  const mockCopy = buildMockCondition(config.examFormat);

  const stage1TopicList =
    unverifiedTopics.length > 0
      ? unverifiedTopics.map(getTopicDisplayName)
      : allTopicNames;

  const firstStage2Name =
    stage2Topics.length > 0
      ? getTopicDisplayName(stage2Topics[0])
      : allTopicNames[0] ?? 'first syllabus topic';

  const firstStage3Name =
    stage3Topics.length > 0
      ? getTopicDisplayName(stage3Topics[0])
      : 'remaining syllabus topics';

  const firstRevisionTopic = weakFirstTopicNames[0] ?? 'core topics';

  const milestones: Milestone[] = [
    {
      id: 'ms-1-audit',
      order: 1,
      stageId: 'audit',
      stageName: STAGE_LABELS.audit,
      targetDate: dateWindows[0].targetDateLabel,
      startDate: dateWindows[0].startDate,
      endDate: dateWindows[0].endDate,
      exactTopics: stage1TopicList,
      estimatedHours: auditHours,
      completionCondition:
        unverifiedTopics.length > 0
          ? `Every topic's true completion status and weak areas are verified (${unverifiedTopics.length} currently marked "Not provided"), with a baseline diagnostic check logged.`
          : `All ${topics.length} syllabus topics have verified status and baseline diagnostic gaps documented.`,
      nextAction: `Review each topic in Step 2 and mark its real completion status and any weak areas (${auditHours}h max).`,
      priorityNote:
        unverifiedTopics.length > 0
          ? `${unverifiedTopics.length} topic(s) unverified`
          : 'Baseline verification',
      isOverCapacity: false,
    },
    {
      id: 'ms-2-learning',
      order: 2,
      stageId: 'learning',
      stageName: STAGE_LABELS.learning,
      targetDate: dateWindows[1].targetDateLabel,
      startDate: dateWindows[1].startDate,
      endDate: dateWindows[1].endDate,
      exactTopics:
        stage2Topics.length > 0
          ? stage2Topics.map(getTopicDisplayName)
          : ['No unfinished priority topics remaining'],
      estimatedHours: stage2Hours,
      completionCondition:
        stage2Topics.length > 0
          ? `Complete core study notes and achieve ≥75% accuracy on practice questions for all ${stage2Topics.length} prioritised topic(s).`
          : 'All topics already marked completed; confirm notes are accessible for revision.',
      nextAction:
        stage2Topics.length > 0
          ? `Open "${firstStage2Name}" and complete a focused 50-minute active study + practice block.`
          : 'Proceed directly to Revision stage.',
      priorityNote:
        weakOrImportantNames.length > 0
          ? 'Prioritises user-marked weak & weighted topics'
          : 'Order preserved (no weightage invented)',
      isOverCapacity: hasGap && stage2Hours > 0,
    },
    {
      id: 'ms-3-completion',
      order: 3,
      stageId: 'completion',
      stageName: STAGE_LABELS.completion,
      targetDate: dateWindows[2].targetDateLabel,
      startDate: dateWindows[2].startDate,
      endDate: dateWindows[2].endDate,
      exactTopics:
        stage3Topics.length > 0
          ? stage3Topics.map(getTopicDisplayName)
          : ['All syllabus topics covered in Stage 2'],
      estimatedHours: stage3Hours,
      completionCondition:
        stage3Topics.length > 0
          ? `100% of remaining ${stage3Topics.length} topic(s) have concise summary notes and solved baseline exercises with zero unstarted chapters.`
          : 'Confirm zero unstarted topics remain across the entire syllabus.',
      nextAction:
        stage3Topics.length > 0
          ? `Close remaining gaps in "${firstStage3Name}" by summarizing key concepts and solving 5–10 representative problems.`
          : 'Verify every topic in Syllabus Audit is ready for full Revision.',
      priorityNote: hasGap
        ? 'Over capacity: apply triage depth without dropping topics'
        : 'Closes 100% syllabus coverage',
      isOverCapacity: hasGap && stage3Hours > 0,
    },
    {
      id: 'ms-4-revision',
      order: 4,
      stageId: 'revision',
      stageName: STAGE_LABELS.revision,
      targetDate: dateWindows[3].targetDateLabel,
      startDate: dateWindows[3].startDate,
      endDate: dateWindows[3].endDate,
      exactTopics: weakFirstTopicNames,
      estimatedHours: reservedRevisionHours,
      completionCondition: `Active-recall review completed across all ${topics.length} topic(s), with weak/flagged items reviewed twice from memory.`,
      nextAction: `Run a closed-book recall sheet for "${firstRevisionTopic}", then check gaps against your notes.`,
      priorityNote: 'Reserved realistic revision block',
      isOverCapacity: hasGap,
    },
    {
      id: 'ms-5-mocks',
      order: 5,
      stageId: 'mocks',
      stageName: STAGE_LABELS.mocks,
      targetDate: dateWindows[4].targetDateLabel,
      startDate: dateWindows[4].startDate,
      endDate: dateWindows[4].endDate,
      exactTopics: allTopicNames,
      estimatedHours: reservedMockHours,
      completionCondition: mockCopy.condition,
      nextAction: mockCopy.nextAction,
      priorityNote:
        config.examFormat.toUpperCase() === 'UNKNOWN'
          ? 'Exam format UNKNOWN — verify before timed simulation'
          : `Adapted for ${config.examFormat}`,
      isOverCapacity: hasGap,
    },
    {
      id: 'ms-6-final-prep',
      order: 6,
      stageId: 'final_prep',
      stageName: STAGE_LABELS.final_prep,
      targetDate: dateWindows[5].targetDateLabel,
      startDate: dateWindows[5].startDate,
      endDate: dateWindows[5].endDate,
      exactTopics:
        weakOrImportantNames.length > 0
          ? weakOrImportantNames
          : ['Full-syllabus error log & summary sheets'],
      estimatedHours: finalPrepHours,
      completionCondition:
        'Error log cleared, formula/concept sheet reviewed lightly (no new cramming), exam logistics packed, and 7–8h sleep protected before exam day.',
      nextAction:
        'Do one 45-minute light pass over your error log and stop study early to protect sleep before exam day.',
      priorityNote: `Anchored before exam day (${formatHumanDate(config.deadlineDate)})`,
      isOverCapacity: false,
    },
  ];

  // Filter out 0h Stage 3 only? NO — prompt asks for all 6 stages; keeping all 6 explicit stages
  // ensures stage completeness and transparent accounting even when stage3Hours === 0.

  const firstActionableMilestone =
    milestones.find((m) => m.estimatedHours > 0) ?? milestones[0];
  const focusTopics = (
    priorityLearningTopics.length > 0 ? priorityLearningTopics : topics
  )
    .slice(0, 3)
    .map(getTopicDisplayName);

  const statusLine = hasGap
    ? `GAP: -${gapHours}h (${totalAvailableHours}h avail / ${totalRequiredHours}h req)`
    : `ON TRACK: ${totalAvailableHours}h avail / ${totalRequiredHours}h req (+${surplusHours}h buffer)`;

  const plainTextLines = [
    `ROUTE TO DONE · EXAM ${formatHumanDate(config.deadlineDate).toUpperCase()} (${daysRemaining}d left)`,
    statusLine,
    `STAGE: ${firstActionableMilestone.stageName} (${firstActionableMilestone.targetDate})`,
    `FOCUS: ${focusTopics.join(' | ')}`,
    `NEXT: ${firstActionableMilestone.nextAction}`,
  ];

  const lockScreenSummary: LockScreenSummary = {
    deadlineLabel: formatHumanDate(config.deadlineDate),
    daysRemaining,
    studyDaysAvailable: studyDays.length,
    statusLine,
    activeStage: firstActionableMilestone.stageName,
    nextMilestoneDate: firstActionableMilestone.targetDate,
    focusTopics,
    oneNextAction: firstActionableMilestone.nextAction,
    plainText: plainTextLines.join('\n'),
  };

  const mdHeader = `| Stage & Milestone | Target Date | Exact Topics | Est. Hours | Measurable Completion Condition | One Next Action |\n| :--- | :--- | :--- | ---: | :--- | :--- |`;
  const mdRows = milestones.map((m) => {
    const topicsCell = m.exactTopics.join(', ').replace(/\|/g, '/');
    const condCell = m.completionCondition.replace(/\|/g, '/');
    const nextCell = m.nextAction.replace(/\|/g, '/');
    return `| ${m.stageName} | ${m.targetDate} | ${topicsCell} | ${m.estimatedHours}h | ${condCell} | ${nextCell} |`;
  });

  const gapMd = hasGap
    ? `\n\n### Capacity Gap Analysis\n${gapAnalysis.explanation}\n${gapAnalysis.prioritySuggestions
        .map((s) => `- ${s}`)
        .join('\n')}`
    : `\n\n### Capacity Check\n${gapAnalysis.explanation}`;

  const markdownExport = `# ROUTE TO DONE — Backward Study Plan\nTarget Deadline: ${formatHumanDate(
    config.deadlineDate
  )} | Exam Format: ${config.examFormat}\n\n${mdHeader}\n${mdRows.join('\n')}${gapMd}\n\n### Lock-Screen Summary\n\`\`\`\n${lockScreenSummary.plainText}\n\`\`\``;

  return {
    isValid: true,
    validationErrors: [],
    studyDays,
    milestones,
    gapAnalysis,
    lockScreenSummary,
    markdownExport,
  };
}
