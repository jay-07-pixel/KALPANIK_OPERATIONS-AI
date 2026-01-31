/**
 * Main server entry point
 * 
 * Responsibilities:
 * - Initialize Express app
 * - Setup middleware
 * - Mount routes
 * - Start server
 * - Handle graceful shutdown
 */

require('dotenv').config();
const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
