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
const cors = require('cors');
const path = require('path');
const app = express();
const stateCoordinator = require('./services/stateCoordinator');
const orderAgent = require('./agents/orderAgent');
const inventoryAgent = require('./agents/inventoryAgent');
const stateManager = require('./state/stateManager');
const { InventoryItem, StaffMember } = require('./models');
const { getCatalogForSeed } = require('./data/productCatalog');

// Middleware
app.use(cors());
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
    const clothing = getCatalogForSeed();
    clothing.forEach(p => {
      stateManager.addInventoryItem(new InventoryItem(p));
    });
    console.log('[Server] Seeded inventory: 10 clothing products (same as WhatsApp catalog)');
  }
  if (stateManager.getAllStaff().length === 0) {
    stateManager.addStaff(new StaffMember({
      staffId: 'STAFF-001',
      name: 'Priya Sharma',
      phone: '+91-98765-11111',
      role: 'PRODUCTION',
      skills: ['assembly'],
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
      skills: ['assembly'],
      status: 'ONLINE',
      currentWorkload: 3,
      maxCapacity: 8
    }));
    stateManager.addStaff(new StaffMember({
      staffId: 'STAFF-003',
      name: 'Sunita Reddy',
      phone: '+91-98765-33333',
      role: 'QUALITY',
      skills: ['quality_check'],
      status: 'ONLINE',
      currentWorkload: 1,
      maxCapacity: 8,
      location: 'Quality Station'
    }));
    stateManager.addStaff(new StaffMember({
      staffId: 'STAFF-004',
      name: 'Ravi Singh',
      phone: '+91-98765-44444',
      role: 'PACKING',
      skills: ['packing'],
      status: 'ONLINE',
      currentWorkload: 2,
      maxCapacity: 8,
      location: 'Packing Area'
    }));
    stateManager.addStaff(new StaffMember({
      staffId: 'STAFF-005',
      name: 'Kavita Nair',
      phone: '+91-98765-55555',
      role: 'DELIVERY',
      skills: ['packing'],
      status: 'ONLINE',
      currentWorkload: 0,
      maxCapacity: 8,
      location: 'Dispatch'
    }));
    console.log('[Server] Seeded staff: PRODUCTION (Priya 0h, Amit 3h), QUALITY (Sunita 1h), PACKING (Ravi 2h), DELIVERY (Kavita 0h)');
  }
}
seedState();

// Routes
const orderRoutes = require('./routes/order.routes');

// Mount routes
app.use('/order', orderRoutes);

// Serve website (same agentic flow as WhatsApp/terminal)
const websitePath = path.join(__dirname, '../../website');
app.use(express.static(websitePath));
app.get('/', (req, res) => res.sendFile(path.join(websitePath, 'index.html')));

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
