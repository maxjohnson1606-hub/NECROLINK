# NECROLINK MLBB Clan Website - PRD

## Architecture
- **Backend**: FastAPI + MongoDB + JWT cookie auth + SendGrid (mocked) + Emergent Object Storage + feedparser
- **Frontend**: React 19 + React Router + Framer Motion + Tailwind (custom cyberpunk theme)
- **Auth Roles**: `member` < `admin` < `owner`

## Iteration History

### v1 — Foundation (19/19 tests)
JWT auth, Home/About/Members/Join Us, basic admin

### v2 — NECROLINK Rebrand + Expansion (34/34 tests)
Events, News, Store (merch+topup), enhanced admin dashboard

### v3 — Owner Role + Personal Spaces (57/57 tests)
Owner role, Profile page, Gallery page, logo image, Aamon leader, social contacts

### v4 — Security + Auto-feeds (CURRENT, 10/10 new + 75/76 regression)
- **Change Password** (Profile → Security tab)
- **Change Email** (Profile → Security tab, requires current password, logs out after change)
- **Store simplified** to MLBB Top-Up only (merchandise hidden from public, still in admin)
- **YouTube auto-fetch** from official MLBB channel (UCqmld-BIYME2i_ooRTo1EOg) via RSS, 30-min cache
- **Video player modal** with embedded YouTube iframe + fallback "Open on YouTube" CTA
- **Instagram CTA** card linking to @mlbb_cis (auto-scraping not feasible due to Instagram restrictions)

## API Endpoints (43 total)
- Auth: login, register, me, logout, **profile (PATCH)**, **password (PUT)**, **email (PUT)**
- Feeds: **mlbb-videos**, **mlbb-instagram**
- My-Data: applications, registrations, orders
- Files: upload, get-by-path
- Events: 5 (CRUD + registrations)
- Registrations: 3
- News: 5 (CRUD)
- Products: 4 (CRUD)
- Orders: 3
- Members, Applications, Announcements, Gallery, Stats
- Users (owner-only): 3

## Test Credentials
- **Owner**: `owner@necrolink.com` / `Owner2024!`
- **Admin**: `admin@necrolink.com` / `Necrolink2024!`
- **Legacy Admin**: `admin@darknet.com` / `DarkNet2024!`

## Deferred Backlog

### P1 — Production hardening
- Real SendGrid API key (currently placeholder)
- Refactor server.py (1100+ lines → modular routers)
- Brute-force lockout on /api/auth/login
- Rotate refresh_token on password/email change
- Email verification flow before email change is committed

### P2 — Future features
- Tournaments page with brackets
- Member leaderboard sorted by wins/MVPs
- Rate limiting on public POST endpoints
- CORS tightening for production
- Avatar file-size limit before data URL conversion

## Files
```
backend/server.py              (1100 lines)
frontend/src/App.js
frontend/src/pages/
  Home, About, Members, JoinUs, Login,
  Events, News, Store, Gallery, Profile, AdminDashboard
frontend/src/components/
  Navigation, Footer, ProtectedRoute
frontend/src/contexts/AuthContext
```
