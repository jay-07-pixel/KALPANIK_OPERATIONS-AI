/**
 * Deadline parsing and feasibility check (deterministic, no LLM).
 *
 * - Parse order deadline (ISO or "tomorrow", "tomorrow 3pm")
 * - Compare estimated completion (now + total task duration) with deadline
 * - Return time required and whether the deadline can genuinely be met
 */

/**
 * Normalize common deadline phrasings before parsing.
 * Handles: "by tomorrow" -> "tomorrow", "by 3pm" -> "today 3pm", etc.
 */
function normalizeDeadlineInput(deadlineStr) {
  if (!deadlineStr || typeof deadlineStr !== 'string') return null;
  let s = deadlineStr.trim().toLowerCase();
  if (!s) return null;

  // Strip prefixes: "by ", "before ", "until ", "due ", "need by ", "delivery by "
  s = s.replace(/^(by|before|until|due|need\s+by|delivery\s+by|in)\s+/i, '').trim();
  return s || null;
}

/**
 * Parse deadline string to a Date, or null if unparseable.
 * Supports: ISO string, "tomorrow", "tomorrow 3pm", "by tomorrow", "today", "tonight", "by 3pm".
 *
 * @param {string|null|undefined} deadlineStr
 * @returns {Date|null}
 */
function parseDeadline(deadlineStr) {
  const raw = normalizeDeadlineInput(deadlineStr);
  if (!raw) return null;

  const s = raw.trim().toLowerCase();

  // ISO or other date string (e.g. "2026-02-01T15:00:00Z")
  const asDate = new Date(raw);
  if (!Number.isNaN(asDate.getTime())) return asDate;

  const now = new Date();
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // "tomorrow" or "by tomorrow"
  if (s === 'tomorrow') {
    tomorrow.setUTCHours(23, 59, 59, 999);
    return tomorrow;
  }

  // "tomorrow 3pm", "tomorrow 10am", "tomorrow by 3pm"
  const tomorrowTimeMatch = s.match(/tomorrow\s+(?:by\s+)?(\d{1,2})\s*(am|pm)?/i);
  if (tomorrowTimeMatch) {
    let hour = parseInt(tomorrowTimeMatch[1], 10);
    const ampm = (tomorrowTimeMatch[2] || '').toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    tomorrow.setUTCHours(hour, 0, 0, 0);
    return tomorrow;
  }

  // "today", "tonight"
  if (s === 'today' || s === 'tonight') {
    today.setUTCHours(23, 59, 59, 999);
    return today;
  }

  // "3pm", "10am", "by 3pm" (today at that time)
  const todayTimeMatch = s.match(/^(\d{1,2})\s*(am|pm)?$/i);
  if (todayTimeMatch) {
    let hour = parseInt(todayTimeMatch[1], 10);
    const ampm = (todayTimeMatch[2] || '').toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    today.setUTCHours(hour, 0, 0, 0);
    // If time already passed today, assume tomorrow
    if (today.getTime() <= now.getTime()) {
      tomorrow.setUTCHours(hour, 0, 0, 0);
      return tomorrow;
    }
    return today;
  }

  // Try native Date parse for "Friday", "next week", etc.
  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime()) && fallback.getTime() > now.getTime()) {
    return fallback;
  }

  return null;
}

/**
 * Compute total duration (hours) and per-task breakdown from tasks.
 *
 * @param {Task[]} tasks
 * @returns {{ totalHours: number, breakdown: Array<{ taskId: string, taskType: string, hours: number }> }}
 */
function getTimeRequired(tasks) {
  const breakdown = (tasks || []).map(t => ({
    taskId: t.taskId,
    taskType: t.taskType,
    hours: t.estimatedDuration ?? 0
  }));
  const totalHours = breakdown.reduce((sum, b) => sum + b.hours, 0);
  return { totalHours, breakdown };
}

/**
 * Check if work can be completed by the deadline.
 *
 * @param {Date|null} deadlineDate - Parsed deadline
 * @param {number} totalHours - Total task duration in hours
 * @returns {{ feasible: boolean|null, estimatedCompletion: Date, message: string }}
 */
function checkFeasibility(deadlineDate, totalHours) {
  const estimatedCompletion = new Date(Date.now() + totalHours * 60 * 60 * 1000);
  if (!deadlineDate) {
    return {
      feasible: null,
      estimatedCompletion,
      message: 'Deadline not set; cannot verify.'
    };
  }
  const feasible = estimatedCompletion.getTime() <= deadlineDate.getTime();
  return {
    feasible,
    estimatedCompletion,
    message: feasible
      ? `Estimated completion ${estimatedCompletion.toISOString()} is before deadline ${deadlineDate.toISOString()}. Can be done.`
      : `Estimated completion ${estimatedCompletion.toISOString()} is after deadline ${deadlineDate.toISOString()}. May not be feasible.`
  };
}

/**
 * Get time required and deadline feasibility for an order and its tasks.
 *
 * @param {Order} order - Order with optional deadline
 * @param {Task[]} tasks - Planned tasks with estimatedDuration
 * @returns {{
 *   totalHours: number,
 *   breakdown: Array<{ taskId: string, taskType: string, hours: number }>,
 *   deadline: Date|null,
 *   deadlineRaw: string|null,
 *   feasible: boolean|null,
 *   estimatedCompletion: Date,
 *   message: string
 * }}
 */
function getTimeAndDeadlineFeasibility(order, tasks) {
  const { totalHours, breakdown } = getTimeRequired(tasks);
  const deadlineRaw = order?.deadline ?? null;
  const deadline = parseDeadline(deadlineRaw);
  const { feasible, estimatedCompletion, message } = checkFeasibility(deadline, totalHours);
  return {
    totalHours,
    breakdown,
    deadline,
    deadlineRaw,
    feasible,
    estimatedCompletion,
    message
  };
}

module.exports = {
  parseDeadline,
  normalizeDeadlineInput,
  getTimeRequired,
  checkFeasibility,
  getTimeAndDeadlineFeasibility
};
