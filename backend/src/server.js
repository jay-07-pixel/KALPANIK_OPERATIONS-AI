/**
 * Main server entry point
 *
 * Responsibilities:
 * - Initialize Express app
 * - Setup middleware
 * - Mount routes
 * - Wire agents to State Coordinator
 * - Seed inventory and staff (for dev)
 * - Start server
 * - Handle graceful shutdown
 */

require('dotenv').config();
const express = require('express');
const app = express();
const stateCoordinator = require('./services/stateCoordinator');
const orderAgent = require('./agents/orderAgent');
const inventoryAgent = require('./agents/inventoryAgent');
const stateManager = require('./state/stateManager');
const { InventoryItem, StaffMember } = require('./models');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Wire agents to State Coordinator (so Order Agent and Inventory Agent are available)
stateCoordinator.setAgents({
  orderAgent,
  inventoryAgent,
  decisionEngine: null,
  workforceAgent: null,
  coordinationAgent: null,
  criticAgent: null,
  taskExecutor: null
});
console.log('[Server] Agents wired: Order Agent, Inventory Agent');

// Seed inventory and staff so orders can be processed (in-memory state; seed on startup)
function seedState() {
  if (stateManager.getAllInventory().length === 0) {
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
    console.log('[Server] Seeded inventory: Widget A (200 boxes), Widget B (100 pieces)');
  }
  if (stateManager.getAllStaff().length === 0) {
    stateManager.addStaff(new StaffMember({
      staffId: 'STAFF-001',
      name: 'Priya Sharma',
      phone: '+91-98765-11111',
      role: 'PRODUCTION',
      skills: ['assembly', 'quality_check', 'packing'],
      status: 'ONLINE',
      currentWorkload: 0,
      maxCapacity: 8,
      shiftStart: '09:00',
      shiftEnd: '18:00',
      location: 'Assembly Floor'
    }));
    stateManager.addStaff(new StaffMember({
      staffId: 'STAFF-002',
      name: 'Amit Kumar',
      phone: '+91-98765-22222',
      role: 'PRODUCTION',
      skills: ['assembly', 'packing'],
      status: 'ONLINE',
      currentWorkload: 4.5,
      maxCapacity: 8
    }));
    console.log('[Server] Seeded staff: Priya Sharma (0h free), Amit Kumar (4.5h busy, 3.5h free)');
  }
}
seedState();

// Routes
const orderRoutes = require('./routes/order.routes');

// Mount routes
app.use('/order', orderRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});
