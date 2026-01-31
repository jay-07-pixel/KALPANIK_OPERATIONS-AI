/**
 * DECISION ENGINE (Planner Agent)
 *
 * Responsibilities:
 * - Decide what tasks are required for an order
 * - Break order into tasks: prepare → quality_check → pack
 * - Do NOT assign staff (that is Workforce/Coordination Agent)
 *
 * Logic: Simple and explainable (deterministic, no LLM).
 * - Every order gets the same 3-task sequence.
 * - Duration is based on quantity (and fixed base for quality check).
 */

const { Task } = require('../models');

// Duration constants (hours) — simple, explainable rules
const PREPARE_MINUTES_PER_UNIT = 6;   // 6 min per unit (e.g. 15 units = 90 min)
const QUALITY_CHECK_FIXED_MINUTES = 20; // 20 min fixed per order
const PACK_MINUTES_PER_UNIT = 2.5;    // 2.5 min per unit (e.g. 15 units = 37.5 min)

function minutesToHours(minutes) {
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Plan tasks for a confirmed order.
 * Returns an array of Task objects (PENDING, no staff assigned).
 *
 * @param {Order} order - Confirmed order (READY_TO_FULFILL)
 * @param {Object} stateManager - State manager to get next task IDs
 * @returns {Task[]} Ordered list of tasks: [prepare, quality_check, pack]
 */
function planTasksForOrder(order, stateManager) {
  const orderId = order.orderId;
  const priority = order.priority || 'MEDIUM';
  const totalQty = order.totalQuantity || 0;
  const items = order.items || [];
  const firstItem = items[0] || {};
  const productId = firstItem.productId || order.items?.[0]?.productId;
  const productName = firstItem.productName || order.items?.[0]?.productName || 'items';

  // Next task IDs (deterministic from current task count)
  const existingCount = stateManager.getAllTasks().length;
  const baseId = existingCount + 1;
  const id1 = `TASK-${String(baseId).padStart(3, '0')}`;
  const id2 = `TASK-${String(baseId + 1).padStart(3, '0')}`;
  const id3 = `TASK-${String(baseId + 2).padStart(3, '0')}`;

  // Durations (deterministic from quantity)
  const prepareMinutes = totalQty * PREPARE_MINUTES_PER_UNIT;
  const prepareHours = minutesToHours(Math.max(prepareMinutes, 15)); // min 15 min
  const qcHours = minutesToHours(QUALITY_CHECK_FIXED_MINUTES);
  const packMinutes = totalQty * PACK_MINUTES_PER_UNIT;
  const packHours = minutesToHours(Math.max(packMinutes, 10)); // min 10 min

  const prepareTask = new Task({
    taskId: id1,
    orderId,
    taskType: 'PREPARE',
    title: `Prepare ${totalQty}x ${productName}`,
    description: `Assemble and prepare ${totalQty} ${firstItem.unit || 'units'} of ${productName} for order ${orderId}.`,
    requiredSkill: 'assembly',
    priority,
    status: 'PENDING',
    assignedStaffId: null,
    assignedStaffName: null,
    estimatedDuration: prepareHours,
    dependsOn: [],
    blockedBy: [],
    productId: productId || null,
    quantity: totalQty,
    location: 'Assembly Floor'
  });

  const qualityCheckTask = new Task({
    taskId: id2,
    orderId,
    taskType: 'QUALITY_CHECK',
    title: `Quality check: ${productName}`,
    description: `Quality check for ${totalQty} ${productName} (order ${orderId}).`,
    requiredSkill: 'quality_check',
    priority,
    status: 'PENDING',
    assignedStaffId: null,
    assignedStaffName: null,
    estimatedDuration: qcHours,
    dependsOn: [id1],
    blockedBy: [],
    productId: productId || null,
    quantity: totalQty,
    location: 'Quality Station'
  });

  const packTask = new Task({
    taskId: id3,
    orderId,
    taskType: 'PACK',
    title: `Pack ${totalQty}x ${productName} for dispatch`,
    description: `Pack ${totalQty} ${productName} for order ${orderId} (ready for delivery).`,
    requiredSkill: 'packing',
    priority,
    status: 'PENDING',
    assignedStaffId: null,
    assignedStaffName: null,
    estimatedDuration: packHours,
    dependsOn: [id2],
    blockedBy: [],
    productId: productId || null,
    quantity: totalQty,
    location: 'Packing Area'
  });

  return [prepareTask, qualityCheckTask, packTask];
}

/**
 * Get a short explanation of why this plan was chosen (for logging/explainability).
 */
function getPlanExplanation(order) {
  const totalQty = order.totalQuantity || 0;
  const prepareMin = totalQty * PREPARE_MINUTES_PER_UNIT;
  const packMin = totalQty * PACK_MINUTES_PER_UNIT;
  return {
    sequence: ['prepare', 'quality_check', 'pack'],
    reason: 'Standard 3-step flow: prepare items, then quality check, then pack for dispatch.',
    durations: {
      prepare: `${Math.max(prepareMin, 15)} min (${PREPARE_MINUTES_PER_UNIT} min/unit × ${totalQty} units, min 15 min)`,
      quality_check: `${QUALITY_CHECK_FIXED_MINUTES} min fixed`,
      pack: `${Math.max(packMin, 10)} min (${PACK_MINUTES_PER_UNIT} min/unit × ${totalQty} units, min 10 min)`
    }
  };
}

const decisionEngine = {
  planTasksForOrder,
  getPlanExplanation
};

module.exports = decisionEngine;
