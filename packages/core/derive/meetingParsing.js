/**
 * meetingParsing.js – NLP extraction helpers for meeting markdown
 *
 * Pure, deterministic, rule-based extraction. No external deps.
 *
 * @module meetingParsing
 */

// =============================================================================
// ACTION ITEMS
// =============================================================================

/**
 * Extract action items from meeting markdown.
 * Patterns:
 * - "### Next Steps" sections with "- Assignee (deadline)\n  - item"
 * - Standalone items with action verbs: "will", "should", "needs to", "by [date]"
 *
 * @param {string} markdown
 * @returns {Array<{text: string, assignee: string|null, deadline: string|null, source: string}>}
 */
export function parseActionItems(markdown) {
  if (!markdown) return [];
  const items = [];
  const seen = new Set();

  // Pattern 1: "### Next Steps" section
  const nextStepsRe = /###\s*Next\s*Steps\s*\n([\s\S]*?)(?=\n###|\n##|$)/gi;
  let match;
  while ((match = nextStepsRe.exec(markdown)) !== null) {
    const block = match[1];
    const lines = block.split('\n');
    let currentAssignee = null;
    let currentDeadline = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Top-level bullet: "- Assignee (deadline)"
      const assigneeMatch = trimmed.match(/^-\s+([A-Z][a-zA-Z\s]+?)\s*\(([^)]+)\)\s*$/);
      if (assigneeMatch) {
        currentAssignee = assigneeMatch[1].trim();
        currentDeadline = assigneeMatch[2].trim();
        continue;
      }

      // Sub-bullet: "  - item text"
      const subMatch = trimmed.match(/^-\s+(.+)/);
      if (subMatch) {
        const text = subMatch[1].trim();
        const key = text.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            text,
            assignee: currentAssignee,
            deadline: currentDeadline,
            source: 'next_steps_section'
          });
        }
        // Reset assignee context on non-indented bullets
        if (!line.startsWith('  ')) {
          currentAssignee = null;
          currentDeadline = null;
        }
      }
    }
  }

  // Pattern 2: Standalone action sentences
  const actionVerbs = /\b(will|should|needs?\s+to|must|going\s+to|plan\s+to|committed\s+to)\b/i;
  const byDateRe = /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+week|end\s+of\s+(?:week|month|quarter)|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|Q[1-4]|\d{1,2}\/\d{1,2})/i;
  const sentences = splitSentences(markdown);

  for (const sentence of sentences) {
    if (sentence.startsWith('#')) continue;
    if (actionVerbs.test(sentence) || byDateRe.test(sentence)) {
      const text = sentence.trim().replace(/^-\s+/, '');
      const key = text.toLowerCase();
      if (!seen.has(key) && text.length > 10 && text.length < 500) {
        seen.add(key);
        const deadlineMatch = sentence.match(byDateRe);
        items.push({
          text,
          assignee: null,
          deadline: deadlineMatch ? deadlineMatch[1] : null,
          source: 'action_verb'
        });
      }
    }
  }

  return items;
}

// =============================================================================
// DECISIONS
// =============================================================================

/**
 * Extract decisions from meeting markdown.
 * Looks for sentences containing decision keywords.
 *
 * @param {string} markdown
 * @returns {Array<{text: string, source: string}>}
 */
export function parseDecisions(markdown) {
  if (!markdown) return [];
  const decisionRe = /\b(decided|agreed|committed\s+to|will\s+go\s+with|approved|confirmed|finalized|signed\s+off|aligned\s+on|settled\s+on)\b/i;
  const sentences = splitSentences(markdown);
  const decisions = [];
  const seen = new Set();

  for (const sentence of sentences) {
    if (sentence.startsWith('#')) continue;
    if (decisionRe.test(sentence)) {
      const text = sentence.trim().replace(/^-\s+/, '');
      const key = text.toLowerCase();
      if (!seen.has(key) && text.length > 10 && text.length < 500) {
        seen.add(key);
        decisions.push({ text, source: 'decision_keyword' });
      }
    }
  }

  return decisions;
}

// =============================================================================
// RISKS
// =============================================================================

/**
 * Extract risks and concerns from meeting markdown.
 *
 * @param {string} markdown
 * @returns {Array<{text: string, severity: string, source: string}>}
 */
export function parseRisks(markdown) {
  if (!markdown) return [];
  const highRe = /\b(blocker|critical|urgent|deadline\s+at\s+risk|must\s+resolve)\b/i;
  const medRe = /\b(risk|concern|worried|challenge|issue|problem|threat|obstacle|bottleneck|dependency)\b/i;
  const sentences = splitSentences(markdown);
  const risks = [];
  const seen = new Set();

  for (const sentence of sentences) {
    if (sentence.startsWith('#')) continue;
    const text = sentence.trim().replace(/^-\s+/, '');
    const key = text.toLowerCase();
    if (seen.has(key) || text.length < 10 || text.length > 500) continue;

    if (highRe.test(sentence)) {
      seen.add(key);
      risks.push({ text, severity: 'high', source: 'risk_keyword' });
    } else if (medRe.test(sentence)) {
      seen.add(key);
      risks.push({ text, severity: 'medium', source: 'risk_keyword' });
    }
  }

  return risks;
}

// =============================================================================
// METRIC MENTIONS
// =============================================================================

/**
 * Extract metric mentions from meeting markdown.
 * Patterns: $X.XM, XX%, XXx growth, XX months runway, revenue/ARR/MRR figures.
 *
 * @param {string} markdown
 * @returns {Array<{text: string, type: string, value: string}>}
 */
export function parseMetricMentions(markdown) {
  if (!markdown) return [];
  const mentions = [];
  const seen = new Set();

  const patterns = [
    { type: 'currency', re: /\$[\d,.]+[KMBkmb]?\b/g },
    { type: 'percentage', re: /\d+(?:\.\d+)?%/g },
    { type: 'multiplier', re: /\d+(?:\.\d+)?x\s+(?:growth|increase|return|revenue|arr)/gi },
    { type: 'runway', re: /\d+\s+months?\s+(?:runway|cash)/gi },
    { type: 'arr', re: /(?:ARR|MRR|revenue)\s*(?:of|:|\s)\s*\$?[\d,.]+[KMBkmb]?/gi },
    { type: 'headcount', re: /\d+\s+(?:employees?|people|team\s+members?|headcount|engineers?)/gi },
    { type: 'valuation', re: /(?:valuation|post-money|pre-money)\s*(?:of|:|\s)\s*\$?[\d,.]+[KMBkmb]?/gi },
  ];

  // Get surrounding context for each match
  for (const { type, re } of patterns) {
    let match;
    while ((match = re.exec(markdown)) !== null) {
      const value = match[0];
      const key = `${type}:${value.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Extract surrounding sentence for context
      const start = Math.max(0, markdown.lastIndexOf('\n', match.index) + 1);
      const end = markdown.indexOf('\n', match.index + value.length);
      const context = markdown.slice(start, end === -1 ? undefined : end).trim();

      mentions.push({ text: context, type, value });
    }
  }

  return mentions;
}

// =============================================================================
// TOPIC CLASSIFICATION
// =============================================================================

const TOPIC_KEYWORDS = {
  fundraising: ['raise', 'round', 'investor', 'term sheet', 'data room', 'valuation', 'cap table', 'dilution', 'pre-money', 'post-money', 'seed', 'series a', 'series b', 'series c', 'loi', 'committed', 'check size'],
  product: ['feature', 'launch', 'user', 'retention', 'churn', 'roadmap', 'release', 'beta', 'mvp', 'product-market', 'onboarding', 'adoption', 'ui', 'ux', 'design partner'],
  hiring: ['hire', 'team', 'recruit', 'role', 'candidate', 'headcount', 'talent', 'engineer', 'product manager', 'sourcing', 'interview'],
  operations: ['process', 'ops', 'cost', 'vendor', 'compliance', 'legal', 'contract', 'license', 'infrastructure', 'security', 'audit'],
  growth: ['revenue', 'arr', 'mrr', 'expansion', 'market', 'customer', 'pipeline', 'deal', 'sales', 'conversion', 'growth', 'margin', 'profitable'],
  partnerships: ['partner', 'intro', 'relationship', 'connect', 'network', 'referral', 'introduction', 'collaboration', 'strategic'],
};

/**
 * Classify topics in meeting markdown using keyword bag scoring.
 *
 * @param {string} markdown
 * @returns {Array<{topic: string, score: number, matches: number}>}
 */
export function classifyTopics(markdown) {
  if (!markdown) return [];
  const lower = markdown.toLowerCase();
  const results = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let matches = 0;
    for (const kw of keywords) {
      // Count occurrences (word boundary for single words, substring for phrases)
      const re = kw.includes(' ')
        ? new RegExp(kw, 'gi')
        : new RegExp(`\\b${kw}\\b`, 'gi');
      const found = lower.match(re);
      if (found) matches += found.length;
    }
    if (matches > 0) {
      // Normalize score: more keywords = higher confidence, diminishing returns
      const score = Math.min(1, matches / (keywords.length * 2));
      results.push({ topic, score: Math.round(score * 1000) / 1000, matches });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// =============================================================================
// SENTIMENT
// =============================================================================

const POSITIVE_WORDS = ['excited', 'strong', 'growth', 'profitable', 'momentum', 'progress', 'great', 'excellent', 'success', 'opportunity', 'aligned', 'impressive', 'bullish', 'ahead', 'milestone', 'win', 'doubled', 'tripled'];
const NEGATIVE_WORDS = ['risk', 'concern', 'decline', 'struggling', 'burn', 'churn', 'slow', 'behind', 'weak', 'problem', 'challenge', 'blocker', 'delay', 'fail', 'loss', 'miss', 'flat', 'stalled'];

/**
 * Score overall sentiment of meeting markdown.
 * Simple positive/negative keyword ratio.
 *
 * @param {string} markdown
 * @returns {{score: number, label: string, positiveCount: number, negativeCount: number}}
 */
export function scoreSentiment(markdown) {
  if (!markdown) return { score: 0, label: 'neutral', positiveCount: 0, negativeCount: 0 };
  const lower = markdown.toLowerCase();

  let positiveCount = 0;
  let negativeCount = 0;

  for (const w of POSITIVE_WORDS) {
    const re = new RegExp(`\\b${w}\\b`, 'gi');
    const found = lower.match(re);
    if (found) positiveCount += found.length;
  }

  for (const w of NEGATIVE_WORDS) {
    const re = new RegExp(`\\b${w}\\b`, 'gi');
    const found = lower.match(re);
    if (found) negativeCount += found.length;
  }

  const total = positiveCount + negativeCount;
  if (total === 0) return { score: 0, label: 'neutral', positiveCount: 0, negativeCount: 0 };

  // Score: -1 (fully negative) to +1 (fully positive)
  const score = Math.round(((positiveCount - negativeCount) / total) * 1000) / 1000;
  const label = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';

  return { score, label, positiveCount, negativeCount };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Split markdown into sentence-like chunks.
 * Splits on newlines and sentence-ending punctuation.
 */
function splitSentences(text) {
  // Split on newlines first, then on sentence boundaries
  return text
    .split(/\n/)
    .flatMap(line => line.split(/(?<=[.!?])\s+/))
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

export default {
  parseActionItems,
  parseDecisions,
  parseRisks,
  parseMetricMentions,
  classifyTopics,
  scoreSentiment,
};
