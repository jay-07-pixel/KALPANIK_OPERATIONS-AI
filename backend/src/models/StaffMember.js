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
   * Parse "HH:MM" or "H:MM" to minutes since midnight (for a given date).
   */
  static _timeToMinutes(timeStr, refDate) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [h, m] = timeStr.trim().split(':').map(s => parseInt(s, 10) || 0);
    return h * 60 + m;
  }

  /**
   * Current time in minutes since midnight (same day as refDate).
   */
  static _nowMinutes(refDate) {
    const d = refDate || new Date();
    return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  }

  /**
   * Whether the given time falls within this staff's shift (shiftStart–shiftEnd).
   */
  isWithinShift(now) {
    const ref = now || new Date();
    const nowM = StaffMember._nowMinutes(ref);
    const startM = StaffMember._timeToMinutes(this.shiftStart, ref);
    const endM = StaffMember._timeToMinutes(this.shiftEnd, ref);
    if (endM > startM) return nowM >= startM && nowM < endM;
    return nowM >= startM || nowM < endM; // overnight shift
  }

  /**
   * Remaining hours left in the current shift from `now` (capped by max capacity).
   */
  getRemainingShiftHours(now) {
    const ref = now || new Date();
    const nowM = StaffMember._nowMinutes(ref);
    const startM = StaffMember._timeToMinutes(this.shiftStart, ref);
    const endM = StaffMember._timeToMinutes(this.shiftEnd, ref);
    let remainingMinutes = 0;
    if (endM > startM) {
      if (nowM < startM) remainingMinutes = endM - startM;
      else if (nowM < endM) remainingMinutes = endM - nowM;
    } else {
      if (nowM >= startM) remainingMinutes = (24 * 60 - nowM) + endM;
      else if (nowM < endM) remainingMinutes = endM - nowM;
    }
    const remainingHours = remainingMinutes / 60;
    return Math.min(remainingHours, this.getRemainingCapacity());
  }

  /**
   * Check if staff can take on additional work (capacity only).
   */
  canTakeTask(taskDurationHours) {
    return (
      this.status === 'ONLINE' &&
      (this.currentWorkload + taskDurationHours) <= this.maxCapacity
    );
  }

  /**
   * Check if staff can take task considering work hours: within shift and task fits in remaining shift hours.
   */
  canTakeTaskWithinWorkHours(taskDurationHours, now) {
    if (!this.canTakeTask(taskDurationHours)) return false;
    const ref = now || new Date();
    if (!this.isWithinShift(ref)) return false;
    const remainingInShift = this.getRemainingShiftHours(ref);
    return taskDurationHours <= remainingInShift;
  }

  /**
   * Calculate remaining capacity (hours left before hitting maxCapacity).
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
