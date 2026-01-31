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
    
    res.status(200).json({
      success: true,
      message: 'Order received successfully',
      orderId: result.data.orderId || 'pending', // Will be assigned by Order Agent
      channel: 'website',
      timestamp: new Date().toISOString()
    });
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
    
    res.status(200).json({
      success: true,
      message: 'Message received successfully',
      note: 'Message will be parsed and processed',
      channel: 'whatsapp',
      timestamp: new Date().toISOString()
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
