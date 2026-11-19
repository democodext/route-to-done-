import { SyllabusTopic, TopicImportance, TopicStatus } from './types';

function slugifyId(index: number, name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28);
  return `topic-${index + 1}-${clean || 'item'}`;
}

function parseExplicitStatus(segment: string): TopicStatus | null {
  const lower = segment.toLowerCase().trim();
  if (
    /^(status\s*:\s*)?(done|completed|complete|finished)$/.test(lower) ||
    /\bstatus\s*:\s*(done|completed|complete|finished)\b/.test(lower)
  ) {
    return 'completed';
  }
  if (
    /^(status\s*:\s*)?(in[\s-]?progress|partial|started|ongoing)$/.test(lower) ||
    /\bstatus\s*:\s*(in[\s-]?progress|partial|started|ongoing)\b/.test(lower)
  ) {
    return 'in_progress';
  }
  if (
    /^(status\s*:\s*)?(unfinished|not[\s-]?started|todo|pending)$/.test(lower) ||
    /\bstatus\s*:\s*(unfinished|not[\s-]?started|todo|pending)\b/.test(lower)
  ) {
    return 'unfinished';
  }
  return null;
}

function parseExplicitWeightage(segment: string): {
  weightage: string | null;
  importance: TopicImportance | null;
} {
  const weightMatch = segment.match(/(?:weight(?:age)?|marks?)\s*:\s*([^|,\]]+)/i);
  if (weightMatch) {
    const raw = weightMatch[1].trim();
    const numMatch = raw.match(/(\d+(?:\.\d+)?)\s*%/);
    let importance: TopicImportance = 'medium';
    if (numMatch) {
      const pct = parseFloat(numMatch[1]);
      importance = pct >= 20 ? 'high' : pct >= 10 ? 'medium' : 'low';
    } else if (/high|major|core|critical/i.test(raw)) {
      importance = 'high';
    } else if (/low|minor/i.test(raw)) {
      importance = 'low';
    }
    return { weightage: raw, importance };
  }

  const lower = segment.toLowerCase().trim();
  if (/^(important|high[\s-]?priority|high[\s-]?weight|core)$/.test(lower)) {
    return { weightage: 'Important (user-tagged)', importance: 'high' };
  }
  if (/^(priority\s*:\s*high|importance\s*:\s*high)$/.test(lower)) {
    return { weightage: 'High', importance: 'high' };
  }
  if (/^(priority\s*:\s*medium|importance\s*:\s*medium)$/.test(lower)) {
    return { weightage: 'Medium', importance: 'medium' };
  }
  if (/^(priority\s*:\s*low|importance\s*:\s*low)$/.test(lower)) {
    return { weightage: 'Low', importance: 'low' };
  }
  return { weightage: null, importance: null };
}

function parseExplicitHours(segment: string): number | null {
  const match = segment.match(/^(?:hours?\s*:\s*)?(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)$/i);
  if (match) {
    const val = parseFloat(match[1]);
    return Number.isFinite(val) && val > 0 ? val : null;
  }
  return null;
}

/**
 * Parses user-provided syllabus text strictly without inventing chapters,
 * topics, exam weightage, or completion status.
 *
 * Supported formats:
 * - Plain lines: "Linear Algebra"
 * - Bullet/numbered items: "- Calculus", "1. Thermodynamics"
 * - Chapter headers ending with ":" or starting with "#": "Unit 1: Mechanics:" or "## Optics"
 * - Optional pipe/bracket metadata ONLY if explicitly written by user:
 *   "Electromagnetism | 6h | weak | weight: 25% | status: in-progress"
 *   "Organic Chemistry [weak, 4h]"
 */
export function parseSyllabusText(rawText: string): SyllabusTopic[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const topics: SyllabusTopic[] = [];
  let currentChapter: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Markdown header -> explicit chapter group
    if (/^#{1,4}\s+/.test(line)) {
      currentChapter = line.replace(/^#{1,4}\s+/, '').replace(/:$/, '').trim();
      continue;
    }

    // Line ending with ":" and no pipe/bracket metadata -> explicit chapter header
    if (line.endsWith(':') && !line.includes('|') && !line.includes('[')) {
      currentChapter = line.slice(0, -1).trim();
      continue;
    }

    // Strip leading bullet or simple numbering only for display cleanliness, keep exact topic wording
    const cleanedLine = line.replace(/^[-*•]\s+/, '').trim();
    if (!cleanedLine) continue;

    // Extract optional bracketed annotations at the end, e.g. "Topic Name [weak, 4h]"
    let basePart = cleanedLine;
    const tagSegments: string[] = [];

    const bracketMatch = cleanedLine.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
    if (bracketMatch) {
      basePart = bracketMatch[1].trim();
      tagSegments.push(
        ...bracketMatch[2]
          .split(/[,;|]/)
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }

    // Extract pipe-delimited metadata, e.g. "Topic Name | 5h | weak | weight: 20%"
    if (basePart.includes('|')) {
      const parts = basePart.split('|').map((s) => s.trim()).filter(Boolean);
      basePart = parts[0] ?? '';
      tagSegments.push(...parts.slice(1));
    }

    if (!basePart) continue;

    // Derive metadata strictly from explicit tags; otherwise keep Not provided / false / null
    let status: TopicStatus = 'not_provided';
    let isWeak = false;
    let weightage: string | null = null;
    let importance: TopicImportance = 'not_provided';
    let estimatedHours: number | null = null;

    for (const seg of tagSegments) {
      const lower = seg.toLowerCase();
      if (/^(weak|weakness|hard|struggling|needs work)$/.test(lower) || /\bweak\b/.test(lower)) {
        isWeak = true;
      }

      const parsedStatus = parseExplicitStatus(seg);
      if (parsedStatus) {
        status = parsedStatus;
      }

      const parsedWeight = parseExplicitWeightage(seg);
      if (parsedWeight.weightage !== null) {
        weightage = parsedWeight.weightage;
      }
      if (parsedWeight.importance !== null) {
        importance = parsedWeight.importance;
      }

      const parsedHours = parseExplicitHours(seg);
      if (parsedHours !== null) {
        estimatedHours = parsedHours;
      }
    }

    topics.push({
      id: slugifyId(topics.length, basePart),
      chapter: currentChapter,
      name: basePart,
      status,
      isWeak,
      weightage,
      importance,
      estimatedHours,
    });
  }

  return topics;
}
