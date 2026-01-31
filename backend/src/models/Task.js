/**
 * TASK
 * 
 * Operational task created by Decision Engine
 * Assigned to staff by Coordination Agent
 * 
 * Real MSME Scenario:
 * - Order broken into tasks: Prepare → Quality Check → Pack
 * - Each task assigned to available staff
 * - Staff completes tasks and updates status
 * - System tracks progress in real-time
 */

class Task {
  constructor({
    taskId,             // Unique task ID (e.g., "TASK-001")
    orderId,            // Parent order ID (e.g., "ORD-156")
    taskType,           // "PREPARE" | "QUALITY_CHECK" | "PACK" | "DELIVER" | "CUSTOM"
    title,              // Human-readable title (e.g., "Prepare 15x Widget A")
    description,        // Detailed description or instructions
    requiredSkill,      // Required skill (e.g., "assembly", "quality_check")
    priority,           // "LOW" | "MEDIUM" | "HIGH" | "URGENT" (inherited from order)
    status,             // Task status (see below)
    assignedStaffId,    // Staff member ID (if assigned)
    assignedStaffName,  // Staff member name (if assigned)
    estimatedDuration,  // Estimated duration in hours (e.g., 1.5)
    actualDuration,     // Actual time taken (null until completed)
    dependsOn,          // Array of task IDs that must complete before this (e.g., ["TASK-001"])
    blockedBy,          // Task IDs blocking this task (if any)
    productId,          // Product being worked on (if applicable)
    quantity,           // Quantity to process
    location,           // Where task should be performed (e.g., "Assembly Floor")
    deadline,           // ISO timestamp (optional, if urgent)
    createdAt,          // ISO timestamp when task was created
    assignedAt,         // ISO timestamp when task was assigned
    startedAt,          // ISO timestamp when staff started working
    completedAt,        // ISO timestamp when task completed
    notes               // Additional notes or staff comments
  }) {
    this.taskId = taskId;
    this.orderId = orderId;
    this.taskType = taskType;
    this.title = title;
    this.description = description || '';
    this.requiredSkill = requiredSkill || '';
    this.priority = priority;
    this.status = status || 'PENDING';
    this.assignedStaffId = assignedStaffId || null;
    this.assignedStaffName = assignedStaffName || null;
    this.estimatedDuration = estimatedDuration;
    this.actualDuration = actualDuration || null;
    this.dependsOn = dependsOn || [];
    this.blockedBy = blockedBy || [];
    this.productId = productId || null;
    this.quantity = quantity || 0;
    this.location = location || '';
    this.deadline = deadline || null;
    this.createdAt = createdAt || new Date().toISOString();
    this.assignedAt = assignedAt || null;
    this.startedAt = startedAt || null;
    this.completedAt = completedAt || null;
    this.notes = notes || '';
  }

  /**
   * Task Status Flow:
   * - PENDING: Created, not yet assigned
   * - ASSIGNED: Assigned to staff, waiting to start
   * - IN_PROGRESS: Staff is working on it
   * - BLOCKED: Cannot proceed (waiting on dependencies)
   * - COMPLETED: Task finished successfully
   * - FAILED: Task failed (needs intervention)
   * - CANCELLED: Task cancelled
   */

  /**
   * Check if task is ready to start (no blocking dependencies)
   */
  isReadyToStart() {
    return (
      this.status === 'ASSIGNED' &&
      this.dependsOn.length === 0 &&
      this.blockedBy.length === 0
    );
  }

  /**
   * Check if task is overdue
   */
  isOverdue() {
    if (!this.deadline) return false;
    return new Date() > new Date(this.deadline);
  }

  /**
   * Calculate time elapsed since task started
   */
  getElapsedTime() {
    if (!this.startedAt) return 0;
    const start = new Date(this.startedAt);
    const end = this.completedAt ? new Date(this.completedAt) : new Date();
    return (end - start) / (1000 * 60 * 60); // Convert to hours
  }

  toJSON() {
    return {
      taskId: this.taskId,
      orderId: this.orderId,
      taskType: this.taskType,
      title: this.title,
      description: this.description,
      requiredSkill: this.requiredSkill,
      priority: this.priority,
      status: this.status,
      assignedStaffId: this.assignedStaffId,
      assignedStaffName: this.assignedStaffName,
      estimatedDuration: this.estimatedDuration,
      actualDuration: this.actualDuration,
      dependsOn: this.dependsOn,
      blockedBy: this.blockedBy,
      productId: this.productId,
      quantity: this.quantity,
      location: this.location,
      deadline: this.deadline,
      createdAt: this.createdAt,
      assignedAt: this.assignedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      isOverdue: this.isOverdue(),
      elapsedTime: this.getElapsedTime(),
      notes: this.notes
    };
  }
}

module.exports = Task;
