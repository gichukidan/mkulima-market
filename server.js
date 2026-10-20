const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'mkulima.db');
const db = new sqlite3.Database(DB_PATH);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(session({
  secret: 'mkulima-market-demo-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

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

const ADMIN_KEY = process.env.ADMIN_KEY || 'mkulima-admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mkulima.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function requireAdmin(req, res, next) {
  const headerKey = req.headers['x-admin-key'] || req.query.key;
  const sessionAdmin = req.session && req.session.isAdmin;

  if (sessionAdmin) return next();
  if (headerKey === ADMIN_KEY) {
    req.session.isAdmin = true;
    req.session.adminEmail = ADMIN_EMAIL;
    return next();
  }

  return res.status(401).json({ error: 'Admin access required' });
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

app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, role } = req.body || {};
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await run(
      `INSERT INTO users (full_name, email, phone, password_hash, role, location, business_type, speciality)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        normalizedEmail,
        phone || '',
        passwordHash,
        role,
        role === 'seller' ? 'Nairobi' : role === 'transporter' ? 'Nakuru' : 'Kisumu',
        role === 'seller' ? 'Fresh produce seller' : role === 'transporter' ? 'Route logistics' : 'Wholesale buyer',
        role === 'seller' ? 'Tomatoes, onions and greens' : role === 'transporter' ? 'Farm-to-market transport' : 'Vegetables and grains'
      ]
    );

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

app.post('/api/login', async (req, res) => {
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
    res.json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      location: user.location,
      businessType: user.business_type,
      speciality: user.speciality,
      activeListings: user.role === 'seller' ? 12 : 8,
      orders: user.role === 'seller' ? 48 : 76,
      responseRate: user.role === 'seller' ? 94 : 96,
      rating: 4.9
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

    const row = await run(
      `INSERT INTO listings (user_id, title, commodity, grade, quantity_kg, price_per_kg, unit, location, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.userId, title, commodity, grade || '', Number(quantityKg), Number(pricePerKg), unit || 'kg', location || '', description || '', status || 'available']
    );
    if (lat !== null && lng !== null) {
      await run('UPDATE listings SET lat = ?, lng = ? WHERE id = ?', [lat, lng, row.id]);
    }
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
      `SELECT l.title, l.commodity, l.price_per_kg, l.status, l.created_at, u.full_name AS seller_name
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
      `SELECT r.route_name, r.origin, r.destination, r.rate, r.created_at, u.full_name AS transporter_name
       FROM routes r JOIN users u ON u.id = r.user_id${routeWhere.length ? ` WHERE ${routeWhere.join(' AND ')}` : ''}
       ORDER BY r.created_at DESC LIMIT 8`,
      routeParams
    );

    const recentUsers = await all(
      `SELECT full_name, email, password_hash, role, created_at FROM users${userWhereSql} ORDER BY created_at DESC LIMIT 8`,
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
    let sql = 'SELECT id, full_name, email, phone, role, location, business_type, password_hash, created_at FROM users';
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
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    await run('UPDATE users SET lat = ?, lng = ?, location = ? WHERE id = ?', [lat, lng, name || '', req.session.userId]);
    res.json({ ok: true, message: 'Location saved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

// Public nearby sellers endpoint (straight-line distance)
app.get('/api/nearby/sellers', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm || 20);
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    const rows = await all("SELECT id, full_name, email, phone, role, location, lat, lng FROM users WHERE role = 'seller' AND lat IS NOT NULL AND lng IS NOT NULL");
    const sellers = rows.map(function(r){
      const d = (r.lat && r.lng) ? haversineKm(lat, lng, r.lat, r.lng) : null;
      return Object.assign({}, r, { distance_km: d });
    }).filter(function(r){ return r.distance_km !== null && r.distance_km <= radiusKm }).sort(function(a,b){return a.distance_km - b.distance_km});
    res.json({ sellers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch nearby sellers' });
  }
});

// Quote request: find matching transporter routes and estimate cost by straight-line distance * route rate
app.post('/api/quote', async (req, res) => {
  try {
    const pickup = req.body?.pickup; // { lat,lng }
    const dest = req.body?.destination; // { lat,lng }
    const loadKg = Number(req.body?.loadKg || 0);
    if (!pickup || !dest || !(pickup.lat && pickup.lng && dest.lat && dest.lng)) return res.status(400).json({ error: 'pickup and destination coords required' });
    if (!(loadKg > 0)) return res.status(400).json({ error: 'loadKg required' });

    const distanceKm = haversineKm(pickup.lat, pickup.lng, dest.lat, dest.lng);

    // find candidate routes whose capacity >= loadKg or capacity is 0 (unspecified)
    const rows = await all(`SELECT r.id AS route_id, r.user_id, r.route_name, r.capacity_kg, r.rate, u.full_name, u.email, u.lat AS user_lat, u.lng AS user_lng FROM routes r JOIN users u ON u.id = r.user_id WHERE (r.capacity_kg IS NULL OR r.capacity_kg = 0 OR r.capacity_kg >= ?)`, [loadKg]);
    const candidates = rows.map(function(r){
      // compute distance from pickup to transporter base (if known)
      const baseDist = (r.user_lat && r.user_lng) ? haversineKm(pickup.lat, pickup.lng, r.user_lat, r.user_lng) : Infinity;
      const estCost = Number(r.rate || 0) * distanceKm;
      return Object.assign({}, r, { base_distance_km: baseDist, distance_km: distanceKm, estimated_cost: Math.round(estCost) });
    }).filter(function(r){ return r.base_distance_km <= 100 }); // only transporters within 100km of pickup
    candidates.sort(function(a,b){ return a.estimated_cost - b.estimated_cost });
    res.json({ distance_km: distanceKm, candidates });
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

    res.json({ ok: true, message: 'Route deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    req.session.adminEmail = email;
    return res.json({ ok: true, message: 'Admin login successful' });
  }
  return res.status(401).json({ error: 'Invalid admin credentials' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true, message: 'Admin logged out' }));
});

app.get('/admin-control', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin-control/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get(/^(.*)$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Mkulima Market running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});
