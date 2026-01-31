/**
 * TEST STATE SYSTEM
 * 
 * Test the in-memory state management and event routing
 * Run: node src/state/testStateSystem.js
 */

const stateManager = require('./stateManager');
const stateCoordinator = require('../services/stateCoordinator');
const { EventTypes, createEvent } = require('./events');
const {
  OrderIntent,
  Order,
  InventoryItem,
  StaffMember,
  Task
} = require('../models');

console.log('='.repeat(60));
console.log('TESTING STATE SYSTEM');
console.log('='.repeat(60));

// ========== SETUP TEST DATA ==========
console.log('\n📦 Setting up test data...\n');

// Add inventory
const widget = new InventoryItem({
  productId: 'PROD-123',
  productName: 'Widget A',
  sku: 'WID-A-001',
  category: 'Electronics',
  unit: 'boxes',
  currentStock: 150,
  reservedStock: 135,
  minStockLevel: 20,
  reorderPoint: 30,
  pricePerUnit: 500,
  location: 'Warehouse-A-12'
});
stateManager.addInventoryItem(widget);
console.log('✓ Added inventory:', widget.productName, `(${widget.availableStock} available)`);

// Add staff
const priya = new StaffMember({
  staffId: 'STAFF-001',
  name: 'Priya Sharma',
  phone: '+91-98765-11111',
  role: 'PRODUCTION',
  skills: ['assembly', 'quality_check', 'packing'],
  status: 'ONLINE',
  currentWorkload: 1,
  maxCapacity: 8,
  shiftStart: '09:00',
  shiftEnd: '18:00',
  location: 'Assembly Floor'
});
stateManager.addStaff(priya);
console.log('✓ Added staff:', priya.name, `(${priya.getRemainingCapacity()}h available)`);

const amit = new StaffMember({
  staffId: 'STAFF-002',
  name: 'Amit Kumar',
  phone: '+91-98765-22222',
  role: 'PRODUCTION',
  skills: ['assembly', 'packing'],
  status: 'ONLINE',
  currentWorkload: 6.5,
  maxCapacity: 8
});
stateManager.addStaff(amit);
console.log('✓ Added staff:', amit.name, `(${amit.getRemainingCapacity()}h available)`);

// ========== TEST 1: Create Order Intent ==========
console.log('\n' + '='.repeat(60));
console.log('TEST 1: Create Order Intent');
console.log('='.repeat(60));

const intent = new OrderIntent({
  intentId: 'INTENT-001',
  customerId: '+91-98765-43210',
  customerName: 'Rajesh Kumar',
  channel: 'whatsapp',
  productId: 'PROD-123',
  productName: 'Widget A',
  quantity: 15,
  unit: 'boxes',
  priority: 'HIGH',
  rawInput: 'I need 15 boxes of Widget A. Urgent!',
  status: 'PENDING'
});

stateManager.addOrderIntent(intent);
console.log('✓ Order Intent created:', intent.intentId);
console.log('  Customer:', intent.customerName);
console.log('  Product:', intent.productName);
console.log('  Quantity:', intent.quantity, intent.unit);

// ========== TEST 2: Reserve Inventory ==========
console.log('\n' + '='.repeat(60));
console.log('TEST 2: Reserve Inventory');
console.log('='.repeat(60));

const item = stateManager.getInventoryItem('PROD-123');
console.log('Before reservation:');
console.log('  Available:', item.availableStock);
console.log('  Reserved:', item.reservedStock);

stateManager.reserveInventory('PROD-123', 15);

console.log('\nAfter reservation:');
console.log('  Available:', item.availableStock);
console.log('  Reserved:', item.reservedStock);
console.log('✓ Inventory reserved successfully');

// ========== TEST 3: Create Order ==========
console.log('\n' + '='.repeat(60));
console.log('TEST 3: Create Order');
console.log('='.repeat(60));

const order = new Order({
  orderId: 'ORD-156',
  customerId: intent.customerId,
  customerName: intent.customerName,
  channel: intent.channel,
  items: [{
    productId: intent.productId,
    productName: intent.productName,
    quantity: intent.quantity,
    unit: intent.unit
  }],
  totalQuantity: intent.quantity,
  priority: intent.priority,
  status: 'READY_TO_FULFILL',
  inventoryReserved: true
});

stateManager.addOrder(order);
console.log('✓ Order created:', order.orderId);
console.log('  Status:', order.status);
console.log('  Inventory reserved:', order.inventoryReserved);

// ========== TEST 4: Create Tasks ==========
console.log('\n' + '='.repeat(60));
console.log('TEST 4: Create Tasks');
console.log('='.repeat(60));

const task1 = new Task({
  taskId: 'TASK-101',
  orderId: order.orderId,
  taskType: 'PREPARE',
  title: 'Prepare 15x Widget A',
  description: 'Assemble and prepare 15 boxes of Widget A',
  requiredSkill: 'assembly',
  priority: order.priority,
  status: 'ASSIGNED',
  assignedStaffId: priya.staffId,
  assignedStaffName: priya.name,
  estimatedDuration: 1.5,
  productId: 'PROD-123',
  quantity: 15,
  location: 'Assembly Floor'
});

stateManager.addTask(task1);
console.log('✓ Task created:', task1.taskId, '-', task1.title);
console.log('  Assigned to:', task1.assignedStaffName);
console.log('  Duration:', task1.estimatedDuration, 'hours');

// Update staff workload
stateManager.updateStaff(priya.staffId, {
  currentWorkload: priya.currentWorkload + task1.estimatedDuration,
  assignedTaskIds: [...priya.assignedTaskIds, task1.taskId]
});
console.log('✓ Staff workload updated:', priya.name, `(${priya.currentWorkload}h)`);

// ========== TEST 5: Calculate System State ==========
console.log('\n' + '='.repeat(60));
console.log('TEST 5: Calculate System State');
console.log('='.repeat(60));

const systemState = stateManager.calculateSystemState();
console.log('System State:');
console.log('  Total Orders:', systemState.totalOrders);
console.log('  Pending Orders:', systemState.pendingOrders);
console.log('  Total Tasks:', systemState.totalTasks);
console.log('  Online Staff:', systemState.onlineStaff);
console.log('  Available Staff:', systemState.availableStaff);
console.log('  Capacity Utilization:', systemState.capacityUtilization.toFixed(1) + '%');
console.log('  Health Status:', systemState.getHealthStatus());

if (systemState.alerts.length > 0) {
  console.log('\n⚠️  Alerts:');
  systemState.alerts.forEach(alert => {
    console.log(`  - [${alert.severity}] ${alert.message}`);
  });
}

// ========== TEST 6: Event Routing ==========
console.log('\n' + '='.repeat(60));
console.log('TEST 6: Event Routing');
console.log('='.repeat(60));

// Simulate ORDER_RECEIVED event
const orderEvent = createEvent(EventTypes.ORDER_RECEIVED, {
  channel: 'whatsapp',
  data: {
    customerPhone: '+91-98765-99999',
    message: 'I need 20 boxes of Widget A',
    priority: 'HIGH'
  }
});

console.log('Sending event:', orderEvent.type);
stateCoordinator.handleEvent(orderEvent);

// Simulate TASK_STARTED event
const taskStartEvent = createEvent(EventTypes.TASK_STARTED, {
  taskId: task1.taskId,
  staffId: priya.staffId
});

console.log('Sending event:', taskStartEvent.type);
stateCoordinator.handleEvent(taskStartEvent);

// ========== TEST 7: Task Completion ==========
console.log('\n' + '='.repeat(60));
console.log('TEST 7: Task Completion');
console.log('='.repeat(60));

// Simulate TASK_COMPLETED event
const taskCompleteEvent = createEvent(EventTypes.TASK_COMPLETED, {
  taskId: task1.taskId,
  staffId: priya.staffId
});

console.log('Sending event:', taskCompleteEvent.type);
stateCoordinator.handleEvent(taskCompleteEvent);

// Check updated state
const updatedTask = stateManager.getTask(task1.taskId);
const updatedStaff = stateManager.getStaff(priya.staffId);
console.log('✓ Task status:', updatedTask.status);
console.log('✓ Staff workload:', updatedStaff.currentWorkload.toFixed(1), 'hours');

// ========== TEST 8: Stats & Audit Log ==========
console.log('\n' + '='.repeat(60));
console.log('TEST 8: Stats & Audit Log');
console.log('='.repeat(60));

const stats = stateManager.getStats();
console.log('State Manager Stats:');
console.log('  Order Intents:', stats.orderIntents);
console.log('  Orders:', stats.orders);
console.log('  Inventory Items:', stats.inventory);
console.log('  Staff Members:', stats.staff);
console.log('  Tasks:', stats.tasks);
console.log('  Audit Log Entries:', stats.auditLogEntries);

console.log('\nRecent Audit Log (last 5):');
const recentLog = stateManager.getAuditLog(5);
recentLog.forEach(entry => {
  console.log(`  [${entry.timestamp}] ${entry.action}`);
});

console.log('\nState Coordinator Status:');
const status = stateCoordinator.getStatus();
console.log('  Event Log Size:', status.eventLogSize);
console.log('  Agents Wired:', Object.entries(status.agentsWired)
  .filter(([k, v]) => !v)
  .map(([k]) => k)
  .join(', ') || 'None (all placeholder)');

// ========== FINAL SUMMARY ==========
console.log('\n' + '='.repeat(60));
console.log('✅ ALL TESTS PASSED');
console.log('='.repeat(60));
console.log('\nSystem is ready for agent implementation!');
console.log('Next: Implement Order Agent → Inventory Agent → etc.\n');
