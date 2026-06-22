# Dark_Net MLBB Clan Website - PRD

## Original Problem Statement
Create a professional esports and gaming community website for Mobile Legends: Bang Bang (MLBB) clan "Dark_Net" with cyberpunk/futuristic theme using dark black background with neon purple, electric blue, and crimson red accents. Slogan: "Connected by Skill. United by Victory."

## User Choices (Initial Requirements)
- Dynamic website with admin dashboard for content management
- Application forms stored in database AND sent via email
- Member login area with profiles and private content
- Placeholder images for launch (user will replace later)
- Priority: Home, About, Members, Join Us pages first

## Architecture
- **Backend**: FastAPI + MongoDB + JWT cookie-based authentication
- **Frontend**: React 19 + React Router + Framer Motion + Tailwind CSS
- **Email**: SendGrid (currently using placeholder key — needs real key for production)
- **Auth**: JWT with httpOnly cookies, role-based (admin/member)

## User Personas
1. **Visitor**: Browses public pages, can submit application to join
2. **Member**: Registered user with profile, can access member-only areas
3. **Admin**: Manages members, reviews applications, posts announcements

## Implemented Features (Date: 2026-02)

### Backend (`/app/backend/server.py`)
- ✅ JWT authentication (login/register/me/logout) with httpOnly cookies
- ✅ Admin auto-seeding on startup (admin@darknet.com)
- ✅ Sample data seeding (2 members, 2 announcements)
- ✅ Application submission with email notification (background task)
- ✅ Member CRUD (admin-only mutations)
- ✅ Announcements CRUD (admin-only mutations)
- ✅ Role-based access control via `get_admin_user` dependency
- ✅ MongoDB indexes (users.email unique, members.game_name unique)

### Frontend Pages
- ✅ **Home** (`/`): Hero banner with neon-glow Dark_Net title, slogan, "Join Dark_Net" CTA, features grid, announcements feed, secondary CTA
- ✅ **About** (`/about`): Clan story, mission & values (4 value cards), commitment statement
- ✅ **Members** (`/members`): Leaders, Co-Leaders, Members sections with role badges, wins/MVP stats, achievements
- ✅ **Join Us** (`/join`): Requirements section + full application form (name, email, IGN, role, experience, Discord, reason)
- ✅ **Login** (`/login`): Toggleable Login/Register form
- ✅ **Admin Dashboard** (`/admin`): Stats overview, tabs for Applications/Members/Announcements management (protected route)

### Design System
- ✅ Cyberpunk theme: pure black bg (#05050A), neon blue (#00E5FF), neon purple (#B026FF), neon red (#FF003C)
- ✅ Unbounded font for headings, JetBrains Mono for body
- ✅ Neon glow effects, animated hero logo, framer-motion transitions
- ✅ Responsive mobile design with hamburger menu
- ✅ data-testid attributes throughout for testing

## Testing Status
- Backend: 19/19 tests passing (100%)
- Frontend: All critical flows verified end-to-end (Playwright)

## Deferred Backlog (P0/P1/P2)
### P0 — Next priorities
- Events & Parties page (weekly matches, training sessions, game nights, celebrations)
- Tournaments page (upcoming tournaments, brackets, registration, results)

### P1
- Gallery page (match screenshots, MVP moments, team highlights)
- News page (recruitment, event updates, tournament news, patch posts)
- Member profile page (private profile editor)
- Event registration system with countdown timer
- Achievement badges system
- Member ranking board

### P2
- Real SendGrid API key for production email
- Brute force lockout on login
- `/api/auth/refresh` endpoint implementation
- CORS tightening to specific origins
- Rate limiting on application submission

## Test Credentials
See `/app/memory/test_credentials.md`
- Admin: `admin@darknet.com` / `DarkNet2024!`
