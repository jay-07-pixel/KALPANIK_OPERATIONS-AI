/**
 * SYSTEM STATE
 * 
 * Global snapshot of the entire system
 * Used by State Coordinator and Critic Agent
 * 
 * Real MSME Scenario:
 * - Owner needs to see overall status at a glance
 * - System uses this to make decisions
 * - Dashboard shows metrics from this state
 * 
 * This is the "single source of truth" for decision-making
 */

class SystemState {
  constructor({
    timestamp,          // ISO timestamp of this state snapshot
    
    // Order Metrics
    totalOrders,        // Total orders in system
    pendingOrders,      // Orders awaiting fulfillment
    inProgressOrders,   // Orders currently being worked on
    completedToday,     // Orders completed today
    
    // Inventory Metrics
    totalProducts,      // Total number of product types
    lowStockProducts,   // Products below reorder point
    outOfStockProducts, // Products with zero available stock
    totalInventoryValue,// Total value of inventory (optional)
    
    // Staff Metrics
    totalStaff,         // Total staff members
    onlineStaff,        // Staff currently online
    busyStaff,          // Staff with high workload (>80%)
    availableStaff,     // Staff available for new tasks
    averageWorkload,    // Average workload percentage
    
    // Task Metrics
    totalTasks,         // Total tasks in system
    pendingTasks,       // Tasks not yet assigned
    inProgressTasks,    // Tasks currently being worked on
    completedTasksToday,// Tasks completed today
    overdueTasks,       // Tasks past their deadline
    
    // System Health
    systemLoad,         // Overall system load percentage (0-100)
    bottlenecks,        // Array of bottlenecks: {type, reason, severity}
    alerts,             // Array of active alerts: {type, message, severity}
    
    // Capacity Metrics
    totalCapacity,      // Total staff capacity in hours
    usedCapacity,       // Currently used capacity
    remainingCapacity,  // Available capacity
    capacityUtilization,// Capacity utilization percentage
    
    // Performance Metrics
    averageOrderFulfillmentTime, // Average time to fulfill an order (hours)
    averageTaskCompletionTime,   // Average task completion time (hours)
    orderSuccessRate,            // Percentage of orders completed successfully
    
    // Real-time Flags
    isOverloaded,       // Boolean: System at or over capacity
    needsAttention,     // Boolean: Critical issues need manual intervention
    canAcceptOrders     // Boolean: Can system accept new orders?
  }) {
    this.timestamp = timestamp || new Date().toISOString();
    
    // Order Metrics
    this.totalOrders = totalOrders || 0;
    this.pendingOrders = pendingOrders || 0;
    this.inProgressOrders = inProgressOrders || 0;
    this.completedToday = completedToday || 0;
    
    // Inventory Metrics
    this.totalProducts = totalProducts || 0;
    this.lowStockProducts = lowStockProducts || 0;
    this.outOfStockProducts = outOfStockProducts || 0;
    this.totalInventoryValue = totalInventoryValue || 0;
    
    // Staff Metrics
    this.totalStaff = totalStaff || 0;
    this.onlineStaff = onlineStaff || 0;
    this.busyStaff = busyStaff || 0;
    this.availableStaff = availableStaff || 0;
    this.averageWorkload = averageWorkload || 0;
    
    // Task Metrics
    this.totalTasks = totalTasks || 0;
    this.pendingTasks = pendingTasks || 0;
    this.inProgressTasks = inProgressTasks || 0;
    this.completedTasksToday = completedTasksToday || 0;
    this.overdueTasks = overdueTasks || 0;
    
    // System Health
    this.systemLoad = systemLoad || 0;
    this.bottlenecks = bottlenecks || [];
    this.alerts = alerts || [];
    
    // Capacity Metrics
    this.totalCapacity = totalCapacity || 0;
    this.usedCapacity = usedCapacity || 0;
    this.remainingCapacity = remainingCapacity || 0;
    this.capacityUtilization = capacityUtilization || 0;
    
    // Performance Metrics
    this.averageOrderFulfillmentTime = averageOrderFulfillmentTime || 0;
    this.averageTaskCompletionTime = averageTaskCompletionTime || 0;
    this.orderSuccessRate = orderSuccessRate || 100;
    
    // Real-time Flags
    this.isOverloaded = isOverloaded || false;
    this.needsAttention = needsAttention || false;
    this.canAcceptOrders = canAcceptOrders !== false; // Default true
  }

  /**
   * Get overall system health status
   */
  getHealthStatus() {
    if (this.alerts.some(a => a.severity === 'CRITICAL')) return 'CRITICAL';
    if (this.isOverloaded) return 'OVERLOADED';
    if (this.needsAttention) return 'NEEDS_ATTENTION';
    if (this.systemLoad > 80) return 'HIGH_LOAD';
    return 'HEALTHY';
  }

  /**
   * Get dashboard summary (for owner view)
   */
  getDashboardSummary() {
    return {
      orders: {
        total: this.totalOrders,
        pending: this.pendingOrders,
        inProgress: this.inProgressOrders,
        completedToday: this.completedToday
      },
      staff: {
        online: this.onlineStaff,
        available: this.availableStaff,
        averageWorkload: `${this.averageWorkload.toFixed(1)}%`
      },
      inventory: {
        lowStock: this.lowStockProducts,
        outOfStock: this.outOfStockProducts
      },
      tasks: {
        pending: this.pendingTasks,
        inProgress: this.inProgressTasks,
        overdue: this.overdueTasks
      },
      health: this.getHealthStatus()
    };
  }

  toJSON() {
    return {
      timestamp: this.timestamp,
      totalOrders: this.totalOrders,
      pendingOrders: this.pendingOrders,
      inProgressOrders: this.inProgressOrders,
      completedToday: this.completedToday,
      totalProducts: this.totalProducts,
      lowStockProducts: this.lowStockProducts,
      outOfStockProducts: this.outOfStockProducts,
      totalInventoryValue: this.totalInventoryValue,
      totalStaff: this.totalStaff,
      onlineStaff: this.onlineStaff,
      busyStaff: this.busyStaff,
      availableStaff: this.availableStaff,
      averageWorkload: this.averageWorkload,
      totalTasks: this.totalTasks,
      pendingTasks: this.pendingTasks,
      inProgressTasks: this.inProgressTasks,
      completedTasksToday: this.completedTasksToday,
      overdueTasks: this.overdueTasks,
      systemLoad: this.systemLoad,
      bottlenecks: this.bottlenecks,
      alerts: this.alerts,
      totalCapacity: this.totalCapacity,
      usedCapacity: this.usedCapacity,
      remainingCapacity: this.remainingCapacity,
      capacityUtilization: this.capacityUtilization,
      averageOrderFulfillmentTime: this.averageOrderFulfillmentTime,
      averageTaskCompletionTime: this.averageTaskCompletionTime,
      orderSuccessRate: this.orderSuccessRate,
      isOverloaded: this.isOverloaded,
      needsAttention: this.needsAttention,
      canAcceptOrders: this.canAcceptOrders,
      healthStatus: this.getHealthStatus(),
      dashboardSummary: this.getDashboardSummary()
    };
  }
}

module.exports = SystemState;
