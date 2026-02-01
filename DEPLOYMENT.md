# Deployment Guide — Netlify (Frontend) + Railway (Backend)

Deploy KALPANIK Operations AI for free on Netlify and Railway.

---

## Project structure

```
OPERATIONS/
├── backend/          # Node.js API (→ Railway)
│   ├── src/
│   ├── ml/           # Delay predictor model + Olist data
│   └── package.json
├── website/          # Static frontend (→ Netlify)
│   ├── index.html    # Shop
│   ├── overview.html # Dashboard Overview
│   ├── dashboard.html# Agents Log
│   └── config.js     # API_BASE (injected at build)
├── scripts/
│   └── inject-env.js # Injects BACKEND_URL into config.js
├── docs/             # Architecture docs
├── netlify.toml      # Netlify config
├── railway.json      # Railway config
└── package.json      # Root (for Railway: npm start → backend)
```

---

## Step 1: Deploy Backend to Railway

1. Push your code to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Select your repo.
4. Railway will auto-detect Node.js. Root `package.json` runs `cd backend && npm start`.
5. Go to **Settings** → **Networking** → **Generate Domain** to get your backend URL (e.g. `https://xxx.up.railway.app`).
6. Copy this URL — you need it for Netlify.

### Optional env vars (Railway → Variables)

- `PORT` — auto-set by Railway
- `GROQ_API_KEY` — for WhatsApp LLM parsing (optional)

---

## Step 2: Deploy Frontend to Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**.
2. Connect your GitHub repo.
3. Build settings:
   - **Build command:** `node scripts/inject-env.js`
   - **Publish directory:** `website`
4. **Environment variables** → Add:
   - **Key:** `BACKEND_URL`
   - **Value:** `https://xxx.up.railway.app` (your Railway URL, no trailing slash)
5. Deploy.

---

## Step 3: Verify

1. Open your Netlify URL (e.g. `https://xxx.netlify.app`).
2. Shop should load products from Railway.
3. Place an order and check Dashboard Overview / Agents Log.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Backend uses `cors()` — allows all origins. If blocked, check Railway domain is correct. |
| Products not loading | Ensure `BACKEND_URL` in Netlify matches Railway URL exactly (https, no trailing `/`). |
| 404 on backend | Check Railway is running. Visit `https://your-backend.railway.app/health` — should return `{"status":"ok"}`. |
| Netlify build fails | Ensure `scripts/inject-env.js` exists. Build command: `node scripts/inject-env.js`. |

---

## Local development

```bash
# Backend
cd backend
npm install
npm start

# Frontend (served by backend at http://localhost:3000)
# Or open website/index.html directly — config.js uses empty API_BASE (same-origin)
```

---

## URLs after deploy

- **Frontend (Netlify):** `https://your-site.netlify.app`
- **Backend (Railway):** `https://your-app.up.railway.app`
