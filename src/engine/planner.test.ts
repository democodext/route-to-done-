import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSyllabusText } from './parser';
import { computeStudyDays, generateStudyPlan } from './planner';
import { PlannerConfig } from './types';
import {
  buildWallpaperModel,
  computeDaysRemaining,
  condenseNextAction,
  getThemeMeta,
  getWallpaperPalette,
  normalizeTheme,
  WALLPAPER_HEIGHT,
  WALLPAPER_THEMES,
  WALLPAPER_WIDTH,
} from './wallpaper';

const BASE_TEST_CONFIG: PlannerConfig = {
  startDate: '2026-11-17',
  deadlineDate: '2026-12-15',
  currentProgressNote: '',
  weekdayHours: 2.5,
  weekendHours: 4.5,
  unavailableWeekdays: [0],
  unavailableDates: ['2026-11-26'],
  examFormat: 'UNKNOWN',
  defaultHoursPerTopic: 3.0,
};

test('parser extracts exact topics without inventing weightage, status, or chapters', () => {
  const raw = `
Linear Algebra
Calculus
Thermodynamics [weak, 5h]
`;
  const parsed = parseSyllabusText(raw);
  assert.equal(parsed.length, 3);

  assert.equal(parsed[0].name, 'Linear Algebra');
  assert.equal(parsed[0].chapter, null);
  assert.equal(parsed[0].status, 'not_provided');
  assert.equal(parsed[0].weightage, null);
  assert.equal(parsed[0].importance, 'not_provided');
  assert.equal(parsed[0].isWeak, false);
  assert.equal(parsed[0].estimatedHours, null);

  assert.equal(parsed[2].name, 'Thermodynamics');
  assert.equal(parsed[2].isWeak, true);
  assert.equal(parsed[2].estimatedHours, 5);
  assert.equal(parsed[2].weightage, null);
  assert.equal(parsed[2].status, 'not_provided');
});

test('parser captures explicit chapter headings and explicit metadata only', () => {
  const raw = `
# Unit 1: Mechanics
Kinematics | 4h | weight: 25% | status: completed
Dynamics | weak | status: in-progress
`;
  const parsed = parseSyllabusText(raw);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].chapter, 'Unit 1: Mechanics');
  assert.equal(parsed[0].weightage, '25%');
  assert.equal(parsed[0].importance, 'high');
  assert.equal(parsed[0].status, 'completed');
  assert.equal(parsed[0].estimatedHours, 4);

  assert.equal(parsed[1].chapter, 'Unit 1: Mechanics');
  assert.equal(parsed[1].isWeak, true);
  assert.equal(parsed[1].status, 'in_progress');
  assert.equal(parsed[1].weightage, null);
});

test('computeStudyDays excludes unavailable weekdays and specific dates', () => {
  const days = computeStudyDays({
    ...BASE_TEST_CONFIG,
    startDate: '2026-11-17',
    deadlineDate: '2026-11-24',
    unavailableWeekdays: [0],
    unavailableDates: ['2026-11-19'],
  });
  const dates = days.map((d) => d.date);
  assert.equal(dates.includes('2026-11-22'), false);
  assert.equal(dates.includes('2026-11-19'), false);
  assert.equal(dates.includes('2026-11-24'), false);
  assert.equal(dates.length, 5);
});

test('planner creates all 6 mandatory stages and prioritises weak/weighted topics without dropping any', () => {
  const topics = parseSyllabusText(`
Standard Topic A | 3h | status: unfinished
Critical Weak Topic B | 4h | weak | weight: 30% | status: unfinished
In Progress Topic C | 2h | status: in-progress
`);
  const result = generateStudyPlan(topics, BASE_TEST_CONFIG);
  assert.equal(result.isValid, true);
  assert.equal(result.milestones.length, 6);

  const stageIds = result.milestones.map((m) => m.stageId);
  assert.deepEqual(stageIds, [
    'audit',
    'learning',
    'completion',
    'revision',
    'mocks',
    'final_prep',
  ]);

  const learningMs = result.milestones.find((m) => m.stageId === 'learning')!;
  assert.ok(learningMs.exactTopics.includes('Critical Weak Topic B'));

  const revisionMs = result.milestones.find((m) => m.stageId === 'revision')!;
  assert.equal(revisionMs.exactTopics.length, 3);
});

test('planner detects capacity gap honestly, explains deficit, and suggests priorities without removing topics', () => {
  const topics = parseSyllabusText(`
Thermodynamics | 6h | weak | status: unfinished
Fluid Mechanics | 6h | weak | status: unfinished
Heat Transfer | 5h | status: unfinished
Mass Transfer | 5h | status: unfinished
Reaction Kinetics | 5h | status: unfinished
`);
  const result = generateStudyPlan(topics, {
    ...BASE_TEST_CONFIG,
    weekdayHours: 1.0,
    weekendHours: 1.0,
    unavailableWeekdays: [0, 6],
  });

  assert.equal(result.isValid, true);
  assert.equal(result.gapAnalysis.hasGap, true);
  assert.ok(result.gapAnalysis.gapHours > 0);
  assert.ok(result.gapAnalysis.prioritySuggestions.length >= 3);
  assert.match(result.gapAnalysis.explanation, /No topics have been removed/);

  const mocksMs = result.milestones.find((m) => m.stageId === 'mocks')!;
  assert.equal(mocksMs.exactTopics.length, topics.length);
});

test('empty syllabus returns explicit validation error without fabricating fallback topics', () => {
  const result = generateStudyPlan([], BASE_TEST_CONFIG);
  assert.equal(result.isValid, false);
  assert.ok(result.validationErrors.length > 0);
  assert.equal(result.milestones.length, 0);
});

test('balanced plan anchors Stage 1 on start date and Stage 6 right before exam deadline', () => {
  const topics = parseSyllabusText(`
Topic One | 3h | status: unfinished
Topic Two | 3h | status: in-progress
`);
  const result = generateStudyPlan(topics, BASE_TEST_CONFIG);

  assert.equal(result.isValid, true);
  assert.equal(result.gapAnalysis.hasGap, false);
  assert.equal(result.milestones[0].startDate, '2026-11-17');
  assert.equal(result.milestones[5].endDate, '2026-12-14');
});

test('countdown calculation computes exact days remaining', () => {
  assert.equal(computeDaysRemaining('2026-11-17', '2026-12-15'), 28);
  assert.equal(computeDaysRemaining('2026-12-14', '2026-12-15'), 1);
  assert.equal(computeDaysRemaining('2026-12-20', '2026-12-15'), 0);
});

test('buildWallpaperModel builds metro stations with Destination terminus and advances active station when completed', () => {
  const topics = parseSyllabusText(`
Organic Mechanisms | 4h | weak | status: unfinished
Stereochemistry | 3h | status: in-progress
`);
  const plan = generateStudyPlan(topics, BASE_TEST_CONFIG);

  const initialModel = buildWallpaperModel(
    'Organic Chemistry Final',
    '2026-11-17',
    '2026-12-15',
    plan,
    []
  );

  assert.equal(initialModel.isReady, true);
  assert.equal(initialModel.goalName, 'Organic Chemistry Final');
  assert.equal(initialModel.daysRemaining, 28);
  assert.equal(initialModel.deadlineLabel, '15 DEC 2026');
  assert.equal(initialModel.shortDeadlineLabel, '15 Dec');
  assert.equal(initialModel.stations.length, 7);
  assert.equal(initialModel.stations[0].state, 'current');
  assert.equal(initialModel.stations[0].statusTag, 'Current');
  assert.equal(initialModel.stations[6].state, 'destination');
  assert.equal(initialModel.stations[6].shortLabel, 'Exam Day');
  assert.equal(initialModel.stations[6].targetDate, '15 Dec');
  assert.equal(initialModel.currentStation?.title, 'Syllabus Audit');
  assert.ok(initialModel.nextAction && initialModel.nextAction.length > 0);

  const advancedModel = buildWallpaperModel(
    'Organic Chemistry Final',
    '2026-11-17',
    '2026-12-15',
    plan,
    ['ms-1-audit']
  );
  assert.equal(advancedModel.stations[0].state, 'done');
  assert.equal(advancedModel.stations[0].statusTag, 'Completed');
  assert.equal(advancedModel.stations[1].state, 'current');
  assert.equal(advancedModel.currentStation?.title, 'Core Topics');
});

test('wallpaper themes, 2160x4560 dimensions, normalization, and next-action condensation', () => {
  assert.equal(WALLPAPER_WIDTH, 2160);
  assert.equal(WALLPAPER_HEIGHT, 4560);

  assert.deepEqual(
    WALLPAPER_THEMES.map((t) => t.id),
    ['midnight_horizon', 'solar', 'obsidian', 'dreamscape']
  );

  const midnightHorizon = getThemeMeta('midnight_horizon');
  const solar = getThemeMeta('solar');
  const obsidian = getThemeMeta('obsidian');
  const dreamscape = getThemeMeta('dreamscape');

  assert.equal(midnightHorizon.name, 'Midnight Horizon');
  assert.equal(solar.name, 'Solar');
  assert.equal(obsidian.name, 'Obsidian');
  assert.equal(dreamscape.name, 'Dreamscape');
  assert.ok(
    midnightHorizon.closingLine &&
      solar.closingLine &&
      obsidian.closingLine &&
      dreamscape.closingLine
  );

  assert.equal(normalizeTheme('midnight'), 'midnight_horizon');
  assert.equal(normalizeTheme('sunrise'), 'solar');
  assert.equal(normalizeTheme('paper'), 'solar');
  assert.equal(normalizeTheme('obsidian'), 'obsidian');
  assert.equal(normalizeTheme('aurora'), 'dreamscape');

  const solarPalette = getWallpaperPalette('solar');
  const obsidianPalette = getWallpaperPalette('obsidian');
  const dreamscapePalette = getWallpaperPalette('dreamscape');
  assert.equal(solarPalette.isLight, true);
  assert.equal(obsidianPalette.isLight, false);
  assert.notEqual(solarPalette.ink, obsidianPalette.ink);
  assert.notEqual(obsidianPalette.accent, dreamscapePalette.accent);

  const longAction =
    'Spend 25 minutes auditing every syllabus chapter carefully and writing down all unfinished problem sets before starting deep work.';
  const condensed = condenseNextAction(longAction, 84);
  assert.ok(condensed.length <= 84);
  assert.ok(condensed.endsWith('…'));
});

test('exclusive vs inclusive countdown and study-day counting agree without off-by-one', () => {
  // Exclusive of exam day: Nov 18..Dec 14 = 27 study days and 27 days remaining
  const exclusiveDays = computeDaysRemaining('2026-11-18', '2026-12-15');
  assert.equal(exclusiveDays, 27);

  const studyDays = computeStudyDays({
    ...BASE_TEST_CONFIG,
    startDate: '2026-11-18',
    deadlineDate: '2026-12-15',
    unavailableWeekdays: [],
    unavailableDates: [],
  });
  assert.equal(studyDays.length, 27);
  assert.equal(studyDays[0].date, '2026-11-18');
  assert.equal(studyDays[studyDays.length - 1].date, '2026-12-14');

  // Inclusive calendar span (including exam day Nov 18..Dec 15) = exclusive + 1 = 28
  const inclusiveCalendarDays = exclusiveDays + 1;
  assert.equal(inclusiveCalendarDays, 28);

  // Day before exam: 1 day left, 1 study day (Dec 14), 2 inclusive calendar days
  assert.equal(computeDaysRemaining('2026-12-14', '2026-12-15'), 1);
  assert.equal(
    computeStudyDays({
      ...BASE_TEST_CONFIG,
      startDate: '2026-12-14',
      deadlineDate: '2026-12-15',
      unavailableWeekdays: [],
      unavailableDates: [],
    }).length,
    1
  );

  // Same day as exam: 0 days left, 0 study days
  assert.equal(computeDaysRemaining('2026-12-15', '2026-12-15'), 0);
  assert.equal(
    computeStudyDays({
      ...BASE_TEST_CONFIG,
      startDate: '2026-12-15',
      deadlineDate: '2026-12-15',
    }).length,
    0
  );
});

test('zero-fabrication invariants hold when syllabus is empty, unmarked, or all completed', () => {
  // 1. Empty syllabus -> wallpaper model stays unready with zero stations
  const emptyPlan = generateStudyPlan([], BASE_TEST_CONFIG);
  const emptyModel = buildWallpaperModel('Bar Exam', '2026-11-18', '2026-12-15', emptyPlan, []);
  assert.equal(emptyModel.isReady, false);
  assert.equal(emptyModel.stations.length, 0);
  assert.equal(emptyModel.nextAction, null);

  // 2. Unmarked topics never turn into completed milestones automatically
  const unmarked = parseSyllabusText('Constitutional Law\nContracts');
  assert.equal(unmarked[0].status, 'not_provided');
  assert.equal(unmarked[1].status, 'not_provided');
  const unmarkedPlan = generateStudyPlan(unmarked, BASE_TEST_CONFIG);
  const unmarkedModel = buildWallpaperModel('Bar Exam', '2026-11-18', '2026-12-15', unmarkedPlan, []);
  assert.equal(unmarkedModel.stations.some((s) => s.state === 'done'), false);

  // 3. Completed topics keep 0h learning stages filtered out of active route stations
  const allDone = parseSyllabusText('Constitutional Law | status: completed\nContracts | status: completed');
  const donePlan = generateStudyPlan(allDone, BASE_TEST_CONFIG);
  const doneModel = buildWallpaperModel('Bar Exam', '2026-11-18', '2026-12-15', donePlan, []);
  assert.equal(doneModel.stations.some((s) => s.stageId === 'learning' || s.stageId === 'completion'), false);
});

