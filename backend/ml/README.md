# Delay / Risk Predictor (Predictive AI)

**Predicts:** Will this order likely be delayed?

## Features (from terminal/order flow)

| Feature       | Description                              | Source                    |
|---------------|------------------------------------------|---------------------------|
| quantity      | Order quantity                           | Order.totalQuantity       |
| priority      | 0=LOW, 1=MEDIUM, 2=HIGH, 3=URGENT        | Order.priority            |
| time_hours    | Total task duration (hours)              | getTimeAndDeadlineFeasibility |
| has_deadline  | 0/1 - order has deadline set             | Order.deadline            |
| staff_workload| Staff workload after assignment (hours)  | Coordination result       |
| num_tasks     | Number of tasks (typically 3)            | Tasks.length              |
| num_candidates| Available staff candidates               | Workforce Agent           |
| channel       | 0=website, 1=whatsapp                    | Order.channel             |

## Train the model

**From project root or backend:**
```bash
cd backend/ml
pip install -r requirements.txt
python train_delay_predictor.py
```

**Or with full paths:**
```bash
pip install -r backend/ml/requirements.txt
python backend/ml/train_delay_predictor.py
```

- Generates 250 synthetic samples if dataset has < 50 rows
- Trains logistic regression (scikit-learn)
- Saves model to `delay_model.json`
- Node.js predictor loads this file at runtime (no Python at runtime)

## Retrain with real data (Olist)

The Olist dataset is embedded in `backend/ml/olist_data/` for hackathon submission.

1. Run: `python olist_to_delay_dataset.py` (transforms Olist CSV → delay_risk_dataset.json)
2. Run: `python train_delay_predictor.py` (trains on real data)

To use a different Olist folder, edit `OLIST_PATHS` in `olist_to_delay_dataset.py`.

## Retrain with your own data

1. Place orders via Shop/WhatsApp to generate real flows
2. Optionally add logged order features to `delay_risk_dataset.json`
3. Re-run `python train_delay_predictor.py`

## Integration

- **State Coordinator**: Calls `delayPredictor.predict(order, context)` after Coordination Agent
- **Terminal**: Logs "🤖 Delay Risk Predictor: [message]"
- **Agents Log (dashboard)**: Shows delay risk % and on-track/likely-delayed
