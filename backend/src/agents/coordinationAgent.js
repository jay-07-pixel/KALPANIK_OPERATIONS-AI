/**
 * COORDINATION AGENT
 *
 * Responsibilities:
 * - Assign tasks to selected staff
 * - Update staff workloads
 *
 * Rules: No LLM, deterministic logic.
 * Validates capacity before assigning (new workload <= maxCapacity).
 */

const { EventTypes, createEvent } = require('../state/events');

/**
 * Assign a list of tasks to a staff member and update workload.
 * Deterministic: assign each task to the given staff, then update staff workload once.
 *
 * @param {Task[]} tasks - Tasks to assign (from getTasksByOrder)
 * @param {string} staffId - Staff member ID
 * @param {Object} stateManager - State manager
 * @param {Function} [onEmit] - Optional callback to emit events (e.g. TASKS_ASSIGNED, WORKLOAD_UPDATED)
 * @returns {{ assigned: string[], newWorkload: number, success: boolean, message?: string }}
 */
function assignTasksToStaff(tasks, staffId, stateManager, onEmit) {
  const staff = stateManager.getStaff(staffId);
  if (!staff) {
    return { assigned: [], newWorkload: 0, success: false, message: `Staff ${staffId} not found` };
  }

  const totalDuration = tasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
  const newWorkload = staff.currentWorkload + totalDuration;

  // Deterministic check: new workload must not exceed capacity
  if (newWorkload > staff.maxCapacity) {
    return {
      assigned: [],
      newWorkload: staff.currentWorkload,
      success: false,
      message: `Capacity exceeded: ${newWorkload}h > ${staff.maxCapacity}h max`
    };
  }

  const now = new Date().toISOString();
  const assignedIds = [];

  for (const task of tasks) {
    stateManager.updateTask(task.taskId, {
      assignedStaffId: staffId,
      assignedStaffName: staff.name,
      status: 'ASSIGNED',
      assignedAt: now
    });
    assignedIds.push(task.taskId);
  }

  const newTaskIds = [...(staff.assignedTaskIds || []), ...assignedIds];
  stateManager.updateStaff(staffId, {
    currentWorkload: newWorkload,
    assignedTaskIds: newTaskIds,
    lastActiveAt: now
  });

  if (onEmit && typeof onEmit === 'function') {
    onEmit(createEvent(EventTypes.TASKS_ASSIGNED, {
      orderId: tasks[0]?.orderId,
      staffId,
      staffName: staff.name,
      taskIds: assignedIds,
      taskCount: assignedIds.length,
      totalDurationHours: totalDuration,
      previousWorkload: staff.currentWorkload,
      newWorkload
    }));
    onEmit(createEvent(EventTypes.WORKLOAD_UPDATED, {
      staffId,
      staffName: staff.name,
      previousWorkload: staff.currentWorkload,
      newWorkload,
      addedHours: totalDuration
    }));
  }

  return {
    assigned: assignedIds,
    newWorkload,
    success: true,
    staffName: staff.name
  };
}

const coordinationAgent = {
  assignTasksToStaff
};

module.exports = coordinationAgent;
