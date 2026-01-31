/**
 * Agents Index
 *
 * Exports all agent modules
 */

const orderAgent = require('./orderAgent');
const inventoryAgent = require('./inventoryAgent');

module.exports = {
  orderAgent,
  inventoryAgent
};
