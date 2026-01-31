/**
 * TEST INTEGRATION
 *
 * Test full integration: Input Gateway → State Coordinator → Order Agent → Inventory Agent
 * Run: node src/services/testIntegration.js
 */

const stateCoordinator = require('./stateCoordinator');
const orderAgent = require('../agents/orderAgent');
const inventoryAgent = require('../agents/inventoryAgent');
const stateManager = require('../state/stateManager');
const { EventTypes, createEvent } = require('../state/events');
const { InventoryItem } = require('../models');

console.log('='.repeat(60));
console.log('TESTING FULL INTEGRATION');
console.log('='.repeat(60));

function seedInventory() {
  stateManager.addInventoryItem(new InventoryItem({
    productId: 'PROD-123',
    productName: 'Widget A',
    sku: 'WID-A-001',
    category: 'Electronics',
    unit: 'boxes',
    currentStock: 200,
    reservedStock: 0,
    minStockLevel: 20,
    reorderPoint: 30
  }));
  stateManager.addInventoryItem(new InventoryItem({
    productId: 'PROD-456',
    productName: 'Widget B',
    sku: 'WID-B-001',
    category: 'Electronics',
    unit: 'pieces',
    currentStock: 100,
    reservedStock: 0,
    minStockLevel: 10,
    reorderPoint: 15
  }));
  console.log('[Setup] Seeded inventory: Widget A (200 boxes), Widget B (100 pieces)\n');
}

// Reset state and seed inventory
console.log('\n[Setup] Resetting state and seeding inventory...');
stateManager.reset();
seedInventory();
console.log('[Setup] Wiring Order Agent and Inventory Agent to State Coordinator...');
stateCoordinator.setAgents({
  orderAgent: orderAgent,
  inventoryAgent: inventoryAgent
});
console.log('[Setup] ✅ Agents wired\n');

async function testWebsiteOrderFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Complete Website Order Flow');
  console.log('='.repeat(60));
  
  // Simulate ORDER_RECEIVED event from Input Gateway
  const event = createEvent(EventTypes.ORDER_RECEIVED, {
    channel: 'website',
    data: {
      customerId: 'user123',
      customerName: 'Rajesh Kumar',
      productId: 'PROD-123',
      productName: 'Widget A',
      quantity: 15,
      unit: 'boxes',
      priority: 'HIGH',
      deadline: '2026-02-01T15:00:00Z',
      notes: 'Please pack carefully'
    }
  });
  
  // Send to State Coordinator
  const result = await stateCoordinator.handleEvent(event);
  
  console.log('\n[Test] Result:');
  console.log('  Status:', result.status);
  console.log('  Message:', result.message);
  if (result.orderIntent) {
    console.log('  OrderIntent ID:', result.orderIntent.intentId);
    console.log('  Intent Status:', result.orderIntent.status);
  }
  if (result.reason) console.log('  Reason:', result.reason);

  const orderIntents = stateManager.getAllOrderIntents();
  console.log('\n[Test] State Check:');
  console.log('  OrderIntents in state:', orderIntents.length);
  if (orderIntents.length > 0) {
    const latest = orderIntents[orderIntents.length - 1];
    console.log('  Latest Intent:', latest.intentId, '-', latest.productName, '-', latest.status);
  }
}

async function testWhatsAppOrderFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Complete WhatsApp Order Flow');
  console.log('='.repeat(60));
  
  // Simulate ORDER_RECEIVED event from Input Gateway
  const event = createEvent(EventTypes.ORDER_RECEIVED, {
    channel: 'whatsapp',
    data: {
      customerId: '+91-98765-43210',
      customerName: 'Rajesh Kumar',
      message: 'Hi, I need 20 pieces of Widget B by tomorrow. Priority!',
      timestamp: new Date().toISOString()
    }
  });
  
  // Send to State Coordinator
  const result = await stateCoordinator.handleEvent(event);
  
  console.log('\n[Test] Result:');
  console.log('  Status:', result.status);
  console.log('  Message:', result.message);
  if (result.orderIntent) {
    console.log('  OrderIntent ID:', result.orderIntent.intentId);
    console.log('  Intent Status:', result.orderIntent.status);
  }
  if (result.reason) console.log('  Reason:', result.reason);

  const orderIntents = stateManager.getAllOrderIntents();
  console.log('\n[Test] State Check:');
  console.log('  OrderIntents in state:', orderIntents.length);
  if (orderIntents.length > 0) {
    const latest = orderIntents[orderIntents.length - 1];
    console.log('  Latest Intent:', latest.intentId, '-', latest.productName, '-', latest.status);
  }
}

async function testInsufficientInventory() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2b: Order with insufficient inventory');
  console.log('='.repeat(60));

  const event = createEvent(EventTypes.ORDER_RECEIVED, {
    channel: 'website',
    data: {
      customerId: 'user123',
      customerName: 'Test User',
      productId: 'PROD-123',
      productName: 'Widget A',
      quantity: 500,
      unit: 'boxes',
      priority: 'HIGH'
    }
  });

  const result = await stateCoordinator.handleEvent(event);
  console.log('\n[Test] Result:');
  console.log('  Status:', result.status);
  console.log('  Message:', result.message);
  console.log('  Reason:', result.reason);
  if (result.status !== 'rejected') throw new Error('Expected status rejected');
  const intents = stateManager.getAllOrderIntents();
  const latest = intents[intents.length - 1];
  if (latest.status !== 'REJECTED') throw new Error('Expected intent status REJECTED');
  console.log('  OrderIntent Status:', latest.status);
  console.log('✅ PASS\n');
}

async function testSystemState() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: System State');
  console.log('='.repeat(60));
  
  const systemState = stateManager.calculateSystemState();
  
  console.log('\nSystem State:');
  console.log('  Total Orders:', systemState.totalOrders);
  console.log('  Pending Orders:', systemState.pendingOrders);
  console.log('  Health Status:', systemState.getHealthStatus());
  
  console.log('\nOrder Intents:');
  const intents = stateManager.getAllOrderIntents();
  intents.forEach(intent => {
    console.log(`  - ${intent.intentId}: ${intent.productName} (${intent.quantity} ${intent.unit}) - ${intent.status}`);
  });
  console.log('\nInventory:');
  const inv = stateManager.getAllInventory();
  inv.forEach(item => {
    console.log(`  - ${item.productId}: available=${item.availableStock}, reserved=${item.reservedStock}`);
  });
  
  console.log('\nAudit Log (last 5):');
  const audit = stateManager.getAuditLog(5);
  audit.forEach(entry => {
    console.log(`  [${entry.timestamp}] ${entry.action}`);
  });
}

async function testCoordinatorStatus() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: State Coordinator Status');
  console.log('='.repeat(60));
  
  const status = stateCoordinator.getStatus();
  
  console.log('\nState Coordinator:');
  console.log('  Event Log Size:', status.eventLogSize);
  console.log('  Agents Wired:');
  Object.entries(status.agentsWired).forEach(([agent, wired]) => {
    console.log(`    ${agent}: ${wired ? '✅' : '❌'}`);
  });
}

// Run all tests
async function runTests() {
  await testWebsiteOrderFlow();
  await testWhatsAppOrderFlow();
  await testInsufficientInventory();
  await testSystemState();
  await testCoordinatorStatus();

  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL INTEGRATION TESTS COMPLETED');
  console.log('='.repeat(60));
  console.log('\nIntegration: Order Agent → Inventory Agent → State Manager');
  console.log('Next: Implement Order Creation & Decision Engine\n');
}

runTests().catch(console.error);
