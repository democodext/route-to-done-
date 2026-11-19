import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SyllabusTopic, TopicStatus } from '../engine/types';

interface StepSyllabusProps {
  syllabusText: string;
  topics: SyllabusTopic[];
  onSyllabusTextChange: (next: string) => void;
  onAddTopicLine: (chapter: string, topicName: string) => void;
  onUpdateTopic: (id: string, patch: Partial<SyllabusTopic>) => void;
  onRemoveTopic: (topic: SyllabusTopic) => void;
}

const PROGRESS_OPTIONS: { value: TopicStatus; label: string }[] = [
  { value: 'unfinished', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export function StepSyllabus({
  syllabusText,
  topics,
  onSyllabusTextChange,
  onAddTopicLine,
  onUpdateTopic,
  onRemoveTopic,
}: StepSyllabusProps) {
  const [chapterInput, setChapterInput] = useState('');
  const [topicInput, setTopicInput] = useState('');

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = topicInput.trim();
    if (!trimmed) return;
    onAddTopicLine(chapterInput.trim(), trimmed);
    setTopicInput('');
  };

  return (
    <section
      id="step-syllabus"
      aria-labelledby="step-2-heading"
      className="scroll-mt-24 pt-7 border-t border-[#141518]/12"
    >
      <div>
        <div className="font-mono text-xs text-[#6B6E76] tracking-wide">
          02 · Your Syllabus
        </div>
        <h2
          id="step-2-heading"
          className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141518]"
        >
          Add chapters, topics, and honest progress
        </h2>
        <p className="mt-1.5 text-sm text-[#5A5D66]">
          Enter topics one by one or paste your syllabus below. Unmarked topics stay unassigned until you mark their progress.
        </p>
      </div>

      <form onSubmit={handleQuickAdd} className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div className="sm:col-span-4">
          <label htmlFor="quick-chapter-input" className="sr-only">
            Chapter name (optional)
          </label>
          <input
            id="quick-chapter-input"
            type="text"
            placeholder="Chapter (optional)"
            value={chapterInput}
            onChange={(e) => setChapterInput(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#141518]/15 rounded-xl text-[#141518] placeholder:text-[#8E9199] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#141518]/12 focus:border-[#141518] transition-colors"
          />
        </div>
        <div className="sm:col-span-5">
          <label htmlFor="quick-topic-input" className="sr-only">
            Topic name
          </label>
          <input
            id="quick-topic-input"
            type="text"
            placeholder="Topic name (e.g., Kinematics)"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#141518]/15 rounded-xl text-[#141518] placeholder:text-[#8E9199] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#141518]/12 focus:border-[#141518] transition-colors"
          />
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={!topicInput.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm font-medium bg-[#E8E5DD] text-[#141518] hover:bg-[#DDD9CE] disabled:opacity-45 disabled:cursor-not-allowed rounded-xl transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Topic</span>
          </button>
        </div>
      </form>

      <div className="mt-4">
        <label htmlFor="syllabus-paste-input" className="block text-xs font-medium text-[#3A3D45] mb-1.5">
          Or paste syllabus lines (use # Chapter for chapter headings)
        </label>
        <textarea
          id="syllabus-paste-input"
          rows={5}
          value={syllabusText}
          onChange={(e) => onSyllabusTextChange(e.target.value)}
          placeholder={`# Module 1: Foundations\nLinear Algebra\nProbability & Distributions\n# Module 2: Applications\nDifferential Equations`}
          className="w-full p-4 text-sm font-mono leading-relaxed bg-[#FAF9F6] border border-[#141518]/15 rounded-xl text-[#141518] placeholder:text-[#8E9199] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#141518]/12 focus:border-[#141518] transition-colors"
        />
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#141518]/10">
          <span className="text-xs font-semibold text-[#3A3D45]">
            Your syllabus topics ({topics.length})
          </span>
          {topics.length > 0 && (
            <span className="text-xs text-[#6B6E76]">
              Mark real progress below
            </span>
          )}
        </div>

        {topics.length === 0 ? (
          <p className="py-5 text-sm text-[#6B6E76]">
            No topics entered yet. Add a topic above or paste your syllabus lines.
          </p>
        ) : (
          <ul className="divide-y divide-[#141518]/8">
            {topics.map((topic) => (
              <li
                key={topic.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  {topic.chapter && (
                    <div className="text-xs text-[#6B6E76] truncate">{topic.chapter}</div>
                  )}
                  <div className="text-sm font-medium text-[#141518] break-words">
                    {topic.name}
                  </div>
                  {topic.status === 'not_provided' && (
                    <div className="mt-0.5 text-xs text-[#6B6E76]">
                      Status not marked yet
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 shrink-0">
                  <div
                    role="group"
                    aria-label={`Progress for ${topic.name}`}
                    className="inline-flex items-center p-0.5 bg-[#EAE7DF] rounded-lg border border-[#141518]/10"
                  >
                    {PROGRESS_OPTIONS.map((opt) => {
                      const active = topic.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => onUpdateTopic(topic.id, { status: opt.value })}
                          className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? opt.value === 'completed'
                                ? 'bg-[#1F5E43] text-white'
                                : opt.value === 'in_progress'
                                ? 'bg-[#B43F20] text-white'
                                : 'bg-[#141518] text-white'
                              : 'text-[#4B4E57] hover:text-[#141518]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    aria-pressed={topic.isWeak}
                    aria-label={`Mark ${topic.name} as weak area`}
                    onClick={() => onUpdateTopic(topic.id, { isWeak: !topic.isWeak })}
                    className={`px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                      topic.isWeak
                        ? 'bg-[#FDF0EC] border-[#D98A74] text-[#B43F20]'
                        : 'bg-[#FAF9F6] border-[#141518]/15 text-[#5A5D66] hover:text-[#141518]'
                    }`}
                  >
                    {topic.isWeak ? 'Weak area' : 'Weak?'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveTopic(topic)}
                    aria-label={`Remove ${topic.name}`}
                    className="p-1.5 text-[#6B6E76] hover:text-[#B43F20] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
