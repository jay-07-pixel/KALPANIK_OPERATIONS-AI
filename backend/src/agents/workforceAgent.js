/**
 * WORKFORCE AGENT
 *
 * Responsibilities:
 * - Check staff availability
 * - Select best candidate for an order's tasks
 *
 * Rules: No LLM, deterministic logic.
 * Best = lowest current workload among staff who can take the total task duration.
 */

/**
 * Select the best staff member for an order (all tasks assigned to one person).
 * Deterministic: choose online staff with lowest current workload who can fit total duration.
 *
 * @param {Order} order - Order with taskIds (TASKS_PLANNED)
 * @param {Object} stateManager - State manager
 * @returns {{ staff: StaffMember | null, totalDuration: number, reason: string }}
 */
function selectBestStaffForOrder(order, stateManager) {
  const tasks = stateManager.getTasksByOrder(order.orderId);
  if (!tasks || tasks.length === 0) {
    return { staff: null, totalDuration: 0, reason: 'NO_TASKS', candidates: [] };
  }

  const totalDuration = tasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
  const availableStaff = stateManager.getAvailableStaff();

  if (availableStaff.length === 0) {
    return { staff: null, totalDuration, reason: 'NO_AVAILABLE_STAFF', candidates: [] };
  }

  // Filter: can take total duration (currentWorkload + totalDuration <= maxCapacity)
  const canTake = availableStaff.filter(s => s.canTakeTask(totalDuration));
  if (canTake.length === 0) {
    return { staff: null, totalDuration, reason: 'NO_STAFF_WITH_CAPACITY', candidates: [] };
  }

  // Deterministic: sort by currentWorkload ascending (lowest first), pick first
  canTake.sort((a, b) => a.currentWorkload - b.currentWorkload);
  const best = canTake[0];

  // Expose 2–3 candidates for display (before selection)
  const maxCandidates = 3;
  const candidates = canTake.slice(0, maxCandidates).map(s => ({
    staffId: s.staffId,
    name: s.name,
    currentWorkload: s.currentWorkload,
    freeCapacity: s.getRemainingCapacity(),
    maxCapacity: s.maxCapacity
  }));

  return {
    staff: best,
    totalDuration,
    reason: `LOWEST_WORKLOAD: ${best.name} (${best.currentWorkload}h current, ${best.getRemainingCapacity()}h free)`,
    candidates
  };
}

const workforceAgent = {
  selectBestStaffForOrder
};

module.exports = workforceAgent;
