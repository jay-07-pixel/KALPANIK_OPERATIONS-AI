/**
 * EVENT TYPES
 * 
 * Defines all events in the system
 * Events drive the agentic workflow
 * 
 * Event Structure:
 * {
 *   type: 'EVENT_NAME',
 *   timestamp: ISO string,
 *   data: { ... event-specific data }
 * }
 */

const EventTypes = {
  // Input Events (from external sources)
  ORDER_RECEIVED: 'ORDER_RECEIVED',               // New order from website/WhatsApp
  
  // Order Agent Events
  ORDER_INTENT_CREATED: 'ORDER_INTENT_CREATED',   // Order parsed, intent created
  ORDER_INTENT_VALIDATED: 'ORDER_INTENT_VALIDATED', // Intent validated
  ORDER_INTENT_REJECTED: 'ORDER_INTENT_REJECTED', // Intent rejected (invalid data)
  
  // Inventory Agent Events
  INVENTORY_CHECKED: 'INVENTORY_CHECKED',         // Stock availability checked
  INVENTORY_RESERVED: 'INVENTORY_RESERVED',       // Stock reserved for order
  INVENTORY_RELEASED: 'INVENTORY_RELEASED',       // Stock released (order cancelled)
  INVENTORY_INSUFFICIENT: 'INVENTORY_INSUFFICIENT', // Not enough stock
  
  // Order Creation Events
  ORDER_CREATED: 'ORDER_CREATED',                 // Order confirmed and created
  ORDER_UPDATED: 'ORDER_UPDATED',                 // Order status changed
  
  // Decision Engine Events
  TASKS_PLANNED: 'TASKS_PLANNED',                 // Tasks created for order
  
  // Workforce Agent Events
  STAFF_SELECTED: 'STAFF_SELECTED',               // Staff member selected
  STAFF_UNAVAILABLE: 'STAFF_UNAVAILABLE',         // No staff available
  
  // Coordination Agent Events
  TASKS_ASSIGNED: 'TASKS_ASSIGNED',               // Tasks assigned to staff
  WORKLOAD_UPDATED: 'WORKLOAD_UPDATED',           // Staff workload updated
  
  // Critic Agent Events
  PLAN_APPROVED: 'PLAN_APPROVED',                 // Plan validated and approved
  PLAN_REJECTED: 'PLAN_REJECTED',                 // Plan rejected (constraints violated)
  REPLAN_REQUESTED: 'REPLAN_REQUESTED',           // Replan requested after rejection
  
  // Task Executor Events
  TASKS_CREATED: 'TASKS_CREATED',                 // Tasks persisted to state
  NOTIFICATIONS_SENT: 'NOTIFICATIONS_SENT',       // Notifications sent
  
  // Task Progress Events (from staff app)
  TASK_STARTED: 'TASK_STARTED',                   // Staff started working
  TASK_COMPLETED: 'TASK_COMPLETED',               // Task finished
  TASK_FAILED: 'TASK_FAILED',                     // Task failed
  
  // System Events
  STATE_UPDATED: 'STATE_UPDATED',                 // System state recalculated
  ALERT_RAISED: 'ALERT_RAISED'                    // System alert triggered
};

/**
 * Create a new event
 */
function createEvent(type, data) {
  return {
    type,
    timestamp: new Date().toISOString(),
    data: data || {}
  };
}

/**
 * Event Flow Examples:
 * 
 * === Website Order Flow ===
 * ORDER_RECEIVED (website)
 *   → ORDER_INTENT_CREATED
 *   → INVENTORY_CHECKED
 *   → INVENTORY_RESERVED
 *   → ORDER_CREATED
 *   → TASKS_PLANNED
 *   → STAFF_SELECTED
 *   → TASKS_ASSIGNED
 *   → PLAN_APPROVED
 *   → TASKS_CREATED
 *   → NOTIFICATIONS_SENT
 * 
 * === WhatsApp Order Flow ===
 * ORDER_RECEIVED (whatsapp)
 *   → ORDER_INTENT_CREATED (with LLM parsing)
 *   → ORDER_INTENT_VALIDATED
 *   → INVENTORY_CHECKED
 *   → INVENTORY_RESERVED
 *   → ORDER_CREATED
 *   ... (same as above)
 * 
 * === Task Completion Flow ===
 * TASK_STARTED
 *   → TASK_COMPLETED
 *   → WORKLOAD_UPDATED
 *   → ORDER_UPDATED
 *   → STATE_UPDATED
 */

module.exports = {
  EventTypes,
  createEvent
};
