# Mkulima Market

Bilingual (English/Kiswahili) Kenyan agricultural marketplace front end: landing page, map and transport, Ask Mkulima AI, and market insights. This is a front-end prototype with **no data and no backend**.

## Run
Fetching partials needs a local server (opening index.html by double click will not work).
- VS Code: install **Live Server**, right-click `index.html`, Open with Live Server.
- Or: `npm run dev`

## Structure
- `index.html` shell with navbar and one container per view
- `js/main.js` builds a shadow root per view (isolated CSS and ids), loads partials, then scripts
- `partials/` HTML of each view, `css/` styles, `js/pages/` view logic, `js/shell.js` router, language and theme
- `js/data/data.js` empty data arrays with the expected shapes. Replace with database calls
- `docs/schema.sql` untested Supabase/PostGIS starting schema
- `assets/images/hero.jpg` the market photo (also cropped for feature sections). Replace with licensed photos

## Known gaps and what to do next
1. **Backend:** nothing is saved. Add Supabase (auth, RLS, PostGIS) from `docs/schema.sql`, then fill `MKDATA` from queries.
2. **Ask Mkulima AI:** `js/pages/ai.js` calls `claude.use("sample")`, which only exists inside claude.ai artifacts. Locally it shows "not available". Replace the `sample(...)` call with a request to your own server endpoint that calls the LLM API with the same tools (search_listings, nearest_markets, price_reports). Keep the API key on the server, add input validation and rate limits.
3. **Map:** the map is an SVG plot of latitude/longitude, not a street map. Replace with Leaflet + OpenStreetMap (or MapLibre) and add routing (OSRM or openrouteservice) for road distance. Straight-line distance is what is computed today.
4. **Markets:** `markets` is empty. Add real markets with verified coordinates.
5. **Not built:** login, buyer requests, offers, reviews, notifications, price alerts, admin dashboard, blue-badge workflow, payments.
6. **Copy to review:** some text still says "sample data" or "prototype" (look for `note`, `warn`, `foot`, `hello` in the page scripts). The home chat preview in the AI section is a static mock.
7. **Pricing:** proposed launch prices only, to be tested with real users.
