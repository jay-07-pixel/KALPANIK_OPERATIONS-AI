/**
 * TEST DECISION ENGINE
 *
 * Run: node src/agents/testDecisionEngine.js
 */

const stateManager = require('../state/stateManager');
const decisionEngine = require('./decisionEngine');
const { Order } = require('../models');

console.log('='.repeat(60));
console.log('TESTING DECISION ENGINE');
console.log('='.repeat(60));

function setup() {
  stateManager.reset();
}

function testPlanTasksForOrder() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Plan tasks for order');
  console.log('='.repeat(60));
  setup();

  const order = new Order({
    orderId: 'ORD-001',
    customerId: 'CUST-001',
    customerName: 'Rajesh Kumar',
    channel: 'website',
    items: [{ productId: 'PROD-123', productName: 'Widget A', quantity: 15, unit: 'boxes' }],
    totalQuantity: 15,
    priority: 'HIGH',
    status: 'READY_TO_FULFILL',
    inventoryReserved: true
  });

  const tasks = decisionEngine.planTasksForOrder(order, stateManager);

  console.log('\nTasks created:', tasks.length);
  tasks.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.taskId}: ${t.taskType} - "${t.title}" (${t.estimatedDuration}h)`);
    console.log(`     dependsOn: ${t.dependsOn.length ? t.dependsOn.join(', ') : 'none'}`);
    console.log(`     assignedStaffId: ${t.assignedStaffId}`);
    console.log(`     status: ${t.status}`);
  });

  if (tasks.length !== 3) throw new Error('Expected 3 tasks');
  if (tasks[0].taskType !== 'PREPARE') throw new Error('First task should be PREPARE');
  if (tasks[1].taskType !== 'QUALITY_CHECK') throw new Error('Second task should be QUALITY_CHECK');
  if (tasks[2].taskType !== 'PACK') throw new Error('Third task should be PACK');
  if (tasks[0].dependsOn.length !== 0) throw new Error('Prepare should have no dependencies');
  if (tasks[1].dependsOn.length !== 1 || tasks[1].dependsOn[0] !== tasks[0].taskId) throw new Error('QC should depend on prepare');
  if (tasks[2].dependsOn.length !== 1 || tasks[2].dependsOn[0] !== tasks[1].taskId) throw new Error('Pack should depend on QC');
  if (tasks.some(t => t.assignedStaffId != null)) throw new Error('No staff should be assigned');
  if (tasks.some(t => t.status !== 'PENDING')) throw new Error('All tasks should be PENDING');

  console.log('✅ PASS\n');
}

function testPlanExplanation() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Plan explanation');
  console.log('='.repeat(60));
  setup();

  const order = new Order({
    orderId: 'ORD-001',
    totalQuantity: 20,
    items: [{ productName: 'Widget B', quantity: 20 }]
  });

  const explanation = decisionEngine.getPlanExplanation(order);
  console.log('\nExplanation:', explanation.reason);
  console.log('Sequence:', explanation.sequence.join(' → '));
  console.log('Durations:', JSON.stringify(explanation.durations, null, 2));

  if (explanation.sequence.length !== 3) throw new Error('Expected 3 steps');
  if (!explanation.durations.prepare || !explanation.durations.quality_check || !explanation.durations.pack) {
    throw new Error('Expected duration strings');
  }
  console.log('✅ PASS\n');
}

function testDurationsScaleWithQuantity() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Durations scale with quantity');
  console.log('='.repeat(60));
  setup();

  const orderSmall = new Order({ orderId: 'ORD-001', totalQuantity: 5, items: [{ productName: 'X', quantity: 5 }] });
  const orderLarge = new Order({ orderId: 'ORD-002', totalQuantity: 50, items: [{ productName: 'X', quantity: 50 }] });

  stateManager.addOrder(orderSmall);
  const tasksSmall = decisionEngine.planTasksForOrder(orderSmall, stateManager);
  const tasksLarge = decisionEngine.planTasksForOrder(orderLarge, stateManager);

  console.log('\nSmall order (5 units): prepare=', tasksSmall[0].estimatedDuration, 'h, pack=', tasksSmall[2].estimatedDuration, 'h');
  console.log('Large order (50 units): prepare=', tasksLarge[0].estimatedDuration, 'h, pack=', tasksLarge[2].estimatedDuration, 'h');

  if (tasksLarge[0].estimatedDuration <= tasksSmall[0].estimatedDuration) throw new Error('Prepare should scale with quantity');
  if (tasksLarge[2].estimatedDuration <= tasksSmall[2].estimatedDuration) throw new Error('Pack should scale with quantity');
  console.log('✅ PASS\n');
}

testPlanTasksForOrder();
testPlanExplanation();
testDurationsScaleWithQuantity();

console.log('='.repeat(60));
console.log('✅ ALL DECISION ENGINE TESTS PASSED');
console.log('='.repeat(60));
