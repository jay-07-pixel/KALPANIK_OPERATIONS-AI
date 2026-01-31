# State Management System

In-memory state management for the MSME Agentic Operations system.

## Components

### 1. StateManager (`stateManager.js`)

**Purpose**: In-memory storage for all system state

**Storage Structure**:
```javascript
{
  orderIntents: Map<intentId, OrderIntent>,
  orders: Map<orderId, Order>,
  inventory: Map<productId, InventoryItem>,
  staff: Map<staffId, StaffMember>,
  tasks: Map<taskId, Task>,
  auditLog: Array<AuditEntry>
}
```

**Key Methods**:
- `addOrder()`, `getOrder()`, `updateOrder()`
- `addInventoryItem()`, `reserveInventory()`, `releaseInventory()`
- `addStaff()`, `getAvailableStaff()`
- `addTask()`, `getTasksByOrder()`, `getTasksByStaff()`
- `calculateSystemState()` - Computes SystemState snapshot
- `getAuditLog()` - Returns audit trail

**Why Map-based?**
- O(1) lookups by ID
- Better than arrays for frequent reads/writes
- Easy to check existence

---

### 2. Events (`events.js`)

**Purpose**: Define all event types in the system

**Event Structure**:
```javascript
{
  type: 'ORDER_RECEIVED',
  timestamp: '2026-01-31T10:30:00Z',
  data: { ... }
}
```

**Event Categories**:
- **Input Events**: `ORDER_RECEIVED`
- **Order Events**: `ORDER_INTENT_CREATED`, `ORDER_CREATED`
- **Inventory Events**: `INVENTORY_CHECKED`, `INVENTORY_RESERVED`
- **Task Events**: `TASKS_PLANNED`, `TASK_STARTED`, `TASK_COMPLETED`
- **Agent Events**: `STAFF_SELECTED`, `PLAN_APPROVED`

**Event Flow Example**:
```
ORDER_RECEIVED
  → ORDER_INTENT_CREATED (Order Agent)
  → INVENTORY_CHECKED (Inventory Agent)
  → INVENTORY_RESERVED
  → ORDER_CREATED
  → TASKS_PLANNED (Decision Engine)
  → STAFF_SELECTED (Workforce Agent)
  → TASKS_ASSIGNED (Coordination Agent)
  → PLAN_APPROVED (Critic Agent)
  → TASKS_CREATED (Task Executor)
```

---

### 3. StateCoordinator (`stateCoordinator.js`)

**Purpose**: Routes events to agents and orchestrates workflow

**Key Responsibilities**:
1. Receive events
2. Route to appropriate agent
3. Sequence agent execution
4. Update system state

**Event Handlers**:
- `_handleOrderReceived()` - Orchestrates full order flow
- `_handleTaskCompleted()` - Updates task and staff workload
- `_handleTaskStarted()` - Updates task status
- `_handleInventoryUpdated()` - Recalculates alerts

**Current State**: Agent placeholders (to be wired up when agents implemented)

---

## Usage Example

```javascript
const stateManager = require('./state/stateManager');
const stateCoordinator = require('./services/stateCoordinator');
const { EventTypes, createEvent } = require('./state/events');
const { Order, StaffMember, Task } = require('./models');

// Add order
const order = new Order({ orderId: 'ORD-156', ... });
stateManager.addOrder(order);

// Reserve inventory
stateManager.reserveInventory('PROD-123', 15);

// Create task
const task = new Task({ taskId: 'TASK-101', ... });
stateManager.addTask(task);

// Send event
const event = createEvent(EventTypes.TASK_COMPLETED, {
  taskId: 'TASK-101',
  staffId: 'STAFF-001'
});
stateCoordinator.handleEvent(event);

// Get system state
const systemState = stateManager.calculateSystemState();
console.log(systemState.getDashboardSummary());
```

---

## Testing

Run the test file to verify the system:

```bash
node src/state/testStateSystem.js
```

**Test Coverage**:
1. ✓ Create order intent
2. ✓ Reserve inventory
3. ✓ Create order
4. ✓ Create tasks
5. ✓ Calculate system state
6. ✓ Event routing
7. ✓ Task completion flow
8. ✓ Stats and audit log

---

## Design Principles

1. **In-Memory Only**: No database (for MVP simplicity)
2. **Event-Driven**: All changes triggered by events
3. **Explainable**: Audit log tracks every action
4. **Deterministic**: Pure state transformations
5. **Singleton**: Single source of truth

---

## State Lifecycle

```
1. Event arrives → StateCoordinator
2. Route to Agent → Agent processes
3. Agent updates StateManager
4. SystemState recalculated
5. New event emitted (if needed)
```

---

## SystemState Calculation

Automatically calculates:
- Order metrics (total, pending, in progress, completed)
- Inventory metrics (low stock, out of stock)
- Staff metrics (online, available, workload)
- Task metrics (pending, in progress, overdue)
- Capacity utilization (used vs available)
- Health status (HEALTHY, HIGH_LOAD, OVERLOADED, CRITICAL)
- Alerts (stock alerts, overdue tasks, capacity alerts)

---

## Audit Log

Every action is logged:
```javascript
{
  timestamp: '2026-01-31T10:30:00Z',
  action: 'INVENTORY_RESERVED',
  data: { productId: 'PROD-123', quantity: 15 }
}
```

**Benefits**:
- Debugging
- Explainability (why did system make decision?)
- Compliance (track all changes)

---

## Next Steps

1. Implement agents (Order Agent, Inventory Agent, etc.)
2. Wire agents into StateCoordinator using `setAgents()`
3. Add more event handlers as needed
4. Build REST API to expose state

---

## Memory Considerations

Since this is in-memory:
- State is lost on server restart
- Not suitable for production (needs database)
- Good for MVP and testing

For production, replace storage with:
- PostgreSQL for persistent state
- Redis for fast caching
