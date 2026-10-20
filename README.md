# Mkulima Market

A bilingual (English / Kiswahili) Kenyan agricultural marketplace where farmers list produce, buyers find it, transporters offer routes, and **Ask Mkulima AI** (Google Gemini) answers questions from real listings and a farming knowledge base. It installs on phones as an app (PWA) and keeps working offline for pages you have visited.

**Stack:** Node.js + Express, SQLite, plain HTML/CSS/JS (no build step), Google Gemini API, Playwright for tests.

---

## 1. Run the project (step by step)

### What you need
- **Node.js 20.12 or newer** (check with `node -v`). Download from https://nodejs.org if needed.
- **Google Chrome** (only for running the automated tests).
- A **Gemini API key** for the AI features (free tier works): https://aistudio.google.com/apikey

### Steps
```bash
# 1. Go to the project folder
cd mkulima-market

# 2. Install dependencies
npm install

# 3. Create your settings file (skip if .env already exists)
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

4. Open `.env` and fill in the values:

| Setting | What to put | Required? |
|---|---|---|
| `GEMINI_API_KEY` | Your Gemini key | For Ask Mkulima AI and Auto-write |
| `GEMINI_MODEL` | `gemini-3.5-flash` (fast; tested) | Optional |
| `SESSION_SECRET` | A long random string. Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Yes in production |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Your admin login. Password must be **12+ characters** and **must not contain `#`** (it starts a comment in `.env`) | To use `/admin` |
| `PORT` | Default `3000` | Optional |

```bash
# 5. Add demo users, listings and transport routes (safe to run more than once)
npm run seed

# 6. Start the server
npm start
```

7. Open **http://localhost:3000** in your browser.

To stop the server press `Ctrl + C`. After changing `server.js` or anything in `lib/`, restart it. Changes to `css/`, `js/` and `partials/` show up on the next page refresh.

### Useful commands
| Command | What it does |
|---|---|
| `npm start` | Start the app on http://localhost:3000 |
| `npm run seed` | Add demo accounts and data (skips accounts that already exist) |
| `npm run seed:reset` | Delete all demo accounts and their data, then recreate them fresh |
| `npm test` | Run the Playwright browser tests (uses its own throwaway database) |
| `npm run test:report` | Open the HTML report of the last test run |

---

## 2. Demo logins

All demo accounts use the password **`Mkulima@2026`**. Demo data is marked with a **Demo** badge in the app. Prices and coordinates are illustrative, not market data.

| Role | Email | Name | Location | What to try |
|---|---|---|---|---|
| Buyer | `buyer@demo.mkulima.test` | Amina Wanjiru | Nairobi | Search produce, Ask Mkulima AI, edit profile |
| Seller | `seller@demo.mkulima.test` | John Kamau | Ol Kalou, Nyandarua | 3 listings (potatoes, cabbages, carrots): edit, change status, delete, Auto-write |
| Seller | `seller2@demo.mkulima.test` | Grace Wambui | Mwea, Kirinyaga | Tomatoes, onions, rice (one paused) |
| Seller | `seller3@demo.mkulima.test` | Peter Mutua | Makueni | Mangoes, green grams |
| Transporter | `transporter@demo.mkulima.test` | Otieno Haulage | Nakuru | 2 lorry routes to Nairobi |
| Transporter | `transporter2@demo.mkulima.test` | Njeri Pickups | Kiambu | 2 pickup/canter routes |
| **Admin** | value of `ADMIN_EMAIL` in `.env` | — | — | Open **http://localhost:3000/admin**. Password is `ADMIN_PASSWORD` in `.env` |

> Local development `.env` on this machine uses `ADMIN_EMAIL=admin@mkulima.test` and `ADMIN_PASSWORD=MkulimaAdmin-2026`. **Change these before deploying anywhere.**

Older database: an account `seller@mkulima.test` / `demo123` was created automatically by the first version of the app. It still works but is not part of the demo set.

---

## 3. What you can do

| Area | Features |
|---|---|
| **Landing page** | Full-bleed market photography, live counts, search that queries real listings, category filters, How it works, transport band, trust section, pricing, FAQ, photo credits |
| **Accounts** | Register (buyer / seller / transporter), log in, log out, edit profile, change password, delete account and all your data. Email and password; no OTP in the MVP |
| **Listings (CRUD)** | Create, view, edit, change status (available / almost out / paused / sold), delete. Drafts auto-save on your device while typing |
| **Auto-write** | On the listing form, ✨ **Auto-write** drafts the title and description from your own details, in English or Kiswahili. It never adds claims you did not give |
| **Transport routes (CRUD)** | Create, view, edit, delete. Public list of routes. Indicative cost labelled as "not a quote" |
| **Ask Mkulima AI** | Chat in English or Kiswahili. Searches live listings and nearby sellers, and uses the **knowledge base (RAG)** for advice. Shows its sources and never invents prices or sellers |
| **Knowledge base (RAG)** | 11 starter guides (selling, safety, prices, post-harvest, transport) in English and Kiswahili, ranked with SQLite full-text search (BM25). Admins create, edit, unpublish and delete articles in `/admin` |
| **Map** | Leaflet/OpenStreetMap, nearby sellers with approximate (about 1 km) locations, straight-line distances clearly labelled |
| **Admin** | Users (change role, delete), listings (status, delete), routes (delete), knowledge base CRUD |
| **Installable app (PWA)** | "Install app" button, home-screen icon, offline support for visited pages, update prompt when a new version is deployed |
| **Languages** | **SW / EN** button in the top bar switches the whole site without leaving the page |

---

## 4. Testing

```bash
npm test
```
- Starts its own server on port **3210** with a fresh database in `tests/.tmp/`, so your real `mkulima.db` is never touched.
- Uses the Chrome installed on your machine (`channel: 'chrome'`). No browser download needed.
- Runs every test on **desktop** and **mobile (Pixel 7)**. Last run: **55 passed** (1 mobile-only test skipped on desktop).
- AI calls are mocked in browser tests (fast, free and repeatable). The AI endpoint's validation is tested for real.

| File | Covers |
|---|---|
| `tests/e2e/pages.spec.js` | Every page renders without errors and with no sideways scrolling; dark-mode readability (contrast check); mobile menu; landing page live data and Kiswahili switch; dashboard auth redirect |
| `tests/e2e/crud.spec.js` | Sign-up, listing create/edit/status/delete through the UI, ownership protection (403), route CRUD, profile edit, draft auto-save |
| `tests/e2e/ai-admin-pwa.spec.js` | Ask AI (answer, sources, listing cards), Auto-write, admin knowledge-base CRUD, private files blocked, cache headers, no contact details leaked, PWA manifest, service worker and offline reload |

---

## 5. Speed and caching

| Layer | How it works |
|---|---|
| Compression | Every text response is gzip-compressed |
| Versioned assets | CSS/JS/partials are loaded as `file?v=<hash>` and cached for **1 year** (`immutable`). The hash changes automatically when files change, so users never get stale code |
| Revalidation | Unversioned files use ETags (cheap `304 Not Modified`) |
| Images | WebP photos with small versions for phones, lazy-loaded below the fold; hero image preloaded |
| API cache | Public reads (listings, nearby sellers, stats, knowledge search) are cached in memory for 60 s and cleared on any write. Identical AI questions reuse the answer for 10 min |
| Service worker | App shell cached for offline use; photos cached when first viewed; API calls are never cached by the worker |
| Database | SQLite WAL mode plus indexes on the common lookups |

---

## 6. Project structure

```
server.js              Express app: security, caching, auth, listings, routes, admin, PWA files
lib/ai.js              Ask Mkulima AI (Gemini function calling) and Auto-write
lib/kb.js              Knowledge base: table, full-text index, seed articles, search, admin CRUD
lib/crud.js            Update/delete routes for listings, routes, profile, account, admin users
lib/seed.js            Demo data (npm run seed)
index.html             App shell: top bar, PWA meta, one container per view
partials/*.html        Markup for each view (home, map, ai, auth, dashboard, forms)
css/*.css              Styles for each view (each view runs in its own shadow DOM)
js/main.js             Loads views, versioned URLs, service worker, install button
js/shell.js            Router (#/home, #/map …), language and theme switching
js/pages/*.js          Logic for each view
sw.js                  Service worker (offline cache)
manifest.webmanifest   PWA manifest (name, icons, shortcuts)
assets/icons/          App icons
assets/images/landing/ Landing photos (WebP) + CREDITS.md
admin.html             Admin panel (/admin)
tests/e2e/             Playwright tests
docs/MKULIMA_MARKET_PLAN.md  Full roadmap, research and test plan
```

### API overview
| Method & path | Who | Purpose |
|---|---|---|
| `POST /api/register`, `/api/login`, `/api/logout`, `GET /api/session` | Anyone | Accounts |
| `GET /api/users/me`, `PUT /api/users/me`, `PUT /api/users/me/password`, `DELETE /api/users/me` | Signed in | Own profile and account |
| `GET /api/marketplace/listings?q=&lat=&lng=&radiusKm=` | Anyone | Public listing search |
| `GET /api/listings` (mine), `POST`, `GET/PUT/DELETE /api/listings/:id`, `PATCH /api/listings/:id/status` | Owner (GET by id is public for active listings) | Listing CRUD |
| `GET /api/routes` (mine), `POST`, `GET/PUT/DELETE /api/routes/:id`, `GET /api/transport/routes` (public) | Owner / anyone | Route CRUD |
| `GET /api/nearby/sellers`, `POST /api/quote`, `GET /api/stats` | Anyone | Map, indicative quotes, landing counts |
| `POST /api/ai`, `POST /api/ai/autowrite` (signed in) | Anyone / signed in | AI chat and Auto-write (rate limited) |
| `GET /api/kb?q=`, `GET /api/kb/:id` | Anyone | Knowledge base search |
| `/api/admin/*` incl. `/api/admin/kb` | Admin | Moderation and knowledge-base CRUD |

---

## 7. What changed in this update

**Security fixes**
- The server used to share the whole project folder, so anyone could download `mkulima.db` (emails, phones, password hashes), `server.js` and other files. Now only `css/`, `js/`, `partials/` and `assets/` are public.
- Removed hardcoded secrets and the default admin password (`admin123`), and the admin "key in the URL" backdoor. Secrets now come from `.env`.
- The nearby-sellers API no longer returns email, phone or exact coordinates (approximate, about 1 km).
- The admin panel no longer shows password hashes, and escapes user text (prevents script injection).
- Added security headers (helmet/CSP), rate limits on login, signup and AI, secure cookies, session renewal on login, input validation, and ownership checks on every update/delete.
- Transport cost is labelled "indicative" instead of being presented as a real quote.
- `mkulima.db` is no longer tracked by git. **It is still in the git history**: if this repo was ever pushed, assume the old demo hashes are public.

**Fixed bugs**
- Saving listings and routes never worked: the forms were looked up on the page instead of inside their shadow DOM.
- The login page was invisible in dark mode (white text on white cards).
- The map threw an error on every page load (missing `from`/`to` dropdowns), and its marker icons failed to load.
- The SW/EN language button and the mobile menu button were never wired up.
- The dashboard showed made-up numbers (12 listings, 4.9 rating). It now shows real counts.

**New**
- Full CRUD (see section 3), Ask Mkulima AI on Gemini with RAG knowledge base and sources, Auto-write, demo seed data, installable PWA with offline support, multi-layer caching, redesigned landing page with real Kenyan market photos, and Playwright test suite (55 tests).

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Page looks old after an update | Hard refresh (`Ctrl + Shift + R`). If it persists: DevTools → Application → Service workers → **Unregister**, then reload |
| `Admin login is not configured` | Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ chars, no `#`) in `.env`, then restart |
| `Invalid admin credentials` but the password is right | The password probably contains `#`. Remove it or wrap the value in quotes |
| AI says "not configured" | Add `GEMINI_API_KEY` to `.env` and restart |
| AI error about a model "no longer available" | Set `GEMINI_MODEL=gemini-3.5-flash` (or another model your key lists) and restart |
| AI is slow or "busy" | Google sometimes returns "high demand"; the server retries automatically. Try again in a minute |
| "Too many requests" | Rate limits: 20 logins per 15 min, 20 AI questions per hour per IP (change `AI_RATE_LIMIT_PER_HOUR`) |
| `EADDRINUSE` on start | Port 3000 is in use. Stop the other server or run with `PORT=3001` |
| Login logs out after restart | Set `SESSION_SECRET` in `.env` (without it a random one is used each start) |

---

## 9. Next steps

See `docs/MKULIMA_MARKET_PLAN.md` for the full roadmap. Main gaps: buyer requests and offers, reviews after completed trades, messaging, market price reports, road distance (OSRM), and M-Pesa payments.

Photo credits: `assets/images/landing/CREDITS.md` (Wikimedia Commons, CC BY-SA / CC0).
