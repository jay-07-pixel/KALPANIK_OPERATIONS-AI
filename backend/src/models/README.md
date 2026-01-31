# Domain Models

Core domain models for the MSME Agentic Operations system.

## Models Overview

### 1. OrderIntent
**Purpose**: Temporary order representation before confirmation

**Lifecycle**:
- Created when order request received (website/WhatsApp)
- Validated by Inventory Agent
- Converted to `Order` if stock available
- Discarded if stock unavailable

**Key Fields**:
- `intentId`: Unique identifier
- `channel`: "website" | "whatsapp"
- `productId`, `quantity`, `priority`
- `status`: "PENDING" | "VALIDATED" | "REJECTED" | "CONVERTED"

---

### 2. Order
**Purpose**: Confirmed order after inventory validation

**Lifecycle**:
```
READY_TO_FULFILL → TASKS_PLANNED → ASSIGNED → 
IN_PROGRESS → QUALITY_CHECK → PACKING → 
READY_FOR_DELIVERY → DELIVERED
```

**Key Fields**:
- `orderId`: Unique order ID (e.g., "ORD-156")
- `items`: Array of products
- `status`: Current order status
- `inventoryReserved`: Boolean
- `taskIds`: Associated tasks

**Real MSME Example**:
- Small factory receives order for 15 boxes of Widget A
- Order flows through production stages
- Customer can track status in real-time

---

### 3. InventoryItem
**Purpose**: Product stock management

**Key Formula**:
```
Available Stock = Current Stock - Reserved Stock
```

**Key Fields**:
- `currentStock`: Total in warehouse
- `reservedStock`: Reserved for pending orders
- `availableStock`: Can be used for new orders
- `reorderPoint`: Trigger restocking alert

**Real MSME Example**:
- Widget A: 150 boxes total
- 135 reserved for pending orders
- 15 available for new orders
- Needs restock when < 30 boxes

**Methods**:
- `canFulfill(qty)`: Check if stock sufficient
- `needsRestock()`: Check if below reorder point
- `getStockStatus()`: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"

---

### 4. StaffMember
**Purpose**: Worker management and workload tracking

**Key Formula**:
```
Can Take Task = (Current Workload + Task Duration) <= Max Capacity
```

**Key Fields**:
- `staffId`: Unique staff ID
- `skills`: Array of skills (e.g., ["assembly", "packing"])
- `status`: "ONLINE" | "BUSY" | "OFFLINE"
- `currentWorkload`: Hours of work assigned
- `maxCapacity`: Maximum hours per day (typically 8)

**Real MSME Example**:
- Priya: 1 hour workload (can take more)
- Amit: 7 hours workload (nearly full)
- Raj: Offline (not available)

**Methods**:
- `canTakeTask(hours)`: Check capacity
- `getRemainingCapacity()`: Available hours
- `hasSkill(skill)`: Check if staff has skill

---

### 5. Task
**Purpose**: Operational task for staff

**Lifecycle**:
```
PENDING → ASSIGNED → IN_PROGRESS → COMPLETED
```

**Key Fields**:
- `taskId`: Unique task ID
- `orderId`: Parent order
- `taskType`: "PREPARE" | "QUALITY_CHECK" | "PACK" | "DELIVER"
- `assignedStaffId`: Who is working on it
- `estimatedDuration`: Planned time (hours)
- `dependsOn`: Tasks that must complete first

**Real MSME Example**:
Order ORD-156 broken into:
- T1: Prepare 15x Widget A (90 min)
- T2: Quality check (20 min) - depends on T1
- T3: Pack for delivery (25 min) - depends on T2

**Methods**:
- `isReadyToStart()`: No blocking dependencies
- `isOverdue()`: Past deadline
- `getElapsedTime()`: Time since started

---

### 6. SystemState
**Purpose**: Global system snapshot for decision-making

**Key Metrics**:
- **Orders**: Total, pending, in progress, completed today
- **Inventory**: Low stock, out of stock products
- **Staff**: Online, available, average workload
- **Tasks**: Pending, in progress, overdue
- **Capacity**: Total, used, remaining

**Real MSME Example**:
```
Dashboard Summary:
- Orders: 12 pending, 8 in progress, 5 completed today
- Staff: 8 online, 5 available, 65% avg workload
- Inventory: 3 low stock, 1 out of stock
- Tasks: 6 pending, 10 in progress, 2 overdue
- Health: HEALTHY
```

**Methods**:
- `getHealthStatus()`: System health check
- `getDashboardSummary()`: Owner dashboard view

---

## Model Relationships

```
OrderIntent --converts-to--> Order
                              ↓
                         creates Tasks
                              ↓
                         assigns to StaffMembers
                              ↓
                         uses InventoryItems
                              ↓
                         updates SystemState
```

## Design Principles

1. **No Database Logic**: Models are pure data structures
2. **No Business Logic**: Logic lives in agents, not models
3. **Immutability**: Create new instances instead of mutating
4. **Explainability**: All fields documented and self-describing
5. **Real MSME Context**: Fields match actual small factory operations

## Usage Example

```javascript
const { Order, StaffMember, Task } = require('./models');

// Create order
const order = new Order({
  orderId: 'ORD-156',
  customerId: '+91-98765-43210',
  customerName: 'Rajesh Kumar',
  channel: 'whatsapp',
  items: [{ productId: 'PROD-123', quantity: 15 }],
  priority: 'HIGH'
});

// Create staff
const priya = new StaffMember({
  staffId: 'STAFF-002',
  name: 'Priya Sharma',
  status: 'ONLINE',
  currentWorkload: 1,
  maxCapacity: 8,
  skills: ['assembly']
});

// Create task
const task = new Task({
  taskId: 'TASK-101',
  orderId: order.orderId,
  taskType: 'PREPARE',
  assignedStaffId: priya.staffId,
  estimatedDuration: 1.5
});

// Check capacity
if (priya.canTakeTask(task.estimatedDuration)) {
  console.log('Priya can take this task!');
}
```

## Next Steps

These models are now ready to be used by:
1. State Manager (persistence layer)
2. Agents (decision-making logic)
3. API endpoints (data serialization)

See `examples.js` for more detailed usage examples.
