/**
 * MODELS INDEX
 * 
 * Central export for all domain models
 * 
 * Usage:
 * const { Order, StaffMember, Task } = require('./models');
 */

const OrderIntent = require('./OrderIntent');
const Order = require('./Order');
const InventoryItem = require('./InventoryItem');
const StaffMember = require('./StaffMember');
const Task = require('./Task');
const SystemState = require('./SystemState');

module.exports = {
  OrderIntent,
  Order,
  InventoryItem,
  StaffMember,
  Task,
  SystemState
};
