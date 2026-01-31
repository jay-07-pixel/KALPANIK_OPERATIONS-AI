/**
 * TEST INVENTORY AGENT
 *
 * Run: node src/agents/testInventoryAgent.js
 */

const stateManager = require('../state/stateManager');
const inventoryAgent = require('./inventoryAgent');
const { OrderIntent } = require('../models');
const { InventoryItem } = require('../models');

console.log('='.repeat(60));
console.log('TESTING INVENTORY AGENT');
console.log('='.repeat(60));

function seedInventory() {
  stateManager.reset();
  const { InventoryItem } = require('../models');
  stateManager.addInventoryItem(new InventoryItem({
    productId: 'PROD-123',
    productName: 'Widget A',
    sku: 'WID-A-001',
    category: 'Electronics',
    unit: 'boxes',
    currentStock: 150,
    reservedStock: 100,
    minStockLevel: 20,
    reorderPoint: 30
  }));
  stateManager.addInventoryItem(new InventoryItem({
    productId: 'PROD-456',
    productName: 'Widget B',
    sku: 'WID-B-001',
    category: 'Electronics',
    unit: 'pieces',
    currentStock: 50,
    reservedStock: 0,
    minStockLevel: 10,
    reorderPoint: 15
  }));
  console.log('\n[Setup] Seeded inventory: Widget A (50 available), Widget B (50 available)\n');
}

function createIntent(productId, productName, quantity, unit) {
  return new OrderIntent({
    intentId: 'INTENT-TEST',
    customerId: 'CUST-001',
    customerName: 'Test Customer',
    channel: 'website',
    productId: productId || null,
    productName: productName || null,
    quantity,
    unit: unit || 'pieces',
    priority: 'MEDIUM',
    status: 'PENDING'
  });
}

async function testAvailableByProductId() {
  console.log('='.repeat(60));
  console.log('TEST 1: Check by productId – sufficient stock');
  console.log('='.repeat(60));
  seedInventory();
  const intent = createIntent('PROD-456', 'Widget B', 20, 'pieces');
  const emitted = [];
  inventoryAgent.onEmit((ev) => emitted.push(ev));
  const result = await inventoryAgent.checkAvailability(intent);
  console.log('\nResult:', result.status);
  console.log('Emitted events:', emitted.map(e => e.type));
  if (result.status !== 'AVAILABLE') throw new Error('Expected AVAILABLE');
  console.log('✅ PASS\n');
}

async function testAvailableByProductName() {
  console.log('='.repeat(60));
  console.log('TEST 2: Check by productName (no productId) – sufficient stock');
  console.log('='.repeat(60));
  seedInventory();
  const intent = createIntent(null, 'Widget A', 30, 'boxes'); // 50 available
  const emitted = [];
  inventoryAgent.onEmit((ev) => emitted.push(ev));
  const result = await inventoryAgent.checkAvailability(intent);
  console.log('\nResult:', result.status);
  console.log('Emitted events:', emitted.map(e => e.type));
  if (result.status !== 'AVAILABLE') throw new Error('Expected AVAILABLE');
  if (result.productId !== 'PROD-123') throw new Error('Expected productId PROD-123');
  console.log('✅ PASS\n');
}

async function testNotAvailableInsufficientStock() {
  console.log('='.repeat(60));
  console.log('TEST 3: Insufficient stock');
  console.log('='.repeat(60));
  seedInventory();
  const intent = createIntent('PROD-123', 'Widget A', 60, 'boxes'); // only 50 available
  const emitted = [];
  inventoryAgent.onEmit((ev) => emitted.push(ev));
  const result = await inventoryAgent.checkAvailability(intent);
  console.log('\nResult:', result.status);
  console.log('Reason:', result.reason);
  console.log('Emitted events:', emitted.map(e => e.type));
  if (result.status !== 'NOT_AVAILABLE') throw new Error('Expected NOT_AVAILABLE');
  if (result.reason !== 'INSUFFICIENT_STOCK') throw new Error('Expected INSUFFICIENT_STOCK');
  console.log('✅ PASS\n');
}

async function testNotAvailableProductNotFound() {
  console.log('='.repeat(60));
  console.log('TEST 4: Product not found');
  console.log('='.repeat(60));
  seedInventory();
  const intent = createIntent(null, 'Unknown Product XYZ', 10, 'pieces');
  const emitted = [];
  inventoryAgent.onEmit((ev) => emitted.push(ev));
  const result = await inventoryAgent.checkAvailability(intent);
  console.log('\nResult:', result.status);
  console.log('Reason:', result.reason);
  if (result.status !== 'NOT_AVAILABLE') throw new Error('Expected NOT_AVAILABLE');
  if (result.reason !== 'PRODUCT_NOT_FOUND') throw new Error('Expected PRODUCT_NOT_FOUND');
  console.log('✅ PASS\n');
}

async function testInvalidQuantity() {
  console.log('='.repeat(60));
  console.log('TEST 5: Invalid quantity');
  console.log('='.repeat(60));
  seedInventory();
  const intent = createIntent('PROD-123', 'Widget A', 0, 'boxes');
  const emitted = [];
  inventoryAgent.onEmit((ev) => emitted.push(ev));
  const result = await inventoryAgent.checkAvailability(intent);
  console.log('\nResult:', result.status);
  console.log('Reason:', result.reason);
  if (result.status !== 'NOT_AVAILABLE') throw new Error('Expected NOT_AVAILABLE');
  if (result.reason !== 'INVALID_QUANTITY') throw new Error('Expected INVALID_QUANTITY');
  console.log('✅ PASS\n');
}

async function testReservationUpdatesState() {
  console.log('='.repeat(60));
  console.log('TEST 6: Reservation updates state');
  console.log('='.repeat(60));
  seedInventory();
  const itemBefore = stateManager.getInventoryItem('PROD-456');
  console.log('Widget B before: reserved=', itemBefore.reservedStock, 'available=', itemBefore.availableStock);
  const intent = createIntent('PROD-456', 'Widget B', 10, 'pieces');
  inventoryAgent.onEmit(() => {});
  const result = await inventoryAgent.checkAvailability(intent);
  const itemAfter = stateManager.getInventoryItem('PROD-456');
  console.log('Widget B after: reserved=', itemAfter.reservedStock, 'available=', itemAfter.availableStock);
  if (result.status !== 'AVAILABLE') throw new Error('Expected AVAILABLE');
  if (itemAfter.reservedStock !== 10) throw new Error('Expected reservedStock 10');
  if (itemAfter.availableStock !== 40) throw new Error('Expected availableStock 40');
  console.log('✅ PASS\n');
}

async function testAgentStatus() {
  console.log('='.repeat(60));
  console.log('TEST 7: Agent status');
  console.log('='.repeat(60));
  seedInventory();
  const status = inventoryAgent.getStatus();
  console.log('Agent:', status.agent);
  console.log('Logic:', status.logic);
  console.log('Product count:', status.productCount);
  console.log('Total available:', status.totalAvailable);
  console.log('✅ PASS\n');
}

async function run() {
  await testAvailableByProductId();
  await testAvailableByProductName();
  await testNotAvailableInsufficientStock();
  await testNotAvailableProductNotFound();
  await testInvalidQuantity();
  await testReservationUpdatesState();
  await testAgentStatus();
  console.log('='.repeat(60));
  console.log('✅ ALL INVENTORY AGENT TESTS PASSED');
  console.log('='.repeat(60));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
