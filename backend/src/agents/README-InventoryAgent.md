# Inventory Agent

Deterministic agent that checks stock availability and temporarily reserves inventory for OrderIntents.

## Purpose

- **Check** if requested product/quantity is available in memory
- **Reserve** stock temporarily when available
- **Return** `AVAILABLE` or `NOT_AVAILABLE`
- **Emit** events back to State Coordinator

**Rules**: No LLM, pure deterministic logic, inventory in memory (stateManager).

---

## Responsibilities

1. Resolve product from OrderIntent (by `productId` or `productName`)
2. Check availability: `availableStock >= quantity`
3. If available: call `stateManager.reserveInventory(productId, quantity)`
4. Emit: `INVENTORY_CHECKED`, then `INVENTORY_RESERVED` or `INVENTORY_INSUFFICIENT`
5. Return: `{ status: 'AVAILABLE' | 'NOT_AVAILABLE', ... }`

---

## Logic (Deterministic)

```
OrderIntent (productId or productName, quantity)
    ↓
Resolve product: getInventoryItem(productId) or getInventoryItemByName(productName)
    ↓
If product not found → NOT_AVAILABLE (PRODUCT_NOT_FOUND)
If quantity invalid (≤0) → NOT_AVAILABLE (INVALID_QUANTITY)
    ↓
If item.canFulfill(quantity) === false → NOT_AVAILABLE (INSUFFICIENT_STOCK)
    ↓
stateManager.reserveInventory(productId, quantity)
    ↓
Emit INVENTORY_RESERVED
    ↓
Return AVAILABLE
```

---

## Events Emitted

| Event | When |
|-------|------|
| `INVENTORY_CHECKED` | After resolving product and checking `canFulfill` |
| `INVENTORY_RESERVED` | After successfully reserving stock |
| `INVENTORY_INSUFFICIENT` | Product not found, invalid quantity, or insufficient stock |
| `INVENTORY_RELEASED` | When `releaseReservation()` is called |

State Coordinator registers via `inventoryAgent.onEmit(callback)` and logs/handles these events.

---

## Product Lookup

- **By productId**: `stateManager.getInventoryItem(orderIntent.productId)` (e.g. website orders)
- **By productName**: `stateManager.getInventoryItemByName(orderIntent.productName)` (e.g. WhatsApp – parser returns name only)

`getInventoryItemByName` does case-insensitive match; supports exact and substring match.

---

## Usage

```javascript
const inventoryAgent = require('./agents/inventoryAgent');
const orderIntent = ...; // from Order Agent

inventoryAgent.onEmit((event) => {
  console.log('Event:', event.type, event.data);
});

const result = await inventoryAgent.checkAvailability(orderIntent);

if (result.status === 'AVAILABLE') {
  // productId, quantity, reservedQuantity
  // Intent can proceed to Order creation
} else {
  // result.reason: PRODUCT_NOT_FOUND | INVALID_QUANTITY | INSUFFICIENT_STOCK
  // Intent should be rejected
}
```

---

## Return Values

**AVAILABLE**
```javascript
{
  status: 'AVAILABLE',
  productId: 'PROD-123',
  productName: 'Widget A',
  quantity: 15,
  unit: 'boxes',
  reservedQuantity: 15,
  message: 'Stock reserved successfully'
}
```

**NOT_AVAILABLE**
```javascript
{
  status: 'NOT_AVAILABLE',
  reason: 'INSUFFICIENT_STOCK',  // or PRODUCT_NOT_FOUND, INVALID_QUANTITY
  productId?: 'PROD-123',
  requestedQuantity?: 60,
  availableStock?: 50,
  message: 'Insufficient stock. Available: 50, Requested: 60'
}
```

---

## Release Reservation

When an order is cancelled or rejected after reserve:

```javascript
inventoryAgent.releaseReservation('PROD-123', 15);
// Emits INVENTORY_RELEASED
```

---

## Tests

Run: `node src/agents/testInventoryAgent.js`

- Check by productId – sufficient stock → AVAILABLE
- Check by productName – sufficient stock → AVAILABLE
- Insufficient stock → NOT_AVAILABLE, INSUFFICIENT_STOCK
- Product not found → NOT_AVAILABLE, PRODUCT_NOT_FOUND
- Invalid quantity → NOT_AVAILABLE, INVALID_QUANTITY
- Reservation updates state (reserved/available counts)
- Agent status

---

## Integration

State Coordinator:

1. After Order Agent creates OrderIntent, calls `inventoryAgent.checkAvailability(orderIntent)`.
2. Registers `inventoryAgent.onEmit(callback)` so events are logged and stored.
3. If `AVAILABLE`: updates intent status to `VALIDATED`, continues to Order creation.
4. If `NOT_AVAILABLE`: updates intent status to `REJECTED`, returns and does not create Order.

---

## Summary

- No LLM; logic is deterministic and explainable.
- Inventory stored in memory via stateManager.
- Lookup by productId or productName.
- Emits INVENTORY_CHECKED, INVENTORY_RESERVED, INVENTORY_INSUFFICIENT (and INVENTORY_RELEASED on release).
