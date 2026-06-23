# NECROLINK

A cyberpunk-themed clan management website for Mobile Legends: Bang Bang (MLBB).

## Architecture

- **Frontend**: React + Tailwind CSS (port 5000), served via craco dev server
- **Backend**: FastAPI + Python (port 8000), proxied via frontend dev server at `/api`
- **Database**: MongoDB Atlas

## Running the App

The `Start application` workflow runs both services:
```bash
bash start.sh
```

This starts:
1. `uvicorn server:app` (backend on localhost:8000)
2. `yarn start` (frontend on 0.0.0.0:5000, proxies /api to backend)

## Environment Variables

Set in Replit Secrets:
- `MONGO_URL` — MongoDB Atlas connection string
- `JWT_SECRET` — Secret for signing JWT tokens

Set as env vars:
- `DB_NAME` — MongoDB database name (default: `necrolink`)

## MongoDB Atlas Setup

The backend connects to MongoDB Atlas. If you see SSL errors, ensure:
1. In Atlas Network Access, add `0.0.0.0/0` to allow all IPs
2. The MONGO_URL secret is correctly set

## Default Admin Credentials

- Owner: `owner@necrolink.com` / `Owner2024!`
- Admin: `admin@necrolink.com` / `Necrolink2024!`

## User Preferences

- Keep frontend on port 5000, backend on port 8000
- Backend proxied through frontend dev server for Replit compatibility
