import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { EXAM_FORMAT_OPTIONS, PlannerConfig } from '../engine/types';

interface StepDeadlineProps {
  goalName: string;
  config: PlannerConfig;
  onGoalNameChange: (name: string) => void;
  onConfigChange: (next: PlannerConfig) => void;
}

const WEEKDAYS = [
  { idx: 1, label: 'Mon' },
  { idx: 2, label: 'Tue' },
  { idx: 3, label: 'Wed' },
  { idx: 4, label: 'Thu' },
  { idx: 5, label: 'Fri' },
  { idx: 6, label: 'Sat' },
  { idx: 0, label: 'Sun' },
];

export function StepDeadline({
  goalName,
  config,
  onGoalNameChange,
  onConfigChange,
}: StepDeadlineProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [offDateInput, setOffDateInput] = useState('');

  const toggleWeekday = (idx: number) => {
    const exists = config.unavailableWeekdays.includes(idx);
    const next = exists
      ? config.unavailableWeekdays.filter((d) => d !== idx)
      : [...config.unavailableWeekdays, idx];
    onConfigChange({ ...config, unavailableWeekdays: next });
  };

  const addOffDate = () => {
    if (!offDateInput) return;
    if (!config.unavailableDates.includes(offDateInput)) {
      onConfigChange({
        ...config,
        unavailableDates: [...config.unavailableDates, offDateInput].sort(),
      });
    }
    setOffDateInput('');
  };

  const removeOffDate = (date: string) => {
    onConfigChange({
      ...config,
      unavailableDates: config.unavailableDates.filter((d) => d !== date),
    });
  };

  return (
    <section
      id="step-deadline"
      aria-labelledby="step-1-heading"
      className="scroll-mt-24 pt-7 border-t border-[#141518]/12"
    >
      <div>
        <div className="font-mono text-xs text-[#6B6E76] tracking-wide">
          01 · Your Deadline
        </div>
        <h2
          id="step-1-heading"
          className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141518]"
        >
          What are you preparing for?
        </h2>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="goal-name-input" className="block text-xs font-medium text-[#3A3D45] mb-1.5">
            Goal name
          </label>
          <input
            id="goal-name-input"
            type="text"
            placeholder="e.g., Organic Chemistry Final, Bar Exam, CFA Level I"
            value={goalName}
            onChange={(e) => onGoalNameChange(e.target.value)}
            className="w-full px-4 py-3 text-sm bg-[#FAF9F6] border border-[#141518]/15 rounded-xl text-[#141518] placeholder:text-[#8E9199] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#141518]/12 focus:border-[#141518] transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="exam-date-input" className="block text-xs font-medium text-[#3A3D45] mb-1.5">
              Exam date
            </label>
            <input
              id="exam-date-input"
              type="date"
              value={config.deadlineDate}
              onChange={(e) => onConfigChange({ ...config, deadlineDate: e.target.value })}
              className="w-full px-4 py-3 text-sm font-mono bg-[#FAF9F6] border border-[#141518]/15 rounded-xl text-[#141518] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#141518]/12 focus:border-[#141518] transition-colors"
            />
          </div>

          <div>
            <label htmlFor="daily-hours-input" className="block text-xs font-medium text-[#3A3D45] mb-1.5">
              Daily available study time (hours)
            </label>
            <input
              id="daily-hours-input"
              type="number"
              min={0}
              max={16}
              step={0.5}
              value={config.weekdayHours}
              onChange={(e) => {
                const val = Math.max(0, parseFloat(e.target.value) || 0);
                onConfigChange({
                  ...config,
                  weekdayHours: val,
                  weekendHours: val,
                });
              }}
              className="w-full px-4 py-3 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#141518]/15 rounded-xl text-[#141518] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#141518]/12 focus:border-[#141518] transition-colors"
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A5D66] hover:text-[#141518] transition-colors cursor-pointer"
          >
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>Optional: off days, unavailable dates & exam format</span>
          </button>

          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-[#141518]/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start-date-input" className="block text-xs font-medium text-[#3A3D45] mb-1.5">
                    Start date
                  </label>
                  <input
                    id="start-date-input"
                    type="date"
                    value={config.startDate}
                    onChange={(e) => onConfigChange({ ...config, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-[#141518]/15 rounded-lg text-[#141518]"
                  />
                </div>

                <div>
                  <label htmlFor="exam-format-select" className="block text-xs font-medium text-[#3A3D45] mb-1.5">
                    Exam format
                  </label>
                  <select
                    id="exam-format-select"
                    value={config.examFormat}
                    onChange={(e) => onConfigChange({ ...config, examFormat: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#141518]/15 rounded-lg text-[#141518]"
                  >
                    {EXAM_FORMAT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-[#3A3D45] mb-2">
                  Weekly days off
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const isOff = config.unavailableWeekdays.includes(day.idx);
                    return (
                      <button
                        key={day.idx}
                        type="button"
                        aria-pressed={isOff}
                        onClick={() => toggleWeekday(day.idx)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                          isOff
                            ? 'bg-[#141518] text-[#FAF9F6] border-[#141518]'
                            : 'bg-[#FAF9F6] text-[#5A5D66] border-[#141518]/15 hover:text-[#141518]'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="off-date-picker" className="block text-xs font-medium text-[#3A3D45] mb-1.5">
                  Specific unavailable dates
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="off-date-picker"
                    type="date"
                    value={offDateInput}
                    onChange={(e) => setOffDateInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-[#FAF9F6] border border-[#141518]/15 rounded-lg text-[#141518]"
                  />
                  <button
                    type="button"
                    disabled={!offDateInput}
                    onClick={addOffDate}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#E8E5DD] text-[#141518] hover:bg-[#DDD9CE] disabled:opacity-45 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add</span>
                  </button>
                </div>
                {config.unavailableDates.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {config.unavailableDates.map((d) => (
                      <li
                        key={d}
                        className="flex items-center justify-between px-3 py-1.5 text-xs font-mono bg-[#FAF9F6] rounded-lg border border-[#141518]/10 text-[#3A3D45]"
                      >
                        <span>{d}</span>
                        <button
                          type="button"
                          onClick={() => removeOffDate(d)}
                          aria-label={`Remove unavailable date ${d}`}
                          className="text-[#6B6E76] hover:text-[#B43F20] p-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
