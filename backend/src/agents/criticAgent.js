/**
 * CRITIC AGENT
 *
 * Responsibilities:
 * - Validate proposed task plan before execution:
 *   - Inventory still reserved for the order
 *   - Staff capacity not exceeded (if staff assigned)
 * - Approve or reject the plan
 * - If rejected, emit replan event (PLAN_REJECTED + REPLAN_REQUESTED)
 *
 * Rules: No LLM, deterministic logic.
 */

const { EventTypes, createEvent } = require('../state/events');

/** Small epsilon for float comparison (hours) */
const CAPACITY_EPSILON = 1e-6;

/**
 * Validate the task plan for an order and approve or reject.
 * Deterministic: checks inventory reserved + staff capacity.
 *
 * @param {Order} order - Order with taskIds and optional assignedStaffId
 * @param {Object} stateManager - State manager
 * @param {Function} [onEmit] - Optional callback to emit events (PLAN_APPROVED / PLAN_REJECTED + REPLAN_REQUESTED)
 * @returns {{ approved: boolean, issues: string[], reason: string }}
 */
function validateTaskPlan(order, stateManager, onEmit) {
  const issues = [];

  // 1. Inventory still reserved
  if (!order.inventoryReserved) {
    issues.push('INVENTORY_NOT_RESERVED');
  }

  // 2. Staff capacity not exceeded (only when staff is assigned)
  if (order.assignedStaffId) {
    const staff = stateManager.getStaff(order.assignedStaffId);
    if (!staff) {
      issues.push('STAFF_NOT_FOUND');
    } else if (staff.currentWorkload > staff.maxCapacity + CAPACITY_EPSILON) {
      issues.push('STAFF_CAPACITY_EXCEEDED');
    }
  }

  const approved = issues.length === 0;
  const reason = approved
    ? 'Plan valid: inventory reserved and staff capacity within limit.'
    : `Plan invalid: ${issues.join(', ')}.`;

  if (onEmit && typeof onEmit === 'function') {
    if (approved) {
      onEmit(createEvent(EventTypes.PLAN_APPROVED, {
        orderId: order.orderId,
        assignedStaffId: order.assignedStaffId || null,
        taskCount: (order.taskIds || []).length,
        reason
      }));
    } else {
      onEmit(createEvent(EventTypes.PLAN_REJECTED, {
        orderId: order.orderId,
        issues,
        reason
      }));
      onEmit(createEvent(EventTypes.REPLAN_REQUESTED, {
        orderId: order.orderId,
        issues,
        reason
      }));
    }
  }

  return { approved, issues, reason };
}

const criticAgent = {
  validateTaskPlan
};

module.exports = criticAgent;
