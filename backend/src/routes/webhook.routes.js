/**
 * Webhook Routes
 * 
 * Handles incoming events from external systems:
 * - WhatsApp webhook (receives messages)
 * - Website form submissions
 * 
 * Routes events to the INPUT GATEWAY
 */

const express = require('express');
const router = express.Router();

// WhatsApp webhook verification (GET)
// TODO: Implement webhook verification

// WhatsApp webhook receiver (POST)
// TODO: Receive WhatsApp messages and route to INPUT GATEWAY

// Website order submission (POST)
// TODO: Receive website orders and route to INPUT GATEWAY

module.exports = router;
