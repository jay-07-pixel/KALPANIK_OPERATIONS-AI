/**
 * STATE MANAGER
 * 
 * In-memory state storage for the agentic system
 * 
 * Responsibilities:
 * - Store current state (orders, inventory, staff, tasks)
 * - Provide read/write access
 * - Calculate derived metrics (SystemState)
 * 
 * Storage Structure:
 * - Map-based storage for O(1) lookups
 * - No database (in-memory only for MVP)
 */

const { SystemState } = require('../models');

class StateManager {
  constructor() {
    // Core state storage (Map for O(1) lookups)
    this.orderIntents = new Map();     // intentId -> OrderIntent
    this.orders = new Map();           // orderId -> Order
    this.inventory = new Map();        // productId -> InventoryItem
    this.staff = new Map();            // staffId -> StaffMember
    this.tasks = new Map();            // taskId -> Task
    
    // Audit log (for debugging and explainability)
    this.auditLog = [];
    
    // Last state snapshot
    this.lastSystemState = null;
  }

  // ========== ORDER INTENTS ==========
  
  addOrderIntent(orderIntent) {
    this.orderIntents.set(orderIntent.intentId, orderIntent);
    this._log('ORDER_INTENT_ADDED', { intentId: orderIntent.intentId });
    return orderIntent;
  }

  getOrderIntent(intentId) {
    return this.orderIntents.get(intentId);
  }

  getAllOrderIntents() {
    return Array.from(this.orderIntents.values());
  }

  updateOrderIntent(intentId, updates) {
    const intent = this.orderIntents.get(intentId);
    if (!intent) throw new Error(`OrderIntent ${intentId} not found`);
    
    Object.assign(intent, updates);
    intent.updatedAt = new Date().toISOString();
    this._log('ORDER_INTENT_UPDATED', { intentId, updates });
    return intent;
  }

  deleteOrderIntent(intentId) {
    const deleted = this.orderIntents.delete(intentId);
    if (deleted) {
      this._log('ORDER_INTENT_DELETED', { intentId });
    }
    return deleted;
  }

  // ========== ORDERS ==========
  
  addOrder(order) {
    this.orders.set(order.orderId, order);
    this._log('ORDER_ADDED', { orderId: order.orderId });
    return order;
  }

  getOrder(orderId) {
    return this.orders.get(orderId);
  }

  getAllOrders() {
    return Array.from(this.orders.values());
  }

  updateOrder(orderId, updates) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    
    Object.assign(order, updates);
    order.updatedAt = new Date().toISOString();
    this._log('ORDER_UPDATED', { orderId, updates });
    return order;
  }

  // ========== INVENTORY ==========
  
  addInventoryItem(item) {
    this.inventory.set(item.productId, item);
    this._log('INVENTORY_ADDED', { productId: item.productId });
    return item;
  }

  getInventoryItem(productId) {
    return this.inventory.get(productId);
  }

  /**
   * Find inventory item by product name (case-insensitive)
   * Used when OrderIntent has productName but no productId (e.g. from WhatsApp)
   */
  getInventoryItemByName(productName) {
    if (!productName || typeof productName !== 'string') return null;
    const normalized = productName.trim().toLowerCase();
    const items = this.getAllInventory();
    return items.find(item => 
      item.productName && item.productName.toLowerCase() === normalized
    ) || items.find(item => 
      item.productName && item.productName.toLowerCase().includes(normalized)
    ) || null;
  }

  getAllInventory() {
    return Array.from(this.inventory.values());
  }

  updateInventory(productId, updates) {
    const item = this.inventory.get(productId);
    if (!item) throw new Error(`Inventory item ${productId} not found`);
    
    Object.assign(item, updates);
    
    // Recalculate available stock
    item.availableStock = item.currentStock - item.reservedStock;
    item.updatedAt = new Date().toISOString();
    
    this._log('INVENTORY_UPDATED', { productId, updates });
    return item;
  }

  reserveInventory(productId, quantity) {
    const item = this.inventory.get(productId);
    if (!item) throw new Error(`Inventory item ${productId} not found`);
    
    if (item.availableStock < quantity) {
      throw new Error(`Insufficient stock for ${productId}. Available: ${item.availableStock}, Requested: ${quantity}`);
    }
    
    item.reservedStock += quantity;
    item.availableStock = item.currentStock - item.reservedStock;
    item.updatedAt = new Date().toISOString();
    
    this._log('INVENTORY_RESERVED', { productId, quantity, newReserved: item.reservedStock });
    return item;
  }

  releaseInventory(productId, quantity) {
    const item = this.inventory.get(productId);
    if (!item) throw new Error(`Inventory item ${productId} not found`);
    
    item.reservedStock = Math.max(0, item.reservedStock - quantity);
    item.availableStock = item.currentStock - item.reservedStock;
    item.updatedAt = new Date().toISOString();
    
    this._log('INVENTORY_RELEASED', { productId, quantity, newReserved: item.reservedStock });
    return item;
  }

  // ========== STAFF ==========
  
  addStaff(staff) {
    this.staff.set(staff.staffId, staff);
    this._log('STAFF_ADDED', { staffId: staff.staffId });
    return staff;
  }

  getStaff(staffId) {
    return this.staff.get(staffId);
  }

  getAllStaff() {
    return Array.from(this.staff.values());
  }

  updateStaff(staffId, updates) {
    const staff = this.staff.get(staffId);
    if (!staff) throw new Error(`Staff ${staffId} not found`);
    
    Object.assign(staff, updates);
    staff.updatedAt = new Date().toISOString();
    
    this._log('STAFF_UPDATED', { staffId, updates });
    return staff;
  }

  getAvailableStaff() {
    return this.getAllStaff().filter(s => 
      s.status === 'ONLINE' && s.getRemainingCapacity() > 0
    );
  }

  // ========== TASKS ==========
  
  addTask(task) {
    this.tasks.set(task.taskId, task);
    this._log('TASK_ADDED', { taskId: task.taskId, orderId: task.orderId });
    return task;
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  getTasksByOrder(orderId) {
    return this.getAllTasks().filter(t => t.orderId === orderId);
  }

  getTasksByStaff(staffId) {
    return this.getAllTasks().filter(t => t.assignedStaffId === staffId);
  }

  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    
    Object.assign(task, updates);
    
    this._log('TASK_UPDATED', { taskId, updates });
    return task;
  }

  // ========== SYSTEM STATE CALCULATION ==========
  
  calculateSystemState() {
    const orders = this.getAllOrders();
    const inventory = this.getAllInventory();
    const staffMembers = this.getAllStaff();
    const tasks = this.getAllTasks();

    // Calculate order metrics
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'READY_TO_FULFILL' || o.status === 'TASKS_PLANNED').length;
    const inProgressOrders = orders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'ASSIGNED').length;
    const completedToday = orders.filter(o => {
      if (!o.completedAt) return false;
      const today = new Date().toDateString();
      return new Date(o.completedAt).toDateString() === today;
    }).length;

    // Calculate inventory metrics
    const totalProducts = inventory.length;
    const lowStockProducts = inventory.filter(i => i.needsRestock()).length;
    const outOfStockProducts = inventory.filter(i => i.availableStock === 0).length;

    // Calculate staff metrics
    const totalStaff = staffMembers.length;
    const onlineStaff = staffMembers.filter(s => s.status === 'ONLINE').length;
    const availableStaff = staffMembers.filter(s => s.status === 'ONLINE' && s.getRemainingCapacity() > 0).length;
    const busyStaff = staffMembers.filter(s => s.getWorkloadPercentage() > 80).length;
    const averageWorkload = staffMembers.length > 0
      ? staffMembers.reduce((sum, s) => sum + s.getWorkloadPercentage(), 0) / staffMembers.length
      : 0;

    // Calculate task metrics
    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(t => t.status === 'PENDING').length;
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const completedTasksToday = tasks.filter(t => {
      if (!t.completedAt) return false;
      const today = new Date().toDateString();
      return new Date(t.completedAt).toDateString() === today;
    }).length;
    const overdueTasks = tasks.filter(t => t.isOverdue()).length;

    // Calculate capacity metrics
    const totalCapacity = staffMembers.reduce((sum, s) => sum + s.maxCapacity, 0);
    const usedCapacity = staffMembers.reduce((sum, s) => sum + s.currentWorkload, 0);
    const remainingCapacity = totalCapacity - usedCapacity;
    const capacityUtilization = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;

    // Calculate system health
    const systemLoad = capacityUtilization;
    const isOverloaded = capacityUtilization > 90;
    const needsAttention = overdueTasks > 0 || outOfStockProducts > 0;
    const canAcceptOrders = availableStaff > 0 && !isOverloaded;

    // Build alerts
    const alerts = [];
    if (outOfStockProducts > 0) {
      alerts.push({ type: 'OUT_OF_STOCK', message: `${outOfStockProducts} products out of stock`, severity: 'CRITICAL' });
    }
    if (lowStockProducts > 0) {
      alerts.push({ type: 'LOW_STOCK', message: `${lowStockProducts} products need restocking`, severity: 'MEDIUM' });
    }
    if (overdueTasks > 0) {
      alerts.push({ type: 'OVERDUE_TASKS', message: `${overdueTasks} tasks overdue`, severity: 'HIGH' });
    }
    if (isOverloaded) {
      alerts.push({ type: 'SYSTEM_OVERLOAD', message: 'System capacity exceeded', severity: 'CRITICAL' });
    }

    const systemState = new SystemState({
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedToday,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalStaff,
      onlineStaff,
      busyStaff,
      availableStaff,
      averageWorkload,
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasksToday,
      overdueTasks,
      systemLoad,
      alerts,
      totalCapacity,
      usedCapacity,
      remainingCapacity,
      capacityUtilization,
      isOverloaded,
      needsAttention,
      canAcceptOrders
    });

    this.lastSystemState = systemState;
    return systemState;
  }

  getSystemState() {
    return this.lastSystemState || this.calculateSystemState();
  }

  // ========== AUDIT LOG ==========
  
  _log(action, data) {
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      action,
      data
    });
    
    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }
  }

  getAuditLog(limit = 100) {
    return this.auditLog.slice(-limit);
  }

  // ========== UTILITY ==========
  
  getStats() {
    return {
      orderIntents: this.orderIntents.size,
      orders: this.orders.size,
      inventory: this.inventory.size,
      staff: this.staff.size,
      tasks: this.tasks.size,
      auditLogEntries: this.auditLog.length
    };
  }

  reset() {
    this.orderIntents.clear();
    this.orders.clear();
    this.inventory.clear();
    this.staff.clear();
    this.tasks.clear();
    this.auditLog = [];
    this.lastSystemState = null;
    this._log('STATE_RESET', {});
  }
}

// Singleton instance
const stateManager = new StateManager();

module.exports = stateManager;
