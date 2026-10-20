const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load .env if present (built into Node 20.12+). Variables already set in the environment win.
try { process.loadEnvFile(path.join(__dirname, '.env')); } catch (e) { /* no .env file */ }

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'mkulima.db');
const db = new sqlite3.Database(DB_PATH);

// ---- Secrets: never hardcoded ----
let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  if (IS_PROD) {
    console.error('SESSION_SECRET is required in production. Set it in .env.');
    process.exit(1);
  }
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[dev] SESSION_SECRET not set: using a random one. Logins reset when the server restarts.');
}
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_ENABLED = !!(ADMIN_EMAIL && ADMIN_PASSWORD.length >= 12);
if (!ADMIN_ENABLED) console.warn('Admin login disabled: set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in .env.');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

if (IS_PROD) app.set('trust proxy', 1);

// ---- Security headers ----
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org', 'https://unpkg.com'],
      connectSrc: ["'self'", 'https://unpkg.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
      upgradeInsecureRequests: IS_PROD ? [] : null
    }
  }
}));

// ---- Caching layer 1: compress every text response ----
app.use(compression());

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ---- Caching layer 2: versioned static assets ----
// Only these folders are public. The project root (mkulima.db, server.js, .env) is never served.
const STATIC_DIRS = ['css', 'js', 'partials', 'assets'];
const ONE_YEAR = 60 * 60 * 24 * 365;
const ONE_WEEK = 60 * 60 * 24 * 7;

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}
function computeAssetVersion() {
  const hash = crypto.createHash('sha1');
  STATIC_DIRS.forEach((d) => walkFiles(path.join(__dirname, d)).forEach((f) => {
    const stat = fs.statSync(f);
    hash.update(f).update(String(stat.size)).update(String(stat.mtimeMs));
  }));
  // The service worker and manifest change the cache too.
  ['sw.js', 'manifest.webmanifest', 'index.html'].forEach((f) => {
    const full = path.join(__dirname, f);
    if (fs.existsSync(full)) hash.update(f).update(String(fs.statSync(full).mtimeMs));
  });
  return hash.digest('hex').slice(0, 10);
}
let ASSET_VERSION = computeAssetVersion();
// In development, recompute on each page load so edits show up without a restart.
function currentAssetVersion() {
  if (!IS_PROD) ASSET_VERSION = computeAssetVersion();
  return ASSET_VERSION;
}
// Every file the offline app needs, with versioned URLs.
function precacheUrls(version) {
  const urls = ['/'];
  STATIC_DIRS.forEach((d) => walkFiles(path.join(__dirname, d)).forEach((f) => {
    const rel = path.relative(__dirname, f).split(path.sep).join('/');
    // Photos are cached when first viewed, not downloaded up front (saves data on slow connections).
    if (rel.startsWith('assets/images/') || /\.(md|json)$/.test(rel)) return;
    urls.push('/' + rel + (d === 'assets' ? '' : '?v=' + version));
  }));
  return urls;
}

const staticOptions = {
  index: false,
  dotfiles: 'deny',
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    const v = res.req && res.req.query && res.req.query.v;
    if (v && v === ASSET_VERSION) {
      // URL contains the content version, so it can be cached for a year.
      res.setHeader('Cache-Control', `public, max-age=${ONE_YEAR}, immutable`);
    } else if (/\.(jpe?g|png|webp|avif|gif|svg|ico|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', `public, max-age=${ONE_WEEK}, stale-while-revalidate=86400`);
    } else {
      // Unversioned CSS/JS/HTML: browser keeps a copy but checks the ETag (cheap 304).
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
};
STATIC_DIRS.forEach((d) => app.use('/' + d, express.static(path.join(__dirname, d), staticOptions)));

// Fill {{ASSET_V}} placeholders in a root file, re-reading only when it or the assets change.
const templateCache = new Map();
function renderTemplate(file, extra) {
  const version = currentAssetVersion();
  const full = path.join(__dirname, file);
  const mtime = fs.statSync(full).mtimeMs;
  const hit = templateCache.get(file);
  if (hit && hit.version === version && hit.mtime === mtime) return hit.body;
  let body = fs.readFileSync(full, 'utf8').replace(/\{\{ASSET_V\}\}/g, version);
  if (extra) body = extra(body, version);
  templateCache.set(file, { version, mtime, body });
  return body;
}

// ---- PWA: manifest and service worker (must be served from the site root) ----
app.get('/manifest.webmanifest', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.type('application/manifest+json').send(fs.readFileSync(path.join(__dirname, 'manifest.webmanifest')));
});
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Service-Worker-Allowed', '/');
  res.type('application/javascript').send(
    renderTemplate('sw.js', (body, version) => body.replace('"{{PRECACHE}}"', JSON.stringify(precacheUrls(version))))
  );
});

// ---- Caching layer 3: short-lived in-memory cache for public API reads ----
const apiCache = new Map();
const API_CACHE_MAX = 500;
async function cached(key, ttlMs, producer) {
  const hit = apiCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await producer();
  if (apiCache.size >= API_CACHE_MAX) apiCache.delete(apiCache.keys().next().value);
  apiCache.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}
// Call after any write that changes public data.
function clearPublicCache() {
  for (const key of apiCache.keys()) apiCache.delete(key);
}

// ---- Sessions: httpOnly, sameSite, secure in production ----
app.use(session({
  name: 'mkulima.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD
  }
}));

// API responses are not cached by browsers or proxies unless a route says otherwise.
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// ---- Rate limits ----
const jsonLimitMessage = { error: 'Too many requests. Please wait a few minutes and try again.' };
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.AUTH_RATE_LIMIT || 20), standardHeaders: 'draft-7', legacyHeaders: false, message: jsonLimitMessage });
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: Number(process.env.AI_RATE_LIMIT_PER_HOUR || 20), standardHeaders: 'draft-7', legacyHeaders: false, message: jsonLimitMessage });
const publicLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, message: jsonLimitMessage });

// Start a fresh session id on login (prevents session fixation).
function regenerateSession(req) {
  return new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
}

function roundCoord(v) {
  return v == null ? null : Math.round(Number(v) * 100) / 100; // about 1 km: hides exact farm/home location
}
function validLatLng(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function (err, row) {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Knowledge base (RAG source for Ask Mkulima AI)
const kb = require('./lib/kb')({ run, get, all });

async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('buyer', 'seller', 'transporter')),
      location TEXT,
      business_type TEXT,
      speciality TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      commodity TEXT NOT NULL,
      grade TEXT,
      quantity_kg REAL NOT NULL,
      price_per_kg REAL NOT NULL,
      unit TEXT DEFAULT 'kg',
      location TEXT,
      description TEXT,
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'almost_out', 'paused', 'sold')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      route_name TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      vehicle TEXT,
      capacity_kg REAL,
      rate REAL NOT NULL,
      service_days TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  const existing = await get("SELECT COUNT(*) as c FROM users");
  if (!existing || existing.c === 0) {
    const hash = await bcrypt.hash('demo123', 10);
    await run(
      `INSERT INTO users (full_name, email, phone, password_hash, role, location, business_type, speciality)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Demo Seller', 'seller@mkulima.test', '+254700000001', hash, 'seller', 'Nairobi', 'Fresh produce seller', 'Tomatoes, onions and greens']
    );
  }

  // Ensure geolocation columns exist for users, listings and routes
  async function ensureColumn(table, column, def) {
    const info = await all(`PRAGMA table_info(${table})`);
    const exists = info.some(function(r){ return r.name === column });
    if (!exists) {
      await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    }
  }

  await ensureColumn('users', 'lat', 'REAL');
  await ensureColumn('users', 'lng', 'REAL');
  await ensureColumn('listings', 'lat', 'REAL');
  await ensureColumn('listings', 'lng', 'REAL');
  await ensureColumn('routes', 'pickup_lat', 'REAL');
  await ensureColumn('routes', 'pickup_lng', 'REAL');
  await ensureColumn('routes', 'dest_lat', 'REAL');
  await ensureColumn('routes', 'dest_lng', 'REAL');
  // Seeded demonstration rows are flagged so the UI can label them "Demo".
  await ensureColumn('users', 'is_demo', 'INTEGER DEFAULT 0');
  await ensureColumn('listings', 'is_demo', 'INTEGER DEFAULT 0');
  await ensureColumn('routes', 'is_demo', 'INTEGER DEFAULT 0');

  // Faster reads: write-ahead log and indexes for the common lookups.
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA synchronous = NORMAL');
  await run('PRAGMA foreign_keys = ON');
  await run('CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_listings_status_created ON listings(status, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_listings_commodity ON listings(commodity)');
  await run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
  await run('CREATE INDEX IF NOT EXISTS idx_routes_user ON routes(user_id)');

  await kb.init();
}

function haversineKm(a,b,c,d){
  var r=Math.PI/180;
  var x=Math.sin((c-a)*r/2), y=Math.sin((d-b)*r/2);
  var h=x*x+Math.cos(a*r)*Math.cos(c*r)*y*y; return 12742*Math.asin(Math.sqrt(h));
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Admin access required' });
}

function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

function parseFilters(req) {
  return {
    search: String(req.query.search || '').trim(),
    role: String(req.query.role || '').trim().toLowerCase(),
    status: String(req.query.status || '').trim().toLowerCase()
  };
}

function buildDynamicWhere(baseFields, term) {
  if (!term) return { sql: '', params: [] };
  const value = `%${term}%`;
  const clauses = baseFields.map(() => 'LOWER(?) LIKE LOWER(?)').join(' OR ');
  return {
    sql: `(${clauses})`,
    params: baseFields.flatMap(() => [value, value])
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Mkulima Market API is running' });
});

const ROLES = ['buyer', 'seller', 'transporter'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { fullName, email, phone, password, role } = req.body || {};
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Choose buyer, seller or transporter' });
    if (!EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: 'Enter a valid email address' });
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (String(fullName).length > 120 || String(phone || '').length > 30) return res.status(400).json({ error: 'Name or phone is too long' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await run(
      `INSERT INTO users (full_name, email, phone, password_hash, role, location, business_type, speciality)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [String(fullName).trim(), normalizedEmail, phone || '', passwordHash, role, null, null, null]
    );

    await regenerateSession(req);
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      fullName,
      email: normalizedEmail,
      phone: phone || '',
      role
    };

    res.status(201).json({ message: 'Account created', user: req.session.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [String(email).trim().toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await regenerateSession(req);
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      location: user.location,
      businessType: user.business_type,
      speciality: user.speciality
    };

    res.json({ message: 'Logged in', user: req.session.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

app.get('/api/session', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  res.json({ user: req.session.user });
});

app.get('/api/users/me', requireAuth, async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const [listingCount, routeCount] = await Promise.all([
      get("SELECT COUNT(*) AS c FROM listings WHERE user_id = ? AND status IN ('available', 'almost_out')", [user.id]),
      get('SELECT COUNT(*) AS c FROM routes WHERE user_id = ?', [user.id])
    ]);
    res.json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      location: user.location,
      businessType: user.business_type,
      speciality: user.speciality,
      activeListings: listingCount.c,
      routes: routeCount.c,
      // Orders, response rate and ratings are not tracked yet, so none are shown.
      orders: 0,
      responseRate: null,
      rating: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

app.get('/api/listings', requireAuth, async (req, res) => {
  try {
    const rows = await all(
      `SELECT * FROM listings WHERE user_id = ? ORDER BY created_at DESC`,
      [req.session.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

app.post('/api/listings', requireAuth, async (req, res) => {
  try {
    const { title, commodity, grade, quantityKg, pricePerKg, unit, location, description, status } = req.body || {};
    const lat = req.body?.lat ? Number(req.body.lat) : null;
    const lng = req.body?.lng ? Number(req.body.lng) : null;
    if (!title || !commodity || !quantityKg || !pricePerKg) {
      return res.status(400).json({ error: 'Invalid listing payload' });
    }
    if (!(Number(quantityKg) > 0) || !(Number(pricePerKg) > 0)) {
      return res.status(400).json({ error: 'Quantity and price must be greater than 0' });
    }
    if (status && !['available', 'almost_out', 'paused', 'sold'].includes(status)) {
      return res.status(400).json({ error: 'Invalid listing status' });
    }
    if (String(title).length > 120 || String(description || '').length > 2000) {
      return res.status(400).json({ error: 'Title or description is too long' });
    }
    if (lat !== null && lng !== null && !validLatLng(lat, lng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const row = await run(
      `INSERT INTO listings (user_id, title, commodity, grade, quantity_kg, price_per_kg, unit, location, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.userId, title, commodity, grade || '', Number(quantityKg), Number(pricePerKg), unit || 'kg', location || '', description || '', status || 'available']
    );
    if (lat !== null && lng !== null) {
      await run('UPDATE listings SET lat = ?, lng = ? WHERE id = ?', [lat, lng, row.id]);
    }
    clearPublicCache();
    res.status(201).json({ id: row.id, message: 'Listing created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

app.get('/api/routes', requireAuth, async (req, res) => {
  try {
    const rows = await all(
      `SELECT * FROM routes WHERE user_id = ? ORDER BY created_at DESC`,
      [req.session.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

app.post('/api/routes', requireAuth, async (req, res) => {
  try {
    const { routeName, origin, destination, vehicle, capacityKg, rate, serviceDays, description } = req.body || {};
    const pickupLat = req.body?.pickupLat ? Number(req.body.pickupLat) : null;
    const pickupLng = req.body?.pickupLng ? Number(req.body.pickupLng) : null;
    const destLat = req.body?.destLat ? Number(req.body.destLat) : null;
    const destLng = req.body?.destLng ? Number(req.body.destLng) : null;
    if (!routeName || !origin || !destination || !rate) {
      return res.status(400).json({ error: 'Missing route details' });
    }

    const row = await run(
      `INSERT INTO routes (user_id, route_name, origin, destination, vehicle, capacity_kg, rate, service_days, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.userId, routeName, origin, destination, vehicle || '', Number(capacityKg) || 0, Number(rate), serviceDays || '', description || '']
    );
    if (pickupLat !== null && pickupLng !== null && destLat !== null && destLng !== null) {
      await run('UPDATE routes SET pickup_lat = ?, pickup_lng = ?, dest_lat = ?, dest_lng = ? WHERE id = ?', [pickupLat, pickupLng, destLat, destLng, row.id]);
    }
    clearPublicCache();
    res.status(201).json({ id: row.id, message: 'Route created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create route' });
  }
});

app.get('/api/admin/session', (req, res) => {
  res.json({
    isAdmin: !!(req.session && req.session.isAdmin),
    email: req.session && req.session.adminEmail ? req.session.adminEmail : null
  });
});

app.get('/api/admin/overview', requireAdmin, async (req, res) => {
  try {
    const { search, role, status } = parseFilters(req);

    const userWhere = [];
    const userParams = [];
    if (role) {
      userWhere.push('role = ?');
      userParams.push(role);
    }
    if (search) {
      userWhere.push('(LOWER(full_name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR LOWER(phone) LIKE LOWER(?) OR LOWER(location) LIKE LOWER(?))');
      userParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const userWhereSql = userWhere.length ? ` WHERE ${userWhere.join(' AND ')}` : '';

    const [users, sellers, transporters, listings, routes, roleBreakdown, listingStatusBreakdown] = await Promise.all([
      get(`SELECT COUNT(*) AS total FROM users${userWhereSql}`, userParams),
      get(`SELECT COUNT(*) AS total FROM users WHERE role = 'seller'${search ? ` AND (LOWER(full_name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR LOWER(phone) LIKE LOWER(?) OR LOWER(location) LIKE LOWER(?))` : ''}`,
        search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []),
      get(`SELECT COUNT(*) AS total FROM users WHERE role = 'transporter'${search ? ` AND (LOWER(full_name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR LOWER(phone) LIKE LOWER(?) OR LOWER(location) LIKE LOWER(?))` : ''}`,
        search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []),
      get(`SELECT COUNT(*) AS total FROM listings${status ? ' WHERE status = ?' : ''}`, status ? [status] : []),
      get('SELECT COUNT(*) AS total FROM routes'),
      all(`SELECT role, COUNT(*) AS total FROM users${userWhereSql} GROUP BY role ORDER BY total DESC`, userParams),
      all(`SELECT status, COUNT(*) AS total FROM listings${status ? ' WHERE status = ?' : ''} GROUP BY status ORDER BY total DESC`, status ? [status] : [])
    ]);

    const listingWhere = [];
    const listingParams = [];
    if (status) {
      listingWhere.push('l.status = ?');
      listingParams.push(status);
    }
    if (search) {
      listingWhere.push('(LOWER(l.title) LIKE LOWER(?) OR LOWER(l.commodity) LIKE LOWER(?) OR LOWER(u.full_name) LIKE LOWER(?))');
      listingParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const recentListings = await all(
      `SELECT l.id, l.title, l.commodity, l.price_per_kg, l.status, l.created_at, u.full_name AS seller_name
       FROM listings l JOIN users u ON u.id = l.user_id${listingWhere.length ? ` WHERE ${listingWhere.join(' AND ')}` : ''}
       ORDER BY l.created_at DESC LIMIT 8`,
      listingParams
    );

    const routeWhere = [];
    const routeParams = [];
    if (search) {
      routeWhere.push('(LOWER(r.route_name) LIKE LOWER(?) OR LOWER(r.origin) LIKE LOWER(?) OR LOWER(r.destination) LIKE LOWER(?) OR LOWER(u.full_name) LIKE LOWER(?))');
      routeParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const recentRoutes = await all(
      `SELECT r.id, r.route_name, r.origin, r.destination, r.rate, r.created_at, u.full_name AS transporter_name
       FROM routes r JOIN users u ON u.id = r.user_id${routeWhere.length ? ` WHERE ${routeWhere.join(' AND ')}` : ''}
       ORDER BY r.created_at DESC LIMIT 8`,
      routeParams
    );

    const recentUsers = await all(
      `SELECT id, full_name, email, phone, role, created_at FROM users${userWhereSql} ORDER BY created_at DESC LIMIT 8`,
      userParams
    );

    res.json({
      summary: {
        users: Number(users.total || 0),
        sellers: Number(sellers.total || 0),
        transporters: Number(transporters.total || 0),
        listings: Number(listings.total || 0),
        routes: Number(routes.total || 0)
      },
      roleBreakdown,
      listingStatusBreakdown,
      recentUsers,
      recentListings,
      recentRoutes,
      filters: { search, role, status },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load admin overview' });
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { search, role } = parseFilters(req);
    let sql = 'SELECT id, full_name, email, phone, role, location, business_type, created_at FROM users';
    const params = [];
    const conditions = [];

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }
    if (search) {
      conditions.push('(LOWER(full_name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR LOWER(phone) LIKE LOWER(?) OR LOWER(location) LIKE LOWER(?))');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ' ORDER BY created_at DESC';

    const rows = await all(sql, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/admin/listings', requireAdmin, async (req, res) => {
  try {
    const { search, status } = parseFilters(req);
    let sql = 'SELECT l.*, u.full_name AS seller_name FROM listings l JOIN users u ON u.id = l.user_id';
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('l.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(LOWER(l.title) LIKE LOWER(?) OR LOWER(l.commodity) LIKE LOWER(?) OR LOWER(u.full_name) LIKE LOWER(?) OR LOWER(l.location) LIKE LOWER(?))');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ' ORDER BY l.created_at DESC';

    const rows = await all(sql, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

app.get('/api/admin/routes', requireAdmin, async (req, res) => {
  try {
    const { search } = parseFilters(req);
    let sql = 'SELECT r.*, u.full_name AS transporter_name FROM routes r JOIN users u ON u.id = r.user_id';
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(LOWER(r.route_name) LIKE LOWER(?) OR LOWER(r.origin) LIKE LOWER(?) OR LOWER(r.destination) LIKE LOWER(?) OR LOWER(u.full_name) LIKE LOWER(?))');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ' ORDER BY r.created_at DESC';

    const rows = await all(sql, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// Save user's current geolocation (private)
app.post('/api/users/location', requireAuth, async (req, res) => {
  try {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const name = String(req.body?.name || '');
    if (!validLatLng(lat, lng)) return res.status(400).json({ error: 'lat and lng required' });
    await run('UPDATE users SET lat = ?, lng = ?, location = ? WHERE id = ?', [lat, lng, name.slice(0, 80), req.session.userId]);
    clearPublicCache();
    res.json({ ok: true, message: 'Location saved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

// Public nearby sellers endpoint (straight-line distance)
// Contact details and exact coordinates are never returned here.
async function findNearbySellers(lat, lng, radiusKm) {
  const key = `nearby:${roundCoord(lat)}:${roundCoord(lng)}:${radiusKm}`;
  return cached(key, 60 * 1000, async () => {
    const rows = await all("SELECT id, full_name, location, lat, lng FROM users WHERE role = 'seller' AND lat IS NOT NULL AND lng IS NOT NULL");
    return rows.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      location: r.location,
      lat: roundCoord(r.lat),
      lng: roundCoord(r.lng),
      location_precision: 'approximate (about 1 km)',
      distance_km: Math.round(haversineKm(lat, lng, r.lat, r.lng)),
      distance_type: 'straight-line'
    })).filter((r) => r.distance_km <= radiusKm).sort((a, b) => a.distance_km - b.distance_km);
  });
}

// Public marketplace search: available listings only, no seller contact details.
async function searchListings({ q = '', commodity = '', minQty = 0, maxPrice = 0, near = null, radiusKm = 0, limit = 30 }) {
  const key = `listings:${q}:${commodity}:${minQty}:${maxPrice}:${near ? roundCoord(near.lat) + ',' + roundCoord(near.lng) : ''}:${radiusKm}:${limit}`;
  return cached(key, 60 * 1000, async () => {
    const where = ["l.status IN ('available', 'almost_out')"];
    const params = [];
    const term = String(q || commodity).trim().toLowerCase().replace(/e?s$/, '');
    if (term) {
      where.push('(LOWER(l.commodity) LIKE ? OR LOWER(l.title) LIKE ?)');
      params.push(`%${term}%`, `%${term}%`);
    }
    if (minQty > 0) { where.push('l.quantity_kg >= ?'); params.push(minQty); }
    if (maxPrice > 0) { where.push('l.price_per_kg <= ?'); params.push(maxPrice); }
    const rows = await all(
      `SELECT l.id, l.title, l.commodity, l.grade, l.quantity_kg, l.price_per_kg, l.unit, l.location, l.status, l.created_at,
              COALESCE(l.lat, u.lat) AS lat, COALESCE(l.lng, u.lng) AS lng, u.full_name AS seller_name, l.is_demo
       FROM listings l JOIN users u ON u.id = l.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY l.created_at DESC LIMIT 200`,
      params
    );
    let out = rows.map((r) => {
      const d = near && r.lat != null && r.lng != null ? haversineKm(near.lat, near.lng, r.lat, r.lng) : null;
      return {
        id: r.id,
        title: r.title,
        commodity: r.commodity,
        grade: r.grade || null,
        quantity_kg: r.quantity_kg,
        price_per_kg: r.price_per_kg,
        price_type: 'asking',
        unit: r.unit,
        area: r.location || null,
        status: r.status,
        seller_name: r.seller_name,
        listed_on: r.created_at,
        is_demo: !!r.is_demo,
        lat: roundCoord(r.lat),
        lng: roundCoord(r.lng),
        distance_km: d == null ? null : Math.round(d),
        distance_type: d == null ? null : 'straight-line'
      };
    });
    if (near && radiusKm > 0) out = out.filter((r) => r.distance_km != null && r.distance_km <= radiusKm);
    if (near) out.sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
    return out.slice(0, Math.min(limit, 100));
  });
}

// Real platform counts for the landing page (cached for a minute).
app.get('/api/stats', publicLimiter, async (req, res) => {
  try {
    const stats = await cached('stats', 60 * 1000, async () => {
      const [l, s, t, r, c] = await Promise.all([
        get("SELECT COUNT(*) AS c FROM listings WHERE status IN ('available', 'almost_out')"),
        get("SELECT COUNT(*) AS c FROM users WHERE role = 'seller'"),
        get("SELECT COUNT(*) AS c FROM users WHERE role = 'transporter'"),
        get('SELECT COUNT(*) AS c FROM routes'),
        get("SELECT COUNT(DISTINCT LOWER(commodity)) AS c FROM listings WHERE status IN ('available', 'almost_out')")
      ]);
      return { activeListings: l.c, sellers: s.c, transporters: t.c, routes: r.c, commodities: c.c };
    });
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(stats);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load stats' }); }
});

app.get('/api/marketplace/listings', publicLimiter, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const near = validLatLng(lat, lng) ? { lat, lng } : null;
    const listings = await searchListings({
      q: String(req.query.q || '').slice(0, 60),
      minQty: Number(req.query.minQty) || 0,
      maxPrice: Number(req.query.maxPrice) || 0,
      near,
      radiusKm: Number(req.query.radiusKm) || 0,
      limit: Number(req.query.limit) || 30
    });
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ listings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

app.get('/api/nearby/sellers', publicLimiter, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Math.min(Math.max(Number(req.query.radiusKm || 20), 1), 500);
    if (!validLatLng(lat, lng)) return res.status(400).json({ error: 'lat and lng required' });
    const sellers = await findNearbySellers(lat, lng, radiusKm);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ sellers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch nearby sellers' });
  }
});

// Quote request: find matching transporter routes and estimate cost by straight-line distance * route rate
app.post('/api/quote', publicLimiter, async (req, res) => {
  try {
    const pickup = req.body?.pickup; // { lat,lng }
    const dest = req.body?.destination; // { lat,lng }
    const loadKg = Number(req.body?.loadKg || 0);
    if (!pickup || !dest || !(pickup.lat && pickup.lng && dest.lat && dest.lng)) return res.status(400).json({ error: 'pickup and destination coords required' });
    if (!(loadKg > 0)) return res.status(400).json({ error: 'loadKg required' });

    const distanceKm = haversineKm(pickup.lat, pickup.lng, dest.lat, dest.lng);

    // find candidate routes whose capacity >= loadKg or capacity is 0 (unspecified)
    const rows = await all(`SELECT r.id AS route_id, r.user_id, r.route_name, r.capacity_kg, r.rate, u.full_name, u.lat AS user_lat, u.lng AS user_lng FROM routes r JOIN users u ON u.id = r.user_id WHERE (r.capacity_kg IS NULL OR r.capacity_kg = 0 OR r.capacity_kg >= ?)`, [loadKg]);
    const candidates = rows.map(function(r){
      // compute distance from pickup to transporter base (if known)
      const baseDist = (r.user_lat && r.user_lng) ? haversineKm(pickup.lat, pickup.lng, r.user_lat, r.user_lng) : Infinity;
      const indicative = Number(r.rate || 0) * distanceKm;
      return {
        route_id: r.route_id,
        transporter_id: r.user_id,
        transporter_name: r.full_name,
        route_name: r.route_name,
        capacity_kg: r.capacity_kg,
        rate_per_km: r.rate,
        base_distance_km: Math.round(baseDist),
        // Not a quote: the transporter's own per-km rate x straight-line distance. Road distance is longer.
        indicative_cost: Math.round(indicative),
        cost_basis: 'Indicative only: transporter per-km rate x straight-line distance. Ask the transporter for a real quote.'
      };
    }).filter(function(r){ return r.base_distance_km <= 100 }); // only transporters within 100km of pickup
    candidates.sort(function(a,b){ return a.indicative_cost - b.indicative_cost });
    res.json({ distance_km: Math.round(distanceKm), distance_type: 'straight-line', candidates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to compute quotes' });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    await run('DELETE FROM routes WHERE user_id = ?', [userId]);
    await run('DELETE FROM listings WHERE user_id = ?', [userId]);
    const result = await run('DELETE FROM users WHERE id = ?', [userId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    clearPublicCache();
    res.json({ ok: true, message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.delete('/api/admin/listings/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid listing id' });
    }

    const result = await run('DELETE FROM listings WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    clearPublicCache();
    res.json({ ok: true, message: 'Listing deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

app.put('/api/admin/listings/:id/status', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!id || !['available', 'almost_out', 'paused', 'sold'].includes(status)) {
      return res.status(400).json({ error: 'Invalid listing status' });
    }

    const result = await run('UPDATE listings SET status = ? WHERE id = ?', [status, id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    clearPublicCache();
    res.json({ ok: true, message: 'Listing status updated', status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update listing status' });
  }
});

app.delete('/api/admin/routes/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid route id' });
    }

    const result = await run('DELETE FROM routes WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    clearPublicCache();
    res.json({ ok: true, message: 'Route deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

app.post('/api/admin/login', authLimiter, async (req, res) => {
  if (!ADMIN_ENABLED) return res.status(503).json({ error: 'Admin login is not configured on this server' });
  const { email, password } = req.body || {};
  const emailOk = safeEqual(String(email || '').trim().toLowerCase(), ADMIN_EMAIL);
  const passOk = safeEqual(String(password || ''), ADMIN_PASSWORD);
  if (emailOk && passOk) {
    await regenerateSession(req);
    req.session.isAdmin = true;
    req.session.adminEmail = ADMIN_EMAIL;
    return res.json({ ok: true, message: 'Admin login successful' });
  }
  return res.status(401).json({ error: 'Invalid admin credentials' });
});

// ---- Ask Mkulima AI (Gemini, server side; the key never reaches the browser) ----
require('./lib/ai')(app, { aiLimiter, cached, searchListings, findNearbySellers, validLatLng, roundCoord, requireAuth, kb, GEMINI_API_KEY, GEMINI_MODEL });

// ---- Full CRUD for listings, routes, profile/account, admin users; knowledge base CRUD ----
require('./lib/crud')(app, { run, get, all, bcrypt, requireAuth, requireAdmin, publicLimiter, authLimiter, clearPublicCache, validLatLng, roundCoord });
kb.registerRoutes(app, { requireAdmin, publicLimiter });

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true, message: 'Admin logged out' }));
});

// The admin page uses inline scripts, so it gets its own, looser policy. Never cached.
function sendAdmin(req, res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'");
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'admin.html'));
}
app.get(['/admin', '/admin/', '/admin-control', '/admin-control/'], sendAdmin);

// Unknown API routes return JSON 404 instead of the app shell.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Anything that looks like a file and was not matched above is a 404,
// so requests like /mkulima.db, /server.js or /.env never reach the disk.
app.get(/\.[a-z0-9]+$/i, (req, res) => res.status(404).send('Not found'));

// App shell for every other path (hash routing happens in the browser).
app.get(/^(.*)$/, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.type('html').send(renderTemplate('index.html'));
});

async function start() {
  await initDatabase();
  // `node server.js --seed` (npm run seed) adds demo users, listings and routes, then exits.
  if (process.argv.includes('--seed') || process.argv.includes('--seed-reset')) {
    await require('./lib/seed')({ run, get, all, bcrypt }, { reset: process.argv.includes('--seed-reset') });
    db.close();
    return;
  }
  app.listen(PORT, () => {
    console.log(`Mkulima Market running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});
