/**
 * ORDER CREATION
 *
 * Converts a validated OrderIntent into a confirmed Order.
 *
 * WHY ORDER CREATION HAPPENS HERE:
 * ---------------------------------
 * 1. We only create a confirmed Order AFTER inventory is reserved.
 *    Until then we have only an OrderIntent (temporary). Creating an Order
 *    here guarantees we never have "confirmed" orders without stock.
 *
 * 2. This step runs ONLY when InventoryAgent returns AVAILABLE. If inventory
 *    is NOT_AVAILABLE, the flow stops at OrderIntent (REJECTED) and no Order
 *    is ever created. That keeps system state consistent: every Order in
 *    state has reserved inventory.
 *
 * 3. Order creation is a single place of truth: one function converts
 *    Intent → Order, assigns orderId, and sets initial status. Downstream
 *    agents (Decision Engine, Task Executor) work with Order, not OrderIntent.
 *
 * 4. Emitting ORDER_CREATED here (from the caller) allows the rest of the
 *    system to react to "new confirmed order" without coupling to inventory.
 */

const { Order } = require('../models');
const stateManager = require('../state/stateManager');
const { EventTypes, createEvent } = require('../state/events');

/**
 * Generate next order ID (e.g. ORD-001, ORD-002).
 * Deterministic: based on current order count in state.
 */
function _nextOrderId() {
  const existing = stateManager.getAllOrders();
  const nextNum = existing.length + 1;
  return `ORD-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Convert a validated OrderIntent + inventory result into a confirmed Order.
 * Call this ONLY when InventoryAgent has returned status === 'AVAILABLE' and
 * stock has been reserved.
 *
 * @param {OrderIntent} orderIntent - Validated intent (status VALIDATED, inventory reserved)
 * @param {Object} inventoryResult - Result from inventoryAgent.checkAvailability() with status 'AVAILABLE'
 * @returns {Order} The new confirmed Order (not yet persisted; caller adds to state and emits event)
 */
function createOrderFromIntent(orderIntent, inventoryResult) {
  const orderId = _nextOrderId();

  const productId = inventoryResult.productId || orderIntent.productId;
  const productName = inventoryResult.productName || orderIntent.productName;
  const quantity = inventoryResult.quantity ?? orderIntent.quantity;
  const unit = inventoryResult.unit || orderIntent.unit || 'pieces';

  const items = [
    {
      productId,
      productName,
      quantity,
      unit
    }
  ];

  const order = new Order({
    orderId,
    customerId: orderIntent.customerId,
    customerName: orderIntent.customerName,
    channel: orderIntent.channel,
    items,
    totalQuantity: quantity,
    priority: orderIntent.priority,
    deadline: orderIntent.deadline || null,
    status: 'READY_TO_FULFILL',
    inventoryReserved: true,
    assignedStaffId: null,
    assignedStaffName: null,
    taskIds: [],
    notes: orderIntent.rawInput?.notes || orderIntent.notes || ''
  });

  return order;
}

/**
 * Persist the order to state, update intent to CONVERTED, and return the event
 * to emit (ORDER_CREATED). Caller (State Coordinator) is responsible for
 * emitting the event and recalculating system state.
 *
 * @param {Order} order - Order returned from createOrderFromIntent()
 * @param {OrderIntent} orderIntent - The intent that was converted
 * @returns {{ order: Order, event: Object }} Order and ORDER_CREATED event payload
 */
function persistOrderAndPrepareEvent(order, orderIntent) {
  stateManager.addOrder(order);
  stateManager.updateOrderIntent(orderIntent.intentId, { status: 'CONVERTED' });

  const event = createEvent(EventTypes.ORDER_CREATED, {
    orderId: order.orderId,
    intentId: orderIntent.intentId,
    customerId: order.customerId,
    customerName: order.customerName,
    channel: order.channel,
    items: order.items,
    totalQuantity: order.totalQuantity,
    priority: order.priority,
    status: order.status,
    inventoryReserved: order.inventoryReserved
  });

  return { order, event };
}

module.exports = {
  createOrderFromIntent,
  persistOrderAndPrepareEvent
};
