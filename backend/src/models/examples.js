/**
 * MODEL USAGE EXAMPLES
 * 
 * Shows how to use the domain models
 * These are NOT real implementations - just examples for reference
 */

const {
  OrderIntent,
  Order,
  InventoryItem,
  StaffMember,
  Task,
  SystemState
} = require('./index');

// ===== EXAMPLE 1: OrderIntent (from WhatsApp) =====
const whatsappIntent = new OrderIntent({
  intentId: 'INTENT-001',
  customerId: '+91-98765-43210',
  customerName: 'Rajesh Kumar',
  channel: 'whatsapp',
  productId: 'PROD-123',
  productName: 'Widget A',
  quantity: 15,
  unit: 'boxes',
  priority: 'HIGH',
  deadline: '2026-02-01T15:00:00Z',
  rawInput: 'Hi, I need 15 boxes of Widget A by tomorrow 3pm. Urgent!',
  status: 'PENDING'
});

console.log('WhatsApp Intent:', whatsappIntent.toJSON());

// ===== EXAMPLE 2: Order (converted from OrderIntent) =====
const confirmedOrder = new Order({
  orderId: 'ORD-156',
  customerId: '+91-98765-43210',
  customerName: 'Rajesh Kumar',
  channel: 'whatsapp',
  items: [
    {
      productId: 'PROD-123',
      productName: 'Widget A',
      quantity: 15,
      unit: 'boxes'
    }
  ],
  totalQuantity: 15,
  priority: 'HIGH',
  deadline: '2026-02-01T15:00:00Z',
  status: 'READY_TO_FULFILL',
  inventoryReserved: true,
  notes: 'Customer needs by tomorrow 3pm'
});

console.log('Confirmed Order:', confirmedOrder.toJSON());

// ===== EXAMPLE 3: InventoryItem =====
const widgetA = new InventoryItem({
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

console.log('Inventory Item:', widgetA.toJSON());
console.log('Can fulfill 15 boxes?', widgetA.canFulfill(15)); // true
console.log('Needs restock?', widgetA.needsRestock()); // true (available = 15, reorder = 30)

// ===== EXAMPLE 4: StaffMember =====
const priya = new StaffMember({
  staffId: 'STAFF-002',
  name: 'Priya Sharma',
  phone: '+91-98765-11111',
  role: 'PRODUCTION',
  skills: ['assembly', 'quality_check', 'packing'],
  status: 'ONLINE',
  currentWorkload: 1, // 1 hour of work
  maxCapacity: 8, // 8-hour shift
  shiftStart: '09:00',
  shiftEnd: '18:00',
  location: 'Assembly Floor',
  performanceRating: 4.5
});

console.log('Staff Member:', priya.toJSON());
console.log('Can take 2.5h task?', priya.canTakeTask(2.5)); // true (1 + 2.5 < 8)
console.log('Remaining capacity:', priya.getRemainingCapacity()); // 7 hours

// ===== EXAMPLE 5: Task =====
const prepareTask = new Task({
  taskId: 'TASK-101',
  orderId: 'ORD-156',
  taskType: 'PREPARE',
  title: 'Prepare 15x Widget A',
  description: 'Assemble and prepare 15 boxes of Widget A for order ORD-156',
  requiredSkill: 'assembly',
  priority: 'HIGH',
  status: 'ASSIGNED',
  assignedStaffId: 'STAFF-002',
  assignedStaffName: 'Priya Sharma',
  estimatedDuration: 1.5, // 90 minutes
  productId: 'PROD-123',
  quantity: 15,
  location: 'Assembly Floor',
  deadline: '2026-01-31T14:30:00Z'
});

console.log('Task:', prepareTask.toJSON());
console.log('Is ready to start?', prepareTask.isReadyToStart()); // true

// ===== EXAMPLE 6: SystemState =====
const currentState = new SystemState({
  totalOrders: 45,
  pendingOrders: 12,
  inProgressOrders: 8,
  completedToday: 5,
  totalProducts: 25,
  lowStockProducts: 3,
  outOfStockProducts: 1,
  totalStaff: 10,
  onlineStaff: 8,
  availableStaff: 5,
  busyStaff: 3,
  averageWorkload: 65.5,
  totalTasks: 24,
  pendingTasks: 6,
  inProgressTasks: 10,
  completedTasksToday: 15,
  overdueTasks: 2,
  totalCapacity: 80, // 10 staff * 8 hours
  usedCapacity: 52.4,
  remainingCapacity: 27.6,
  capacityUtilization: 65.5,
  systemLoad: 68,
  alerts: [
    { type: 'LOW_STOCK', message: 'Widget B below reorder point', severity: 'MEDIUM' }
  ],
  canAcceptOrders: true
});

console.log('System State:', currentState.toJSON());
console.log('Dashboard Summary:', currentState.getDashboardSummary());
console.log('Health Status:', currentState.getHealthStatus()); // HEALTHY

// ===== EXAMPLE 7: Complete Flow =====
/*
1. WhatsApp message arrives → Create OrderIntent
2. Order Agent parses → Extract product, quantity
3. Inventory Agent checks → Widget A available (15 boxes)
4. Create Order → ORD-156
5. Decision Engine creates Tasks → T1: Prepare, T2: Quality Check, T3: Pack
6. Workforce Agent selects → Priya (lowest workload)
7. Coordination Agent assigns → Tasks to Priya
8. Critic Agent validates → All constraints satisfied
9. Task Executor persists → Save to DB, notify Priya
10. System State updated → Metrics recalculated
*/

module.exports = {
  // Export examples for testing
  whatsappIntent,
  confirmedOrder,
  widgetA,
  priya,
  prepareTask,
  currentState
};
