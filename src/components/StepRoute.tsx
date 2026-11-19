import { AlertTriangle, RefreshCw } from 'lucide-react';
import { StudyPlanResult } from '../engine/types';

interface StepRouteProps {
  hasGenerated: boolean;
  needsRegenerate: boolean;
  validationErrors: string[];
  plan: StudyPlanResult;
  completedMilestoneIds: string[];
  onGenerateRoute: () => void;
  onToggleMilestone: (id: string) => void;
}

export function StepRoute({
  hasGenerated,
  needsRegenerate,
  validationErrors,
  plan,
  completedMilestoneIds,
  onGenerateRoute,
  onToggleMilestone,
}: StepRouteProps) {
  const completedSet = new Set(completedMilestoneIds);
  const currentMs =
    plan.milestones.find((m) => !completedSet.has(m.id)) ??
    plan.milestones[plan.milestones.length - 1] ??
    null;

  return (
    <section
      id="step-route"
      aria-labelledby="step-3-heading"
      className="scroll-mt-24 pt-7 border-t border-[#141518]/12"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-[#6B6E76] tracking-wide">
            03 · Your Route
          </div>
          <h2
            id="step-3-heading"
            className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141518]"
          >
            Backward milestone route
          </h2>
        </div>

        <button
          type="button"
          onClick={onGenerateRoute}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#FAF9F6] bg-[#141518] hover:bg-[#272930] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141518]"
        >
          {hasGenerated && <RefreshCw className="w-4 h-4" aria-hidden="true" />}
          <span>{hasGenerated ? 'Regenerate Route' : 'Generate Route'}</span>
        </button>
      </div>

      {validationErrors.length > 0 && (
        <div
          role="alert"
          className="mt-5 p-4 bg-[#FDF0EC] border border-[#E2A998] rounded-xl"
        >
          <p className="text-xs font-semibold text-[#9A3412]">
            Complete these details before generating your route:
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-[#7C2D12] list-disc pl-5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {!hasGenerated && validationErrors.length === 0 && (
        <p className="mt-4 text-sm text-[#5A5D66] leading-relaxed">
          Enter your goal name, exam date, daily study hours, and syllabus topics, then select{' '}
          <span className="font-semibold text-[#141518]">Generate Route</span> to map your backward milestones onto the wallpaper studio.
        </p>
      )}

      {hasGenerated && plan.isValid && (
        <div className="mt-6 space-y-6">
          {needsRegenerate && (
            <div className="px-4 py-3 bg-[#FAF3E1] border border-[#DFC994] rounded-xl text-xs text-[#6B4E16]">
              You updated your deadline or syllabus. Click Regenerate Route to refresh milestone dates and wallpaper.
            </div>
          )}

          {plan.gapAnalysis.hasGap && (
            <div
              role="status"
              className="p-4 bg-[#FDF0EC] border border-[#E2A998] rounded-xl flex items-start gap-3"
            >
              <AlertTriangle className="w-4 h-4 text-[#B43F20] mt-0.5 shrink-0" aria-hidden="true" />
              <div className="space-y-1.5 text-sm text-[#7C2D12]">
                <div className="font-semibold text-[#9A3412]">
                  Schedule conflict: {plan.gapAnalysis.gapHours}h short before your exam date
                </div>
                <p className="leading-relaxed text-xs sm:text-sm">
                  {plan.gapAnalysis.explanation}
                </p>
                {plan.gapAnalysis.prioritySuggestions.length > 0 && (
                  <p className="text-xs text-[#9A3412] leading-relaxed">
                    {plan.gapAnalysis.prioritySuggestions[0]}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentMs && (
            <div className="p-5 bg-[#FAF9F6] border border-[#141518]/12 rounded-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium text-[#B43F20]">
                  Next milestone · {currentMs.targetDate}
                </span>
                <span className="font-mono text-xs text-[#5A5D66] tabular-nums">
                  {currentMs.estimatedHours}h planned
                </span>
              </div>
              <div className="mt-1.5 font-display text-base font-semibold text-[#141518]">
                {currentMs.stageName}
              </div>
              <div className="mt-3 pt-3 border-t border-[#141518]/10">
                <div className="font-mono text-xs text-[#5A5D66]">One next action</div>
                <p className="mt-1 text-sm font-medium text-[#141518] leading-relaxed">
                  {currentMs.nextAction}
                </p>
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-[#5A5D66] mb-3">
              Check off completed stages and update your wallpaper anytime
            </div>
            <ol className="divide-y divide-[#141518]/8">
              {plan.milestones.map((ms) => {
                const isDone = completedSet.has(ms.id);
                const isCurrent = currentMs?.id === ms.id && !isDone;
                return (
                  <li
                    key={ms.id}
                    className={`py-4 px-3 rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-[#FAF9F6]'
                        : isDone
                        ? 'opacity-65'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => onToggleMilestone(ms.id)}
                        aria-label={`Mark ${ms.stageName} completed`}
                        className="mt-1 w-4 h-4 rounded border-[#141518]/30 text-[#141518] focus:ring-[#141518] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              isDone ? 'line-through text-[#6B6E76]' : 'text-[#141518]'
                            }`}
                          >
                            {ms.stageName}
                          </span>
                          <span className="font-mono text-xs text-[#5A5D66] tabular-nums">
                            {ms.targetDate} · {ms.estimatedHours}h
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#5A5D66] leading-relaxed">
                          Topics: {ms.exactTopics.join(', ')}
                        </p>
                        <p className="mt-1.5 text-xs text-[#3A3D45] leading-relaxed">
                          <span className="font-medium text-[#141518]">Next action:</span> {ms.nextAction}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
