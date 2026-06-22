# NECROLINK MLBB Clan Website - PRD

## Original Problem Statement
Create a professional esports and gaming community website for an MLBB clan (originally Dark_Net, **renamed to NECROLINK**) with cyberpunk theme. Major v2 update added Events page, News page, Store page, and comprehensive Admin Dashboard for managing all content without coding.

## User Choices (v2 Iteration)
- **Image uploads**: Use Emergent Object Storage AND allow URL paste (both supported in admin forms)
- **Store/Payments**: NO payment integration - just collect order info; admin contacts customer manually
- **News**: Both manual admin posts allowed (auto RSS fetch deferred — no official MLBB RSS exists)
- **Event Registration**: Open to anyone via public form (no login required)
- **Rebrand**: All Dark_Net → NECROLINK across the entire site

## Architecture
- **Backend**: FastAPI + MongoDB + JWT cookie auth + SendGrid (mocked) + Emergent Object Storage
- **Frontend**: React 19 + React Router + Framer Motion + Tailwind (custom cyberpunk theme)
- **Auth**: JWT httpOnly cookies, admin/member role-based

## Implemented Features

### v1 Foundation (Date: 2026-02 part 1)
- JWT auth, Home/About/Members/Join Us pages, basic admin dashboard

### v2 Major Expansion (Date: 2026-02 part 2)
- **Full NECROLINK rebrand** (logo: Skull icon + neon purple, all text updated)
- **Events Page** (`/events`):
  - Live event list (Upcoming/Ongoing/Completed sections)
  - 14 default event categories (Friday Night Clash, Sunday Championship, NECROLINK Dark Cup, Halloween, etc.)
  - Upcoming calendar grid (next 5 dates with event titles)
  - Real-time countdown timer per event (D/H/M/S, updates every second)
  - "Live Now" pulse indicator for ongoing events
  - Category + status filters
  - Public registration modal (name, email, IGN, Discord, notes)
- **News Page** (`/news`):
  - 6 categories: Patch Notes, New Heroes, New Skins, Events, Esports, Game Updates
  - Pinned announcements section at top
  - Category filter buttons
  - External source URL support
- **Store Page** (`/store`):
  - Two sections: Merchandise (jerseys/hoodies/tshirts/mousepads/stickers/keychains) + MLBB Top-Up (diamonds/weekly_pass/starlight/event_pass)
  - Section tabs + category sub-filters
  - Order modal with MLBB User ID + Server ID fields for top-ups
  - Low stock badge when stock < 10
  - Admin will contact customer for payment (no Stripe)
- **Enhanced Admin Dashboard** (`/admin`) — 8 tabs:
  - **Overview**: 8 stat cards (pending apps, upcoming/ongoing events, pending regs, orders, members, news, products)
  - **Events**: Full CRUD with form (title, desc, category, datetime, location, status, banner, max participants, prize pool)
  - **Registrations**: View all event registrations with event title lookup, approve/reject
  - **News**: Full CRUD with pin/publish toggles, category picker, image, source URL
  - **Products**: Full CRUD with section switch (auto-updates category options), price, stock, image
  - **Orders**: View orders with customer info + game IDs, mark complete/cancelled
  - **Applications**: Approve/reject clan applications
  - **Announcements**: Create/delete homepage announcements
- **Image Upload Component**: Used in all admin forms (Events/News/Products) — either paste URL or upload file (max 5MB, image types only) via Emergent Object Storage

### Backend Endpoints (29 total)
- Auth: `/api/auth/{login,register,me,logout}`
- Files: `/api/upload`, `/api/files/{path}`
- Events: GET/POST/PUT/DELETE `/api/events`, `/api/events/{id}`
- Registrations: POST/GET `/api/event-registrations`, PATCH `/api/event-registrations/{id}/status`
- News: GET/POST/PUT/DELETE `/api/news`, `/api/news/{id}`
- Products: GET/POST/PUT/DELETE `/api/products`, `/api/products/{id}`
- Orders: POST/GET `/api/orders`, PATCH `/api/orders/{id}/status`
- Members, Applications, Announcements (from v1)
- Stats: GET `/api/stats` (admin overview)

## Testing Status
- Iteration 1: 19/19 backend tests passing
- Iteration 2: **34/34 backend tests passing**, all critical frontend flows verified via Playwright

## Test Credentials
- **Primary admin**: `admin@necrolink.com` / `Necrolink2024!`
- **Legacy admin** (backward compat): `admin@darknet.com` / `DarkNet2024!`

## Deferred Backlog (P0/P1/P2)
### P1 — Next priorities
- Gallery page (match screenshots, MVP moments) with admin upload UI
- Tournaments page (brackets, schedules, results) — currently merged into Events
- Member profile page (private profile editor)
- MLBB news auto-fetch (no official RSS — would need web scraping of mobilelegends.com)
- Refactor server.py (now 804 lines) into modules: routes_events.py, routes_news.py, services/storage.py

### P2 — Polish & Production
- Replace native datetime-local input with shadcn Calendar in admin event form
- Real SendGrid API key for production email
- Rate limiting on public POST endpoints (event-registrations, orders, applications)
- Brute force lockout on `/api/auth/login` (5-fail threshold per playbook)
- CORS tightening to specific production origins
- Cookie `secure=True` for HTTPS deployment
- Status field enum validation on PATCH endpoints

## Files Structure
```
backend/server.py              (804 lines — TO REFACTOR)
frontend/src/App.js            (routes: /, /about, /members, /events, /news, /store, /join, /login, /admin)
frontend/src/pages/
  Home.js, About.js, Members.js, JoinUs.js, Login.js,
  Events.js, News.js, Store.js, AdminDashboard.js
frontend/src/components/
  Navigation.js, Footer.js, ProtectedRoute.js
frontend/src/contexts/AuthContext.js
```
