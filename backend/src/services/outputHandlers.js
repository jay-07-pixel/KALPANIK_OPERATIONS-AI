/**
 * OUTPUT HANDLERS
 *
 * Responsibilities:
 * - Send updates to Website (mock response: structured JSON)
 * - Send updates to WhatsApp (console log, mock)
 * - Reflect current order and task status in both
 * - Include time required and deadline feasibility when available
 *
 * No LLM; deterministic formatting.
 */

const { getTimeAndDeadlineFeasibility } = require('../utils/deadlineFeasibility');

/**
 * Build a payload with current order and task status from state.
 * Used for both website response and WhatsApp summary.
 *
 * @param {Object} coordinatorResult - Return value from stateCoordinator.handleEvent (ORDER_RECEIVED)
 * @param {Object} stateManager - State manager (optional; used to enrich with order/tasks)
 * @returns {{ orderId: string|null, orderStatus: string|null, tasks: Array, message: string, success: boolean, ... }}
 */
function buildStatusPayload(coordinatorResult, stateManager) {
  const payload = {
    success: coordinatorResult.status === 'success' || coordinatorResult.status === 'plan_rejected',
    status: coordinatorResult.status,
    message: coordinatorResult.message || '',
    orderId: coordinatorResult.orderId || null,
    orderStatus: null,
    tasks: [],
    assignedStaff: null,
    timestamp: new Date().toISOString()
  };

  if (!coordinatorResult.orderId && coordinatorResult.order) {
    payload.orderId = coordinatorResult.order.orderId;
  }
  if (coordinatorResult.order) {
    payload.orderStatus = coordinatorResult.order.status;
    payload.assignedStaff = coordinatorResult.order.assignedStaffName || null;
  }

  if (stateManager && payload.orderId) {
    const order = stateManager.getOrder(payload.orderId);
    if (order) {
      payload.orderStatus = order.status;
      payload.assignedStaff = order.assignedStaffName || null;
      const taskList = stateManager.getTasksByOrder(payload.orderId);
      payload.tasks = taskList.map(t => ({
        taskId: t.taskId,
        taskType: t.taskType,
        status: t.status,
        assignedTo: t.assignedStaffName || null,
        estimatedDurationHours: t.estimatedDuration
      }));
      const timeAndDeadline = getTimeAndDeadlineFeasibility(order, taskList);
      payload.timeRequiredHours = timeAndDeadline.totalHours;
      payload.timeBreakdown = timeAndDeadline.breakdown;
      payload.deadline = timeAndDeadline.deadline ? timeAndDeadline.deadline.toISOString() : null;
      payload.deadlineFeasible = timeAndDeadline.feasible;
      payload.estimatedCompletion = timeAndDeadline.estimatedCompletion ? timeAndDeadline.estimatedCompletion.toISOString() : null;
      payload.deadlineMessage = timeAndDeadline.message;
    }
  }

  return payload;
}

/**
 * Build mock response for Website channel.
 * Returns structured JSON reflecting current order and task status.
 *
 * @param {Object} coordinatorResult - Return from stateCoordinator.handleEvent
 * @param {Object} stateManager - State manager
 * @param {string} channel - 'website' | 'whatsapp'
 * @returns {Object} Mock response body for website client
 */
function buildWebsiteResponse(coordinatorResult, stateManager, channel = 'website') {
  const payload = buildStatusPayload(coordinatorResult, stateManager);
  return {
    success: payload.success,
    message: payload.message,
    channel: 'website',
    orderId: payload.orderId,
    orderStatus: payload.orderStatus,
    tasks: payload.tasks,
    assignedStaff: payload.assignedStaff,
    timeRequiredHours: payload.timeRequiredHours ?? null,
    timeBreakdown: payload.timeBreakdown ?? null,
    deadline: payload.deadline ?? null,
    deadlineFeasible: payload.deadlineFeasible ?? null,
    estimatedCompletion: payload.estimatedCompletion ?? null,
    deadlineMessage: payload.deadlineMessage ?? null,
    timestamp: payload.timestamp,
    rawStatus: payload.status
  };
}

/**
 * Send update to WhatsApp (mock: console log).
 * Logs current order and task status in a readable format.
 *
 * @param {Object} coordinatorResult - Return from stateCoordinator.handleEvent
 * @param {Object} stateManager - State manager
 * @param {string} [customerId] - Optional customer/phone for context
 */
function sendWhatsAppUpdate(coordinatorResult, stateManager, customerId = null) {
  const payload = buildStatusPayload(coordinatorResult, stateManager);
  const lines = [
    '[OutputHandlers] 💬 WhatsApp update (mock)',
    `  To: ${customerId || 'customer'}`,
    `  Order: ${payload.orderId || '—'} | Status: ${payload.orderStatus || payload.status}`,
    `  Message: ${payload.message}`
  ];
  if (payload.timeRequiredHours != null) {
    lines.push(`  Time required: ${payload.timeRequiredHours.toFixed(2)}h total`);
    if (payload.deadline) {
      const feasibleStr = payload.deadlineFeasible === true ? 'Yes' : payload.deadlineFeasible === false ? 'No' : '—';
      lines.push(`  Deadline: ${payload.deadline} | Feasible: ${feasibleStr}`);
    } else {
      lines.push('  Deadline: not set');
    }
  }
  if (payload.tasks && payload.tasks.length > 0) {
    lines.push('  Tasks:');
    payload.tasks.forEach(t => {
      lines.push(`    - ${t.taskId} (${t.taskType}): ${t.status}${t.assignedTo ? ` → ${t.assignedTo}` : ''}`);
    });
  }
  if (payload.assignedStaff) {
    lines.push(`  Assigned to: ${payload.assignedStaff}`);
  }
  lines.push('');
  console.log(lines.join('\n'));
}

/**
 * Send update to Website (mock response).
 * Returns the object that would be sent to the website client.
 *
 * @param {Object} coordinatorResult - Return from stateCoordinator.handleEvent
 * @param {Object} stateManager - State manager
 * @returns {Object} Mock response body
 */
function sendWebsiteUpdate(coordinatorResult, stateManager) {
  const body = buildWebsiteResponse(coordinatorResult, stateManager, 'website');
  console.log('[OutputHandlers] 🌐 Website update (mock response):', JSON.stringify(body, null, 2));
  return body;
}

const outputHandlers = {
  buildStatusPayload,
  buildWebsiteResponse,
  sendWhatsAppUpdate,
  sendWebsiteUpdate
};

module.exports = outputHandlers;
