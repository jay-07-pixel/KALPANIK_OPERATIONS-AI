/**
 * ORDER
 * 
 * Confirmed order after inventory validation
 * Created when OrderIntent is approved
 * 
 * Lifecycle:
 * - Created: Inventory confirmed available
 * - Ready to Fulfill: Tasks planned
 * - In Progress: Staff working on it
 * - Completed: All tasks done
 * - Delivered: Customer received
 * 
 * This is the core entity that flows through the entire system
 */

class Order {
  constructor({
    orderId,            // Unique order ID (e.g., "ORD-156")
    customerId,         // Customer ID or phone number
    customerName,       // Customer name
    channel,            // "website" | "whatsapp"
    items,              // Array of {productId, productName, quantity, unit}
    totalQuantity,      // Sum of all item quantities
    priority,           // "LOW" | "MEDIUM" | "HIGH" | "URGENT"
    deadline,           // ISO timestamp (optional)
    status,             // Order status (see below)
    inventoryReserved,  // Boolean: Is inventory reserved?
    assignedStaffId,    // Staff member ID (if assigned)
    assignedStaffName,  // Staff member name (if assigned)
    taskIds,            // Array of task IDs associated with this order
    createdAt,          // ISO timestamp when order was created
    updatedAt,          // ISO timestamp of last update
    estimatedCompletion,// ISO timestamp when order should be ready
    completedAt,        // ISO timestamp when order completed (null if ongoing)
    notes               // Additional notes or special instructions
  }) {
    this.orderId = orderId;
    this.customerId = customerId;
    this.customerName = customerName;
    this.channel = channel;
    this.items = items || [];
    this.totalQuantity = totalQuantity || 0;
    this.priority = priority;
    this.deadline = deadline || null;
    this.status = status || 'READY_TO_FULFILL';
    this.inventoryReserved = inventoryReserved || false;
    this.assignedStaffId = assignedStaffId || null;
    this.assignedStaffName = assignedStaffName || null;
    this.taskIds = taskIds || [];
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
    this.estimatedCompletion = estimatedCompletion || null;
    this.completedAt = completedAt || null;
    this.notes = notes || '';
  }

  /**
   * Order Status Flow:
   * - READY_TO_FULFILL: Order confirmed, awaiting task creation
   * - TASKS_PLANNED: Tasks created, awaiting staff assignment
   * - ASSIGNED: Tasks assigned to staff
   * - IN_PROGRESS: Staff working on order
   * - QUALITY_CHECK: Quality verification in progress
   * - PACKING: Being packed for delivery
   * - READY_FOR_DELIVERY: Packed and ready
   * - OUT_FOR_DELIVERY: In transit to customer
   * - DELIVERED: Customer received
   * - CANCELLED: Order cancelled
   */

  toJSON() {
    return {
      orderId: this.orderId,
      customerId: this.customerId,
      customerName: this.customerName,
      channel: this.channel,
      items: this.items,
      totalQuantity: this.totalQuantity,
      priority: this.priority,
      deadline: this.deadline,
      status: this.status,
      inventoryReserved: this.inventoryReserved,
      assignedStaffId: this.assignedStaffId,
      assignedStaffName: this.assignedStaffName,
      taskIds: this.taskIds,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      estimatedCompletion: this.estimatedCompletion,
      completedAt: this.completedAt,
      notes: this.notes
    };
  }
}

module.exports = Order;
