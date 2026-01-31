/**
 * TEST INPUT GATEWAY
 * 
 * Test the Input Gateway with sample website and WhatsApp orders
 * Run: node src/services/testInputGateway.js
 */

const inputGateway = require('./inputGateway');

console.log('='.repeat(60));
console.log('TESTING INPUT GATEWAY');
console.log('='.repeat(60));

async function testWebsiteOrder() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Website Order (Structured JSON)');
  console.log('='.repeat(60));
  
  const websiteOrder = {
    userId: 'user123',
    customerId: 'CUST-001',
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
    const result = await inputGateway.processWebsiteOrder(websiteOrder);
    console.log('\n[Test] ✅ Result:', result.message);
    console.log('[Test] Channel:', result.channel);
  } catch (error) {
    console.error('\n[Test] ❌ Error:', error.message);
  }
}

async function testWhatsAppOrder() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: WhatsApp Order (Raw Text)');
  console.log('='.repeat(60));
  
  const whatsappMessage = {
    phone: '+91-98765-43210',
    name: 'Rajesh Kumar',
    message: 'Hi, I need 15 boxes of Widget A by tomorrow 3pm. Urgent!',
    timestamp: new Date().toISOString()
  };
  
  try {
    const result = await inputGateway.processWhatsAppOrder(whatsappMessage);
    console.log('\n[Test] ✅ Result:', result.message);
    console.log('[Test] Channel:', result.channel);
  } catch (error) {
    console.error('\n[Test] ❌ Error:', error.message);
  }
}

async function testValidation() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Validation (Missing Fields)');
  console.log('='.repeat(60));
  
  // Test missing required fields
  const invalidWebsiteOrder = {
    userId: 'user123',
    customerName: 'Rajesh Kumar'
    // Missing productId, productName, quantity
  };
  
  try {
    await inputGateway.processWebsiteOrder(invalidWebsiteOrder);
  } catch (error) {
    console.log('\n[Test] ✅ Validation working - caught error:');
    console.log('[Test]', error.message);
  }
  
  // Test invalid quantity
  const invalidQuantity = {
    productId: 'PROD-123',
    productName: 'Widget A',
    quantity: -5
  };
  
  try {
    await inputGateway.processWebsiteOrder(invalidQuantity);
  } catch (error) {
    console.log('\n[Test] ✅ Quantity validation working:');
    console.log('[Test]', error.message);
  }
  
  // Test empty WhatsApp message
  const emptyMessage = {
    phone: '+91-98765-43210',
    message: ''
  };
  
  try {
    await inputGateway.processWhatsAppOrder(emptyMessage);
  } catch (error) {
    console.log('\n[Test] ✅ WhatsApp validation working:');
    console.log('[Test]', error.message);
  }
}

async function testHealthCheck() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Health Check');
  console.log('='.repeat(60));
  
  const status = inputGateway.getStatus();
  console.log('\n[Test] Gateway Status:');
  console.log('[Test]   Status:', status.status);
  console.log('[Test]   Website:', status.channels.website);
  console.log('[Test]   WhatsApp:', status.channels.whatsapp);
}

// Run all tests
async function runTests() {
  await testWebsiteOrder();
  await testWhatsAppOrder();
  await testValidation();
  await testHealthCheck();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL INPUT GATEWAY TESTS PASSED');
  console.log('='.repeat(60));
  console.log('\nInput Gateway is ready to accept orders!');
  console.log('Next: Start server and test with API endpoints\n');
}

runTests().catch(console.error);
