/**
 * COORDINATION AGENT
 *
 * - Assign tasks to staff (per task by role, or whole order to one person)
 * - Update staff workloads
 *
 * assignTasksByRole: each task goes to best staff for that task type (PRODUCTION/QUALITY/PACKING).
 */

const { EventTypes, createEvent } = require('../state/events');
const workforceAgent = require('./workforceAgent');

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

/**
 * Assign each task to the best staff for that task type (by role).
 * PREPARE → PRODUCTION, QUALITY_CHECK → QUALITY, PACK → PACKING.
 * Returns assigned staff names and per-task assignment details.
 *
 * @param {Task[]} tasks - Tasks for one order (from getTasksByOrder)
 * @param {Object} stateManager - State manager
 * @param {Function} [onEmit] - Optional event callback
 * @returns {{ success: boolean, assignedStaffNames: string[], assignments: Array, message: string }}
 */
function assignTasksByRole(tasks, stateManager, onEmit) {
  const assignments = [];
  const staffNamesSet = new Set();

  for (const task of tasks) {
    const sel = workforceAgent.selectBestStaffForTask(task, stateManager);
    if (!sel.staff) {
      return {
        success: false,
        assignedStaffNames: [],
        assignments,
        message: `No staff for task ${task.taskId} (${task.taskType}): ${sel.reason}`
      };
    }
    const assignResult = assignTasksToStaff([task], sel.staff.staffId, stateManager, onEmit);
    if (!assignResult.success) {
      return {
        success: false,
        assignedStaffNames: [...staffNamesSet],
        assignments,
        message: assignResult.message || `Failed to assign ${task.taskId}`
      };
    }
    assignments.push({
      taskId: task.taskId,
      taskType: task.taskType,
      staffId: sel.staff.staffId,
      staffName: assignResult.staffName
    });
    staffNamesSet.add(assignResult.staffName);
  }

  const assignedStaffNames = [...staffNamesSet];
  return {
    success: true,
    assignedStaffNames,
    assignments,
    message: assignedStaffNames.length === 1
      ? `All tasks → ${assignedStaffNames[0]}`
      : `Tasks → ${assignedStaffNames.join(', ')}`
  };
}

const coordinationAgent = {
  assignTasksToStaff,
  assignTasksByRole
};

module.exports = coordinationAgent;
