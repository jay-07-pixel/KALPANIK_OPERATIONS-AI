#!/usr/bin/env python3
"""
Transform Olist Brazilian E-Commerce data into delay_risk_dataset format.
Uses real-world order/delivery data for training the delay predictor.
"""

import csv
import json
import os
import random
from datetime import datetime
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "delay_risk_dataset.json")

# Look in project first (olist_data/), then external paths
OLIST_PATHS = [
    os.path.join(SCRIPT_DIR, "olist_data"),  # Project-embedded data (hackathon submission)
    r"C:\Users\jayjo\Downloads\archive (3)",
    os.path.join(os.path.dirname(SCRIPT_DIR), "..", "..", "Downloads", "archive (3)"),
]


def find_olist_dir():
    for d in OLIST_PATHS:
        orders_path = os.path.join(d, "olist_orders_dataset.csv")
        if os.path.exists(orders_path):
            return d
    return None


def parse_date(s):
    if not s or s.strip() == "":
        return None
    try:
        return datetime.strptime(s.strip(), "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            return datetime.strptime(s.strip()[:10], "%Y-%m-%d")
        except ValueError:
            return None


def transform_olist_to_delay_dataset(olist_dir, max_samples=2000):
    """Transform Olist CSV data into delay_risk_dataset format."""
    orders_path = os.path.join(olist_dir, "olist_orders_dataset.csv")
    items_path = os.path.join(olist_dir, "olist_order_items_dataset.csv")

    if not os.path.exists(orders_path):
        raise FileNotFoundError(f"Orders file not found: {orders_path}")
    if not os.path.exists(items_path):
        raise FileNotFoundError(f"Order items file not found: {items_path}")

    # Count items per order
    order_quantity = defaultdict(int)
    order_sellers = defaultdict(set)
    with open(items_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            oid = row.get("order_id", "").strip()
            if oid:
                order_quantity[oid] += 1
                sid = row.get("seller_id", "").strip()
                if sid:
                    order_sellers[oid].add(sid)

    # Process orders (only delivered with both dates)
    data = []
    random.seed(42)

    with open(orders_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("order_status") != "delivered":
                continue
            delivered = parse_date(row.get("order_delivered_customer_date", ""))
            estimated = parse_date(row.get("order_estimated_delivery_date", ""))
            purchase = parse_date(row.get("order_purchase_timestamp", ""))

            if not delivered or not estimated or not purchase:
                continue

            quantity = order_quantity.get(row["order_id"], 1)
            quantity = max(1, min(quantity, 200))  # clamp to realistic range

            # Label: delayed = 1 if delivered after estimated
            delayed = 1 if delivered > estimated else 0

            # time_hours: estimated delivery window (purchase to estimated) in hours
            time_hours = (estimated - purchase).total_seconds() / 3600
            time_hours = round(min(max(time_hours, 0.5), 200), 2)

            # has_deadline: always 1 for Olist (all have estimated)
            has_deadline = 1

            # priority: not in Olist - derive from freight or random
            priority = random.randint(0, 3)

            # staff_workload: not in Olist - use #sellers as proxy (more sellers = more coordination)
            num_sellers = len(order_sellers.get(row["order_id"], set()))
            staff_workload = round(min(num_sellers * 1.5 + random.uniform(0, 2), 8), 1)

            num_tasks = 3
            num_candidates = random.choice([1, 2, 3])
            channel = random.choice([0, 1])

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

            if len(data) >= max_samples:
                break

    return data


def main():
    olist_dir = find_olist_dir()
    if not olist_dir:
        print("ERROR: Olist data folder not found.")
        print("Expected at:", OLIST_DIR)
        print("Or place olist_orders_dataset.csv and olist_order_items_dataset.csv in backend/ml/olist_data/")
        return 1

    print(f"Loading Olist data from: {olist_dir}")
    data = transform_olist_to_delay_dataset(olist_dir, max_samples=2000)

    if len(data) < 100:
        print(f"WARNING: Only {len(data)} valid rows (need delivered orders with dates).")
        print("Using synthetic data to reach 1000...")
        from train_delay_predictor import generate_synthetic_dataset
        synth = generate_synthetic_dataset(1000 - len(data))
        data = data + synth

    delayed_count = sum(1 for r in data if r["delayed"] == 1)
    print(f"Transformed {len(data)} samples ({delayed_count} delayed, {len(data) - delayed_count} on-time)")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Saved to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    exit(main())
