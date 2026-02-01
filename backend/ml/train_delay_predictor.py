#!/usr/bin/env python3
"""
Train Delay/Risk Predictor (Predictive AI)
------------------------------------------
Predicts: Will this order likely be delayed?

Features (from terminal/order flow):
- quantity, priority (0=LOW,1=MEDIUM,2=HIGH,3=URGENT)
- time_hours, has_deadline (0/1)
- staff_workload, num_tasks, num_candidates
- channel (0=website, 1=whatsapp)

Label: delayed (0/1) - 1 when deadline infeasible OR high risk
"""

import json
import os
import random

# Try scikit-learn; fallback to simple logistic
try:
    import numpy as np
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(SCRIPT_DIR, "delay_risk_dataset.json")
MODEL_PATH = os.path.join(SCRIPT_DIR, "delay_model.json")

FEATURE_NAMES = ["quantity", "priority", "time_hours", "has_deadline", "staff_workload", "num_tasks", "num_candidates", "channel"]


def generate_synthetic_dataset(n=1000):
    """Generate synthetic dataset reflecting terminal/order flow patterns."""
    random.seed(42)
    data = []
    for _ in range(n):
        quantity = random.choice([5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200])
        priority = random.randint(0, 3)
        time_hours = round(0.1 * quantity + 0.5 + random.uniform(0, 0.5), 2)
        has_deadline = random.choice([0, 1])
        staff_workload = round(random.uniform(0, 8), 1)
        num_tasks = 3
        num_candidates = random.choice([1, 2, 3])
        channel = random.choice([0, 1])

        # Label: delayed = 1 when high risk
        # - deadline set + time > staff capacity
        # - high quantity + low candidates
        # - staff workload already high
        delayed = 0
        if has_deadline and time_hours > (8 - staff_workload):
            delayed = 1
        elif quantity >= 100 and num_candidates <= 1:
            delayed = 1
        elif staff_workload >= 6 and time_hours >= 4:
            delayed = 1
        elif quantity >= 150:
            delayed = 1
        elif priority == 3 and time_hours >= 6:
            delayed = 1
        elif random.random() < 0.15:
            delayed = 1

        data.append({
            "quantity": quantity,
            "priority": priority,
            "time_hours": time_hours,
            "has_deadline": has_deadline,
            "staff_workload": staff_workload,
            "num_tasks": num_tasks,
            "num_candidates": num_candidates,
            "channel": channel,
            "delayed": delayed
        })
    return data


def train_with_sklearn(data):
    X = [[r[f] for f in FEATURE_NAMES] for r in data]
    y = [r["delayed"] for r in data]
    X = np.array(X, dtype=float)
    y = np.array(y, dtype=int)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = LogisticRegression(max_iter=500, random_state=42)
    model.fit(X_scaled, y)

    # Export for Node.js: coefficients and intercept (on scaled features)
    # Node will scale input same way, then sigmoid(w0 + sum(wi*xi))
    coef = model.coef_[0].tolist()
    intercept = float(model.intercept_[0])
    mean = scaler.mean_.tolist()
    scale = scaler.scale_.tolist()

    return {
        "type": "logistic_regression",
        "features": FEATURE_NAMES,
        "coef": coef,
        "intercept": intercept,
        "scaler_mean": mean,
        "scaler_scale": scale
    }


def train_simple(data):
    """Fallback: rule-based weights when sklearn not available."""
    return {
        "type": "logistic_regression",
        "features": FEATURE_NAMES,
        "coef": [0.015, 0.3, 0.4, 0.2, 0.25, 0.1, -0.5, 0.0],
        "intercept": -2.0,
        "scaler_mean": [0] * 8,
        "scaler_scale": [1.0] * 8
    }


def main():
    # Load or generate dataset (need enough samples for training)
    if os.path.exists(DATASET_PATH):
        with open(DATASET_PATH, "r") as f:
            data = json.load(f)
        if len(data) < 1000:
            prev_count = len(data)
            data = generate_synthetic_dataset(1000)
            with open(DATASET_PATH, "w") as f:
                json.dump(data, f, indent=2)
            print(f"Dataset had {prev_count} rows (< 1000); generated 1000 synthetic samples")
        else:
            print(f"Loaded {len(data)} samples from {DATASET_PATH}")
    else:
        data = generate_synthetic_dataset(1000)
        with open(DATASET_PATH, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Generated and saved {len(data)} synthetic samples to {DATASET_PATH}")

    # Train
    if HAS_SKLEARN:
        model = train_with_sklearn(data)
        print("Trained with scikit-learn LogisticRegression")
    else:
        model = train_simple(data)
        print("Using rule-based weights (install scikit-learn for trained model)")

    # Save
    with open(MODEL_PATH, "w") as f:
        json.dump(model, f, indent=2)
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    main()
