/**
 * DELAY / RISK PREDICTOR (Predictive AI)
 *
 * Predicts: Will this order likely be delayed?
 *
 * Uses a pre-trained logistic regression model (trained by ml/train_delay_predictor.py).
 * Features: quantity, priority, time_hours, has_deadline, staff_workload, num_tasks, num_candidates, channel
 */

const path = require('path');
const fs = require('fs');

const MODEL_PATH = path.join(__dirname, '../../ml/delay_model.json');
const FEATURE_NAMES = ['quantity', 'priority', 'time_hours', 'has_deadline', 'staff_workload', 'num_tasks', 'num_candidates', 'channel'];

let cachedModel = null;

function loadModel() {
  if (cachedModel) return cachedModel;
  try {
    const raw = fs.readFileSync(MODEL_PATH, 'utf8');
    cachedModel = JSON.parse(raw);
    return cachedModel;
  } catch (err) {
    console.warn('[DelayPredictor] Could not load model:', err.message);
    return null;
  }
}

function sigmoid(z) {
  if (z < -20) return 0;
  if (z > 20) return 1;
  return 1 / (1 + Math.exp(-z));
}

function priorityToNum(priority) {
  if (!priority) return 1;
  const p = String(priority).toUpperCase();
  if (p === 'LOW') return 0;
  if (p === 'MEDIUM') return 1;
  if (p === 'HIGH') return 2;
  if (p === 'URGENT') return 3;
  return 1;
}

function channelToNum(channel) {
  if (!channel) return 0;
  const c = String(channel).toLowerCase();
  return c === 'whatsapp' ? 1 : 0;
}

/**
 * Predict delay risk for an order.
 *
 * @param {Object} order - Order object (quantity, priority, deadline, etc.)
 * @param {Object} context - { timeRequiredHours, staffWorkload, numCandidates, numTasks }
 * @returns {{ risk: number, delayed: boolean, message: string }}
 */
function predict(order, context = {}) {
  const model = loadModel();
  if (!model || model.type !== 'logistic_regression') {
    return {
      risk: 0.5,
      delayed: false,
      message: 'Model not loaded; using neutral risk.'
    };
  }

  const quantity = order?.totalQuantity ?? order?.quantity ?? 0;
  const priority = priorityToNum(order?.priority);
  const timeHours = context.timeRequiredHours ?? 0;
  const hasDeadline = (order?.deadline && order.deadline !== null && order.deadline !== '') ? 1 : 0;
  const staffWorkload = context.staffWorkload ?? 0;
  const numTasks = context.numTasks ?? 3;
  const numCandidates = context.numCandidates ?? 0;
  const channel = channelToNum(order?.channel);

  const rawFeatures = [quantity, priority, timeHours, hasDeadline, staffWorkload, numTasks, numCandidates, channel];

  // Scale features: (x - mean) / scale
  const scaled = rawFeatures.map((x, i) => {
    const mean = model.scaler_mean[i] ?? 0;
    const scale = model.scaler_scale[i] ?? 1;
    return scale !== 0 ? (x - mean) / scale : 0;
  });

  // z = intercept + sum(coef[i] * scaled[i])
  let z = model.intercept;
  for (let i = 0; i < model.coef.length; i++) {
    z += model.coef[i] * (scaled[i] ?? 0);
  }

  const risk = sigmoid(z);
  const delayed = risk >= 0.5;

  return {
    risk: Math.round(risk * 100) / 100,
    delayed,
    message: delayed
      ? `Order likely to be delayed (risk: ${(risk * 100).toFixed(1)}%). Consider adding staff or extending deadline.`
      : `Order on track (risk: ${(risk * 100).toFixed(1)}%).`
  };
}

module.exports = {
  predict,
  loadModel
};
