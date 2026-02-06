/**
 * meetings.js – Meeting Intelligence Derive Module
 *
 * Pure deterministic derivation from meeting data + transcripts.
 * Matches meetings to companies, extracts intelligence per company.
 *
 * @module meetings
 */

import {
  parseActionItems,
  parseDecisions,
  parseRisks,
  parseMetricMentions,
  classifyTopics,
  scoreSentiment,
} from './meetingParsing.js';

// =============================================================================
// COMPANY MATCHING
// =============================================================================

const STRIP_SUFFIXES = /\b(inc|llc|corp|ltd|co|corporation|incorporated|limited|group)\b\.?/gi;

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().replace(STRIP_SUFFIXES, '').replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Match meetings to companies.
 *
 * Strategy (checked in order, first match wins per company):
 * 1. Participant org vs company name
 * 2. Title parsing — company name in meeting title
 * 3. Email domain vs company domain
 *
 * A meeting can match multiple companies (multi-party meetings).
 *
 * @param {Array} meetings - Meeting objects from raw/meetings
 * @param {Array} companies - Company objects
 * @returns {Map<string, Array>} Map of companyId → meetings[]
 */
export function matchMeetingsToCompanies(meetings, companies) {
  const result = new Map();

  // Pre-build lookup structures
  const byNormalizedName = new Map();
  const byDomain = new Map();
  for (const c of companies) {
    const nn = normalize(c.name);
    if (nn) byNormalizedName.set(nn, c);
    if (c.domain) {
      const domainKey = c.domain.toLowerCase().replace(/^www\./, '');
      byDomain.set(domainKey, c);
    }
  }

  for (const meeting of meetings) {
    const matchedCompanyIds = new Set();

    // Strategy 1: Participant org
    for (const p of (meeting.participants || [])) {
      if (!p.org) continue;
      const normOrg = normalize(p.org);
      // Skip our own org
      if (normOrg === 'backbone' || normOrg === 'backboneam') continue;

      for (const [nn, c] of byNormalizedName) {
        if (normOrg === nn || normOrg.includes(nn) || nn.includes(normOrg)) {
          matchedCompanyIds.add(c.id);
        }
      }
    }

    // Strategy 2: Title parsing
    const normTitle = normalize(meeting.title || '');
    for (const [nn, c] of byNormalizedName) {
      if (nn.length >= 3 && normTitle.includes(nn)) {
        matchedCompanyIds.add(c.id);
      }
    }

    // Strategy 3: Email domain
    for (const p of (meeting.participants || [])) {
      if (!p.email) continue;
      const domain = p.email.split('@')[1];
      if (!domain) continue;
      // Skip our own domains
      if (domain === 'backboneam.com' || domain === 'gmail.com' || domain === 'outlook.com') continue;

      const domainKey = domain.toLowerCase();
      if (byDomain.has(domainKey)) {
        matchedCompanyIds.add(byDomain.get(domainKey).id);
      }
    }

    // Add meeting to each matched company
    for (const cid of matchedCompanyIds) {
      if (!result.has(cid)) result.set(cid, []);
      result.get(cid).push(meeting);
    }
  }

  return result;
}

// =============================================================================
// MEETING INTELLIGENCE
// =============================================================================

/**
 * Derive meeting intelligence for one company's meetings.
 *
 * @param {Array} meetings - Meetings for this company (from matchMeetingsToCompanies)
 * @param {Map<string,string>} transcripts - Map of meetingId → transcript text
 * @param {Date} now
 * @returns {Object} MeetingIntelligence
 */
export function deriveMeetingIntelligence(meetings, transcripts, now) {
  if (!meetings || meetings.length === 0) {
    return emptyIntelligence();
  }

  const nowMs = now.getTime();
  const d7 = 7 * 24 * 60 * 60 * 1000;
  const d30 = 30 * 24 * 60 * 60 * 1000;

  // Sort by date desc
  const sorted = [...meetings].sort((a, b) => {
    return parseDate(b.date) - parseDate(a.date);
  });

  // Engagement signals
  const dates = sorted.map(m => parseDate(m.date)).filter(d => !isNaN(d));
  const last7d = dates.filter(d => (nowMs - d) <= d7).length;
  const last30d = dates.filter(d => (nowMs - d) <= d30).length;
  const daysSinceLast = dates.length > 0
    ? Math.round((nowMs - dates[0]) / (24 * 60 * 60 * 1000))
    : null;

  // Avg days between meetings
  let avgDaysBetween = null;
  if (dates.length >= 2) {
    const gaps = [];
    for (let i = 0; i < dates.length - 1; i++) {
      gaps.push((dates[i] - dates[i + 1]) / (24 * 60 * 60 * 1000));
    }
    avgDaysBetween = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  }

  // Unique participants (exclude Backbone)
  const participantSet = new Set();
  for (const m of meetings) {
    for (const p of (m.participants || [])) {
      const normOrg = normalize(p.org);
      if (normOrg !== 'backbone' && normOrg !== 'backboneam' && p.name) {
        participantSet.add(p.name);
      }
    }
  }

  // Engagement trend
  const engagementTrend = computeEngagementTrend(dates, nowMs);

  // Extract content from summaries + transcripts
  let allActions = [];
  let allDecisions = [];
  let allRisks = [];
  let allMetrics = [];
  let topicCounts = {};
  let sentimentSum = 0;
  let sentimentCount = 0;
  const meetingSummaries = [];

  for (const m of sorted) {
    const text = combineText(m.summary, transcripts.get(m.id));

    const actions = parseActionItems(text);
    const decisions = parseDecisions(text);
    const risks = parseRisks(text);
    const metrics = parseMetricMentions(text);
    const topics = classifyTopics(text);
    const sentiment = scoreSentiment(text);

    allActions.push(...actions);
    allDecisions.push(...decisions);
    allRisks.push(...risks);
    allMetrics.push(...metrics);
    sentimentSum += sentiment.score;
    sentimentCount++;

    // Accumulate topics
    for (const t of topics) {
      topicCounts[t.topic] = (topicCounts[t.topic] || 0) + t.score;
    }

    meetingSummaries.push({
      meetingId: m.id,
      title: m.title,
      date: m.date,
      actionCount: actions.length,
      topTopics: topics.slice(0, 3).map(t => t.topic),
      sentiment: sentiment.label,
    });
  }

  // Deduplicate actions by text
  allActions = deduplicateByText(allActions);
  allDecisions = deduplicateByText(allDecisions);
  allRisks = deduplicateByText(allRisks);

  // Build sorted topic scores
  const topics = Object.entries(topicCounts)
    .map(([topic, score]) => ({ topic, score: Math.round(score * 1000) / 1000 }))
    .sort((a, b) => b.score - a.score);

  // Aggregate sentiment
  const avgSentiment = sentimentCount > 0
    ? Math.round((sentimentSum / sentimentCount) * 1000) / 1000
    : 0;
  const sentimentLabel = avgSentiment > 0.2 ? 'positive' : avgSentiment < -0.2 ? 'negative' : 'neutral';

  return {
    engagementSignals: {
      meetingCount: meetings.length,
      meetingCountLast7d: last7d,
      meetingCountLast30d: last30d,
      daysSinceLastMeeting: daysSinceLast,
      avgDaysBetweenMeetings: avgDaysBetween,
      uniqueParticipants: [...participantSet],
      engagementTrend,
    },
    extractedActions: allActions,
    decisions: allDecisions,
    risks: allRisks,
    metricMentions: allMetrics,
    topics,
    sentiment: { score: avgSentiment, label: sentimentLabel },
    meetingSummaries,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function emptyIntelligence() {
  return {
    engagementSignals: {
      meetingCount: 0,
      meetingCountLast7d: 0,
      meetingCountLast30d: 0,
      daysSinceLastMeeting: null,
      avgDaysBetweenMeetings: null,
      uniqueParticipants: [],
      engagementTrend: 'none',
    },
    extractedActions: [],
    decisions: [],
    risks: [],
    metricMentions: [],
    topics: [],
    sentiment: { score: 0, label: 'neutral' },
    meetingSummaries: [],
  };
}

function parseDate(dateStr) {
  if (!dateStr) return NaN;
  return new Date(dateStr).getTime();
}

function combineText(summary, transcript) {
  const parts = [];
  if (summary) parts.push(summary);
  if (transcript) parts.push(transcript);
  return parts.join('\n\n');
}

function computeEngagementTrend(dates, nowMs) {
  if (dates.length < 2) return 'none';

  const d30 = 30 * 24 * 60 * 60 * 1000;
  const recent = dates.filter(d => (nowMs - d) <= d30).length;
  const prior = dates.filter(d => (nowMs - d) > d30 && (nowMs - d) <= d30 * 2).length;

  if (recent > prior + 1) return 'increasing';
  if (recent < prior - 1) return 'declining';
  return 'stable';
}

function deduplicateByText(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.text.toLowerCase().slice(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default {
  matchMeetingsToCompanies,
  deriveMeetingIntelligence,
};
