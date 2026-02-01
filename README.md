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

## Quick start

```bash
# Install and run backend (serves API + frontend)
cd backend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) — Shop, Dashboard, Agents Log.

---

## Deploy (Netlify + Railway)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for step-by-step:

- **Frontend:** Netlify (static site)
- **Backend:** Railway (Node.js API)

---

## Project structure

```
OPERATIONS/
├── backend/          # Node.js API
│   ├── src/          # Agents, routes, services
│   └── ml/           # Delay predictor (Olist dataset, model)
├── website/          # Static frontend
├── docs/             # Architecture docs
├── scripts/          # Build scripts (Netlify env injection)
├── netlify.toml      # Netlify config
├── railway.json      # Railway config
└── DEPLOYMENT.md     # Deploy guide
```

---

## Tech stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla JS, HTML, CSS
- **ML:** scikit-learn (Python), logistic regression for delay prediction
- **Data:** Olist Brazilian E-Commerce (Kaggle)
