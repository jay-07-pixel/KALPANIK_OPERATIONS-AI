/**
 * Deadline parsing and feasibility check (deterministic, no LLM).
 *
 * - Parse order deadline (ISO or "tomorrow", "tomorrow 3pm")
 * - Compare estimated completion (now + total task duration) with deadline
 * - Return time required and whether the deadline can genuinely be met
 */

/**
 * Parse deadline string to a Date, or null if unparseable.
 * Supports: ISO string, "tomorrow", "tomorrow 3pm" (case-insensitive).
 *
 * @param {string|null|undefined} deadlineStr
 * @returns {Date|null}
 */
function parseDeadline(deadlineStr) {
  if (!deadlineStr || typeof deadlineStr !== 'string') return null;
  const s = deadlineStr.trim().toLowerCase();
  if (!s) return null;

  // ISO or other date string
  const asDate = new Date(deadlineStr);
  if (!Number.isNaN(asDate.getTime())) return asDate;

  // "tomorrow" or "tomorrow 3pm"
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (s === 'tomorrow') {
    tomorrow.setUTCHours(23, 59, 59, 999);
    return tomorrow;
  }
  const match = s.match(/tomorrow\s+(\d{1,2})\s*(am|pm)?/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const ampm = (match[2] || '').toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    tomorrow.setUTCHours(hour, 0, 0, 0);
    return tomorrow;
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
  getTimeRequired,
  checkFeasibility,
  getTimeAndDeadlineFeasibility
};
