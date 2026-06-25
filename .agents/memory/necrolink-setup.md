---
name: Necrolink project setup
description: Key setup decisions for the NECROLINK MLBB clan management site (FastAPI + React)
---

# Necrolink Setup Decisions

## In-Memory DB Fallback (No MONGO_URL needed)
When MONGO_URL is not set, the app uses `backend/memdb.py` — a full in-memory database.
Seed data includes: `owner@necrolink.com / Owner2024!` and `admin@necrolink.com / Necrolink2024!`

**Why:** Replit environment doesn't have a MongoDB Atlas MONGO_URL configured; the fallback keeps the app fully functional without any external DB dependency.

**How to apply:** `backend/server.py` — `os.environ.get('MONGO_URL')` with graceful fallback to memdb import. Never crash on missing MONGO_URL.

## JWT Secret Fallback
`JWT_SECRET` defaults to `"necrolink-default-secret-change-in-production-2024"`.

**Why:** App would crash with KeyError if JWT_SECRET not set. Fallback enables login/register to work immediately on Replit without any env setup.

## MongoDB Atlas SSL Fix (if MONGO_URL is configured)
OpenSSL 3.6 on Replit causes `TLSV1_ALERT_INTERNAL_ERROR` with MongoDB Atlas clusters.
**Fix:** Pass `tlsInsecure=True` to `AsyncIOMotorClient`. Also set short timeouts (5000ms) to prevent startup blocking.

## Non-blocking Startup
Backend seeding moved to `asyncio.create_task(_background_startup())` so port opens immediately.

**Why:** Replit workflow checker times out if port doesn't open within ~30s.

## Frontend Proxy for Backend
In Replit, only port 5000 (webview) is publicly accessible. Backend runs on 8000.
**Fix:** Configure `devServerConfig.proxy` in `craco.config.js` as an **array** (not object) for webpack-dev-server v5:
```js
devServerConfig.proxy = [{ context: ["/api"], target: "http://localhost:8000", ... }]
```

**Why:** webpack-dev-server v5 requires proxy as an array; object format throws schema error.

## Combined Workflow
Both backend and frontend run from `start.sh` via single "Start application" workflow.
`REACT_APP_BACKEND_URL=""` (empty) so all /api calls go through the proxy.
`start.sh` uses `python3 -m uvicorn` (uvicorn not in PATH directly).

## Python Packages
Packages installed to `/home/runner/workspace/.pythonlibs/lib/python3.12/site-packages`.
The `emergentintegrations` package in requirements.txt is not available on PyPI — skip it.

## Admin Dashboard
- Tabs: Overview, Applications (with pending badge), Events, Registrations, Orders, News, Gallery, Products, Announcements
- Owner-only tabs: Users, Settings (Discord + owner info)
- Stats cards are clickable and navigate to the relevant tab
- Quick actions in Overview for common tasks
