export type TopicStatus = 'not_provided' | 'unfinished' | 'in_progress' | 'completed';

export type TopicImportance = 'not_provided' | 'high' | 'medium' | 'low';

export type StageId =
  | 'audit'
  | 'learning'
  | 'completion'
  | 'revision'
  | 'mocks'
  | 'final_prep';

export interface SyllabusTopic {
  id: string;
  chapter: string | null;
  name: string;
  status: TopicStatus;
  isWeak: boolean;
  weightage: string | null;
  importance: TopicImportance;
  estimatedHours: number | null;
}

export interface PlannerConfig {
  startDate: string; // YYYY-MM-DD
  deadlineDate: string; // YYYY-MM-DD
  currentProgressNote: string;
  weekdayHours: number;
  weekendHours: number;
  unavailableWeekdays: number[]; // 0 (Sun) - 6 (Sat)
  unavailableDates: string[]; // YYYY-MM-DD
  examFormat: string; // 'UNKNOWN' or explicit format
  defaultHoursPerTopic: number; // Explicit user-visible baseline when per-topic hours are omitted
}

export interface StudyDaySlot {
  date: string;
  weekday: string;
  availableHours: number;
}

export interface Milestone {
  id: string;
  order: number;
  stageId: StageId;
  stageName: string;
  targetDate: string;
  startDate: string;
  endDate: string;
  exactTopics: string[];
  estimatedHours: number;
  completionCondition: string;
  nextAction: string;
  priorityNote: string;
  isOverCapacity: boolean;
}

export interface GapAnalysis {
  hasGap: boolean;
  totalAvailableHours: number;
  totalRequiredHours: number;
  gapHours: number;
  surplusHours: number;
  auditHours: number;
  learningHoursNeeded: number;
  reservedRevisionHours: number;
  reservedMockHours: number;
  finalPrepHours: number;
  additionalDailyHoursNeeded: number;
  explanation: string;
  prioritySuggestions: string[];
}

export interface LockScreenSummary {
  deadlineLabel: string;
  daysRemaining: number;
  studyDaysAvailable: number;
  statusLine: string;
  activeStage: string;
  nextMilestoneDate: string;
  focusTopics: string[];
  oneNextAction: string;
  plainText: string;
}

export interface StudyPlanResult {
  isValid: boolean;
  validationErrors: string[];
  studyDays: StudyDaySlot[];
  milestones: Milestone[];
  gapAnalysis: GapAnalysis;
  lockScreenSummary: LockScreenSummary;
  markdownExport: string;
}

export const STAGE_LABELS: Record<StageId, string> = {
  audit: '1. Syllabus Audit & Diagnostic',
  learning: '2. Learning Unfinished Topics',
  completion: '3. Completing the Syllabus',
  revision: '4. Revision',
  mocks: '5. Mock Tests & Error Correction',
  final_prep: '6. Final Exam Preparation',
};

export const EXAM_FORMAT_OPTIONS = [
  'UNKNOWN',
  'Multiple Choice (MCQ)',
  'Written / Long-Form Essay',
  'Problem Solving / Numerical',
  'Mixed (MCQ + Written)',
  'Practical / Lab / Oral',
] as const;
