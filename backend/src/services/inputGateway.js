/**
 * INPUT GATEWAY
 * 
 * Entry point for all external events
 * 
 * Responsibilities:
 * - Detect channel (website / whatsapp)
 * - Normalize input format
 * - Route to STATE COORDINATOR
 * 
 * Channel Detection:
 * - Website: structured form data (JSON)
 * - WhatsApp: raw text message (needs parsing later)
 */

const stateCoordinator = require('./stateCoordinator');
const { EventTypes, createEvent } = require('../state/events');

class InputGateway {
  /**
   * Process website order
   * Input is already structured - no parsing needed
   */
  async processWebsiteOrder(data) {
    console.log('\n[InputGateway] 📝 Website order received');
    
    // Validate required fields
    this._validateWebsiteOrder(data);
    
    // Normalize to standard format
    const normalizedData = {
      channel: 'website',
      customerId: data.userId || data.customerId,
      customerName: data.customerName,
      productId: data.productId,
      productName: data.productName,
      quantity: parseInt(data.quantity),
      unit: data.unit || 'pieces',
      priority: data.priority || 'MEDIUM',
      deadline: data.deadline || null,
      notes: data.notes || '',
      rawInput: data // Store original data
    };
    
    console.log('[InputGateway] ✓ Normalized website order');
    console.log('[InputGateway]   Customer:', normalizedData.customerName);
    console.log('[InputGateway]   Product:', normalizedData.productName);
    console.log('[InputGateway]   Quantity:', normalizedData.quantity, normalizedData.unit);
    console.log('[InputGateway]   Priority:', normalizedData.priority);
    
    // Create event and route to State Coordinator
    const event = createEvent(EventTypes.ORDER_RECEIVED, {
      channel: 'website',
      data: normalizedData
    });
    
    console.log('[InputGateway] ➤ Routing to State Coordinator\n');
    await stateCoordinator.handleEvent(event);
    
    return {
      success: true,
      channel: 'website',
      message: 'Order received and processing',
      data: normalizedData
    };
  }

  /**
   * Process WhatsApp order
   * Input is raw text - store as-is for now
   * Parsing will happen in Order Agent (using LLM)
   */
  async processWhatsAppOrder(data) {
    console.log('\n[InputGateway] 💬 WhatsApp message received');
    
    // Validate required fields
    this._validateWhatsAppOrder(data);
    
    // Normalize to standard format
    const normalizedData = {
      channel: 'whatsapp',
      customerId: data.phone || data.from,
      customerName: data.name || null, // May not be known yet
      message: data.message || data.text,
      timestamp: data.timestamp || new Date().toISOString(),
      rawInput: data // Store original data
    };
    
    console.log('[InputGateway] ✓ Normalized WhatsApp message');
    console.log('[InputGateway]   From:', normalizedData.customerId);
    console.log('[InputGateway]   Message:', normalizedData.message);
    console.log('[InputGateway]   Note: Will be parsed by Order Agent (LLM)');
    
    // Create event and route to State Coordinator
    const event = createEvent(EventTypes.ORDER_RECEIVED, {
      channel: 'whatsapp',
      data: normalizedData
    });
    
    console.log('[InputGateway] ➤ Routing to State Coordinator\n');
    await stateCoordinator.handleEvent(event);
    
    return {
      success: true,
      channel: 'whatsapp',
      message: 'Message received and processing',
      data: normalizedData
    };
  }

  /**
   * Validate website order data
   */
  _validateWebsiteOrder(data) {
    const required = ['productId', 'productName', 'quantity'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (isNaN(parseInt(data.quantity)) || parseInt(data.quantity) <= 0) {
      throw new Error('Quantity must be a positive number');
    }
    
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (data.priority && !validPriorities.includes(data.priority)) {
      throw new Error(`Priority must be one of: ${validPriorities.join(', ')}`);
    }
  }

  /**
   * Validate WhatsApp order data
   */
  _validateWhatsAppOrder(data) {
    if (!data.phone && !data.from) {
      throw new Error('Phone number is required');
    }
    
    if (!data.message && !data.text) {
      throw new Error('Message text is required');
    }
    
    const message = data.message || data.text;
    if (message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }
  }

  /**
   * Health check
   */
  getStatus() {
    return {
      status: 'operational',
      channels: {
        website: 'ready',
        whatsapp: 'ready'
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
const inputGateway = new InputGateway();

module.exports = inputGateway;
