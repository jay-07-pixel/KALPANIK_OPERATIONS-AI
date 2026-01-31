/**
 * INVENTORY AGENT
 *
 * Responsibilities:
 * - Check stock availability for OrderIntent
 * - Temporarily reserve inventory if available
 * - Return AVAILABLE or NOT_AVAILABLE
 * - Emit events for State Coordinator
 *
 * Rules:
 * - No LLM
 * - Pure deterministic logic
 * - Inventory stored in memory (stateManager)
 */

const stateManager = require('../state/stateManager');
const { EventTypes, createEvent } = require('../state/events');

class InventoryAgent {
  constructor() {
    this.eventCallback = null; // Set by State Coordinator to receive events
  }

  /**
   * Register callback for emitting events back to State Coordinator
   * @param {Function} callback - (event) => void
   */
  onEmit(callback) {
    this.eventCallback = callback;
  }

  /**
   * Emit event to State Coordinator
   */
  _emit(event) {
    if (this.eventCallback && typeof this.eventCallback === 'function') {
      this.eventCallback(event);
    }
  }

  /**
   * Check availability and optionally reserve stock for an OrderIntent
   *
   * @param {OrderIntent} orderIntent - Order intent from Order Agent
   * @returns {Promise<Object>} { status: 'AVAILABLE' | 'NOT_AVAILABLE', productId?, quantity?, reason? }
   */
  async checkAvailability(orderIntent) {
    console.log('\n[InventoryAgent] 📦 Checking inventory availability...');
    console.log('[InventoryAgent] Intent:', orderIntent.intentId);
    console.log('[InventoryAgent] Product:', orderIntent.productName || orderIntent.productId);
    console.log('[InventoryAgent] Quantity:', orderIntent.quantity, orderIntent.unit);

    const quantity = orderIntent.quantity;
    if (!quantity || quantity <= 0) {
      console.log('[InventoryAgent] ❌ Invalid quantity:', quantity);
      this._emit(createEvent(EventTypes.INVENTORY_INSUFFICIENT, {
        intentId: orderIntent.intentId,
        reason: 'INVALID_QUANTITY',
        productName: orderIntent.productName,
        productId: orderIntent.productId,
        quantity: quantity
      }));
      return {
        status: 'NOT_AVAILABLE',
        reason: 'INVALID_QUANTITY',
        message: 'Quantity must be a positive number'
      };
    }

    // Resolve product: by productId first, then by productName
    const item = this._resolveProduct(orderIntent);
    if (!item) {
      console.log('[InventoryAgent] ❌ Product not found in inventory');
      this._emit(createEvent(EventTypes.INVENTORY_INSUFFICIENT, {
        intentId: orderIntent.intentId,
        reason: 'PRODUCT_NOT_FOUND',
        productName: orderIntent.productName,
        productId: orderIntent.productId,
        quantity: quantity
      }));
      return {
        status: 'NOT_AVAILABLE',
        reason: 'PRODUCT_NOT_FOUND',
        message: `Product not found: ${orderIntent.productName || orderIntent.productId}`
      };
    }

    console.log('[InventoryAgent] ✅ Product found:', item.productId, '-', item.productName);
    console.log('[InventoryAgent]   Current stock:', item.currentStock);
    console.log('[InventoryAgent]   Reserved:', item.reservedStock);
    console.log('[InventoryAgent]   Available:', item.availableStock);

    // Emit INVENTORY_CHECKED (deterministic check result)
    this._emit(createEvent(EventTypes.INVENTORY_CHECKED, {
      intentId: orderIntent.intentId,
      productId: item.productId,
      productName: item.productName,
      requestedQuantity: quantity,
      availableStock: item.availableStock,
      canFulfill: item.canFulfill(quantity)
    }));

    // Deterministic check: availableStock >= quantity
    if (!item.canFulfill(quantity)) {
      console.log('[InventoryAgent] ❌ Insufficient stock. Available:', item.availableStock, ', Requested:', quantity);
      this._emit(createEvent(EventTypes.INVENTORY_INSUFFICIENT, {
        intentId: orderIntent.intentId,
        reason: 'INSUFFICIENT_STOCK',
        productId: item.productId,
        productName: item.productName,
        requestedQuantity: quantity,
        availableStock: item.availableStock
      }));
      return {
        status: 'NOT_AVAILABLE',
        reason: 'INSUFFICIENT_STOCK',
        productId: item.productId,
        productName: item.productName,
        requestedQuantity: quantity,
        availableStock: item.availableStock,
        message: `Insufficient stock. Available: ${item.availableStock}, Requested: ${quantity}`
      };
    }

    // Reserve stock (temporary reservation)
    try {
      stateManager.reserveInventory(item.productId, quantity);
      console.log('[InventoryAgent] ✅ Stock reserved:', quantity, orderIntent.unit);
    } catch (err) {
      console.error('[InventoryAgent] ❌ Reserve failed:', err.message);
      this._emit(createEvent(EventTypes.INVENTORY_INSUFFICIENT, {
        intentId: orderIntent.intentId,
        reason: 'RESERVE_FAILED',
        productId: item.productId,
        error: err.message
      }));
      return {
        status: 'NOT_AVAILABLE',
        reason: 'RESERVE_FAILED',
        productId: item.productId,
        message: err.message
      };
    }

    // Emit INVENTORY_RESERVED
    this._emit(createEvent(EventTypes.INVENTORY_RESERVED, {
      intentId: orderIntent.intentId,
      productId: item.productId,
      productName: item.productName,
      quantity: quantity,
      unit: orderIntent.unit,
      newReservedTotal: item.reservedStock
    }));

    console.log('[InventoryAgent] ✅ Status: AVAILABLE\n');

    return {
      status: 'AVAILABLE',
      productId: item.productId,
      productName: item.productName,
      quantity: quantity,
      unit: orderIntent.unit,
      reservedQuantity: quantity,
      message: 'Stock reserved successfully'
    };
  }

  /**
   * Resolve inventory item from OrderIntent (by productId or productName)
   * Pure deterministic lookup - no LLM
   */
  _resolveProduct(orderIntent) {
    if (orderIntent.productId) {
      const byId = stateManager.getInventoryItem(orderIntent.productId);
      if (byId) return byId;
    }
    if (orderIntent.productName) {
      return stateManager.getInventoryItemByName(orderIntent.productName);
    }
    return null;
  }

  /**
   * Release temporary reservation (e.g. when order is cancelled)
   * @param {string} productId
   * @param {number} quantity
   */
  releaseReservation(productId, quantity) {
    console.log('[InventoryAgent] 🔓 Releasing reservation:', productId, quantity);
    try {
      stateManager.releaseInventory(productId, quantity);
      this._emit(createEvent(EventTypes.INVENTORY_RELEASED, {
        productId,
        quantity,
        reason: 'RESERVATION_CANCELLED'
      }));
      return { success: true };
    } catch (err) {
      console.error('[InventoryAgent] Release failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get agent status
   */
  getStatus() {
    const items = stateManager.getAllInventory();
    return {
      agent: 'InventoryAgent',
      status: 'operational',
      logic: 'deterministic',
      productCount: items.length,
      totalStock: items.reduce((sum, i) => sum + i.currentStock, 0),
      totalReserved: items.reduce((sum, i) => sum + i.reservedStock, 0),
      totalAvailable: items.reduce((sum, i) => sum + i.availableStock, 0)
    };
  }
}

const inventoryAgent = new InventoryAgent();
module.exports = inventoryAgent;
