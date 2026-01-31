/**
 * TEST ORDER AGENT
 * 
 * Test Order Agent with website and WhatsApp orders
 * Run: node src/agents/testOrderAgent.js
 */

const orderAgent = require('./orderAgent');

console.log('='.repeat(60));
console.log('TESTING ORDER AGENT');
console.log('='.repeat(60));

async function testWebsiteOrder() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Website Order (Structured Data)');
  console.log('='.repeat(60));
  
  const websiteData = {
    customerId: 'user123',
    customerName: 'Rajesh Kumar',
    productId: 'PROD-123',
    productName: 'Widget A',
    quantity: 15,
    unit: 'boxes',
    priority: 'HIGH',
    deadline: '2026-02-01T15:00:00Z',
    notes: 'Please pack carefully'
  };
  
  try {
    const orderIntent = await orderAgent.processOrder(websiteData, 'website');
    
    console.log('\n✅ Result:');
    console.log('  Intent ID:', orderIntent.intentId);
    console.log('  Customer:', orderIntent.customerName);
    console.log('  Product:', orderIntent.productName);
    console.log('  Quantity:', orderIntent.quantity, orderIntent.unit);
    console.log('  Priority:', orderIntent.priority);
    console.log('  Status:', orderIntent.status);
    
    // Validate
    const validation = orderAgent.validateIntent(orderIntent);
    console.log('\n  Validation:', validation.isValid ? '✅ Valid' : '⚠️ Has warnings');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

async function testWhatsAppOrder() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: WhatsApp Order (Needs Parsing)');
  console.log('='.repeat(60));
  
  const whatsappData = {
    customerId: '+91-98765-43210',
    customerName: 'Rajesh Kumar',
    message: 'Hi, I need 15 boxes of Widget A by tomorrow 3pm. Urgent!',
    timestamp: new Date().toISOString()
  };
  
  try {
    const orderIntent = await orderAgent.processOrder(whatsappData, 'whatsapp');
    
    console.log('\n✅ Result:');
    console.log('  Intent ID:', orderIntent.intentId);
    console.log('  Customer:', orderIntent.customerName);
    console.log('  Product:', orderIntent.productName);
    console.log('  Quantity:', orderIntent.quantity, orderIntent.unit);
    console.log('  Priority:', orderIntent.priority);
    console.log('  Deadline:', orderIntent.deadline);
    console.log('  Status:', orderIntent.status);
    
    // Validate
    const validation = orderAgent.validateIntent(orderIntent);
    console.log('\n  Validation:', validation.isValid ? '✅ Valid' : '⚠️ Has warnings');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

async function testWhatsAppOrderWithNewCustomer() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: WhatsApp Order (New Customer)');
  console.log('='.repeat(60));
  
  const whatsappData = {
    customerId: '+91-99999-88888',
    customerName: null, // Unknown customer
    message: '50 boxes of Material Z urgently needed',
    timestamp: new Date().toISOString()
  };
  
  try {
    const orderIntent = await orderAgent.processOrder(whatsappData, 'whatsapp');
    
    console.log('\n✅ Result:');
    console.log('  Intent ID:', orderIntent.intentId);
    console.log('  Customer:', orderIntent.customerName);
    console.log('  Product:', orderIntent.productName);
    console.log('  Quantity:', orderIntent.quantity, orderIntent.unit);
    console.log('  Priority:', orderIntent.priority);
    
    // Validate
    const validation = orderAgent.validateIntent(orderIntent);
    console.log('\n  Validation:', validation.isValid ? '✅ Valid' : '⚠️ Has warnings');
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(w => console.log('    -', w));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

async function testVagueWhatsAppOrder() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Vague WhatsApp Order (Validation Test)');
  console.log('='.repeat(60));
  
  const whatsappData = {
    customerId: '+91-98765-43210',
    customerName: 'Rajesh Kumar',
    message: 'Can you send me some widgets tomorrow?',
    timestamp: new Date().toISOString()
  };
  
  try {
    const orderIntent = await orderAgent.processOrder(whatsappData, 'whatsapp');
    
    console.log('\n✅ Result:');
    console.log('  Intent ID:', orderIntent.intentId);
    console.log('  Customer:', orderIntent.customerName);
    console.log('  Product:', orderIntent.productName || '(not detected)');
    console.log('  Quantity:', orderIntent.quantity || '(not specified)');
    console.log('  Priority:', orderIntent.priority);
    
    // Validate
    const validation = orderAgent.validateIntent(orderIntent);
    console.log('\n  Validation:', validation.isValid ? '✅ Valid' : '⚠️ Has warnings');
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(w => console.log('    -', w));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

async function testAgentStatus() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Agent Status');
  console.log('='.repeat(60));
  
  const status = orderAgent.getStatus();
  console.log('\nAgent Status:');
  console.log('  Agent:', status.agent);
  console.log('  Status:', status.status);
  console.log('  Capabilities:');
  status.capabilities.forEach(c => console.log('    -', c));
  console.log('  Intents Created:', status.intentsCreated);
  console.log('  Customers Registered:', status.customersRegistered);
}

// Run all tests
async function runTests() {
  await testWebsiteOrder();
  await testWhatsAppOrder();
  await testWhatsAppOrderWithNewCustomer();
  await testVagueWhatsAppOrder();
  await testAgentStatus();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL ORDER AGENT TESTS COMPLETED');
  console.log('='.repeat(60));
  console.log('\nOrder Agent is ready for integration!');
  console.log('Next: Wire to StateCoordinator\n');
}

runTests().catch(console.error);
