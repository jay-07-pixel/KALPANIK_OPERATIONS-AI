/**
 * INVENTORY ITEM
 * 
 * Represents a product in stock
 * Used by Inventory Agent to check availability
 * 
 * Key Calculation:
 * Available = currentStock - reservedStock
 * 
 * Real MSME Scenario:
 * - Small factory with limited stock
 * - Need to track what's reserved for pending orders
 * - Avoid overselling (selling more than available)
 */

class InventoryItem {
  constructor({
    productId,          // Unique product ID (e.g., "PROD-123")
    productName,        // Human-readable name (e.g., "Widget A")
    sku,                // Stock Keeping Unit (e.g., "WID-A-001")
    category,           // Product category (e.g., "Electronics", "Textiles")
    unit,               // Unit of measurement (e.g., "boxes", "pieces", "kg")
    currentStock,       // Total stock in warehouse (number)
    reservedStock,      // Stock reserved for pending orders (number)
    availableStock,     // currentStock - reservedStock (calculated)
    minStockLevel,      // Minimum stock before reorder alert (number)
    reorderPoint,       // Trigger reorder when stock hits this level (number)
    pricePerUnit,       // Price per unit (optional, for order value calculation)
    location,           // Warehouse location (e.g., "A-12", "Shelf-5")
    lastRestocked,      // ISO timestamp of last restock
    updatedAt           // ISO timestamp of last update
  }) {
    this.productId = productId;
    this.productName = productName;
    this.sku = sku;
    this.category = category;
    this.unit = unit;
    this.currentStock = currentStock;
    this.reservedStock = reservedStock || 0;
    this.availableStock = currentStock - (reservedStock || 0);
    this.minStockLevel = minStockLevel || 0;
    this.reorderPoint = reorderPoint || 0;
    this.pricePerUnit = pricePerUnit || 0;
    this.location = location || '';
    this.lastRestocked = lastRestocked || null;
    this.updatedAt = updatedAt || new Date().toISOString();
  }

  /**
   * Check if sufficient stock available for requested quantity
   */
  canFulfill(requestedQuantity) {
    return this.availableStock >= requestedQuantity;
  }

  /**
   * Check if stock is below minimum level (needs reorder)
   */
  needsRestock() {
    return this.availableStock <= this.reorderPoint;
  }

  /**
   * Get stock status as string
   */
  getStockStatus() {
    if (this.availableStock === 0) return 'OUT_OF_STOCK';
    if (this.availableStock <= this.reorderPoint) return 'LOW_STOCK';
    if (this.availableStock <= this.minStockLevel) return 'MEDIUM_STOCK';
    return 'IN_STOCK';
  }

  toJSON() {
    return {
      productId: this.productId,
      productName: this.productName,
      sku: this.sku,
      category: this.category,
      unit: this.unit,
      currentStock: this.currentStock,
      reservedStock: this.reservedStock,
      availableStock: this.availableStock,
      minStockLevel: this.minStockLevel,
      reorderPoint: this.reorderPoint,
      pricePerUnit: this.pricePerUnit,
      location: this.location,
      lastRestocked: this.lastRestocked,
      updatedAt: this.updatedAt,
      stockStatus: this.getStockStatus()
    };
  }
}

module.exports = InventoryItem;
