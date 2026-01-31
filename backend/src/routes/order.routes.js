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
