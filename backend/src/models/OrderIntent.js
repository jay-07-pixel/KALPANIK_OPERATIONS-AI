/**
 * ORDER INTENT
 * 
 * Temporary order representation before confirmation
 * Created by Order Agent after parsing input
 * 
 * Lifecycle:
 * - Created when order request received
 * - Validated by Inventory Agent
 * - Converted to Order if stock available
 * - Discarded if stock unavailable
 */

class OrderIntent {
  constructor({
    intentId,           // Unique ID for this intent (e.g., "INTENT-001")
    customerId,         // Customer ID or phone number
    customerName,       // Customer name (if known)
    channel,            // "website" | "whatsapp"
    productId,          // Product identifier (e.g., "PROD-123")
    productName,        // Human-readable product name (e.g., "Widget A")
    quantity,           // Requested quantity (number)
    unit,               // Unit of measurement (e.g., "boxes", "pieces", "kg")
    priority,           // "LOW" | "MEDIUM" | "HIGH" | "URGENT"
    deadline,           // ISO timestamp (optional, e.g., "2026-02-01T15:00:00Z")
    rawInput,           // Original input (WhatsApp text or form data)
    createdAt,          // ISO timestamp when intent was created
    status              // "PENDING" | "VALIDATED" | "REJECTED" | "CONVERTED"
  }) {
    this.intentId = intentId;
    this.customerId = customerId;
    this.customerName = customerName;
    this.channel = channel;
    this.productId = productId;
    this.productName = productName;
    this.quantity = quantity;
    this.unit = unit;
    this.priority = priority;
    this.deadline = deadline || null;
    this.rawInput = rawInput;
    this.createdAt = createdAt || new Date().toISOString();
    this.status = status || 'PENDING';
  }

  /**
   * Convert to plain object (for JSON serialization)
   */
  toJSON() {
    return {
      intentId: this.intentId,
      customerId: this.customerId,
      customerName: this.customerName,
      channel: this.channel,
      productId: this.productId,
      productName: this.productName,
      quantity: this.quantity,
      unit: this.unit,
      priority: this.priority,
      deadline: this.deadline,
      rawInput: this.rawInput,
      createdAt: this.createdAt,
      status: this.status
    };
  }
}

module.exports = OrderIntent;
