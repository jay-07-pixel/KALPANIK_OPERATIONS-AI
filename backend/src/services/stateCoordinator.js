/**
 * STATE COORDINATOR
 * 
 * Central orchestrator for the agentic system
 * 
 * Responsibilities:
 * - Receive events
 * - Route events to appropriate agents
 * - Coordinate agent execution flow
 * - Update system state
 * 
 * This is the "brain" that sequences agent execution
 */

const stateManager = require('../state/stateManager');
const { EventTypes, createEvent } = require('../state/events');
const orderCreation = require('./orderCreation');
const decisionEngine = require('../agents/decisionEngine');
const workforceAgent = require('../agents/workforceAgent');
const coordinationAgent = require('../agents/coordinationAgent');
const criticAgent = require('../agents/criticAgent');
const { getTimeAndDeadlineFeasibility } = require('../utils/deadlineFeasibility');

class StateCoordinator {
  constructor() {
    this.eventLog = [];
    this.lastRunLog = [];
    this.lastRunSummary = null; // Structured summary for dashboard (order flow steps, tasks, staff, etc.)
    this.isProcessing = false;
    
    // Agent placeholders (will be wired up later)
    this.orderAgent = null;
    this.inventoryAgent = null;
    this.decisionEngine = null;
    this.workforceAgent = null;
    this.coordinationAgent = null;
    this.criticAgent = null;
    this.taskExecutor = null;
  }

  /**
   * Wire up agents (to be called after agents are implemented)
   */
  setAgents({
    orderAgent,
    inventoryAgent,
    decisionEngine,
    workforceAgent,
    coordinationAgent,
    criticAgent,
    taskExecutor
  }) {
    this.orderAgent = orderAgent;
    this.inventoryAgent = inventoryAgent;
    this.decisionEngine = decisionEngine;
    this.workforceAgent = workforceAgent;
    this.coordinationAgent = coordinationAgent;
    this.criticAgent = criticAgent;
    this.taskExecutor = taskExecutor;
  }

  /**
   * Main event handler
   * Routes events to appropriate handlers
   */
  async handleEvent(event) {
    this._logEvent(event);
    
    try {
      switch (event.type) {
        case EventTypes.ORDER_RECEIVED:
          return await this._handleOrderReceived(event);
        
        case EventTypes.TASK_COMPLETED:
          return await this._handleTaskCompleted(event);
        
        case EventTypes.TASK_STARTED:
          return await this._handleTaskStarted(event);
        
        case EventTypes.INVENTORY_UPDATED:
          return await this._handleInventoryUpdated(event);
        
        default:
          console.log(`[StateCoordinator] Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`[StateCoordinator] Error handling event ${event.type}:`, error.message);
      throw error;
    }
  }

  /**
   * Append a line to lastRunLog (for dashboard) and console
   */
  _runLog(text, type = 'info') {
    this.lastRunLog.push({ type, text });
    if (type === 'error') console.error(text);
    else console.log(text);
  }

  getLastRunLog() {
    return this.lastRunLog || [];
  }

  /**
   * Get structured summary of last order run (for meaningful dashboard)
   */
  getLastRunSummary() {
    return this.lastRunSummary;
  }

  _setSummary(partial) {
    this.lastRunSummary = { ...(this.lastRunSummary || {}), ...partial };
  }

  /**
   * ORDER_RECEIVED event handler
   * Orchestrates the full order processing flow
   */
  async _handleOrderReceived(event) {
    const { channel, data } = event.data;
    this.lastRunLog = [];
    this.lastRunSummary = { channel, timestamp: new Date().toISOString(), status: null, steps: [] };

    this._runLog(`\n[StateCoordinator] 🎯 ORDER_RECEIVED from ${channel}`);
    this._runLog(`[StateCoordinator] Data: ${JSON.stringify(data, null, 2)}`);

    try {
      // Step 1: Route to Order Agent
      this._runLog(`[StateCoordinator] ➤ Step 1: Routing to Order Agent...`);
      if (!this.orderAgent) {
        this._runLog(`[StateCoordinator] ⚠️  Order Agent not wired yet`);
        return { status: 'pending', message: 'Order Agent not available' };
      }
      
      const orderIntent = await this.orderAgent.processOrder(data, channel);
      this._runLog(`[StateCoordinator] ✅ OrderIntent created: ${orderIntent.intentId}`);
      this._setSummary({
        orderIntentId: orderIntent.intentId,
        customerName: orderIntent.customerName,
        productName: orderIntent.productName,
        quantity: orderIntent.quantity,
        unit: orderIntent.unit,
        steps: [...(this.lastRunSummary.steps || []), { step: 1, name: 'Order Agent', status: 'ok', detail: `Intent ${orderIntent.intentId} created` }]
      });
      const validation = this.orderAgent.validateIntent(orderIntent);
      if (!validation.isValid) {
        this._runLog(`[StateCoordinator] ⚠️  OrderIntent has warnings: ${JSON.stringify(validation.warnings)}`);
      }
      stateManager.addOrderIntent(orderIntent);
      this._runLog(`[StateCoordinator] ✅ OrderIntent saved to state`);
      
      this._runLog(`[StateCoordinator] ➤ Step 2: Routing to Inventory Agent...`);
      if (!this.inventoryAgent) {
        this._runLog(`[StateCoordinator] ⚠️  Inventory Agent not implemented yet`);
        this._runLog(`[StateCoordinator] 🛑 Stopping here until Inventory Agent is ready\n`);
        return { 
          status: 'partial', 
          message: 'OrderIntent created, waiting for Inventory Agent',
          orderIntent: orderIntent
        };
      }

      this.inventoryAgent.onEmit((ev) => {
        this._logEvent(ev);
        this._runLog(`[StateCoordinator] 📥 Event from Inventory Agent: ${ev.type}`);
      });

      const inventoryResult = await this.inventoryAgent.checkAvailability(orderIntent);

      if (inventoryResult.status === 'NOT_AVAILABLE') {
        this._runLog(`[StateCoordinator] ❌ Inventory not available. Reason: ${inventoryResult.reason}`);
        stateManager.updateOrderIntent(orderIntent.intentId, { status: 'REJECTED' });
        this._setSummary({
          status: 'rejected',
          steps: [...(this.lastRunSummary.steps || []), { step: 2, name: 'Inventory Agent', status: 'rejected', detail: inventoryResult.reason }],
          inventory: { status: 'NOT_AVAILABLE', reason: inventoryResult.reason }
        });
        this._runLog(`[StateCoordinator] 🛑 OrderIntent ${orderIntent.intentId} rejected\n`);
        return {
          status: 'rejected',
          message: 'Insufficient inventory',
          orderIntent: orderIntent,
          reason: inventoryResult.reason,
          details: inventoryResult
        };
      }

      this._runLog(`[StateCoordinator] ✅ Inventory reserved for intent ${orderIntent.intentId}`);
      this._setSummary({
        steps: [...(this.lastRunSummary.steps || []), { step: 2, name: 'Inventory Agent', status: 'ok', detail: 'Stock reserved' },
          { step: 3, name: 'Order Creation', status: 'ok', detail: '' }],
        inventory: { status: 'AVAILABLE', productId: inventoryResult.productId, quantity: inventoryResult.quantity }
      });
      stateManager.updateOrderIntent(orderIntent.intentId, {
        status: 'VALIDATED',
        productId: inventoryResult.productId || orderIntent.productId
      });

      this._runLog(`[StateCoordinator] ➤ Step 3: Creating Order (Intent → Order)...`);
      const order = orderCreation.createOrderFromIntent(orderIntent, inventoryResult);
      const { order: persistedOrder, event: orderCreatedEvent } = orderCreation.persistOrderAndPrepareEvent(order, orderIntent);
      this._logEvent(orderCreatedEvent);
      this._runLog(`[StateCoordinator] 📥 Event: ORDER_CREATED (order_confirmed)`);
      this._runLog(`[StateCoordinator] ✅ Order created: ${persistedOrder.orderId} (from intent ${orderIntent.intentId})`);
      this._setSummary({ orderId: persistedOrder.orderId, orderStatus: 'READY_TO_FULFILL' });
      stateManager.calculateSystemState();

      this._runLog(`[StateCoordinator] ➤ Step 4: Routing to Decision Engine...`);
      const tasks = decisionEngine.planTasksForOrder(persistedOrder, stateManager);
      const taskIds = tasks.map(t => t.taskId);
      for (const task of tasks) {
        stateManager.addTask(task);
      }
      stateManager.updateOrder(persistedOrder.orderId, {
        taskIds,
        status: 'TASKS_PLANNED'
      });
      const planExplanation = decisionEngine.getPlanExplanation(persistedOrder);
      const timeAndDeadline = getTimeAndDeadlineFeasibility(persistedOrder, tasks);

      this._runLog(`[StateCoordinator] ✅ Tasks planned: ${taskIds.join(', ')}`);
      this._runLog(`[StateCoordinator]   Sequence: ${planExplanation.sequence.join(' → ')}`);
      this._runLog(`[StateCoordinator]   Time required: ${timeAndDeadline.totalHours.toFixed(2)}h total`);
      timeAndDeadline.breakdown.forEach(b => {
        this._runLog(`[StateCoordinator]     - ${b.taskId} (${b.taskType}): ${b.hours.toFixed(2)}h`);
      });
      if (timeAndDeadline.deadline) {
        const feasibleStr = timeAndDeadline.feasible === true ? 'Yes' : timeAndDeadline.feasible === false ? 'No' : '—';
        this._runLog(`[StateCoordinator]   Deadline: ${timeAndDeadline.deadline.toISOString()} | Feasible: ${feasibleStr}`);
      } else {
        this._runLog(`[StateCoordinator]   Deadline: not set (cannot verify)`);
      }

      this._setSummary({
        steps: [...(this.lastRunSummary.steps || []), { step: 4, name: 'Decision Engine', status: 'ok', detail: `Tasks: ${taskIds.join(', ')}` }],
        tasks: tasks.map(t => ({ taskId: t.taskId, taskType: t.taskType, estimatedDuration: t.estimatedDuration, status: t.status })),
        sequence: planExplanation.sequence,
        timeRequiredHours: timeAndDeadline.totalHours,
        timeBreakdown: timeAndDeadline.breakdown,
        deadline: timeAndDeadline.deadline ? timeAndDeadline.deadline.toISOString() : null,
        deadlineFeasible: timeAndDeadline.feasible,
        estimatedCompletion: timeAndDeadline.estimatedCompletion ? timeAndDeadline.estimatedCompletion.toISOString() : null
      });

      this._logEvent(createEvent(EventTypes.TASKS_PLANNED, {
        orderId: persistedOrder.orderId,
        taskIds,
        taskCount: tasks.length,
        explanation: planExplanation,
        timeRequiredHours: timeAndDeadline.totalHours,
        timeBreakdown: timeAndDeadline.breakdown,
        deadline: timeAndDeadline.deadline?.toISOString() ?? null,
        deadlineFeasible: timeAndDeadline.feasible,
        estimatedCompletion: timeAndDeadline.estimatedCompletion?.toISOString() ?? null,
        deadlineMessage: timeAndDeadline.message
      }));
      stateManager.calculateSystemState();

      this._runLog(`[StateCoordinator] ➤ Step 5: Routing to Workforce Agent...`);
      const workforceResult = workforceAgent.selectBestStaffForOrder(persistedOrder, stateManager);
      let assignedStaffId = null;
      let assignedStaffName = null;

      if (workforceResult.candidates && workforceResult.candidates.length > 0) {
        this._runLog(`[StateCoordinator]   Candidates (${workforceResult.candidates.length}):`);
        workforceResult.candidates.forEach((c, i) => {
          const marker = workforceResult.staff && c.staffId === workforceResult.staff.staffId ? ' ← selected' : '';
          this._runLog(`[StateCoordinator]     ${i + 1}. ${c.name} (${c.staffId}): ${c.currentWorkload}h current, ${c.freeCapacity}h free${marker}`);
        });
      }

      this._setSummary({
        steps: [...(this.lastRunSummary.steps || []), { step: 5, name: 'Workforce Agent', status: workforceResult.staff ? 'ok' : 'warn', detail: workforceResult.staff ? workforceResult.reason : workforceResult.reason }],
        candidates: workforceResult.candidates || [],
        selectedStaff: workforceResult.staff ? { staffId: workforceResult.staff.staffId, name: workforceResult.staff.name, reason: workforceResult.reason } : null
      });

      if (workforceResult.staff) {
        this._logEvent(createEvent(EventTypes.STAFF_SELECTED, {
          orderId: persistedOrder.orderId,
          staffId: workforceResult.staff.staffId,
          staffName: workforceResult.staff.name,
          totalDurationHours: workforceResult.totalDuration,
          reason: workforceResult.reason,
          candidates: workforceResult.candidates
        }));
        this._runLog(`[StateCoordinator] ✅ Staff selected: ${workforceResult.staff.name} (${workforceResult.staff.staffId})`);
        this._runLog(`[StateCoordinator]   Reason: ${workforceResult.reason}`);

        this._runLog(`[StateCoordinator] ➤ Step 6: Routing to Coordination Agent...`);
        const orderTasks = stateManager.getTasksByOrder(persistedOrder.orderId);
        const assignResult = coordinationAgent.assignTasksToStaff(
          orderTasks,
          workforceResult.staff.staffId,
          stateManager,
          (ev) => {
            this._logEvent(ev);
            this._runLog(`[StateCoordinator] 📥 Event: ${ev.type}`);
          }
        );

        if (assignResult.success) {
          assignedStaffId = workforceResult.staff.staffId;
          assignedStaffName = assignResult.staffName;
          stateManager.updateOrder(persistedOrder.orderId, {
            status: 'ASSIGNED',
            assignedStaffId,
            assignedStaffName
          });
          this._runLog(`[StateCoordinator] ✅ Tasks assigned to ${assignResult.staffName}; new workload: ${assignResult.newWorkload}h`);
          this._setSummary({
            steps: [...(this.lastRunSummary.steps || []), { step: 6, name: 'Coordination Agent', status: 'ok', detail: `Assigned to ${assignResult.staffName}; workload ${assignResult.newWorkload}h` }],
            coordination: { assignedStaffName: assignResult.staffName, newWorkload: assignResult.newWorkload }
          });
        } else {
          this._runLog(`[StateCoordinator] ⚠️  Assignment failed: ${assignResult.message}`);
          this._setSummary({ steps: [...(this.lastRunSummary.steps || []), { step: 6, name: 'Coordination Agent', status: 'warn', detail: assignResult.message }] });
        }
      } else {
        this._runLog(`[StateCoordinator] ⚠️  No staff available: ${workforceResult.reason}`);
      }

      stateManager.calculateSystemState();

      this._runLog(`[StateCoordinator] ➤ Step 7: Routing to Critic Agent...`);
      const orderForCritic = stateManager.getOrder(persistedOrder.orderId);
      const criticResult = criticAgent.validateTaskPlan(orderForCritic, stateManager, (ev) => {
        this._logEvent(ev);
        this._runLog(`[StateCoordinator] 📥 Event: ${ev.type}`);
      });

      if (!criticResult.approved) {
        this._runLog(`[StateCoordinator] ❌ Plan rejected: ${criticResult.reason}`);
        this._runLog(`[StateCoordinator]   Issues: ${criticResult.issues.join(', ')}`);
        this._setSummary({
          status: 'plan_rejected',
          steps: [...(this.lastRunSummary.steps || []), { step: 7, name: 'Critic Agent', status: 'rejected', detail: criticResult.reason, issues: criticResult.issues }],
          critic: { approved: false, reason: criticResult.reason, issues: criticResult.issues }
        });
        this._runLog(`[StateCoordinator] 🛑 Replan requested; stopping before execution\n`);
        return {
          status: 'plan_rejected',
          message: 'Critic rejected task plan; replan requested',
          orderId: persistedOrder.orderId,
          issues: criticResult.issues,
          reason: criticResult.reason
        };
      }
      this._runLog(`[StateCoordinator] ✅ Plan approved: ${criticResult.reason}`);
      this._setSummary({
        steps: [...(this.lastRunSummary.steps || []), { step: 7, name: 'Critic Agent', status: 'ok', detail: criticResult.reason }, { step: 8, name: 'Task Executor', status: 'ok', detail: 'Order processing complete' }],
        critic: { approved: true, reason: criticResult.reason },
        status: 'success'
      });

      this._runLog(`[StateCoordinator] ➤ Step 8: Routing to Task Executor...`);
      this._runLog(`[StateCoordinator] ✅ Order processing complete\n`);

      return {
        status: 'success',
        message: 'Order created and processing flow complete',
        orderId: persistedOrder.orderId,
        order: persistedOrder,
        orderIntent: orderIntent
      };
      
    } catch (error) {
      this._runLog(`[StateCoordinator] ❌ Error in order processing: ${error.message}`, 'error');
      return { status: 'error', message: error.message };
    }
  }

  /**
   * TASK_COMPLETED event handler
   */
  async _handleTaskCompleted(event) {
    const { taskId, staffId } = event.data;
    
    console.log(`\n[StateCoordinator] ✅ TASK_COMPLETED: ${taskId} by ${staffId}`);
    
    // Get task
    const task = stateManager.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Update task status
    stateManager.updateTask(taskId, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      actualDuration: task.getElapsedTime()
    });
    
    // Update staff workload
    const staff = stateManager.getStaff(staffId);
    if (staff) {
      const newWorkload = Math.max(0, staff.currentWorkload - task.estimatedDuration);
      stateManager.updateStaff(staffId, {
        currentWorkload: newWorkload,
        completedTasksToday: staff.completedTasksToday + 1,
        lastActiveAt: new Date().toISOString()
      });
      
      console.log(`[StateCoordinator] Staff ${staff.name} workload: ${staff.currentWorkload}h → ${newWorkload}h`);
    }
    
    // Check if all tasks for order are complete
    const order = stateManager.getOrder(task.orderId);
    if (order) {
      const allTasks = stateManager.getTasksByOrder(order.orderId);
      const allCompleted = allTasks.every(t => t.status === 'COMPLETED');
      
      if (allCompleted) {
        console.log(`[StateCoordinator] 🎉 All tasks complete for order ${order.orderId}`);
        stateManager.updateOrder(order.orderId, {
          status: 'COMPLETED',
          completedAt: new Date().toISOString()
        });
      }
    }
    
    // Recalculate system state
    stateManager.calculateSystemState();
    
    console.log(`[StateCoordinator] ✅ Task completion processed\n`);
    
    return { status: 'success', message: 'Task completed' };
  }

  /**
   * TASK_STARTED event handler
   */
  async _handleTaskStarted(event) {
    const { taskId, staffId } = event.data;
    
    console.log(`\n[StateCoordinator] ▶️  TASK_STARTED: ${taskId} by ${staffId}`);
    
    // Update task status
    stateManager.updateTask(taskId, {
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString()
    });
    
    // Update staff status
    const staff = stateManager.getStaff(staffId);
    if (staff && staff.status === 'ONLINE') {
      stateManager.updateStaff(staffId, {
        status: 'BUSY',
        lastActiveAt: new Date().toISOString()
      });
    }
    
    console.log(`[StateCoordinator] ✅ Task started\n`);
    
    return { status: 'success', message: 'Task started' };
  }

  /**
   * INVENTORY_UPDATED event handler
   */
  async _handleInventoryUpdated(event) {
    const { productId, change } = event.data;
    
    console.log(`\n[StateCoordinator] 📦 INVENTORY_UPDATED: ${productId}`);
    
    // Recalculate system state (to update low stock alerts)
    const systemState = stateManager.calculateSystemState();
    
    // Check if new alerts triggered
    if (systemState.alerts.length > 0) {
      console.log(`[StateCoordinator] ⚠️  System alerts:`, systemState.alerts);
    }
    
    console.log(`[StateCoordinator] ✅ Inventory update processed\n`);
    
    return { status: 'success', message: 'Inventory updated' };
  }

  /**
   * Get event log
   */
  getEventLog(limit = 50) {
    return this.eventLog.slice(-limit);
  }

  /**
   * Log event to internal log
   */
  _logEvent(event) {
    this.eventLog.push({
      ...event,
      processedAt: new Date().toISOString()
    });
    
    // Keep only last 1000 events
    if (this.eventLog.length > 1000) {
      this.eventLog.shift();
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      eventLogSize: this.eventLog.length,
      systemState: stateManager.getSystemState(),
      stateStats: stateManager.getStats(),
      agentsWired: {
        orderAgent: !!this.orderAgent,
        inventoryAgent: !!this.inventoryAgent,
        decisionEngine: !!this.decisionEngine,
        workforceAgent: !!this.workforceAgent,
        coordinationAgent: !!this.coordinationAgent,
        criticAgent: !!this.criticAgent,
        taskExecutor: !!this.taskExecutor
      }
    };
  }
}

// Singleton instance
const stateCoordinator = new StateCoordinator();

module.exports = stateCoordinator;
