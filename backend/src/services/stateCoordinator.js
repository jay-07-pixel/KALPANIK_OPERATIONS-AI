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

class StateCoordinator {
  constructor() {
    this.eventLog = [];
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
   * ORDER_RECEIVED event handler
   * Orchestrates the full order processing flow
   */
  async _handleOrderReceived(event) {
    const { channel, data } = event.data;
    
    console.log(`\n[StateCoordinator] 🎯 ORDER_RECEIVED from ${channel}`);
    console.log(`[StateCoordinator] Data:`, JSON.stringify(data, null, 2));

    try {
      // Step 1: Route to Order Agent
      console.log(`[StateCoordinator] ➤ Step 1: Routing to Order Agent...`);
      if (!this.orderAgent) {
        console.log(`[StateCoordinator] ⚠️  Order Agent not wired yet`);
        return { status: 'pending', message: 'Order Agent not available' };
      }
      
      // Process order and create OrderIntent
      const orderIntent = await this.orderAgent.processOrder(data, channel);
      console.log(`[StateCoordinator] ✅ OrderIntent created: ${orderIntent.intentId}`);
      
      // Validate intent
      const validation = this.orderAgent.validateIntent(orderIntent);
      if (!validation.isValid) {
        console.log(`[StateCoordinator] ⚠️  OrderIntent has warnings:`, validation.warnings);
        // Continue anyway - warnings don't stop processing
      }
      
      // Save OrderIntent to state
      stateManager.addOrderIntent(orderIntent);
      console.log(`[StateCoordinator] ✅ OrderIntent saved to state`);
      
      // Step 2: Route to Inventory Agent
      console.log(`[StateCoordinator] ➤ Step 2: Routing to Inventory Agent...`);
      if (!this.inventoryAgent) {
        console.log(`[StateCoordinator] ⚠️  Inventory Agent not implemented yet`);
        console.log(`[StateCoordinator] 🛑 Stopping here until Inventory Agent is ready\n`);
        return { 
          status: 'partial', 
          message: 'OrderIntent created, waiting for Inventory Agent',
          orderIntent: orderIntent
        };
      }

      // Register listener for events emitted by Inventory Agent
      this.inventoryAgent.onEmit((ev) => {
        this._logEvent(ev);
        console.log(`[StateCoordinator] 📥 Event from Inventory Agent: ${ev.type}`);
      });

      const inventoryResult = await this.inventoryAgent.checkAvailability(orderIntent);

      if (inventoryResult.status === 'NOT_AVAILABLE') {
        console.log(`[StateCoordinator] ❌ Inventory not available. Reason: ${inventoryResult.reason}`);
        stateManager.updateOrderIntent(orderIntent.intentId, { status: 'REJECTED' });
        console.log(`[StateCoordinator] 🛑 OrderIntent ${orderIntent.intentId} rejected\n`);
        return {
          status: 'rejected',
          message: 'Insufficient inventory',
          orderIntent: orderIntent,
          reason: inventoryResult.reason,
          details: inventoryResult
        };
      }

      console.log(`[StateCoordinator] ✅ Inventory reserved for intent ${orderIntent.intentId}`);
      stateManager.updateOrderIntent(orderIntent.intentId, {
        status: 'VALIDATED',
        productId: inventoryResult.productId || orderIntent.productId
      });
      
      // Step 3: Create Order
      console.log(`[StateCoordinator] ➤ Step 3: Creating Order...`);
      
      // Step 4: Route to Decision Engine
      console.log(`[StateCoordinator] ➤ Step 4: Routing to Decision Engine...`);
      
      // Step 5: Route to Workforce Agent
      console.log(`[StateCoordinator] ➤ Step 5: Routing to Workforce Agent...`);
      
      // Step 6: Route to Coordination Agent
      console.log(`[StateCoordinator] ➤ Step 6: Routing to Coordination Agent...`);
      
      // Step 7: Route to Critic Agent
      console.log(`[StateCoordinator] ➤ Step 7: Routing to Critic Agent...`);
      
      // Step 8: Execute approved plan
      console.log(`[StateCoordinator] ➤ Step 8: Routing to Task Executor...`);
      
      // Update system state
      stateManager.calculateSystemState();
      
      console.log(`[StateCoordinator] ✅ Order processing complete\n`);
      
      return { status: 'success', message: 'Order processing flow complete' };
      
    } catch (error) {
      console.error(`[StateCoordinator] ❌ Error in order processing:`, error.message);
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
