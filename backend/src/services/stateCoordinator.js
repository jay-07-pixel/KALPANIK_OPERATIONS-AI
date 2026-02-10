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
const delayPredictor = require('./delayPredictor');

class StateCoordinator {
  constructor() {
    this.eventLog = [];
    this.lastRunLog = [];
    this.pendingRunLog = []; // Lines logged before ORDER_RECEIVED (e.g. API, InputGateway, parser) — prepended for WhatsApp
    this.lastRunSummary = null;
    this.lastWhatsAppRunLog = [];
    this.lastWhatsAppRunSummary = null; // Snapshot when channel is whatsapp (for WhatsApp Log UI)
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

  /**
   * Append a line to pending run log (prepended to lastRunLog for next WhatsApp run so web shows entire flow)
   */
  appendPendingRunLog(text, type = 'info') {
    this.pendingRunLog.push({ type, text });
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

  getLastWhatsAppRunLog() {
    return this.lastWhatsAppRunLog || [];
  }

  getLastWhatsAppRunSummary() {
    return this.lastWhatsAppRunSummary;
  }

  _snapshotWhatsAppRunIfNeeded(channel) {
    if (channel === 'whatsapp') {
      this.lastWhatsAppRunLog = [...this.lastRunLog];
      this.lastWhatsAppRunSummary = this.lastRunSummary ? { ...this.lastRunSummary } : null;
    }
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
    // Prepend any lines logged before this run (API, InputGateway, etc.) so web log matches terminal
    if (channel === 'whatsapp' && this.pendingRunLog.length > 0) {
      this.lastRunLog = [...this.pendingRunLog];
      this.pendingRunLog = [];
    }
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
      
      const runLogger = (text, type) => this._runLog(text, type || 'info');
      const orderIntent = await this.orderAgent.processOrder(data, channel, { log: runLogger });
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
        this._snapshotWhatsAppRunIfNeeded(channel);
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
        this._snapshotWhatsAppRunIfNeeded(channel);
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
        const rawInfo = timeAndDeadline.deadlineRaw ? ` (raw: "${timeAndDeadline.deadlineRaw}")` : '';
        this._runLog(`[StateCoordinator]   Deadline: not set${rawInfo} (cannot verify)`);
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

      this._runLog(`[StateCoordinator] ➤ Step 5–6: Workforce & Coordination (assign each task by role: PRODUCTION / QUALITY / PACKING)...`);
      const orderTasks = stateManager.getTasksByOrder(persistedOrder.orderId);
      const assignResult = coordinationAgent.assignTasksByRole(
        orderTasks,
        stateManager,
        (ev) => {
          this._logEvent(ev);
          this._runLog(`[StateCoordinator] 📥 Event: ${ev.type}`);
        }
      );

      let assignedStaffId = null;
      let assignedStaffName = null;

      if (assignResult.assignments && assignResult.assignments.length > 0) {
        assignResult.assignments.forEach((a, i) => {
          this._runLog(`[StateCoordinator]   ${a.taskType} (${a.taskId}) → ${a.staffName} (${a.staffId})`);
        });
      }

      this._setSummary({
        steps: [...(this.lastRunSummary.steps || []), { step: 5, name: 'Workforce Agent', status: assignResult.success ? 'ok' : 'warn', detail: assignResult.success ? 'Per-task by role' : assignResult.message }, { step: 6, name: 'Coordination Agent', status: assignResult.success ? 'ok' : 'warn', detail: assignResult.message }],
        taskAssignments: assignResult.assignments || [],
        assignedStaffNames: assignResult.assignedStaffNames || [],
        selectedStaff: assignResult.assignments && assignResult.assignments[0] ? { staffId: assignResult.assignments[0].staffId, name: assignResult.assignments[0].staffName, reason: assignResult.message } : null
      });

      if (assignResult.success) {
        assignedStaffId = assignResult.assignments[0].staffId;
        assignedStaffName = assignResult.assignedStaffNames.join(', ');
        stateManager.updateOrder(persistedOrder.orderId, {
          status: 'ASSIGNED',
          assignedStaffId,
          assignedStaffName
        });
        this._runLog(`[StateCoordinator] ✅ Tasks assigned by role: ${assignResult.message}`);

        const delayPred = delayPredictor.predict(persistedOrder, {
          timeRequiredHours: timeAndDeadline.totalHours,
          staffWorkload: assignResult.assignments.reduce((sum, a) => {
            const s = stateManager.getStaff(a.staffId);
            return sum + (s ? s.currentWorkload : 0);
          }, 0) / Math.max(assignResult.assignments.length, 1),
          numCandidates: assignResult.assignments.length,
          numTasks: tasks.length
        });
        this._runLog(`[StateCoordinator] 🤖 Delay Risk Predictor: ${delayPred.message}`);
        this._setSummary({
          coordination: { assignedStaffName: assignResult.assignedStaffNames.join(', '), taskAssignments: assignResult.assignments },
          delayRisk: { ...delayPred }
        });
      } else {
        this._runLog(`[StateCoordinator] ⚠️  Assignment failed: ${assignResult.message}`);
        const delayPred2 = delayPredictor.predict(persistedOrder, {
          timeRequiredHours: timeAndDeadline.totalHours,
          staffWorkload: 0,
          numCandidates: 0,
          numTasks: tasks.length
        });
        this._runLog(`[StateCoordinator] 🤖 Delay Risk Predictor: ${delayPred2.message}`);
        this._setSummary({ delayRisk: { ...delayPred2 } });
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
        this._snapshotWhatsAppRunIfNeeded(channel);
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

      this._snapshotWhatsAppRunIfNeeded(channel);
      return {
        status: 'success',
        message: 'Order created and processing flow complete',
        orderId: persistedOrder.orderId,
        order: persistedOrder,
        orderIntent: orderIntent
      };
      
    } catch (error) {
      this._runLog(`[StateCoordinator] ❌ Error in order processing: ${error.message}`, 'error');
      this._snapshotWhatsAppRunIfNeeded(channel);
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
