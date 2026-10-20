# Mkulima Market: Build, Clean-up and Test Plan

> **MVP decisions (2026-10-21):** no OTP for now; accounts use email + password. AI runs on Gemini (`gemini-3.5-flash`). The MVP stays on the current Express + SQLite stack; the Next.js/Supabase rebuild below is the longer-term plan. See README section 7 for what has already been fixed.

_Written 2026-10-21 from the code in this repo (commit `0a0e575`), the master build prompt, and the five reference designs._

This doc covers eight things, in order:

1. [Where the project is today](#0-where-the-project-is-today)
2. [Clean up the design and UI](#1-clean-up-the-design-and-ui)
3. [Finish every feature](#2-finish-every-feature)
4. [Make the user flows work end to end](#3-user-flows)
5. [Test every page with Playwright](#4-playwright-page-by-page-testing)
6. [Write the test suite](#5-test-suite)
7. [Research: how other platforms do it](#6-research-how-other-platforms-do-it)
8. [Polish the UI](#7-ui-polish-checklist)
9. [New feature ideas](#8-new-feature-ideas)

Then the [phased checklist](#9-phased-checklist) and the [definition of done](#10-definition-of-done).

---

## 0. Where the project is today

### What exists
| Area | State |
|---|---|
| Stack | Plain HTML + vanilla JS front end. Each view is a partial loaded into a **shadow root** (`js/main.js`). Express + SQLite + `express-session` + bcrypt back end in `server.js` (725 lines). |
| Pages | Home, Map & transport, Ask AI + market insights, Auth, Dashboard, Seller form, Transporter form, Admin (`admin.html`). |
| Database | 3 tables: `users` (one role per user), `listings`, `routes`. `docs/schema.sql` is a separate, untested Supabase/PostGIS schema that nothing uses. |
| Data | `js/data/data.js` has empty arrays. Home produce, sellers, markets and price reports are all empty. |
| AI | `js/pages/ai.js` calls `claude.use("sample")`, which only works inside a claude.ai artifact. **It doesn't work locally.** |
| Map | Leaflet is loaded from unpkg in `map.js`. Distances are straight-line only. |
| Tests | None. |
| i18n | Each page has its own `{en, sw}` dictionary. The navbar has a separate one. The language toggle clicks hidden buttons inside each shadow root. |

### Critical issues (fix before anything else)
1. **The database and server code can be downloaded.** `app.use(express.static(__dirname))` serves the whole project folder, so `GET /mkulima.db` returns every user's email, phone and password hash, and `GET /server.js` shows the source. Serve only a `public/` folder.
2. **Hardcoded secrets.** The session secret is `'mkulima-market-demo-secret'`. Admin defaults are `admin@mkulima.test` / `admin123` and the key is `mkulima-admin`. Admin access also works with `?key=` in the URL, which ends up in logs and browser history. Fail at startup if these aren't set in env, and drop the query-string key.
3. **Private data is public.** `GET /api/nearby/sellers` needs no login and returns sellers' **email, phone and exact lat/lng**. That breaks the prompt's privacy rule and puts the project at risk under the Kenya Data Protection Act 2019. Return approximate locations (snapped to ward or market) and no contact details.
4. **Transport costs are made up.** `/api/quote` returns `rate × straight-line km` as `estimated_cost`. The prompt says never to invent transport costs. Show the transporter's own quote, or label any figure as a rough guide.
5. **Guests can't browse anything.** `GET /api/listings` requires login and only returns *your own* listings. There is no public marketplace query.
6. **No protection on forms or logins.** No rate limiting on login or register, no CSRF protection, no `helmet` headers, cookies aren't `secure`/`sameSite`, and there's no server-side validation library.

### UI problems seen in the code
- **Two navbars.** `index.html` has a global nav, and `partials/home.html` has its own nav with different links.
- Almost every CTA points to `#/auth`, including Explore, Find Buyers and Find Transport. Users hit a login wall before they see any value.
- The page copy says "Prototype", "Sample data", "Not yet live" and "These buttons are not live yet", and the home AI chat preview is static.
- Images are crops of one `hero.jpg` made with `background-position` hacks, not real produce photos.
- Inline styles throughout the partials. Class names like `.w`, `.f`, `.rv` and `.pl` are hard to maintain.
- Minified one-line JS in `shell.js` and `ai.js` is unreadable and untestable.
- Shadow DOM per view makes global theming, i18n and Playwright selectors harder than they need to be.

### Recommendation: rebuild on a proper stack and port the content
The current code is about 2,900 lines, mostly markup and copy. Patching it costs more than porting it. Follow the prompt's preferred stack:

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Server routes keep the AI key and routing service on the server. SSR makes listing pages fast on slow networks and shareable on WhatsApp (OG previews). |
| Styling | **Tailwind CSS v4 + shadcn/ui (Radix)** | Accessible primitives, design tokens in one place. |
| DB / Auth | **Supabase**: Postgres + PostGIS + Auth (phone OTP and email) + Storage + RLS | Matches `docs/schema.sql`. Phone OTP suits Kenyan users better than email. |
| Validation | **Zod**, shared by client and server | One schema per form. |
| i18n | **next-intl** with `/en` and `/sw` routes | Switching language keeps the current page. Translation files live in `messages/en.json` and `messages/sw.json`. |
| Maps | **MapLibre GL or Leaflet + OSM tiles**, **OSRM/openrouteservice** for routing behind a server proxy | Matches the prompt. The routing provider is configurable and cached. |
| AI | Server route calling the **Gemini API with function calling** (`@google/genai` SDK; a Pro model for reasoning, a Flash model for cheap intent and translation). Key is the existing `GEMINI_API_KEY` in `.env`. | The tools query Supabase directly. Keep the provider behind one `lib/ai/` interface so it can be swapped later. |
| Animation | **Motion** (Framer Motion), with `prefers-reduced-motion` respected | |
| Tests | **Vitest** (unit), **Playwright** (E2E, visual, a11y via `@axe-core/playwright`), **pgTAP** or SQL tests for RLS | |
| PWA | `next-pwa`/Serwist for an offline shell and cached listings | Low-bandwidth users. |

Keep: all EN/SW copy (move it into `messages/*.json`), the logo SVG, the colour intent, and the pricing and blue-badge wording.

### Target folder structure
```
mkulima-market/
  app/[locale]/
    (marketing)/page.tsx            # landing
    produce/page.tsx  produce/[id]/page.tsx
    requests/page.tsx requests/[id]/page.tsx       # Find Buyer
    transport/page.tsx transport/[id]/page.tsx
    markets/page.tsx  markets/[slug]/page.tsx
    map/page.tsx
    ai/page.tsx
    sellers/[handle]/page.tsx
    dashboard/(seller|buyer|transporter)/...
    admin/...
    auth/(login|register|verify)/page.tsx
  app/api/ai/route.ts  app/api/route-distance/route.ts
  components/ui/ (shadcn)  components/marketplace/  components/map/
  lib/supabase/  lib/validation/ (zod)  lib/geo/  lib/ai/tools/
  messages/en.json  messages/sw.json
  supabase/migrations/  supabase/seed.sql (clearly labelled demo data)
  tests/unit/  tests/e2e/  tests/rls/
```

---

## 1. Clean up the design and UI

### What the reference images teach
| Ref | Take | Leave |
|---|---|---|
| **B.Grocery** (light, floating cards) | Soft light background, floating proof cards next to the hero ("4.5 rating", "100% fresh"), category tiles with colour backgrounds | Stock-model hero photo, misspellings |
| **Gromuse** (deep teal, laptop) | Search bar *in* the header, horizontal category chips that overlap the hero, deep green hero with a curved bottom edge | Delivery-in-15-minutes promises |
| **Top Picks grid** | Clean product card: cut-out produce image, price large, unit underneath, rating + "sold" count, heart and "+" button | Strikethrough "discount" prices (not a fit for farm trade) |
| **fresh** (bold, condensed) | Bold category tiles with 3D produce, a promo strip above the nav, a big confident headline | Coral-red background (clashes with the green/orange/blue brand) |
| **Grocify** (app-style) | "How it works" in numbered visual cards, stats row (users / rating / categories), pill section labels ("HOW TO START") | Phone mock-up hero if there's no app |

**Direction:** Gromuse structure (deep green hero, search in the header, overlapping category chips) + Top Picks product cards + Grocify "How it works" and stats band + B.Grocery floating trust cards. Use **Plus Jakarta Sans** throughout.

### Design tokens (single source in `app/globals.css` / Tailwind theme)
```css
:root {
  /* Green: identity */
  --green-950:#0B2A1E; --green-900:#123D2B; --green-800:#164B35; --green-700:#1E6B47;
  --green-600:#2A8A5A; --green-500:#38A765; --green-100:#DDF3E5; --green-50:#F0FAF3;
  /* Orange: CTAs and highlights */
  --orange-600:#D9620F; --orange-500:#F47721; --orange-100:#FEE7D6;
  /* Blue: navigation, info, maps */
  --blue-700:#1F6FB8; --blue-500:#4A9FE8; --blue-100:#DCEBFA;
  /* Neutrals (warm) */
  --bg:#FAF8F1; --surface:#FFFFFF; --ink:#1D2421; --muted:#5B6660; --line:#E4E0D3;
  /* Status */
  --success:#2A8A5A; --warning:#C98A00; --danger:#C0392B;
  /* Shape */
  --radius-sm:10px; --radius:16px; --radius-lg:24px; --radius-xl:32px;
  --shadow-1:0 1px 2px rgb(16 40 28/.06),0 2px 8px rgb(16 40 28/.06);
  --shadow-2:0 8px 30px rgb(16 40 28/.10);
}
```
- **Contrast:** white on `--orange-500` is about 2.9:1, which fails AA for normal text. Use `--orange-600` for button backgrounds with white text, or dark ink on orange. Check every pair with axe.
- **Type scale:** Display 56/64 (800), H1 44/52, H2 32/40, H3 22/30, Body 16/26, Small 14/22. Mobile: Display 36/42. Never below 14px.
- **Spacing:** 4px base (4, 8, 12, 16, 24, 32, 48, 64, 96).
- **Dark mode:** keep it, with green-950 backgrounds and lifted surfaces. Don't just invert.

### Component inventory (build once, use everywhere)
`Button` (primary orange, secondary green, ghost, link; sizes sm/md/lg; loading state) · `Input/Select/Textarea` with label, hint and error · `SearchBar` (produce + location + radius) · `CategoryChip` · `ProduceCard` · `SellerCard` · `RequestCard` · `OfferRow` · `TransporterCard` · `MarketCard` · `PriceTag` (with type badge: Asking / Reported / Confirmed) · `RatingStars` + count · `VerifiedBadge` (only when `verified_until >= today`) · `DistanceBadge` ("12 km straight-line" vs "18 km by road · ~35 min") · `EmptyState` · `Skeleton` · `Toast` · `Dialog/Sheet` · `Stepper` (multi-step forms) · `LanguageSwitcher` · `MapView` · `ChatBubble` · `StatCounter` · `Stat tile`.

### Clean-up tasks
- [ ] Delete the duplicate nav in `partials/home.html`. Use one global, sticky header: logo · Find Produce · Find Buyers · Transport · Markets · Ask Mkulima AI · 🌐 EN/SW · Login/Register (avatar menu when logged in).
- [ ] Mobile: bottom tab bar (Home, Produce, Sell (+), Messages, Account), as in app-style marketplaces, plus a hamburger for the rest.
- [ ] Remove all "prototype / sample data / not live" copy from production pages. Demo data gets one clear "Demo listing" badge per item instead of disclaimers everywhere.
- [ ] Replace the `hero.jpg` crops with real, licensed photography of Kenyan markets (Wakulima, Marikiti, Kongowea) and cut-out produce PNG/WebP for cards. Use `next/image` with AVIF/WebP, `sizes` and blur placeholders.
- [ ] Replace inline styles and cryptic class names with tokens and components.
- [ ] Every CTA goes somewhere useful *without* login: Explore → `/produce`, Find Buyers → `/requests`, Transport → `/transport`. Ask for login only at the moment of action (enquire, offer, list, save).
- [ ] Icons: one set (Lucide), 24px, 1.75 stroke.
- [ ] Motion: fade/slide-up on scroll (200–300 ms, once), card hover lift (translateY −2px + shadow-2), animated counters in the stats band, page transitions ≤ 200 ms. Everything off under `prefers-reduced-motion`.

---

## 2. Finish every feature

Each feature has **acceptance criteria (AC)** and lists every loading, empty and error state. A feature is done only when its Playwright spec passes in EN and SW, on mobile and desktop.

### Data model (Supabase migration; replaces both current schemas)
```
profiles(id→auth.users, display_name, phone, avatar_url, locale, county, ward, roles text[] {buyer,seller,transporter,admin}, created_at)
seller_profiles(id→profiles, business_name, handle unique, bio, public_location geography(point) /* approximate */, location_precision {market,ward,exact_public}, operating_market_ids bigint[], contact_prefs jsonb, verified_until date, completed_tx int, rating_avg numeric, rating_count int)
commodities(id, slug, name_en, name_sw, category, default_unit, kg_per_unit jsonb /* e.g. bag=90kg potatoes, crate=64kg tomatoes */)
markets(id, slug, name, county, town, location geography(point), coords_verified bool, opening_info jsonb, opening_verified bool, source)
listings(id, seller_id, commodity_id, title, description, grade, quantity numeric, unit, qty_kg numeric generated, price numeric, price_unit, negotiable bool, sale_type {wholesale,retail,both}, min_order numeric, available_from date, available_until date, status {draft,active,low_stock,paused,sold,removed}, location geography(point), market_id, images text[], views int, created_at, updated_at)
buyer_requests(id, buyer_id, commodity_id, quantity, unit, quality, target_price, location geography, deadline date, fulfilment {collect,deliver,either}, status {open,closed,fulfilled,expired})
offers(id, request_id null, listing_id null, from_id, to_id, price, quantity, unit, message, status {sent,countered,accepted,declined,withdrawn,expired}, parent_offer_id)
conversations(id, listing_id, request_id, participant_ids uuid[]); messages(id, conversation_id, sender_id, body, attachments, read_at)
transactions(id, offer_id, buyer_id, seller_id, transporter_id null, qty, price, status {agreed,in_transit,delivered,completed,disputed,cancelled}, completed_at)
reviews(id, transaction_id unique per reviewer, reviewer_id, reviewee_id, role_reviewed, stars 1-5, body, status {visible,hidden,flagged}, created_at)
transporter_profiles(id→profiles, vehicles jsonb[], capacity_kg, base geography, service_radius_km, service_counties text[], pricing_method {per_km,per_trip,per_kg,quote}, available bool)
quote_requests(id, requester_id, pickup geography, destination geography, load_kg, commodity_id, pickup_date, road_km, road_minutes, routing_provider, status)
quotes(id, quote_request_id, transporter_id, price, valid_until, notes, status)
price_reports(id, commodity_id, market_id, unit, price, price_type {asking,reported,confirmed}, reported_on date, source {kamis,admin,user,transaction}, reporter_id, status {pending,approved,rejected})
favourites(user_id, target_type {listing,seller,market,request}, target_id)
alerts(user_id, commodity_id, market_id, condition jsonb, channel {inapp,sms,whatsapp})
notifications(id, user_id, type, payload jsonb, read_at)
reports(id, reporter_id, target_type, target_id, reason, status, resolved_by)
audit_log(id, actor_id, action, target, at)
```
Indexes: GiST on every `geography` column; btree on `(commodity_id,status)`, `(seller_id,status)`, `(market_id,commodity_id,reported_on)`; trigram (`pg_trgm`) on listing title for fuzzy search ("nyanya" → tomato via `commodities.name_sw`).
RLS: public read on active listings, open requests, markets, approved price reports and seller public profiles. Owners write their own rows. Offers and messages are visible to participants only. Admin role is checked via a `profiles.roles` claim.

### A. Accounts and roles
- [ ] Phone OTP (primary) + email/password (secondary) via Supabase Auth.
- [ ] Onboarding wizard: language → "What do you want to do?" (multi-select Buy / Sell / Transport) → county/ward → role-specific details. Skippable, resumable.
- [ ] Multiple roles per user. The dashboard shows a role switcher.
- [ ] Profile edit, avatar upload (resized server-side, EXIF stripped so no GPS leaks from photos).
- **AC:** registering with an existing phone shows an inline error; OTP resend is limited to 1 per 60 s; logout clears the session everywhere; a user who is not an admin gets 403/404 on `/admin`.

### B. Produce marketplace
- [ ] Create listing as a 4-step stepper: What (commodity, grade, photos) → How much (qty, unit with kg conversion, price, negotiable, wholesale/retail, min order) → Where/When (market or approximate area on map, availability dates) → Review & publish. Drafts autosave.
- [ ] Edit, pause, mark low stock, mark sold, remove. Quick "update stock" from the dashboard.
- [ ] `/produce`: search (EN/SW, fuzzy), filters (category, commodity, price range, min qty, county/market, radius 5/10/25/50 km, min rating, verified only), sort (nearest, newest, price ↑↓, rating). URL-driven state so filters are shareable. Map/list toggle.
- [ ] Listing detail: gallery, price with type badge, qty and availability, seller card (rating, completed trades, verified), distance, "Enquire", "Make offer", "Save", "Share on WhatsApp", "Report", and similar listings.
- **AC:** guests can browse and search; an action prompts login and returns them to the same listing afterwards; a sold listing shows "Sold" and disables offers; a seller sees only their own listings in the dashboard.

### C. Find Buyer (buyer requests and offers)
- [ ] Buyers post a request (commodity, qty, quality, target price, location, deadline, collect/deliver).
- [ ] `/requests` board for sellers with filters, plus "Matching requests for your listings" in the seller dashboard.
- [ ] Sellers respond with an offer (price, qty, message, optionally linking a listing).
- [ ] Buyers get an **offer comparison table**: price, qty, seller rating, distance, verified, and road distance when available. Accept, decline, or counter.
- [ ] Accepting an offer creates a `transaction` (status `agreed`) and opens a conversation.
- **AC:** requests past their deadline auto-expire (cron); a buyer can't make an offer on their own request; accepting one offer optionally closes the request and notifies the others.

### D. Ratings and trust
- [ ] A review can be left only for a `transaction` with status `completed` and both parties confirmed. One review per reviewer per transaction (unique constraint).
- [ ] Two-way reviews: buyers rate sellers, sellers rate buyers, both rate transporters. Hide both until both have reviewed or 14 days have passed (Airbnb pattern, to prevent retaliation).
- [ ] Report a review; admin moderation queue.
- [ ] Rating shown as average + count + completed trades. "New seller" if fewer than 3 reviews; no fake stars.
- [ ] Blue badge appears only while `verified_until >= today`.
- **AC:** the review form isn't reachable without a completed transaction (UI *and* RLS); a duplicate review is rejected by the DB.

### E. GIS / GPS and markets
- [ ] Location chip in the header: "📍 Nairobi · 25 km". Click to use GPS (explicit permission prompt with an explanation) or pick a county/town/market manually. Stored in a cookie + profile.
- [ ] PostGIS `ST_DWithin` RPC for nearby listings, sellers, requests, transporters and markets.
- [ ] Map page: clustered markers by type (listings, markets, transporters), radius ring, filter chips, list panel synced to the map viewport.
- [ ] Road distance and ETA via a server proxy to OSRM/openrouteservice: cached by rounded coordinate pairs, rate limited, falls back to straight-line with a clear label.
- [ ] Markets directory with profile pages: location, commodities traded, verified opening info, latest price reports, nearby sellers, and a "Directions" link (OSM/Google Maps).
- [ ] Privacy: sellers choose market, ward or approximate (jittered ≈1 km) display. Exact coordinates are never sent to the client unless the seller opts into a public business address.
- **AC:** with GPS denied, manual selection works and nothing breaks; distance badges always say "straight-line" or "by road"; no API response includes `phone`/`email` unless the viewer is in an accepted transaction with that user.

### F. Ask Mkulima AI
- [ ] `/api/ai` server route that streams. The Gemini API with function calling (function declarations): `search_listings`, `get_listing`, `search_requests`, `nearest_markets`, `price_reports`, `compare_offers`, `find_transporters`, `route_distance`, `draft_listing` (writes nothing; returns a prefilled form link).
- [ ] The system prompt enforces: answer only from tool data, cite listing links, say when data is missing or stale (show "as of" dates), state straight-line vs road distance, reply in the user's language.
- [ ] UI: full page + floating launcher on every page + suggested prompts + result cards rendered inline (listing cards, market cards, mini map), not just text.
- [ ] Voice input (Web Speech API where supported) for Kiswahili and English.
- [ ] Rate limit (e.g. 20 messages/hour per user, 5 per guest via IP and cookie), input length cap, Zod-validated tool inputs, prompt-injection guard (listing text is passed as data, not instructions), logging of tool calls for audit.
- **AC:** with no matching data, the assistant says so instead of inventing; every seller or price it mentions links to a real record; the API key never appears in the client bundle (checked in CI by grepping `.next/static`).

### G. Transport marketplace
- [ ] Transporter onboarding: vehicles (type, capacity, refrigerated?), base, service radius/counties, pricing method, availability toggle.
- [ ] Quote request: pickup + destination (map picker or market), load, date → road distance computed → sent to matching transporters (capacity ≥ load, base within radius).
- [ ] Transporters reply with real quotes; requesters compare them (price, rating, vehicle, ETA) and accept.
- [ ] Link a transport quote to a produce transaction ("Arrange transport" button after an offer is accepted).
- **AC:** no cost figure appears unless a transporter quoted it or it's labelled "indicative, based on the transporter's per-km rate × road km".

### H. Market intelligence
- [ ] Price reports from: an admin import (CSV from KAMIS or other public sources, with the source recorded), verified reporter users, and confirmed transaction prices (anonymised).
- [ ] Commodity page: latest price per market by type, a trend chart only when there are ≥ 5 reported points in the window, a min/median/max band, and "last updated".
- [ ] "Is this a fair price?" hint on listing forms: shows the range of recent reported prices for that commodity and market.
- **AC:** asking, reported and confirmed prices are never mixed in one line; no chart is drawn from thin data.

### I. Platform features
- [ ] Notifications (in-app, then SMS/WhatsApp): new offer, offer accepted, new message, matching request, price alert, listing expiring.
- [ ] Favourites/watchlist for listings, sellers, markets and requests.
- [ ] Messaging (Supabase Realtime) with quick replies ("Still available?", "Best price for 20 bags?").
- [ ] Report listing/user/review.
- [ ] Transaction history and CSV export.
- [ ] **Admin:** users (roles, suspend), listings (moderate), requests, markets (add, verify coordinates), price reports (approve), reviews/reports queue, verification visits (schedule → pass/fail → set `verified_until`), audit log. Admins are real users with the `admin` role, not a shared password.

---

## 3. User flows

Every flow below must work start to finish, in both languages, on a 360px phone. These are also the Playwright E2E journeys.

| # | Flow | Steps | Success state |
|---|---|---|---|
| F1 | **Guest discovers produce** | Home → search "viazi" + "Nakuru" → results → filter 25 km → open listing | Listing detail with seller and distance; no login required |
| F2 | **Guest → enquiry** | Listing → "Enquire" → login/register sheet → OTP → back on the same listing with the message box open → send | Conversation created; seller notified |
| F3 | **Farmer lists produce** | Register (role Seller) → onboarding → "Sell" → 4-step form → publish | Listing live, visible in search, appears in "My listings" |
| F4 | **Buyer posts a request → compares offers** | Request form → publish → 2 sellers offer → comparison table → accept one | Transaction `agreed`, other sellers notified, chat opened |
| F5 | **Seller responds to a request** | Dashboard → "Matching requests" → open → make offer | Offer appears in the buyer's comparison |
| F6 | **Arrange transport** | Accepted transaction → "Arrange transport" → pickup/destination prefilled → road km shown → send → transporter quotes → accept | Transport linked to the transaction |
| F7 | **Complete and review** | Both mark "Completed" → review prompt → stars + text | Review visible after both submit (or 14 days); rating updated |
| F8 | **Find nearest market** | Location chip → allow GPS (or pick town) → Markets → sorted by distance → market page → Directions | External directions open with correct coordinates |
| F9 | **Ask AI** | "Nitafute viazi karibu na Nyeri, angalau magunia 50" | Reply in Kiswahili with linked listing cards, bag→kg assumption stated, distances labelled |
| F10 | **Language switch mid-task** | On `/en/produce?commodity=tomato&radius=25` press SW | `/sw/produce?commodity=tomato&radius=25`, same results, all UI in Kiswahili, form input kept |
| F11 | **Admin moderation** | Report a listing → admin queue → hide → reporter notified | Listing hidden from search |
| F12 | **Verification** | Seller requests badge → admin schedules visit → pass | Badge shows with an expiry date; removed automatically after expiry |

UX rules for every flow:
- Ask for login **at the point of action**, never as a wall, and always return the user to where they were.
- One primary action per screen (orange).
- Each form step has 5 or fewer fields on mobile. Validate inline on blur, and on the server too.
- Every list has a loading skeleton, an empty state with a next action ("No potatoes within 10 km. Try 25 km or post a request"), and an error state with retry.
- Use optimistic UI for favourites, stock updates and message send.

---

## 4. Playwright: page-by-page testing

### Setup
```bash
npm i -D @playwright/test @axe-core/playwright
npx playwright install --with-deps chromium webkit
```
`playwright.config.ts` projects:
- `desktop-chromium` (1440×900)
- `mobile-chrome` (Pixel 7) and `mobile-safari` (iPhone 14)
- `slow-3g` (Chromium with CPU ×4 throttle + network throttling via CDP), used for key pages only
- `webServer` starts `next start` against a **local Supabase** (`supabase start`) seeded with `supabase/seed.sql`
- `storageState` fixtures for `buyer`, `seller`, `transporter` and `admin`, created by a global setup that logs in through the test OTP provider
- `use: { locale: 'en-KE', timezoneId: 'Africa/Nairobi', geolocation: {latitude:-0.4167, longitude:36.95}, permissions: [] }`; grant geolocation per test

### Checklist run on every page
For each route, in **EN and SW**, **desktop and mobile**:
1. Renders with no console errors and no failed requests (fail the test on `page.on('console', error)` / `requestfailed`).
2. **axe** reports no serious or critical violations.
3. **Visual snapshot** (`toHaveScreenshot`, masked dynamic areas) for light and dark themes.
4. Keyboard: Tab order is logical, focus is visible, Esc closes dialogs, skip-link works.
5. No horizontal scroll at 360px (`document.documentElement.scrollWidth <= innerWidth`).
6. Language switch keeps the URL path and query.
7. Loading, empty and error states are reachable (empty via a seed filter; error via `page.route` returning 500).
8. Performance budget on `slow-3g`: LCP < 2.5 s on mobile for Home, Produce and Listing (Lighthouse CI or `web-vitals` captured in-page).

### Route matrix
| Route | Extra page-specific checks |
|---|---|
| `/` | Hero search submits to `/produce` with params; the 4 action cards link to the right places; counters show real DB counts; "nearby" section appears only after location is granted |
| `/produce` | Each filter changes the URL and results; radius filter is correct against seeded coordinates; sort order; pagination/infinite scroll; map toggle |
| `/produce/[id]` | Gallery; price type badge; enquire/offer/save gated by login; WhatsApp share URL; report dialog; sold-state disables offer |
| `/requests`, `/requests/[id]` | Seller can offer; buyer can't offer on their own request; expired request is read-only |
| `/transport`, quote flow | Road distance shown with provider label; straight-line fallback when routing is mocked down |
| `/markets`, `/markets/[slug]` | Sorted by distance with GPS; manual town works with GPS denied; price table separates types; trend hidden with < 5 points |
| `/map` | Markers render; clustering; radius ring; list ↔ map sync; denied geolocation shows the manual picker |
| `/ai` | Streaming reply with a mocked AI route (`page.route('/api/ai')`) for determinism; plus a nightly **live** run with real prompts checking that every cited link resolves to a real record |
| `/sellers/[handle]` | Rating = avg of seeded reviews; badge only if `verified_until` is in the future; no phone or email shown to guests |
| `/auth/*` | Validation messages EN/SW; wrong OTP; rate-limit message; redirect back to `?next=` |
| `/dashboard/*` | Role switcher; CRUD on listings; stock update; offers inbox; transaction status changes |
| `/admin/*` | 403 for other users; moderation actions write to the audit log |

### Example spec
```ts
// tests/e2e/produce-search.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['en', 'sw'] as const) {
  test(`guest searches potatoes near Nyeri [${locale}]`, async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await page.goto(`/${locale}`);
    await page.getByRole('searchbox', { name: locale === 'en' ? /produce/i : /mazao/i }).fill('viazi');
    await page.getByRole('button', { name: locale === 'en' ? 'Search' : 'Tafuta' }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/produce\\?.*q=viazi`));
    await page.getByRole('radio', { name: '25 km' }).check();
    const cards = page.getByTestId('produce-card');
    await expect(cards.first()).toBeVisible();
    for (const d of await cards.getByTestId('distance').allTextContents())
      expect(parseFloat(d)).toBeLessThanOrEqual(25);
    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations.filter(v => ['serious','critical'].includes(v.impact!))).toEqual([]);
  });
}
```

Selector rule: use `getByRole` / `getByLabel` first (this also tests accessibility), `data-testid` only for repeated cards. Never use CSS class selectors.

---

## 5. Test suite

| Layer | Tool | What | Target |
|---|---|---|---|
| Unit | Vitest | Zod schemas, unit conversion (bag/crate→kg), haversine, price formatting (KSh), i18n key parity (every `en.json` key exists in `sw.json` and vice versa), rating maths, offer state machine | 90% of `lib/` |
| Component | Vitest + Testing Library | ProduceCard, PriceTag type badge, RatingStars, DistanceBadge labels, form error display, EmptyState | Key components |
| DB / RLS | pgTAP or SQL tests run with `supabase test db` | Guest can read active listings but not drafts; user A can't update user B's listing; offers visible only to participants; review insert fails without a completed transaction; duplicate review fails; `ST_DWithin` RPC returns correct rows for seeded points | Every table policy |
| API | Vitest + `supertest`-style calls to route handlers | `/api/ai` rejects oversize input, rate-limits, never returns invented IDs (tool output is checked against the DB); `/api/route-distance` caches and falls back | Every route |
| AI evals | Script with fixed prompts + seeded DB, run nightly | ~30 prompts EN/SW: groundedness (every entity cited exists), refusal to invent prices, language match, distance labelling | ≥ 95% pass |
| E2E | Playwright | Flows F1–F12 + route matrix | All pass on 3 projects |
| Visual | Playwright snapshots | Every page, light/dark, EN/SW, mobile/desktop | Reviewed diffs only |
| Security | `npm audit`, ZAP baseline scan in CI, secret grep on the client bundle | No high or critical issues | — |

**CI (GitHub Actions):** lint + typecheck → unit → `supabase start` + migrations + RLS tests → build → Playwright (sharded) → Lighthouse CI on Home/Produce/Listing → upload the HTML report. Block merge on failure.

**Seed data:** `supabase/seed.sql` with `is_demo = true` on every row and a visible "Demo" badge in the UI. One command (`npm run db:reset`) gives a known state for tests.

---

## 6. Research: how other platforms do it

### Kenyan and East African agri-marketplaces
- **Mkulima Bora** (GIZ + Rift Valley counties): buyers search produce by **county → sub-county → ward**, including a **map view**, and it's built on reusable, standards-based components. **Take:** use Kenya's admin hierarchy (county/sub-county/ward) as a first-class filter, not just free-text towns. [GovStack](https://govstack.global/?p=9897)
- **Tawi** (SC Ventures / Standard Chartered): B2B marketplace that **aggregates buyer demand** for commercial-scale produce. **Take:** let small farmers pool supply to meet large requests (see "Group supply" in §8). [Limitless Beliefs](https://limitlessbeliefsnews.beehiiv.com/p/utm-source-rss-utm-medium-rss-utm-campaign-sc-ventures-launches-b2b-agritech-marketplace-for-farmers)
- **KOMEX / warehouse receipts (Makueni)**: digital trading tied to warehouse receipts, with **payment to farmers within 48 hours**. **Take:** fast, predictable payout builds trust. [Kenya News](https://www.kenyanews.go.ke/farmers-set-to-benefit-from-digital-agricultural-trading-in-makueni/)
- **Twiga Foods + Safaricom Daraja**: paid farmers by M-Pesa (bank for larger amounts) **within 24 hours after grading and quantity confirmation**. **Take:** "grade → confirm qty → pay" is the trust sequence; build the transaction status around it. [Bizna Kenya](https://biznakenya.com/?p=53871)
- **2KUZE (Mastercard)**: mobile marketplace where farmers post produce and buyers bid. **Take:** keep the offer/bid model lightweight and mobile-first. [Farmer's Weekly](https://www.farmersweekly.co.za/agri-news/africa/mastercard-launches-mobile-marketplace-for-east-africa/)
- **M-Farm**: subscriptions + transaction fees for successful sales. Validates the pricing tiers on the landing page. [Dealroom](https://app.dealroom.co/companies/m_farm)
- Common theme: **verified counterparties**, **price transparency** and **fewer brokers** are what farmers value most.

### Market price data
- **KAMIS** (Ministry of Agriculture, `kamis.kilimo.go.ke`) covers **150+ products** with wholesale, retail and farm-gate prices and volumes, nominally **five markets in each of the 47 counties**. No public API was found, so start with a **manual/CSV import by admins with the source recorded**, and contact the Ministry about data access and licence terms. [KAMIS about](https://kamis.kilimo.go.ke/index.php/site/about) · [KALRO ICT manual](https://www.kalro.org/elrp/locust/contentfiles/4-1-2%20Sub-Module%202-%20ICT%20tools%20that%20support%20decision%20making%20in%20agriculture.pdf)

### Payments
- **Safaricom Daraja** supports Lipa Na M-PESA (Buy Goods / PayBill), STK push and B2C/B2B payouts. No native escrow product turned up; escrow would need to be built as "collect into PayBill → hold in ledger → B2C release", via an aggregator like IntaSend or Kopo Kopo, **with legal advice** (holding funds may need CBK authorisation). [Safaricom](https://safaricom.co.ke/annualreport_2018/daraja-our-bridge-to-m-pesas-future.php) · [IntaSend guide](https://intasend.com/payments/m-pesa-api-integration-step-by-step-guide)

### Privacy and compliance
- **Kenya Data Protection Act 2019**: controllers and processors must **register with the ODPC**; it covers commercial use of personal data and cross-border transfers (relevant if Supabase or the AI provider host data outside Kenya). Needed: a privacy policy, consent for location, a data-retention policy, and user data export/delete. [ODPC – Act PDF](https://www.odpc.go.ke/wp-content/uploads/2024/02/TheDataProtectionAct__No24of2019.pdf) · [Rödl & Partner](https://roedl.com/insights/kenya-registration-data-controllers-protection) · [DLA Piper](https://www.dlapiperdataprotection.com/?c=KE&t=law)

### Global marketplace patterns worth copying
- **Airbnb** double-blind reviews (both parties review before either is shown) prevent retaliation.
- **Jiji / OLX** "Safety tips" banner on first contact and "Report" on every listing; phone revealed on tap (and logged).
- **Upwork** offer/counter-offer threads tied to a contract; **Uber Freight** instant quote, then accept.
- **Instacart / Glovo** URL-driven filters, a sticky search, and a location chip in the header.
- **WhatsApp-first commerce** (common in Kenya): share-to-WhatsApp on every listing with rich OG previews; a WhatsApp Business bot later.

---

## 7. UI polish checklist

**Landing page, top to bottom**
1. Promo strip (optional, from the "fresh" reference): "🌽 Today: 128 new listings across 14 counties". Real count only.
2. Sticky header with a compact search + location chip.
3. **Hero** (Gromuse-style deep green, curved bottom): big headline, subline, search (produce · location · radius), and the **4 action cards** overlapping the hero edge: Find Buyer (orange), Find Seller (green), Find Transport (blue), Ask Mkulima AI (gradient). On the right, a cut-out produce photo with 2 floating proof cards (B.Grocery-style), e.g. "★ 4.7 avg seller rating" and "312 completed trades". Real numbers, or hide the cards.
4. **Category tiles** with 3D or cut-out produce (Vegetables, Fruits, Cereals & Grains, Legumes, Tubers, Dairy, Livestock, Inputs).
5. **Fresh from the market**: Top Picks-style cards (image, price + unit, qty, rating, distance, heart).
6. **Near you**: map preview + nearest markets (only when location is set; otherwise a "Set your location" card).
7. **Market prices today**: ticker or table from approved price reports with "as of" date and source.
8. **Open buyer requests**: shows sellers there's demand.
9. **How it works**: 3 tabs (Buyers / Sellers / Transporters), each 3 numbered visual cards (Grocify-style).
10. **Trusted sellers**: rating, trades, verified badge.
11. **Ask Mkulima AI** live mini-chat (real, rate-limited) with suggested prompts.
12. Stats band with animated counters (real DB counts).
13. Pricing tiers + blue badge.
14. FAQ (accordion, EN/SW).
15. Final CTA (Join as buyer / seller / transporter) + footer (links, languages, contact, Terms, Privacy, Data protection).

**Quality bar**
- [ ] Lighthouse mobile ≥ 90 performance, 100 accessibility, ≥ 95 best practices and SEO on Home, Produce and Listing.
- [ ] JS ≤ 170 KB gzipped on the landing page; fonts self-hosted with `next/font` (Plus Jakarta Sans 400/500/600/700/800, `display: swap`).
- [ ] Tap targets ≥ 44×44 px; base font 16px; works at 200% zoom.
- [ ] Kiswahili strings are often 20–30% longer, so test every button and card with SW text for overflow.
- [ ] Currency always `KSh 1,250` with `Intl.NumberFormat('en-KE')`; units localised (kg, gunia/bag, kreti/crate).
- [ ] Every image has meaningful `alt` in both languages.

---

## 8. New feature ideas

Ranked by impact on Kenyan farmers vs. effort. ⭐ = recommended for the first version or Phase 2.

| # | Feature | Why it matters | Effort |
|---|---|---|---|
| ⭐1 | **USSD + SMS access** (Africa's Talking): `*384*xx#` to list produce, check prices and get offers | Many farmers use feature phones or have little data. This is the biggest reach multiplier. | M |
| ⭐2 | **WhatsApp bot** for Mkulima AI and alerts | Kenyans already trade on WhatsApp; it's the lowest-friction channel. | M |
| ⭐3 | **Kiswahili voice notes to AI** (Gemini accepts audio input directly, so no separate speech-to-text step → optional text-to-speech) | Low literacy and hands-busy farmers can just speak: "Nina magunia 40 ya viazi Nyandarua". | M |
| ⭐4 | **"Is this a fair price?"** on the listing form and listing pages, from reported prices + recent confirmed trades | Directly fights broker under-pricing (middlemen can take 60–80% of final prices). | S |
| ⭐5 | **Group supply / pooling**: several nearby farmers combine stock to fill a large buyer request; offers split pro-rata | Small farmers can't meet 5-tonne orders alone (Tawi-style aggregation). | L |
| ⭐6 | **Offline-first PWA**: install to home screen, cached listings and drafts, background sync | Patchy rural connectivity. | M |
| 7 | **Harvest calendar & pre-orders**: sellers post expected harvest (crop, qty, week); buyers reserve ahead | Plans supply, cuts post-harvest loss. | M |
| 8 | **Perishables flash listings**: "Ripe now – sell within 48 h" with a countdown and auto-notifications to nearby buyers | Tomatoes, mangoes and bananas spoil; reduces waste. | S |
| 9 | **Transport backhaul and load-sharing**: trucks returning empty post cheap return trips; several farmers share one truck to the same market | Transport is a big share of farm-gate cost. | M |
| 10 | **M-Pesa escrow-style payments** (STK push → hold → release on delivery confirmation; needs legal review) | Fixes the "who pays first" trust problem (Twiga's grade → confirm → pay pattern). | L |
| 11 | **AI photo grading**: buyer or seller uploads a photo, the model suggests a grade and flags issues (bruising, ripeness) as advisory only | Faster listings, fewer quality disputes. | M |
| 12 | **Price alerts** ("Notify me when tomatoes at Wakulima exceed KSh 80/kg") by in-app, SMS or WhatsApp | Already in the data model (`alerts`). | S |
| 13 | **Trust ladder**: phone verified → ID verified → trades completed → blue badge, shown as a simple progress bar | Clear path for new sellers to earn trust. | S |
| 14 | **Field agents / cooperative accounts**: an agent onboards and lists for many farmers, with commission tracking | Matches how Kenyan agri-trade really runs (co-ops, aggregators). | M |
| 15 | **Weather and market-day nudges**: "Rain expected Thursday in Kirinyaga, consider selling before" and market-day reminders | Useful for timing. Use a free weather API, labelled as forecast. | S |
| 16 | **Demand heatmap** for sellers: where buyer requests for their crop are concentrated | Tells farmers where to sell. | M |
| 17 | **Traceability QR** on produce lots (farm, harvest date, grade) | Supermarket and export buyers ask for it. | M |
| 18 | **Input-supplier lane** (seeds, fertiliser) with verified dealers | Fights fake inputs, a known problem. Later phase. | L |

---

## 9. Phased checklist

### Phase 0: Stop the bleeding (1–2 days, on the current code)
- [ ] Serve only a `public/` folder; move `mkulima.db` out of the web root; rotate any real passwords that were in the DB.
- [ ] Read the session secret and admin credentials from env and refuse to start without them; remove `?key=` admin access.
- [ ] Strip `email`, `phone` and exact `lat/lng` from `/api/nearby/sellers`.
- [ ] Label or remove `estimated_cost` in `/api/quote`.
- [ ] Swap `ANTHROPIC_API_KEY` for `GEMINI_API_KEY` in `.env.example`. Keep the real key only in `.env` (already git-ignored) and read it only on the server. Replace the `claude.use("sample")` call in `js/pages/ai.js` with a `POST /api/ai` server route that calls Gemini.
- [ ] Add `helmet`, `express-rate-limit` on `/api/login`, `/api/register` and `/api/admin/login`, and `cookie: {httpOnly, sameSite:'lax', secure in prod}`.

### Phase 1: Foundation and marketplace
- [ ] Scaffold Next.js + TS + Tailwind + shadcn + next-intl + Supabase; CI with lint/typecheck/test.
- [ ] Design tokens and component library (§1), Storybook optional.
- [ ] Supabase migrations + RLS + seed (§2 data model); RLS tests.
- [ ] Auth (phone OTP + email), onboarding, multi-role profiles.
- [ ] Landing page (§7) with real data.
- [ ] Produce: create/edit/pause/sold, search, filters, detail.
- [ ] Buyer requests, offers, comparison, transactions.
- [ ] Enquiries/messages, favourites, notifications (in-app).
- [ ] Reviews (transaction-gated, double-blind), reports.
- [ ] Admin v1 (users, listings, reports, markets).
- [ ] Playwright F1–F5, F7, F10, F11 + route matrix for Phase 1 pages.
- [ ] **Exit:** a stranger can register, list produce, find it as a buyer, agree a trade and review it, in EN and SW on a phone.

### Phase 2: GIS/GPS and transport
- [ ] Location chip + GPS consent + manual picker (county/ward/market).
- [ ] PostGIS RPCs, radius filters, map page with clustering.
- [ ] Routing proxy (OSRM/ORS) with cache + fallback + labelling.
- [ ] Markets directory + verified market data entry in admin.
- [ ] Transporter profiles, quote requests, quotes, comparison, link to transactions.
- [ ] PWA offline shell. ⭐ USSD/SMS pilot (listing + price check).
- [ ] Playwright F6, F8 + map/transport routes.
- [ ] **Exit:** nearest markets and sellers are correct for seeded coordinates; road vs straight-line is always labelled; transport quotes come only from transporters.

### Phase 3: AI and market intelligence
- [ ] `/api/ai` with Gemini function calling over Supabase; streaming; rate limits; audit log.
- [ ] AI UI (page + launcher + inline result cards + voice input).
- [ ] Price report import (KAMIS CSV/admin), approvals, commodity pages, trends with thresholds.
- [ ] "Fair price" hints, price alerts, richer dashboards (views, enquiries, conversion).
- [ ] ⭐ WhatsApp bot, ⭐ Kiswahili voice.
- [ ] AI eval suite nightly; Playwright F9 + F12.
- [ ] **Exit:** AI evals ≥ 95% grounded; no fabricated entities in 30-prompt EN/SW set.

### Compliance (runs alongside every phase)
- [ ] ODPC registration check; privacy policy and terms (EN/SW); location consent text; data export/delete in account settings; retention policy; note where data is hosted.

---

## 10. Definition of done (per feature)
- [ ] Works for guest / each role as specified; permissions enforced by **RLS**, not only UI.
- [ ] EN and SW complete (key-parity test passes); language switch keeps state.
- [ ] Loading, empty and error states designed and tested.
- [ ] Zod validation on client and server; friendly messages in both languages.
- [ ] Playwright spec passes on desktop, Android and iOS projects; axe clean; visual snapshots approved.
- [ ] No invented data: every number shown traces to a DB row, a third-party quote, or is labelled "estimate" with its method.
- [ ] Lighthouse budgets met on affected pages.
- [ ] README updated: setup, env vars, external services, their limits and costs.

### Environment variables (to document in `.env.example`)
```
NEXT_PUBLIC_SUPABASE_URL=            NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # server only
GEMINI_API_KEY=                      # server only (already in .env)
GEMINI_MODEL=                        # e.g. a Flash model for chat, Pro for complex comparisons
ROUTING_PROVIDER=osrm|ors            ORS_API_KEY=   OSRM_BASE_URL=
AFRICASTALKING_API_KEY=  AFRICASTALKING_USERNAME=     # SMS/USSD (Phase 2)
MPESA_CONSUMER_KEY=  MPESA_CONSUMER_SECRET=  MPESA_SHORTCODE=  MPESA_PASSKEY=   # optional, later
AI_RATE_LIMIT_PER_HOUR=20
```
