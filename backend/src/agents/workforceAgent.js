/**
 * WORKFORCE AGENT
 *
 * - Check staff availability by role (PRODUCTION, QUALITY, PACKING, DELIVERY)
 * - Select best candidate per task so each task can go to a different employee
 *
 * Task type → Role: PREPARE → PRODUCTION, QUALITY_CHECK → QUALITY, PACK → PACKING
 */

const TASK_TYPE_TO_ROLE = {
  PREPARE: 'PRODUCTION',
  QUALITY_CHECK: 'QUALITY',
  PACK: 'PACKING',
  DELIVERY: 'DELIVERY'
};

/**
 * Select best staff for a single task by role, skill, and work hours.
 * Only considers staff who are within their shift and have enough remaining shift hours for the task.
 * Picks lowest current workload first.
 */
function selectBestStaffForTask(task, stateManager, now) {
  const refNow = now || new Date();
  const taskType = (task.taskType || '').toUpperCase();
  const role = TASK_TYPE_TO_ROLE[taskType] || 'PRODUCTION';
  const requiredSkill = task.requiredSkill || 'assembly';
  const duration = task.estimatedDuration || 0;

  const availableStaff = stateManager.getAvailableStaff();
  if (availableStaff.length === 0) {
    return { staff: null, reason: 'NO_AVAILABLE_STAFF', candidates: [] };
  }

  const byRole = availableStaff.filter(s => s.role === role);
  const withSkill = byRole.length > 0 ? byRole : availableStaff.filter(s => s.hasSkill && s.hasSkill(requiredSkill));
  const pool = withSkill.length > 0 ? withSkill : availableStaff;

  // Prefer staff within shift with enough remaining shift hours; fallback to capacity-only (e.g. outside shift or demo)
  let canTake = pool.filter(s => s.canTakeTaskWithinWorkHours && s.canTakeTaskWithinWorkHours(duration, refNow));
  if (canTake.length === 0) {
    canTake = pool.filter(s => s.canTakeTask(duration));
  }
  if (canTake.length === 0) {
    return {
      staff: null,
      reason: `NO_STAFF_FOR_${taskType} (role ${role}, need ${duration}h; check work hours and capacity)`,
      candidates: []
    };
  }

  canTake.sort((a, b) => a.currentWorkload - b.currentWorkload);
  const best = canTake[0];
  const remainingShift = best.getRemainingShiftHours ? best.getRemainingShiftHours(refNow) : best.getRemainingCapacity();
  const candidates = canTake.slice(0, 3).map(s => ({
    staffId: s.staffId,
    name: s.name,
    role: s.role,
    currentWorkload: s.currentWorkload,
    freeCapacity: s.getRemainingCapacity(),
    remainingShiftHours: s.getRemainingShiftHours ? s.getRemainingShiftHours(refNow) : null,
    maxCapacity: s.maxCapacity
  }));

  return {
    staff: best,
    reason: `${taskType} → ${role}: ${best.name} (${best.currentWorkload}h done, ${Number(remainingShift).toFixed(2)}h left in shift, ${duration}h task)`,
    candidates
  };
}

/**
 * Select the best staff for an order (all tasks to one person) — fallback.
 * Considers work hours: only staff within shift with enough remaining shift hours for total duration.
 */
function selectBestStaffForOrder(order, stateManager, now) {
  const refNow = now || new Date();
  const tasks = stateManager.getTasksByOrder(order.orderId);
  if (!tasks || tasks.length === 0) {
    return { staff: null, totalDuration: 0, reason: 'NO_TASKS', candidates: [] };
  }

  const totalDuration = tasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
  const availableStaff = stateManager.getAvailableStaff();

  if (availableStaff.length === 0) {
    return { staff: null, totalDuration, reason: 'NO_AVAILABLE_STAFF', candidates: [] };
  }

  // Filter: capacity AND within work hours, total duration fits in remaining shift hours
  const canTake = availableStaff.filter(s =>
    s.canTakeTaskWithinWorkHours && s.canTakeTaskWithinWorkHours(totalDuration, refNow)
  );
  if (canTake.length === 0) {
    const withCapacity = availableStaff.filter(s => s.canTakeTask(totalDuration));
    return {
      staff: null,
      totalDuration,
      reason: `NO_STAFF_WITH_WORK_HOURS (need ${totalDuration}h in shift; ${withCapacity.length} with capacity)`,
      candidates: []
    };
  }

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
  TASK_TYPE_TO_ROLE,
  selectBestStaffForTask,
  selectBestStaffForOrder
};

module.exports = workforceAgent;
