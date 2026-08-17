# KALPANIK Operations AI

Agentic AI system for **MSME operations** — multi-channel order intake, inventory checks, task planning, workforce assignment, and **ML-based delay risk prediction**.

**Repositories:**
- [jay-07-pixel/KALPANIK_OPERATIONS-AI](https://github.com/jay-07-pixel/KALPANIK_OPERATIONS-AI)
- [waruledivya1411/Agentic-AI-for-MSME-Operations](https://github.com/waruledivya1411/Agentic-AI-for-MSME-Operations)

---

## What it does

Orders arrive from the **website shop** or **WhatsApp API**. One backend pipeline processes them:

**Input Gateway → Order Agent → Inventory Agent → Order Creation → Decision Engine → Workforce & Coordination → Delay Risk Predictor (ML) → Critic Agent → Task Executor**

- Inventory is checked and reserved; orders fail if stock is insufficient.
- Tasks are planned (prepare → quality check → pack) and assigned by role (Production, Quality, Packing).
- Delay risk is scored by a logistic-regression model with labels: **No tension**, **A bit**, **High chances it will get delayed**.
- Customers on the shop see only **“Your order has been placed!”** and an order ID.
- Operations teams use the dashboard pages and agent logs.

Operational state is **in-memory** (resets when the server restarts). There is **no login/auth** in the current codebase.

---

## Web pages (frontend)

Express serves the `website/` folder from the same server as the API.

| Page | Path | Purpose |
|------|------|---------|
| **Shop** | `/` (`index.html`) | Product catalog and website order placement |
| **Dashboard Overview** | `/overview.html` | KPIs, live orders, workforce, stock, restock |
| **Agents Log** | `/dashboard.html` | Structured summary + terminal log of last order run |
| **WhatsApp Log** | `/whatsapp.html` | Terminal log of the last WhatsApp order run |

There are **no** warehouse, employee, supervisor, or login pages in the current branch.

---

## Features (current)

- **Shop** — Browse catalog, place orders via `POST /order/website`
- **WhatsApp orders** — Natural-language messages via `POST /order/whatsapp` (Groq LLM parsing when `GROQ_API_KEY` is set; regex fallback otherwise)
- **Dashboard Overview** — Orders, staff workload, inventory levels, restock and staff management
- **Agents Log** — Last run overview, pipeline steps, tasks, workforce, delay risk
- **WhatsApp Log** — Full agent terminal output for the last WhatsApp order
- **Delay predictor** — Python/scikit-learn logistic regression (`backend/ml/`)
- **Workforce management** — Add, update, or remove staff from the overview dashboard

---

## Quick start (local)

### 1. Install and run

From the repo root:

```bash
npm install
npm start
```

Or from `backend/`:

```bash
cd backend
npm install
npm start
```

Server: [http://localhost:3000](http://localhost:3000) (API + frontend together).

### 2. Optional: Groq for WhatsApp parsing

Copy `backend/.env.example` to `backend/.env`:

```env
PORT=3000
GROQ_API_KEY=your_groq_api_key
```

Without `GROQ_API_KEY`, WhatsApp parsing uses a regex fallback.

### 3. Local URLs

| Page | URL |
|------|-----|
| Shop | http://localhost:3000 |
| Dashboard Overview | http://localhost:3000/overview.html |
| Agents Log | http://localhost:3000/dashboard.html |
| WhatsApp Log | http://localhost:3000/whatsapp.html |
| Health check | http://localhost:3000/health |

---

## API endpoints

All routes are under `/order` unless noted.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Server health |
| GET | `/order/products` | Product catalog |
| POST | `/order/website` | Place order from shop |
| POST | `/order/whatsapp` | Place order from WhatsApp text |
| GET | `/order/status` | System / pipeline status |
| GET | `/order/list` | List orders |
| GET | `/order/dashboard` | Overview dashboard payload |
| GET | `/order/last-run` | Last order run log (Agents Log) |
| GET | `/order/last-run/whatsapp` | Last WhatsApp run log |
| POST | `/order/restock` | Add inventory |
| POST | `/order/staff` | Add staff member |
| PATCH | `/order/staff/:staffId` | Update staff |
| DELETE | `/order/staff/:staffId` | Remove staff |

---

## Test WhatsApp orders (Postman / Insomnia)

**Local:** `POST http://localhost:3000/order/whatsapp`  
**Header:** `Content-Type: application/json`

```json
{
  "from": "+919876543210",
  "message": "Hi, I need 2 Cotton Crew T-Shirt by tomorrow 11pm. Urgent!"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `from` or `phone` | Yes | Customer phone |
| `message` or `text` | Yes | Raw WhatsApp text |
| `name` | No | Optional customer name |

Then open **WhatsApp Log** and click **Refresh**.

---

## Deploy

### Option A — Railway (recommended)

One deploy serves **API + frontend**. See **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

Set environment variables on Railway as needed:

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | Usually set by host | Server port |
| `GROQ_API_KEY` | Optional | WhatsApp LLM parsing |

### Option B — Railway + Netlify (split)

| Platform | Role |
|----------|------|
| **Railway** | Backend API |
| **Netlify** | Static `website/` |

Netlify build: `node scripts/inject-env.js`  
Publish directory: `website`  
Set `BACKEND_URL` to your Railway URL (see `netlify.toml`).

---

## Project structure

```
OPERATIONS/
├── backend/
│   ├── src/
│   │   ├── agents/       # Order, Inventory, Decision, Workforce, Critic, etc.
│   │   ├── routes/       # order.routes.js (main API)
│   │   ├── services/     # Input gateway, WhatsApp parser, delay predictor, coordinator
│   │   └── state/        # In-memory state manager
│   └── ml/               # Delay predictor training + model JSON
├── website/              # Shop, overview, dashboard, WhatsApp log
├── scripts/              # inject-env.js (Netlify), flowchart utilities
├── docs/                 # Architecture notes
├── DEPLOYMENT.md
├── netlify.toml
└── railway.json
```

---

## ML delay risk predictor

- **Model:** Logistic regression (`backend/ml/delay_model.json`)
- **Labels:** No tension (&lt;35%), A bit (35–65%), High chances delayed (≥65%)
- **Retrain:** See `backend/ml/README.md`

```bash
cd backend/ml
pip install -r requirements.txt
python train_delay_predictor.py
```

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| Backend | Node.js, Express |
| Frontend | HTML, CSS, vanilla JavaScript |
| AI / agents | Multi-agent pipeline, optional Groq LLM for WhatsApp |
| ML | Python, scikit-learn |
| Deploy | Railway; optional Netlify for static frontend |

---

## Agent pipeline

```
Order → Inventory → Decision Engine → Workforce → Critic → Executor
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| WhatsApp Log empty | Send `POST /order/whatsapp` first, then Refresh |
| WhatsApp parse weak | Set `GROQ_API_KEY` in `backend/.env` |
| Dashboard shows no orders | Place an order from Shop or WhatsApp API |
| Data disappeared after restart | Expected — state is in-memory only |

---

## Live deployment

If deployed on Railway, the public URL depends on your project settings. After the recent reset to commit `a35f11a`, **redeploy from GitHub** so production matches this README.

Example format: `https://<your-app>.up.railway.app`
