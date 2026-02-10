# KALPANIK Operations AI

Agentic AI system for MSME operations — order management, workforce scheduling, inventory, and **delay risk prediction** using real-world Olist e-commerce data.

---

## Features

- **Shop** — Place orders (website + WhatsApp); customer sees only “Your order has been placed!” and order ID
- **Dashboard Overview** — KPIs, live orders, workforce (Manage staff), stock levels
- **Agents Log** — Structured view of last order flow, delay risk, pipeline steps, tasks & time
- **WhatsApp Log** — Full terminal-style log of WhatsApp order flow (API → agents → completion) on the web
- **Delay/Risk Predictor** — ML model; labels: **No tension**, **A bit**, **High chances delayed** (not rule-based)
- **Manage Workforce** — Add/remove staff, update roles and shift times
- **Restock** — Add inventory

---

## Live deployment

- **Website:** [https://kalpanikoperations-ai-production.up.railway.app/](https://kalpanikoperations-ai-production.up.railway.app/)
- **WhatsApp testing:** [https://kalpanikoperations-ai-production.up.railway.app/order/whatsapp](https://kalpanikoperations-ai-production.up.railway.app/order/whatsapp) — `POST` JSON with `from`/`phone` and `message`

---

## Quick start

### 1. Start the backend

```bash
cd backend
npm install
npm start
```

The server runs on [http://localhost:3000](http://localhost:3000).

### 2. Access the app

- **Shop:** [http://localhost:3000](http://localhost:3000) — Browse products, place orders
- **Dashboard Overview:** [http://localhost:3000/overview.html](http://localhost:3000/overview.html)
- **Agents Log:** [http://localhost:3000/dashboard.html](http://localhost:3000/dashboard.html)
- **WhatsApp Log:** [http://localhost:3000/whatsapp.html](http://localhost:3000/whatsapp.html) — Terminal-style log of last WhatsApp order

### 3. Test WhatsApp orders (Insomnia / Postman)

**Local:** `POST http://localhost:3000/order/whatsapp`  
**Deployed:** `POST https://kalpanikoperations-ai-production.up.railway.app/order/whatsapp`

**Headers:** `Content-Type: application/json`

**Request body (JSON):**

```json
{
  "from": "+919876543210",
  "message": "Hi, I need 2 Cotton Crew T-Shirt by tomorrow 11pm. Urgent!"
}
```

Or use `phone` instead of `from`:

```json
{
  "phone": "+919876543210",
  "message": "I need 1 Cotton Crew T-Shirt by tomorrow. Urgent!"
}
```

**Notes:**
- `from` or `phone` — Required
- `message` or `text` — Required (raw WhatsApp text)
- `name` — Optional
- The LLM parses product, quantity, deadline, and priority from the message

---

## Deploy (Railway only)

**One deployment does everything.** The backend serves the frontend: Express serves the `website/` folder as static files, so when you deploy the repo to Railway you get both the API and the shop/dashboard at the same URL.

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for step-by-step.

---

## Project structure

```
OPERATIONS/
├── backend/          # Node.js API (serves website/ as static)
│   ├── src/          # Agents, routes, services
│   └── ml/           # Delay predictor (train script, model, API-aligned dataset)
├── website/          # Static frontend (shop, overview, dashboard, WhatsApp log)
├── scripts/          # Utilities (e.g. technical_flowchart.py)
├── docs/             # Architecture docs
├── railway.json      # Railway config
└── DEPLOYMENT.md     # Deploy guide
```

---

## Tech stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla JS, HTML, CSS
- **ML:** scikit-learn (Python), logistic regression for delay prediction
- **Data:** Olist Brazilian E-Commerce (Kaggle)
