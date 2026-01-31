/**
 * ORDER AGENT
 * 
 * Responsibilities:
 * - Extract order details from normalized input
 * - Create OrderIntent (NOT confirmed Order)
 * - Identify customer
 * - Parse WhatsApp messages using LLM (via WhatsAppParser)
 * 
 * NOT responsible for:
 * - Checking inventory (that's Inventory Agent)
 * - Creating confirmed orders (that happens after inventory check)
 * - Making business decisions
 */

const { OrderIntent } = require('../models');
const whatsappParser = require('../services/whatsappParser');

class OrderAgent {
  constructor() {
    // Mock customer database (for MVP)
    this.mockCustomers = new Map([
      ['+91-98765-43210', { id: 'CUST-001', name: 'Rajesh Kumar' }],
      ['+91-98765-11111', { id: 'CUST-002', name: 'Priya Sharma' }],
      ['+91-98765-99999', { id: 'CUST-003', name: 'Amit Patel' }],
      ['user123', { id: 'CUST-004', name: 'Website User 123' }]
    ]);
    
    this.intentCounter = 1;
  }

  /**
   * Process order from any channel
   * Creates OrderIntent (NOT confirmed Order)
   * 
   * @param {Object} data - Normalized order data from Input Gateway
   * @param {string} channel - "website" or "whatsapp"
   * @returns {Promise<OrderIntent>}
   */
  async processOrder(data, channel) {
    console.log('\n[OrderAgent] 📝 Processing order...');
    console.log('[OrderAgent] Channel:', channel);
    
    let orderData;
    
    if (channel === 'website') {
      // Website data is already structured
      orderData = this._processWebsiteOrder(data);
    } else if (channel === 'whatsapp') {
      // WhatsApp needs parsing
      orderData = await this._processWhatsAppOrder(data);
    } else {
      throw new Error(`Unknown channel: ${channel}`);
    }
    
    // Identify customer
    const customer = this._identifyCustomer(orderData.customerId, orderData.customerName);
    
    // Create OrderIntent (temporary, before inventory check)
    const orderIntent = this._createOrderIntent(orderData, customer, channel);
    
    console.log('[OrderAgent] ✅ OrderIntent created:', orderIntent.intentId);
    console.log('[OrderAgent]   Customer:', orderIntent.customerName);
    console.log('[OrderAgent]   Product:', orderIntent.productName);
    console.log('[OrderAgent]   Quantity:', orderIntent.quantity, orderIntent.unit);
    console.log('[OrderAgent]   Priority:', orderIntent.priority);
    
    return orderIntent;
  }

  /**
   * Process website order (already structured)
   */
  _processWebsiteOrder(data) {
    console.log('[OrderAgent] 🌐 Processing website order (structured data)');
    
    // Data from website is already clean and structured
    return {
      customerId: data.customerId,
      customerName: data.customerName,
      productId: data.productId,
      productName: data.productName,
      quantity: data.quantity,
      unit: data.unit,
      priority: data.priority,
      deadline: data.deadline,
      notes: data.notes,
      rawInput: data
    };
  }

  /**
   * Process WhatsApp order (needs LLM parsing)
   */
  async _processWhatsAppOrder(data) {
    console.log('[OrderAgent] 💬 Processing WhatsApp order (needs parsing)');
    console.log('[OrderAgent] Message:', data.message);
    
    // Use WhatsAppParser to extract structured data
    console.log('[OrderAgent] ➤ Calling WhatsAppParser...');
    const parsed = await whatsappParser.parseMessage(data.message);
    
    console.log('[OrderAgent] ✅ Parsed result:');
    console.log('[OrderAgent]   Product:', parsed.product);
    console.log('[OrderAgent]   Quantity:', parsed.quantity);
    console.log('[OrderAgent]   Unit:', parsed.unit);
    console.log('[OrderAgent]   Priority:', parsed.priority);
    console.log('[OrderAgent]   Deadline:', parsed.deadline);
    
    // Return structured format
    return {
      customerId: data.customerId, // Phone number
      customerName: data.customerName, // May be null
      productId: null, // Will be resolved later by looking up product name
      productName: parsed.product,
      quantity: parsed.quantity,
      unit: parsed.unit,
      priority: parsed.priority,
      deadline: parsed.deadline,
      notes: null,
      rawInput: data
    };
  }

  /**
   * Identify customer from database (mock for now)
   */
  _identifyCustomer(customerId, customerName) {
    console.log('[OrderAgent] 👤 Identifying customer...');
    
    // Try to find customer in mock database
    const existing = this.mockCustomers.get(customerId);
    
    if (existing) {
      console.log('[OrderAgent] ✅ Found existing customer:', existing.name, `(${existing.id})`);
      return {
        customerId: existing.id,
        customerName: existing.name,
        isNewCustomer: false
      };
    }
    
    // New customer - create temporary ID
    const newCustomerId = `CUST-${String(this.mockCustomers.size + 1).padStart(3, '0')}`;
    const newCustomer = {
      customerId: newCustomerId,
      customerName: customerName || 'Unknown Customer',
      isNewCustomer: true
    };
    
    console.log('[OrderAgent] ⚠️  New customer:', newCustomer.customerName, `(${newCustomerId})`);
    
    // In real system: Save to database
    this.mockCustomers.set(customerId, {
      id: newCustomerId,
      name: newCustomer.customerName
    });
    
    return newCustomer;
  }

  /**
   * Create OrderIntent (temporary order before confirmation)
   */
  _createOrderIntent(orderData, customer, channel) {
    console.log('[OrderAgent] 📋 Creating OrderIntent...');
    
    const intentId = `INTENT-${String(this.intentCounter++).padStart(3, '0')}`;
    
    const orderIntent = new OrderIntent({
      intentId: intentId,
      customerId: customer.customerId,
      customerName: customer.customerName,
      channel: channel,
      productId: orderData.productId,
      productName: orderData.productName,
      quantity: orderData.quantity,
      unit: orderData.unit,
      priority: orderData.priority,
      deadline: orderData.deadline,
      rawInput: orderData.rawInput,
      status: 'PENDING'
    });
    
    console.log('[OrderAgent] ✅ OrderIntent created successfully');
    
    return orderIntent;
  }

  /**
   * Validate OrderIntent data quality
   * Returns warnings if data is incomplete
   */
  validateIntent(orderIntent) {
    const warnings = [];
    
    if (!orderIntent.productName) {
      warnings.push('Product name not detected');
    }
    
    if (!orderIntent.quantity || orderIntent.quantity <= 0) {
      warnings.push('Quantity not specified or invalid');
    }
    
    if (orderIntent.customerName === 'Unknown Customer') {
      warnings.push('Customer name unknown');
    }
    
    if (warnings.length > 0) {
      console.log('[OrderAgent] ⚠️  Validation warnings:');
      warnings.forEach(w => console.log('[OrderAgent]   -', w));
    }
    
    return {
      isValid: warnings.length === 0,
      warnings: warnings
    };
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      agent: 'OrderAgent',
      status: 'operational',
      capabilities: [
        'Website order processing',
        'WhatsApp message parsing',
        'Customer identification',
        'OrderIntent creation'
      ],
      intentsCreated: this.intentCounter - 1,
      customersRegistered: this.mockCustomers.size
    };
  }
}

// Singleton instance
const orderAgent = new OrderAgent();

module.exports = orderAgent;
