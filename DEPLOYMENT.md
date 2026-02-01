# Deployment Guide — Railway (backend + frontend)

Deploy KALPANIK Operations AI on Railway. **One deploy serves both the API and the website.**

---

## Why one URL for everything?

The backend (Express) serves the `website/` folder as static files:

```js
// backend/src/server.js
const websitePath = path.join(__dirname, '../../website');
app.use(express.static(websitePath));
app.get('/', (req, res) => res.sendFile(path.join(websitePath, 'index.html')));
```

So when Railway runs the backend, you get:

- **API:** `/order/whatsapp`, `/order/website`, `/health`, etc.
- **Website:** `/`, `/overview.html`, `/dashboard.html` (from `website/`)

No Netlify or separate frontend deploy needed.

---

## Project structure (for deploy)

```
OPERATIONS/
├── backend/          # Node.js API
│   ├── src/          # Agents, routes, server (serves website/)
│   ├── ml/           # Delay predictor model + Olist data
│   └── package.json
├── website/          # Static frontend (HTML/CSS/JS)
│   ├── index.html    # Shop
│   ├── overview.html # Dashboard Overview
│   ├── dashboard.html# Agents Log
│   └── config.js     # API_BASE (empty = same origin)
├── railway.json      # Railway config
└── package.json     # Root: npm start → cd backend && npm start
```

---

## Step 1: Deploy to Railway

1. Push your code to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Select your repo.
4. Railway detects Node.js. Root `package.json` runs `npm start` → `cd backend && npm start`.
5. Go to **Settings** → **Networking** → **Generate Domain**.
6. Your app is live at `https://your-app.up.railway.app` — that URL serves both the website and the API.

### Optional env vars (Railway → Variables)

- `PORT` — set by Railway
- `GROQ_API_KEY` — for WhatsApp LLM parsing (optional)

---

## Step 2: Verify

1. **Website:** Open `https://your-app.up.railway.app` — shop, overview, dashboard should load.
2. **API:** `GET https://your-app.up.railway.app/health` → `{"status":"ok"}`
3. **WhatsApp test:** `POST https://your-app.up.railway.app/order/whatsapp` with JSON `{ "from": "+...", "message": "..." }`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Backend uses `cors()` — allows all origins. |
| 404 on `/` or pages | Ensure repo has `website/` with `index.html`, `overview.html`, `dashboard.html`. |
| 404 on API | Check routes are under `/order` and `/health`. Railway may add a path prefix — check project settings. |
| Build fails | Root `package.json` must have `"start": "cd backend && npm start"`. Run `npm install` in root so Railway installs deps; use postinstall to `cd backend && npm install` if needed. |

---

## Local development

```bash
cd backend
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000) — same as production: one server, API + website.
