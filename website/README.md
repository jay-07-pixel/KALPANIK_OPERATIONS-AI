# OPERATIONS — Website order portal

Same agentic backend as WhatsApp/terminal: **Input Gateway → Order Agent → Inventory → Tasks → Workforce → Critic**.

## Run

1. Start the backend (serves the website at `/`):
   ```bash
   cd backend && npm start
   ```
2. Open **http://localhost:3000** in a browser.

## Features

- **Place order**: Product (Widget A/B), quantity, unit, priority, deadline, notes.
- **Result** (same info as terminal): Order ID, status, assigned staff, time required, deadline feasibility, tasks (Prepare → Quality check → Pack).
- **Recent orders**: List from `GET /order/list`.

## API

- `POST /order/website` — place order (structured JSON).
- `GET /order/list` — list orders.
- `GET /health` — health check.
