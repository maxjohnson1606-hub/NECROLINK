# NECROLINK MLBB Clan Website - PRD

## Original Problem Statement
Professional esports/gaming community website for an MLBB clan with cyberpunk theme, dynamic admin management, member personal spaces, and store/events functionality.

## Architecture
- **Backend**: FastAPI + MongoDB + JWT cookie auth + SendGrid (mocked) + Emergent Object Storage
- **Frontend**: React 19 + React Router + Framer Motion + Tailwind (custom cyberpunk theme)
- **Auth Roles**: `member` < `admin` < `owner` (3-tier role hierarchy)

## Implemented Features by Iteration

### v1 (2026-02 part 1) — Foundation
- JWT auth, Home/About/Members/Join Us pages, basic admin dashboard
- 19/19 backend tests passing

### v2 (2026-02 part 2) — Major Expansion (Rename to NECROLINK)
- Full Dark_Net → NECROLINK rebrand
- Events Page with calendar, countdown timers, public registration, 14 categories
- News Page with 6 categories, pinned articles, source URLs
- Store Page (Merchandise + MLBB Top-Up sections) with order flow (admin contacts customer)
- Enhanced Admin Dashboard with 8 tabs and built-in ImageUploader
- 34/34 backend tests passing

### v3 (2026-02 part 3) — Owner Role + Personal Spaces
- **Owner Role** (highest privilege above admin)
  - Can manage all admins, change user roles, delete users
  - Cannot modify own role/account
- **Profile Page** (`/profile`, login required)
  - Avatar + bio + display name + game name + preferred role editor
  - Avatar upload (client-side FileReader to data URL)
  - 4 tabs: Profile, My Applications, My Event Registrations, My Orders
- **Gallery Page** (`/gallery`, public)
  - 4 categories: Match Screenshots, MVP Moments, Team Highlights, Event Memories
  - Lightbox view with category filter
  - Admin-uploaded images with title/description
- **Admin Gallery Tab** — Full CRUD with image uploader
- **Owner Users Tab** — User management (role changes, deletion)
- **Logo & Branding**
  - Custom NECROLINK skull/hood logo (navbar, footer, home hero)
  - Aamon player poster as leader avatar (Members page)
  - Leader stats updated to match poster: 236 wins, 68 MVPs, "The Duke of Shadows" achievement
- **Contact Info** (footer)
  - Instagram: [@necrolink.official](https://www.instagram.com/necrolink.official/)
  - Email: maxjohnson1606@gmail.com
  - Telegram: [@CurrentIyAFK](https://t.me/CurrentIyAFK)
- **57/57 backend tests passing (23 new + 34 regression), 31/31 frontend UI checks**

### Backend Endpoint Count: 38
- Auth: 5 endpoints (login, register, me, logout, profile)
- My-Data: 3 (applications, registrations, orders)
- Files: 2 (upload admin-only, get-by-path)
- Events: 5 (CRUD + registrations)
- Registrations: 3 (create, list, status)
- News: 5 (CRUD)
- Products: 4 (CRUD)
- Orders: 3 (create, list, status)
- Members, Applications, Announcements, Gallery, Stats, Users (owner)

## Test Credentials (`/app/memory/test_credentials.md`)
- **Owner**: `owner@necrolink.com` / `Owner2024!`
- **Admin**: `admin@necrolink.com` / `Necrolink2024!`
- **Legacy Admin**: `admin@darknet.com` / `DarkNet2024!`

## Deferred Backlog
### P0 — Polish
- Real SendGrid API key (user kept placeholder — orders/registrations still save to DB)
- Refactor server.py (993 lines → modular routers)

### P1 — Features
- Tournaments page (brackets, schedules — currently within Events)
- MLBB news auto-fetch (no official RSS exists; would need web scraping)
- Replace native datetime-local with shadcn Calendar in admin event form

### P2 — Production Hardening
- Brute-force lockout on /api/auth/login
- Rate limiting on public POST endpoints
- CORS tightening to production origin
- Cookie `secure=True` for HTTPS
- Avatar file-size limit on client (200KB) before data URL conversion

## File Structure
```
backend/server.py              (993 lines — TO REFACTOR)
frontend/src/App.js            (routes: /, /about, /members, /events, /news, /gallery, /store, /join, /login, /profile, /admin)
frontend/src/pages/
  Home, About, Members, JoinUs, Login,
  Events, News, Store, Gallery, Profile, AdminDashboard
frontend/src/components/
  Navigation, Footer, ProtectedRoute
frontend/src/contexts/AuthContext
```
