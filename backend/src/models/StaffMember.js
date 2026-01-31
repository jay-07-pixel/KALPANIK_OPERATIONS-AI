/**
 * STAFF MEMBER
 * 
 * Represents a worker in the MSME
 * Used by Workforce Agent to assign tasks
 * 
 * Real MSME Scenario:
 * - Small team (5-20 workers)
 * - Each worker has skills and capacity
 * - Need to balance workload fairly
 * - Track who's available, busy, or offline
 */

class StaffMember {
  constructor({
    staffId,            // Unique staff ID (e.g., "STAFF-001")
    name,               // Full name (e.g., "Priya Sharma")
    phone,              // Phone number (for WhatsApp notifications)
    email,              // Email address (optional)
    role,               // Role: "PRODUCTION" | "QUALITY" | "PACKING" | "DELIVERY" | "MANAGER"
    skills,             // Array of skills (e.g., ["assembly", "quality_check", "packing"])
    status,             // "ONLINE" | "BUSY" | "OFFLINE" | "ON_BREAK"
    currentWorkload,    // Current workload in hours (e.g., 3.5)
    maxCapacity,        // Maximum capacity in hours per day (e.g., 8)
    assignedTaskIds,    // Array of currently assigned task IDs
    completedTasksToday,// Number of tasks completed today
    performanceRating,  // Performance rating (1-5 scale)
    shiftStart,         // Shift start time (e.g., "09:00")
    shiftEnd,           // Shift end time (e.g., "18:00")
    location,           // Work location (e.g., "Assembly Floor", "Warehouse")
    lastActiveAt,       // ISO timestamp of last activity
    createdAt,          // ISO timestamp when staff record created
    updatedAt           // ISO timestamp of last update
  }) {
    this.staffId = staffId;
    this.name = name;
    this.phone = phone;
    this.email = email || '';
    this.role = role;
    this.skills = skills || [];
    this.status = status || 'OFFLINE';
    this.currentWorkload = currentWorkload || 0;
    this.maxCapacity = maxCapacity || 8;
    this.assignedTaskIds = assignedTaskIds || [];
    this.completedTasksToday = completedTasksToday || 0;
    this.performanceRating = performanceRating || 0;
    this.shiftStart = shiftStart || '09:00';
    this.shiftEnd = shiftEnd || '18:00';
    this.location = location || '';
    this.lastActiveAt = lastActiveAt || new Date().toISOString();
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }

  /**
   * Check if staff can take on additional work
   */
  canTakeTask(taskDurationHours) {
    return (
      this.status === 'ONLINE' &&
      (this.currentWorkload + taskDurationHours) <= this.maxCapacity
    );
  }

  /**
   * Calculate remaining capacity
   */
  getRemainingCapacity() {
    return Math.max(0, this.maxCapacity - this.currentWorkload);
  }

  /**
   * Get workload percentage
   */
  getWorkloadPercentage() {
    return (this.currentWorkload / this.maxCapacity) * 100;
  }

  /**
   * Check if staff has specific skill
   */
  hasSkill(skillName) {
    return this.skills.includes(skillName);
  }

  toJSON() {
    return {
      staffId: this.staffId,
      name: this.name,
      phone: this.phone,
      email: this.email,
      role: this.role,
      skills: this.skills,
      status: this.status,
      currentWorkload: this.currentWorkload,
      maxCapacity: this.maxCapacity,
      remainingCapacity: this.getRemainingCapacity(),
      workloadPercentage: this.getWorkloadPercentage(),
      assignedTaskIds: this.assignedTaskIds,
      completedTasksToday: this.completedTasksToday,
      performanceRating: this.performanceRating,
      shiftStart: this.shiftStart,
      shiftEnd: this.shiftEnd,
      location: this.location,
      lastActiveAt: this.lastActiveAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = StaffMember;
