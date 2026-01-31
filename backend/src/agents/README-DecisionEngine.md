# Decision Engine (Planner Agent)

Deterministic planner that breaks a confirmed order into operational tasks. Does **not** assign staff.

## Responsibilities

- Decide what tasks are required for an order
- Break order into tasks: **prepare** → **quality_check** → **pack**
- Set task sequence (dependencies) and estimated durations
- Do **NOT** assign staff (that is Workforce/Coordination Agent)
- Keep logic simple and explainable (no LLM)

## Logic (Deterministic)

Every order gets the same 3-task sequence:

1. **PREPARE** – Assemble/prepare items  
   - Duration: `6 min/unit × quantity` (min 15 min)  
   - Required skill: `assembly`  
   - Depends on: none  

2. **QUALITY_CHECK** – Quality check  
   - Duration: `20 min` fixed  
   - Required skill: `quality_check`  
   - Depends on: PREPARE  

3. **PACK** – Pack for dispatch  
   - Duration: `2.5 min/unit × quantity` (min 10 min)  
   - Required skill: `packing`  
   - Depends on: QUALITY_CHECK  

All tasks are created with `status: 'PENDING'` and `assignedStaffId: null`. Staff assignment is done later by Workforce/Coordination Agent.

## API

### `planTasksForOrder(order, stateManager)`

- **Input**: Confirmed `Order` (e.g. `READY_TO_FULFILL`), `stateManager` (for next task IDs).
- **Output**: Array of 3 `Task` objects: `[prepare, quality_check, pack]`.
- Task IDs are generated from current task count (e.g. TASK-001, TASK-002, TASK-003).
- Dependencies: prepare has `dependsOn: []`, quality_check has `dependsOn: [prepareTaskId]`, pack has `dependsOn: [qualityCheckTaskId]`.

### `getPlanExplanation(order)`

- Returns `{ sequence, reason, durations }` for logging/explainability.
- Example: `sequence: ['prepare', 'quality_check', 'pack']`, `reason: 'Standard 3-step flow...'`, `durations: { prepare: '90 min (...)', quality_check: '20 min fixed', pack: '37.5 min (...)' }`.

## Constants (Explainable)

```javascript
PREPARE_MINUTES_PER_UNIT = 6    // 6 min per unit
QUALITY_CHECK_FIXED_MINUTES = 20  // 20 min fixed
PACK_MINUTES_PER_UNIT = 2.5    // 2.5 min per unit
```

Minimum durations: prepare ≥ 15 min, pack ≥ 10 min.

## Integration

State Coordinator (after Order Creation):

1. Calls `decisionEngine.planTasksForOrder(persistedOrder, stateManager)`.
2. Adds each task to state: `stateManager.addTask(task)`.
3. Updates order: `stateManager.updateOrder(orderId, { taskIds, status: 'TASKS_PLANNED' })`.
4. Emits `TASKS_PLANNED` event with `orderId`, `taskIds`, `explanation`.
5. Recalculates system state.

## Tests

Run: `node src/agents/testDecisionEngine.js`

- Plan tasks for order: 3 tasks, correct types and dependencies, no staff assigned, all PENDING.
- Plan explanation: sequence and duration strings.
- Durations scale with quantity: larger order → longer prepare and pack.

## Summary

- **Input**: Confirmed Order  
- **Output**: 3 Task objects (PREPARE, QUALITY_CHECK, PACK) with dependencies and durations  
- **No staff assignment**  
- **Simple, explainable rules** (min/unit and fixed minutes)
