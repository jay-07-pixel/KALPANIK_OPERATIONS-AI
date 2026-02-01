# KALPANIK Operations AI

Agentic AI system for MSME operations — order management, workforce scheduling, inventory, and **delay risk prediction** using real-world Olist e-commerce data.

---

## Features

- **Shop** — Place orders (website + WhatsApp)
- **Dashboard Overview** — KPIs, live orders, workforce, stock levels
- **Agents Log** — Structured view of last order flow, delay risk
- **Delay/Risk Predictor** — ML model predicts order delay likelihood
- **Manage Workforce** — Add/remove staff, update status
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

### 3. Test WhatsApp orders (Insomnia / Postman)

**Local:** `POST http://localhost:3000/order/whatsapp`  
**Deployed:** `POST https://kalpanikoperations-ai-production.up.railway.app/order/whatsapp`

**Headers:** `Content-Type: application/json`

**Request body (JSON):**

```json
{
  "from": "+919876543210",
  "message": "Hi, I need 10 boxes of Widget A by tomorrow 3 pm"
}
```

Or use `phone` instead of `from`:

```json
{
  "phone": "+919876543210",
  "message": "I need 15 boxes of Widget B. Urgent!"
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
│   └── ml/           # Delay predictor (Olist dataset, model)
├── website/          # Static frontend (served by backend)
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
