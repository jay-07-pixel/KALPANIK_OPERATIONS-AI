

# KALPANIK Operations AI

Agentic AI system for MSME operations — order management, workforce scheduling, inventory, and **delay risk prediction** using real-world Olist e-commerce data.

**Live:** [https://kalpanikoperations-ai-production.up.railway.app/](https://kalpanikoperations-ai-production.up.railway.app/)

---

## Features

- **Shop** — Place orders (website + WhatsApp); customers see only “Your order has been placed!” and an order ID
- **Dashboard Overview** — KPIs, live orders, workforce management, stock levels
- **Agents Log** — Structured view of the last order flow, delay risk, pipeline steps, tasks & time
- **WhatsApp Log** — Terminal-style log of the WhatsApp order flow (API → agents → completion)
- **Delay / Risk Predictor** — ML model with labels: **No tension**, **A bit**, **High chances delayed** (not rule-based)
- **Manage Workforce** — Add/remove staff, update roles and shift times
- **Restock** — Add inventory quantities

---

## Live deployment (Railway)

One deployment serves both the API and the frontend (Express serves `website/` as static files).

| Page | URL |
|------|-----|
| **Shop** | [https://kalpanikoperations-ai-production.up.railway.app/](https://kalpanikoperations-ai-production.up.railway.app/) |
| **Dashboard Overview** | [https://kalpanikoperations-ai-production.up.railway.app/overview.html](https://kalpanikoperations-ai-production.up.railway.app/overview.html) |
| **Agents Log** | [https://kalpanikoperations-ai-production.up.railway.app/dashboard.html](https://kalpanikoperations-ai-production.up.railway.app/dashboard.html) |
| **WhatsApp Log** | [https://kalpanikoperations-ai-production.up.railway.app/whatsapp.html](https://kalpanikoperations-ai-production.up.railway.app/whatsapp.html) |
| **WhatsApp API** | `POST` [https://kalpanikoperations-ai-production.up.railway.app/order/whatsapp](https://kalpanikoperations-ai-production.up.railway.app/order/whatsapp) |

---

## Quick start (local)

### 1. Start the backend

```bash
cd backend
npm install
npm start
```

Server runs at [http://localhost:3000](http://localhost:3000).

### 2. Open the app

| Page | Local URL |
|------|-----------|
| **Shop** | [http://localhost:3000](http://localhost:3000) |
| **Dashboard Overview** | [http://localhost:3000/overview.html](http://localhost:3000/overview.html) |
| **Agents Log** | [http://localhost:3000/dashboard.html](http://localhost:3000/dashboard.html) |
| **WhatsApp Log** | [http://localhost:3000/whatsapp.html](http://localhost:3000/whatsapp.html) |

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

**Field notes:**

| Field | Required | Description |
|-------|----------|-------------|
| `from` or `phone` | Yes | Customer phone number |
| `message` or `text` | Yes | Raw WhatsApp message text |
| `name` | No | Optional customer name |

The LLM parses product, quantity, deadline, and priority from the message.

---

## Deploy (Railway)

**One deployment does everything.** The backend serves the frontend: Express serves the `website/` folder as static files, so when you deploy the repo to Railway you get both the API and the shop/dashboard at the same URL.

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for step-by-step Railway setup.

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

| Layer | Technologies |
|-------|----------------|
| **Backend** | Node.js, Express |
| **Frontend** | Vanilla JS, HTML, CSS |
| **ML** | scikit-learn (Python), logistic regression for delay prediction |
| **Data** | Olist Brazilian E-Commerce (Kaggle) |
| **Deploy** | Railway |

---

## Agent pipeline

```
Order → Inventory → Decision Engine → Workforce → Critic → Executor
```

---

## Portfolio — run locally

This portfolio is a static site — no build step required.

```bash
cd Divya_Portfolio
python -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

## Portfolio — deploy

| Target | How |
|--------|-----|
| **GitHub Pages** | Push to `main`; workflow in `.github/workflows/pages.yml` deploys automatically |
| **Firebase Hosting** | `firebase deploy` (config in `firebase.json`) |

---

