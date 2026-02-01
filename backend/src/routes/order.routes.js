/**
 * ORDER ROUTES
 * 
 * Handles incoming order requests from:
 * - Website (structured JSON)
 * - WhatsApp (raw text)
 * 
 * Routes to Input Gateway for processing
 */

const express = require('express');
const router = express.Router();
const inputGateway = require('../services/inputGateway');
const outputHandlers = require('../services/outputHandlers');
const stateManager = require('../state/stateManager');
const stateCoordinator = require('../services/stateCoordinator');

/**
 * GET /order/products
 * List products (inventory) for e-commerce catalog
 */
router.get('/products', (req, res) => {
  try {
    const items = stateManager.getAllInventory();
    const products = items.map(p => ({
      productId: p.productId,
      productName: p.productName,
      unit: p.unit,
      availableStock: p.availableStock ?? (p.currentStock - (p.reservedStock || 0)),
      currentStock: p.currentStock,
      category: p.category || ''
    }));
    res.status(200).json({ products, count: products.length });
  } catch (error) {
    console.error('[API] Error listing products:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /order/last-run
 * Terminal-style run log of last order processing (for dashboard page)
 */
router.get('/last-run', (req, res) => {
  try {
    const runLog = stateCoordinator.getLastRunLog();
    const summary = stateCoordinator.getLastRunSummary();
    res.status(200).json({ runLog, summary, count: runLog.length });
  } catch (error) {
    console.error('[API] Error getting last run log:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /order/dashboard
 * Full dashboard payload: KPIs, live orders, workforce, stock (for Overview UI)
 */
router.get('/dashboard', (req, res) => {
  try {
    const orders = stateManager.getAllOrders();
    const staffMembers = stateManager.getAllStaff();
    const inventory = stateManager.getAllInventory();

    const totalOrders = orders.length;
    const totalStaff = staffMembers.length;
    const onlineStaff = staffMembers.filter(s => s.status === 'ONLINE').length;
    const lowStockCount = inventory.filter(i => i.needsRestock && i.needsRestock()).length;
    const utilization = totalStaff > 0
      ? staffMembers.reduce((sum, s) => sum + (s.getWorkloadPercentage ? s.getWorkloadPercentage() : 0), 0) / totalStaff
      : 0;

    const list = orders.map(o => {
      const firstItem = (o.items && o.items[0]) || {};
      return {
        orderId: o.orderId,
        customerName: o.customerName,
        channel: o.channel,
        status: o.status,
        totalQuantity: o.totalQuantity,
        unit: firstItem.unit || o.unit || 'units',
        assignedStaffName: o.assignedStaffName,
        productName: firstItem.productName || o.productName || 'Order',
        priority: o.priority || 'STANDARD',
        createdAt: o.createdAt
      };
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const staff = staffMembers.map(s => ({
      staffId: s.staffId,
      name: s.name,
      role: s.role,
      status: s.status,
      currentWorkload: s.currentWorkload,
      maxCapacity: s.maxCapacity,
      workloadHours: `${s.currentWorkload}h`,
      workloadPercent: s.getWorkloadPercentage ? s.getWorkloadPercentage() : 0
    }));

    const stock = inventory.map(i => ({
      productId: i.productId,
      productName: i.productName,
      unit: i.unit,
      currentStock: i.currentStock,
      availableStock: i.availableStock,
      minStockLevel: i.minStockLevel,
      reorderPoint: i.reorderPoint,
      needsRestock: i.needsRestock ? i.needsRestock() : false,
      stockStatus: i.getStockStatus ? i.getStockStatus() : 'IN_STOCK'
    }));

    res.status(200).json({
      summary: {
        totalOrders,
        activeStaff: onlineStaff,
        totalStaff,
        lowStockCount,
        utilizationPercent: Math.round(utilization),
        efficiencyPercent: 94
      },
      orders: list,
      staff,
      inventory: stock
    });
  } catch (error) {
    console.error('[API] Error getting dashboard:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /order/restock
 * Add stock to an inventory item (Restock button on dashboard)
 * Body: { productId: string, quantity: number }
 */
router.post('/restock', (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || quantity == null || quantity < 1) {
      return res.status(400).json({ error: 'productId and quantity (>= 1) required' });
    }
    const item = stateManager.getInventoryItem(productId);
    if (!item) return res.status(404).json({ error: `Product ${productId} not found` });
    const newStock = item.currentStock + Number(quantity);
    stateManager.updateInventory(productId, {
      currentStock: newStock,
      lastRestocked: new Date().toISOString()
    });
    const updated = stateManager.getInventoryItem(productId);
    res.status(200).json({
      success: true,
      productId,
      previousStock: item.currentStock,
      added: Number(quantity),
      newStock: updated.currentStock
    });
  } catch (error) {
    console.error('[API] Error restocking:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /order/staff
 * Add new staff member (Manage button on dashboard)
 * Body: { name: string, role?: string, status?: string, maxCapacity?: number, phone?: string }
 */
router.post('/staff', (req, res) => {
  try {
    const { name, role, status, maxCapacity, phone } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const allStaff = stateManager.getAllStaff();
    const maxNum = allStaff.reduce((max, s) => {
      const m = /^STAFF-(\d+)$/i.exec(s.staffId);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const staffId = `STAFF-${String(maxNum + 1).padStart(3, '0')}`;
    const { StaffMember } = require('../models');
    const staff = new StaffMember({
      staffId,
      name: name.trim(),
      phone: phone || '',
      role: role || 'PRODUCTION',
      skills: ['assembly', 'packing'],
      status: (status || 'ONLINE').toUpperCase(),
      currentWorkload: 0,
      maxCapacity: maxCapacity != null ? Math.min(24, Math.max(1, Number(maxCapacity) || 8)) : 8
    });
    stateManager.addStaff(staff);
    res.status(201).json({ success: true, staff: staff.toJSON ? staff.toJSON() : staff });
  } catch (error) {
    console.error('[API] Error adding staff:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /order/staff/:staffId
 * Remove staff member (Manage button on dashboard)
 */
router.delete('/staff/:staffId', (req, res) => {
  try {
    const { staffId } = req.params;
    stateManager.deleteStaff(staffId);
    res.status(200).json({ success: true, message: `Staff ${staffId} removed` });
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('[API] Error removing staff:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /order/staff/:staffId
 * Update staff status or workload (Manage button on dashboard)
 * Body: { status?: "ONLINE"|"BUSY"|"OFFLINE", currentWorkload?: number }
 */
router.patch('/staff/:staffId', (req, res) => {
  try {
    const { staffId } = req.params;
    const { status, currentWorkload } = req.body;
    const staff = stateManager.getStaff(staffId);
    if (!staff) return res.status(404).json({ error: `Staff ${staffId} not found` });
    const updates = {};
    if (status !== undefined) {
      const valid = ['ONLINE', 'BUSY', 'OFFLINE', 'ON_BREAK'];
      if (valid.includes(String(status).toUpperCase())) {
        updates.status = String(status).toUpperCase();
      }
    }
    if (currentWorkload !== undefined) {
      const val = Number(currentWorkload);
      if (!Number.isNaN(val) && val >= 0) {
        updates.currentWorkload = Math.min(val, staff.maxCapacity || 8);
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Provide status and/or currentWorkload' });
    }
    stateManager.updateStaff(staffId, updates);
    const updated = stateManager.getStaff(staffId);
    res.status(200).json({ success: true, staff: updated.toJSON ? updated.toJSON() : updated });
  } catch (error) {
    console.error('[API] Error updating staff:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /order/list
 * List all orders (for website dashboard / order tracking)
 */
router.get('/list', (req, res) => {
  try {
    const orders = stateManager.getAllOrders();
    const list = orders.map(o => {
      const tasks = stateManager.getTasksByOrder(o.orderId);
      return {
        orderId: o.orderId,
        customerName: o.customerName,
        channel: o.channel,
        status: o.status,
        totalQuantity: o.totalQuantity,
        assignedStaffName: o.assignedStaffName,
        taskIds: o.taskIds,
        taskCount: tasks.length,
        createdAt: o.createdAt
      };
    });
    res.status(200).json({ orders: list, count: list.length });
  } catch (error) {
    console.error('[API] Error listing orders:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /order/website
 * 
 * Accepts structured order from website form
 * 
 * Request body:
 * {
 *   "userId": "user123",
 *   "customerName": "Rajesh Kumar",
 *   "productId": "PROD-123",
 *   "productName": "Widget A",
 *   "quantity": 15,
 *   "unit": "boxes",
 *   "priority": "HIGH",
 *   "deadline": "2026-02-01T15:00:00Z",
 *   "notes": "Please pack carefully"
 * }
 */
router.post('/website', async (req, res) => {
  try {
    console.log('\n[API] POST /order/website');
    
    const result = await inputGateway.processWebsiteOrder(req.body);
    const coordinatorResult = result.result || {};
    const responseBody = outputHandlers.sendWebsiteUpdate(coordinatorResult, stateManager);
    responseBody.runLog = stateCoordinator.getLastRunLog();
    res.status(200).json(responseBody);
  } catch (error) {
    console.error('[API] Error processing website order:', error.message);
    
    res.status(400).json({
      success: false,
      error: error.message,
      channel: 'website'
    });
  }
});

/**
 * POST /order/whatsapp
 * 
 * Accepts raw WhatsApp message
 * 
 * Request body:
 * {
 *   "phone": "+91-98765-43210",
 *   "name": "Rajesh Kumar",
 *   "message": "I need 15 boxes of Widget A by tomorrow 3pm. Urgent!",
 *   "timestamp": "2026-01-31T10:30:00Z"
 * }
 */
router.post('/whatsapp', async (req, res) => {
  try {
    console.log('\n[API] POST /order/whatsapp');
    
    const result = await inputGateway.processWhatsAppOrder(req.body);
    const coordinatorResult = result.result || {};
    const customerId = result.data?.customerId || req.body?.phone || req.body?.from;
    outputHandlers.sendWhatsAppUpdate(coordinatorResult, stateManager, customerId);
    
    const responseBody = outputHandlers.buildWebsiteResponse(coordinatorResult, stateManager, 'whatsapp');
    res.status(200).json({
      ...responseBody,
      channel: 'whatsapp',
      note: 'Update sent to customer (mock: console log)'
    });
  } catch (error) {
    console.error('[API] Error processing WhatsApp message:', error.message);
    
    res.status(400).json({
      success: false,
      error: error.message,
      channel: 'whatsapp'
    });
  }
});

/**
 * GET /order/status
 * 
 * Input Gateway health check
 */
router.get('/status', (req, res) => {
  const status = inputGateway.getStatus();
  res.status(200).json(status);
});

module.exports = router;
