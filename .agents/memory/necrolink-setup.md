---
name: Necrolink project setup
description: Key setup decisions for the NECROLINK MLBB clan management site (FastAPI + React)
---

# Necrolink Setup Decisions

## MongoDB Atlas SSL Fix
OpenSSL 3.6 on Replit causes `TLSV1_ALERT_INTERNAL_ERROR` with MongoDB Atlas clusters.
**Fix:** Pass `tlsInsecure=True` to `AsyncIOMotorClient`. Also set short timeouts (5000ms) to prevent startup blocking.

**Why:** The Atlas cluster rejects the TLS handshake under OpenSSL 3.x unless certificate validation is relaxed.

**How to apply:** In `backend/server.py` line ~41, `AsyncIOMotorClient(mongo_url, tlsInsecure=True, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000, socketTimeoutMS=5000)`

## Non-blocking Startup
The startup event does MongoDB seeding. With SSL failures, this blocks for 5s×3 ops = 15s+.
**Fix:** Move all DB work to a `asyncio.create_task(_background_startup())` so the port opens immediately.

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

## Python Packages
Packages installed to `/home/runner/workspace/.pythonlibs/lib/python3.12/site-packages` via:
`python3 -m pip install <pkg> --target /home/runner/workspace/.pythonlibs/lib/python3.12/site-packages`

Key missing packages that needed manual install: `fastapi, motor, starlette, pydantic, sendgrid, aiohttp, anyio, httpx, email-validator, python-jose, cryptography, cffi, jinja2, python-multipart`

The `emergentintegrations` package in requirements.txt is not available on PyPI — skip it.
