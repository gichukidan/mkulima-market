/* Community, trust and activity features: listing photos, views and thumbs, follows, star ratings,
   notifications, the blue badge (renews every 6 months), adverts and sponsored listings,
   transport quote requests, dashboard statistics, market insights, map data and admin tools.
   Every number returned here is computed from the database; nothing is invented. */
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const BADGE_PRICE = 2000;        // KSh, per period
const BADGE_MONTHS = 6;          // the blue badge must be renewed every 6 months
const BADGE_WARN_DAYS = 30;      // show "renew soon" this many days before it ends
const PLANS = {                  // photo limits match the pricing section on the landing page (unlimited is capped at 30)
  free: { label: 'Free', images: 5 },
  biashara: { label: 'Biashara', images: 15 },
  agribusiness: { label: 'Agribusiness', images: 30 }
};
const IMAGE_MAX_BYTES = 1024 * 1024;
const ADVERT_KINDS = ['advert', 'sponsored'];

function today() { return new Date().toISOString().slice(0, 10); }
function addMonths(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + n);
  if (d.getUTCDate() !== day) d.setUTCDate(0); // 31 Aug + 6 months -> end of Feb, not March
  return d.toISOString().slice(0, 10);
}
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5); }
function str(v, max) { const s = v == null ? '' : String(v).trim(); return s.length > max ? null : s; }
function planOf(user) { return PLANS[user && user.plan] ? user.plan : 'free'; }
function imageLimit(user) { return PLANS[planOf(user)].images; }
function badgeActive(user) { return !!(user && user.badge_until && user.badge_until >= today()); }

function sniffImage(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}
function parseDataUrl(s) {
  const m = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(s || ''));
  if (!m) return null;
  const buf = Buffer.from(m[1], 'base64');
  if (!buf.length || buf.length > IMAGE_MAX_BYTES) return null;
  const mime = sniffImage(buf);
  return mime ? { buf, mime } : null;
}

module.exports = function registerFeatures(app, deps) {
  const { run, get, all, requireAuth, requireAdmin, publicLimiter, clearPublicCache, roundCoord, validLatLng } = deps;
  const writeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 90, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests. Please wait a minute and try again.' } });

  /* ---------------- schema ---------------- */
  async function ensureColumn(table, column, def) {
    const info = await all(`PRAGMA table_info(${table})`);
    if (!info.some((r) => r.name === column)) await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
  async function init() {
    await ensureColumn('users', 'plan', "TEXT DEFAULT 'free'");
    await ensureColumn('users', 'badge_until', 'TEXT');
    await ensureColumn('users', 'sold_count', 'INTEGER DEFAULT 0');

    await run(`CREATE TABLE IF NOT EXISTS listing_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      mime TEXT NOT NULL,
      data BLOB NOT NULL,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE)`);
    await run(`CREATE TABLE IF NOT EXISTS listing_views (
      listing_id INTEGER NOT NULL,
      viewer_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (listing_id, viewer_key),
      FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE)`);
    await run(`CREATE TABLE IF NOT EXISTS listing_votes (
      listing_id INTEGER NOT NULL,
      viewer_key TEXT NOT NULL,
      vote INTEGER NOT NULL CHECK(vote IN (1, -1)),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (listing_id, viewer_key),
      FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE)`);
    await run(`CREATE TABLE IF NOT EXISTS follows (
      follower_id INTEGER NOT NULL,
      followee_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_id, followee_id),
      FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(followee_id) REFERENCES users(id) ON DELETE CASCADE)`);
    await run(`CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rater_id INTEGER NOT NULL,
      ratee_id INTEGER NOT NULL,
      stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (rater_id, ratee_id),
      FOREIGN KEY(rater_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(ratee_id) REFERENCES users(id) ON DELETE CASCADE)`);
    await run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      data TEXT,
      link TEXT,
      group_key TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);
    await run(`CREATE TABLE IF NOT EXISTS badge_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'rejected')),
      amount INTEGER NOT NULL,
      payment_ref TEXT,
      note TEXT,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      decided_at DATETIME,
      period_end TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);
    await run(`CREATE TABLE IF NOT EXISTS adverts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('advert', 'sponsored')),
      title TEXT NOT NULL,
      body TEXT,
      link_url TEXT,
      listing_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'rejected', 'ended')),
      starts_at TEXT,
      ends_at TEXT,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      admin_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE SET NULL)`);
    await run(`CREATE TABLE IF NOT EXISTS quote_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      route_id INTEGER,
      transporter_id INTEGER NOT NULL,
      load_kg REAL NOT NULL,
      pickup TEXT,
      destination TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(transporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(route_id) REFERENCES routes(id) ON DELETE SET NULL)`);
    await run('CREATE INDEX IF NOT EXISTS idx_images_listing ON listing_images(listing_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_views_created ON listing_views(created_at)');
    await run('CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read, id)');
    await run('CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_ratings_ratee ON ratings(ratee_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_adverts_status ON adverts(status, kind)');
    await run('CREATE INDEX IF NOT EXISTS idx_quotes_transporter ON quote_requests(transporter_id, status)');
  }

  /* ---------------- helpers ---------------- */
  function viewerKey(req) {
    if (req.session.userId) return 'u' + req.session.userId;
    if (!req.session.vk) req.session.vk = crypto.randomBytes(12).toString('hex');
    return 's' + req.session.vk;
  }

  // Add an in-app notification. With `group`, repeated activity (e.g. many views) updates one unread entry.
  async function notify(userId, type, data, link, group) {
    if (!userId) return;
    data = data || {};
    if (group) {
      const ex = await get('SELECT id, data FROM notifications WHERE user_id = ? AND type = ? AND group_key = ? AND is_read = 0 ORDER BY id DESC LIMIT 1', [userId, type, group]);
      if (ex) {
        let d = {}; try { d = JSON.parse(ex.data || '{}'); } catch (e) { /* ignore */ }
        d.count = (d.count || 1) + 1;
        await run('UPDATE notifications SET data = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(d), ex.id]);
        return;
      }
    }
    await run('INSERT INTO notifications (user_id, type, data, link, group_key) VALUES (?, ?, ?, ?, ?)', [userId, type, JSON.stringify(data), link || '', group || null]);
  }

  async function ratingOf(userId) {
    const r = await get('SELECT AVG(stars) AS avg, COUNT(*) AS n FROM ratings WHERE ratee_id = ?', [userId]);
    return { avg: r && r.n ? Math.round(r.avg * 10) / 10 : null, count: r ? r.n : 0 };
  }

  function selfUser(u) {
    return {
      id: u.id, fullName: u.full_name, email: u.email, phone: u.phone, role: u.role, location: u.location,
      businessType: u.business_type, speciality: u.speciality, plan: planOf(u), imageLimit: imageLimit(u),
      badge: { active: badgeActive(u), until: u.badge_until || null }, createdAt: u.created_at
    };
  }

  // Lazy badge notices: "ending soon" and "ended" are each sent once per badge period.
  async function badgeNotices(u) {
    if (!u.badge_until) return;
    const days = daysBetween(today(), u.badge_until);
    const type = days < 0 ? 'badge_expired' : days <= BADGE_WARN_DAYS ? 'badge_expiring' : null;
    if (!type) return;
    const seen = await get('SELECT id FROM notifications WHERE user_id = ? AND type = ? AND group_key = ?', [u.id, type, 'badge:' + u.badge_until]);
    if (!seen) {
      await run('INSERT INTO notifications (user_id, type, data, link, group_key) VALUES (?, ?, ?, ?, ?)',
        [u.id, type, JSON.stringify({ until: u.badge_until, days: Math.max(days, 0) }), '#/dashboard', 'badge:' + u.badge_until]);
    }
  }

  async function badgeState(u) {
    const last = await get('SELECT * FROM badge_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1', [u.id]);
    const until = u.badge_until || null;
    const days = until ? daysBetween(today(), until) : null;
    let status = 'none';
    if (last && last.status === 'pending') status = 'pending';
    else if (until && days >= 0) status = days <= BADGE_WARN_DAYS ? 'expiring' : 'active';
    else if (until) status = 'expired';
    else if (last && last.status === 'rejected') status = 'rejected';
    return {
      price: BADGE_PRICE, periodMonths: BADGE_MONTHS, status, until, daysLeft: days,
      canRequest: status !== 'pending' && status !== 'active',
      request: last ? { id: last.id, status: last.status, requestedAt: last.requested_at, paymentRef: last.payment_ref, note: last.note } : null
    };
  }

  // Counts shown with a listing. `key` marks which vote is the current viewer's.
  async function listingExtras(id, key) {
    const [c, imgs, mine, sp] = await Promise.all([
      get(`SELECT (SELECT COUNT(*) FROM listing_views WHERE listing_id = ?) AS views,
                  (SELECT COUNT(*) FROM listing_votes WHERE listing_id = ? AND vote = 1) AS likes,
                  (SELECT COUNT(*) FROM listing_votes WHERE listing_id = ? AND vote = -1) AS dislikes`, [id, id, id]),
      all('SELECT id FROM listing_images WHERE listing_id = ? ORDER BY position, id', [id]),
      key ? get('SELECT vote FROM listing_votes WHERE listing_id = ? AND viewer_key = ?', [id, key]) : null,
      get("SELECT 1 AS x FROM adverts WHERE listing_id = ? AND kind = 'sponsored' AND status = 'active' AND (ends_at IS NULL OR ends_at >= date('now'))", [id])
    ]);
    return { views: c.views, likes: c.likes, dislikes: c.dislikes, images: imgs.map((r) => r.id), my_vote: mine ? mine.vote : 0, sponsored: !!sp };
  }

  // "Sold out" removes the listing. Photos, views and votes go with it (cascade); the seller keeps a sold count.
  async function sellListing(row) {
    await run('DELETE FROM listings WHERE id = ?', [row.id]);
    await run('UPDATE users SET sold_count = COALESCE(sold_count, 0) + 1 WHERE id = ?', [row.user_id]);
    await notify(row.user_id, 'listing_sold', { title: row.title }, '#/dashboard');
    clearPublicCache();
  }

  const helpers = { init, notify, ratingOf, selfUser, badgeNotices, badgeState, listingExtras, sellListing, viewerKey, planOf, imageLimit, badgeActive, PLANS, BADGE_PRICE, BADGE_MONTHS };

  /* ---------------- listing photos ---------------- */
  app.get('/api/listing-images/:id', publicLimiter, async (req, res) => {
    try {
      const row = await get('SELECT mime, data FROM listing_images WHERE id = ?', [Number(req.params.id)]);
      if (!row) return res.status(404).json({ error: 'Image not found' });
      res.setHeader('Content-Type', row.mime);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // a photo never changes under the same id
      res.end(row.data);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load image' }); }
  });

  async function ownListingRow(req, res) {
    const row = await get('SELECT * FROM listings WHERE id = ?', [Number(req.params.id)]);
    if (!row) { res.status(404).json({ error: 'Listing not found' }); return null; }
    if (row.user_id !== req.session.userId) { res.status(403).json({ error: 'You can only change your own listings' }); return null; }
    return row;
  }

  app.post('/api/listings/:id/images', requireAuth, writeLimiter, async (req, res) => {
    try {
      const row = await ownListingRow(req, res); if (!row) return;
      const me = await get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
      const incoming = Array.isArray(req.body && req.body.images) ? req.body.images : [];
      if (!incoming.length) return res.status(400).json({ error: 'No photos sent' });
      const have = (await get('SELECT COUNT(*) AS c FROM listing_images WHERE listing_id = ?', [row.id])).c;
      const limit = imageLimit(me);
      if (have + incoming.length > limit) {
        return res.status(403).json({ error: `Your ${PLANS[planOf(me)].label} plan allows ${limit} photos per listing (you have ${have}).`, limit, have });
      }
      const parsed = incoming.map(parseDataUrl);
      if (parsed.some((p) => !p)) return res.status(400).json({ error: 'Each photo must be a JPEG, PNG or WebP under 1 MB.' });
      const ids = [];
      for (let i = 0; i < parsed.length; i++) {
        const r = await run('INSERT INTO listing_images (listing_id, mime, data, position) VALUES (?, ?, ?, ?)', [row.id, parsed[i].mime, parsed[i].buf, have + i]);
        ids.push(r.id);
      }
      clearPublicCache();
      res.status(201).json({ ok: true, ids, limit, total: have + ids.length });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save photos' }); }
  });

  app.delete('/api/listings/:id/images/:imageId', requireAuth, async (req, res) => {
    try {
      const row = await ownListingRow(req, res); if (!row) return;
      const r = await run('DELETE FROM listing_images WHERE id = ? AND listing_id = ?', [Number(req.params.imageId), row.id]);
      if (!r.changes) return res.status(404).json({ error: 'Photo not found' });
      clearPublicCache();
      res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to remove photo' }); }
  });

  /* ---------------- views and thumbs ---------------- */
  async function activeListing(id) {
    return get("SELECT id, user_id, title, status FROM listings WHERE id = ? AND status IN ('available', 'almost_out')", [Number(id)]);
  }

  app.post('/api/listings/:id/view', publicLimiter, async (req, res) => {
    try {
      const l = await activeListing(req.params.id);
      if (!l) return res.status(404).json({ error: 'Listing not found' });
      if (req.session.userId !== l.user_id) {
        const r = await run('INSERT OR IGNORE INTO listing_views (listing_id, viewer_key) VALUES (?, ?)', [l.id, viewerKey(req)]);
        if (r.changes) await notify(l.user_id, 'listing_view', { listingId: l.id, title: l.title, count: 1 }, '#/listing/' + l.id, 'view:' + l.id);
      }
      const c = await get('SELECT COUNT(*) AS c FROM listing_views WHERE listing_id = ?', [l.id]);
      res.json({ views: c.c });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to record view' }); }
  });

  // vote: 1 = thumbs up, -1 = thumbs down, 0 = remove my vote. Sending the same vote again removes it.
  app.post('/api/listings/:id/vote', publicLimiter, async (req, res) => {
    try {
      const l = await activeListing(req.params.id);
      if (!l) return res.status(404).json({ error: 'Listing not found' });
      if (req.session.userId === l.user_id) return res.status(403).json({ error: 'You cannot vote on your own listing' });
      let vote = Number(req.body && req.body.vote);
      if (![1, -1, 0].includes(vote)) return res.status(400).json({ error: 'vote must be 1, -1 or 0' });
      const key = viewerKey(req);
      const prev = await get('SELECT vote FROM listing_votes WHERE listing_id = ? AND viewer_key = ?', [l.id, key]);
      if (prev && prev.vote === vote) vote = 0;
      if (vote === 0) await run('DELETE FROM listing_votes WHERE listing_id = ? AND viewer_key = ?', [l.id, key]);
      else {
        await run('INSERT INTO listing_votes (listing_id, viewer_key, vote) VALUES (?, ?, ?) ON CONFLICT(listing_id, viewer_key) DO UPDATE SET vote = excluded.vote, updated_at = CURRENT_TIMESTAMP', [l.id, key, vote]);
        const type = vote === 1 ? 'listing_like' : 'listing_dislike';
        await notify(l.user_id, type, { listingId: l.id, title: l.title, count: 1 }, '#/listing/' + l.id, type + ':' + l.id);
      }
      const x = await listingExtras(l.id, key);
      res.json({ likes: x.likes, dislikes: x.dislikes, my_vote: x.my_vote });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save vote' }); }
  });

  /* ---------------- follows, ratings, profiles ---------------- */
  async function userCard(row, meId) {
    const [rating, followers, isF] = await Promise.all([
      ratingOf(row.id),
      get('SELECT COUNT(*) AS c FROM follows WHERE followee_id = ?', [row.id]),
      meId ? get('SELECT 1 AS x FROM follows WHERE follower_id = ? AND followee_id = ?', [meId, row.id]) : null
    ]);
    return { id: row.id, fullName: row.full_name, role: row.role, location: row.location, verified: badgeActive(row), rating, followers: followers.c, iFollow: !!isF, isDemo: !!row.is_demo, isMe: row.id === meId };
  }

  app.post('/api/users/:id/follow', requireAuth, writeLimiter, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (id === req.session.userId) return res.status(400).json({ error: 'You cannot follow yourself' });
      const target = await get('SELECT id FROM users WHERE id = ?', [id]);
      if (!target) return res.status(404).json({ error: 'User not found' });
      const r = await run('INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)', [req.session.userId, id]);
      if (r.changes) {
        const me = await get('SELECT full_name FROM users WHERE id = ?', [req.session.userId]);
        await notify(id, 'new_follower', { userId: req.session.userId, name: me.full_name }, '#/profile/' + req.session.userId);
      }
      const c = await get('SELECT COUNT(*) AS c FROM follows WHERE followee_id = ?', [id]);
      res.json({ ok: true, following: true, followers: c.c });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to follow' }); }
  });

  app.delete('/api/users/:id/follow', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await run('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', [req.session.userId, id]);
      const c = await get('SELECT COUNT(*) AS c FROM follows WHERE followee_id = ?', [id]);
      res.json({ ok: true, following: false, followers: c.c });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to unfollow' }); }
  });

  app.get('/api/users/me/followers', requireAuth, async (req, res) => {
    try {
      const rows = await all('SELECT u.* FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.followee_id = ? ORDER BY f.created_at DESC LIMIT 100', [req.session.userId]);
      res.json({ users: await Promise.all(rows.map((r) => userCard(r, req.session.userId))) });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load followers' }); }
  });

  app.get('/api/users/me/following', requireAuth, async (req, res) => {
    try {
      const rows = await all('SELECT u.* FROM follows f JOIN users u ON u.id = f.followee_id WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT 100', [req.session.userId]);
      res.json({ users: await Promise.all(rows.map((r) => userCard(r, req.session.userId))) });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load following' }); }
  });

  // People you may want to follow: real accounts only, same area and verified first.
  app.get('/api/users/suggestions', requireAuth, async (req, res) => {
    try {
      const me = await get('SELECT id, location FROM users WHERE id = ?', [req.session.userId]);
      const rows = await all(`SELECT u.*, (SELECT COUNT(*) FROM follows f WHERE f.followee_id = u.id) AS fc
        FROM users u
        WHERE u.id != ? AND u.id NOT IN (SELECT followee_id FROM follows WHERE follower_id = ?)
        ORDER BY (CASE WHEN ? IS NOT NULL AND u.location = ? THEN 1 ELSE 0 END) DESC,
                 (CASE WHEN u.badge_until >= date('now') THEN 1 ELSE 0 END) DESC, fc DESC, u.created_at DESC
        LIMIT 8`, [me.id, me.id, me.location, me.location]);
      const users = await Promise.all(rows.map(async (r) => {
        const c = await userCard(r, me.id);
        c.reason = me.location && r.location === me.location ? 'area' : (badgeActive(r) ? 'verified' : (r.fc ? 'popular' : 'new'));
        return c;
      }));
      res.json({ users });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load suggestions' }); }
  });

  // Star rating: given by hand after a completed transaction. One rating per pair; sending again updates it.
  app.post('/api/users/:id/rate', requireAuth, writeLimiter, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (id === req.session.userId) return res.status(400).json({ error: 'You cannot rate yourself' });
      const target = await get('SELECT id FROM users WHERE id = ?', [id]);
      if (!target) return res.status(404).json({ error: 'User not found' });
      const stars = Number(req.body && req.body.stars);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) return res.status(400).json({ error: 'Choose 1 to 5 stars' });
      if (!(req.body && req.body.completedTransaction === true)) return res.status(400).json({ error: 'Confirm that you completed a transaction with this person first' });
      const comment = str(req.body.comment, 500);
      if (comment === null) return res.status(400).json({ error: 'Comment is too long (max 500 characters)' });
      const me = await get('SELECT full_name FROM users WHERE id = ?', [req.session.userId]);
      await run(`INSERT INTO ratings (rater_id, ratee_id, stars, comment) VALUES (?, ?, ?, ?)
        ON CONFLICT(rater_id, ratee_id) DO UPDATE SET stars = excluded.stars, comment = excluded.comment, created_at = CURRENT_TIMESTAMP`,
      [req.session.userId, id, stars, comment || null]);
      await notify(id, 'new_rating', { userId: req.session.userId, name: me.full_name, stars }, '#/profile');
      clearPublicCache();
      res.json({ ok: true, rating: await ratingOf(id) });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save rating' }); }
  });

  // Profile: public details for anyone; email and phone only for the owner.
  app.get('/api/profiles/:id', publicLimiter, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const u = await get('SELECT * FROM users WHERE id = ?', [id]);
      if (!u) return res.status(404).json({ error: 'User not found' });
      const meId = req.session.userId || null;
      const card = await userCard(u, meId);
      const [following, reviews, myRating, listings, routes] = await Promise.all([
        get('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?', [id]),
        all(`SELECT r.stars, r.comment, r.created_at, p.full_name AS rater_name, p.id AS rater_id
             FROM ratings r JOIN users p ON p.id = r.rater_id WHERE r.ratee_id = ? ORDER BY r.created_at DESC LIMIT 20`, [id]),
        meId ? get('SELECT stars, comment FROM ratings WHERE rater_id = ? AND ratee_id = ?', [meId, id]) : null,
        all(`SELECT l.id, l.title, l.commodity, l.price_per_kg, l.quantity_kg, l.unit, l.status,
                    (SELECT id FROM listing_images i WHERE i.listing_id = l.id ORDER BY position, id LIMIT 1) AS image_id
             FROM listings l WHERE l.user_id = ? AND l.status IN ('available', 'almost_out') ORDER BY l.created_at DESC LIMIT 12`, [id]),
        all('SELECT id, route_name, origin, destination, vehicle, capacity_kg, rate, service_days FROM routes WHERE user_id = ? ORDER BY created_at DESC LIMIT 12', [id])
      ]);
      const out = Object.assign(card, {
        businessType: u.business_type, speciality: u.speciality, memberSince: u.created_at, following: following.c,
        reviews: reviews.map((r) => ({ stars: r.stars, comment: r.comment, createdAt: r.created_at, raterName: r.rater_name, raterId: r.rater_id })),
        myRating: myRating || null, listings, routes
      });
      if (meId === id) Object.assign(out, { email: u.email, phone: u.phone, plan: planOf(u), imageLimit: imageLimit(u), badge: await badgeState(u) });
      res.json(out);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load profile' }); }
  });

  /* ---------------- notifications ---------------- */
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
      const rows = await all('SELECT id, type, data, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?', [req.session.userId, limit]);
      const unread = (await get('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0', [req.session.userId])).c;
      res.json({ unread, items: rows.map((r) => { let d = {}; try { d = JSON.parse(r.data || '{}'); } catch (e) { /* ignore */ } return { id: r.id, type: r.type, data: d, link: r.link, read: !!r.is_read, createdAt: r.created_at }; }) });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load notifications' }); }
  });

  app.post('/api/notifications/read', requireAuth, async (req, res) => {
    try {
      const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids.map(Number).filter(Boolean).slice(0, 200) : null;
      if (ids && ids.length) await run(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`, [req.session.userId, ...ids]);
      else await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.session.userId]);
      const unread = (await get('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0', [req.session.userId])).c;
      res.json({ ok: true, unread });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update notifications' }); }
  });

  /* ---------------- blue badge (KSh 2,000, renewed every 6 months) ---------------- */
  app.get('/api/badge/me', requireAuth, async (req, res) => {
    try {
      const u = await get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
      await badgeNotices(u);
      res.json(await badgeState(u));
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load badge' }); }
  });

  // The user asks for a verification visit (or a renewal). Payment is confirmed by our team before the badge is issued.
  app.post('/api/badge/request', requireAuth, writeLimiter, async (req, res) => {
    try {
      const u = await get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
      const state = await badgeState(u);
      if (!state.canRequest) return res.status(409).json({ error: state.status === 'pending' ? 'Your request is already being reviewed' : 'Your badge is still active. You can renew in the last 30 days.' });
      const ref = str(req.body && req.body.paymentRef, 40);
      if (ref === null) return res.status(400).json({ error: 'Payment reference is too long' });
      const r = await run('INSERT INTO badge_requests (user_id, amount, payment_ref) VALUES (?, ?, ?)', [u.id, BADGE_PRICE, ref || null]);
      await notify(u.id, 'badge_requested', { renewal: !!u.badge_until }, '#/dashboard');
      res.status(201).json({ ok: true, id: r.id, badge: await badgeState(u) });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to send request' }); }
  });

  /* ---------------- adverts and sponsored listings ---------------- */
  app.get('/api/adverts/me', requireAuth, async (req, res) => {
    try {
      const rows = await all(`SELECT a.*, l.title AS listing_title FROM adverts a LEFT JOIN listings l ON l.id = a.listing_id
        WHERE a.user_id = ? ORDER BY a.id DESC LIMIT 50`, [req.session.userId]);
      res.json({ adverts: rows });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load adverts' }); }
  });

  app.post('/api/adverts', requireAuth, writeLimiter, async (req, res) => {
    try {
      const b = req.body || {};
      if (!ADVERT_KINDS.includes(b.kind)) return res.status(400).json({ error: 'Choose advert or sponsored listing' });
      let listingId = null; let title = str(b.title, 80); const body = str(b.body, 300); let link = str(b.linkUrl, 200);
      if (b.kind === 'sponsored') {
        const l = await get('SELECT id, title, user_id, status FROM listings WHERE id = ?', [Number(b.listingId)]);
        if (!l || l.user_id !== req.session.userId) return res.status(400).json({ error: 'Choose one of your own listings' });
        if (!['available', 'almost_out'].includes(l.status)) return res.status(400).json({ error: 'Only available listings can be sponsored' });
        const dup = await get("SELECT id FROM adverts WHERE listing_id = ? AND kind = 'sponsored' AND status IN ('pending', 'active')", [l.id]);
        if (dup) return res.status(409).json({ error: 'This listing already has a sponsorship request' });
        listingId = l.id; title = title || l.title;
      } else {
        if (!title) return res.status(400).json({ error: 'Give your advert a title (max 80 characters)' });
        if (body === null) return res.status(400).json({ error: 'Advert text is too long (max 300 characters)' });
        if (link && !/^https?:\/\//i.test(link)) return res.status(400).json({ error: 'The link must start with http:// or https://' });
        if (link === null) return res.status(400).json({ error: 'Link is too long' });
      }
      if (!title) return res.status(400).json({ error: 'Title is required' });
      const r = await run('INSERT INTO adverts (user_id, kind, title, body, link_url, listing_id) VALUES (?, ?, ?, ?, ?, ?)', [req.session.userId, b.kind, title, body || null, link || null, listingId]);
      await notify(req.session.userId, 'advert_submitted', { kind: b.kind, title }, '#/dashboard');
      res.status(201).json({ ok: true, id: r.id });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to send request' }); }
  });

  app.delete('/api/adverts/:id', requireAuth, async (req, res) => {
    try {
      const r = await run("DELETE FROM adverts WHERE id = ? AND user_id = ? AND status != 'active'", [Number(req.params.id), req.session.userId]);
      if (!r.changes) return res.status(404).json({ error: 'Advert not found, or it is running (ask us to end it)' });
      res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete advert' }); }
  });

  // Public: running adverts, always shown with a "Sponsored" label by the page.
  app.get('/api/adverts/active', publicLimiter, async (req, res) => {
    try {
      const rows = await all(`SELECT a.id, a.title, a.body, a.link_url, a.listing_id, u.full_name AS advertiser
        FROM adverts a JOIN users u ON u.id = a.user_id
        WHERE a.kind = 'advert' AND a.status = 'active' AND (a.ends_at IS NULL OR a.ends_at >= date('now'))
        ORDER BY a.id DESC LIMIT 3`);
      if (rows.length) await run(`UPDATE adverts SET impressions = impressions + 1 WHERE id IN (${rows.map(() => '?').join(',')})`, rows.map((r) => r.id));
      res.json({ adverts: rows });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load adverts' }); }
  });
  app.post('/api/adverts/:id/click', publicLimiter, async (req, res) => {
    try { await run("UPDATE adverts SET clicks = clicks + 1 WHERE id = ? AND status = 'active'", [Number(req.params.id)]); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  /* ---------------- transport quote requests ---------------- */
  app.post('/api/quote-requests', requireAuth, writeLimiter, async (req, res) => {
    try {
      const b = req.body || {};
      const route = await get('SELECT r.id, r.user_id, r.route_name FROM routes r WHERE r.id = ?', [Number(b.routeId)]);
      if (!route) return res.status(404).json({ error: 'Route not found' });
      if (route.user_id === req.session.userId) return res.status(400).json({ error: 'This is your own route' });
      const load = Number(b.loadKg);
      if (!(load > 0)) return res.status(400).json({ error: 'Enter the load in kg (greater than 0)' });
      const pickup = str(b.pickup, 80), dest = str(b.destination, 80), msg = str(b.message, 500);
      if (pickup === null || dest === null || msg === null) return res.status(400).json({ error: 'One of the fields is too long' });
      const dup = await get("SELECT id FROM quote_requests WHERE requester_id = ? AND route_id = ? AND status = 'pending'", [req.session.userId, route.id]);
      if (dup) return res.status(409).json({ error: 'You already have a pending request for this route' });
      const me = await get('SELECT full_name FROM users WHERE id = ?', [req.session.userId]);
      const r = await run('INSERT INTO quote_requests (requester_id, route_id, transporter_id, load_kg, pickup, destination, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.session.userId, route.id, route.user_id, load, pickup || null, dest || null, msg || null]);
      await notify(route.user_id, 'quote_request', { name: me.full_name, loadKg: load, route: route.route_name, requestId: r.id }, '#/dashboard');
      res.status(201).json({ ok: true, id: r.id });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to send quote request' }); }
  });

  app.get('/api/quote-requests/me', requireAuth, async (req, res) => {
    try {
      const me = req.session.userId;
      const [received, sent] = await Promise.all([
        all(`SELECT q.*, u.full_name AS requester_name, u.phone AS requester_phone, r.route_name FROM quote_requests q
             JOIN users u ON u.id = q.requester_id LEFT JOIN routes r ON r.id = q.route_id WHERE q.transporter_id = ? ORDER BY q.id DESC LIMIT 50`, [me]),
        all(`SELECT q.*, u.full_name AS transporter_name, CASE WHEN q.status = 'accepted' THEN u.phone END AS transporter_phone, r.route_name FROM quote_requests q
             JOIN users u ON u.id = q.transporter_id LEFT JOIN routes r ON r.id = q.route_id WHERE q.requester_id = ? ORDER BY q.id DESC LIMIT 50`, [me])
      ]);
      res.json({ received, sent });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load requests' }); }
  });

  app.patch('/api/quote-requests/:id', requireAuth, async (req, res) => {
    try {
      const status = String(req.body && req.body.status);
      if (!['accepted', 'declined'].includes(status)) return res.status(400).json({ error: 'Status must be accepted or declined' });
      const q = await get('SELECT * FROM quote_requests WHERE id = ?', [Number(req.params.id)]);
      if (!q) return res.status(404).json({ error: 'Request not found' });
      if (q.transporter_id !== req.session.userId) return res.status(403).json({ error: 'Only the transporter can answer this request' });
      await run('UPDATE quote_requests SET status = ? WHERE id = ?', [status, q.id]);
      const t = await get('SELECT full_name FROM users WHERE id = ?', [q.transporter_id]);
      await notify(q.requester_id, 'quote_response', { name: t.full_name, status }, '#/dashboard');
      res.json({ ok: true, status });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update request' }); }
  });

  /* ---------------- dashboard statistics ---------------- */
  function fillSeries(rows, days) {
    const map = new Map(rows.map((r) => [r.d, r.c]));
    const out = [];
    for (let i = days - 1; i >= 0; i--) { const d = addDays(today(), -i); out.push({ date: d, count: map.get(d) || 0 }); }
    return out;
  }

  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
      const id = req.session.userId;
      const u = await get('SELECT * FROM users WHERE id = ?', [id]);
      const [byStatus, views, votes, viewSeries, top, quotes, quoteSeries, routes, followers, following, rating, adverts] = await Promise.all([
        all('SELECT status, COUNT(*) AS c FROM listings WHERE user_id = ? GROUP BY status', [id]),
        get('SELECT COUNT(*) AS total, SUM(CASE WHEN v.created_at >= datetime(\'now\', \'-7 days\') THEN 1 ELSE 0 END) AS last7 FROM listing_views v JOIN listings l ON l.id = v.listing_id WHERE l.user_id = ?', [id]),
        get('SELECT SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) AS likes, SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) AS dislikes FROM listing_votes x JOIN listings l ON l.id = x.listing_id WHERE l.user_id = ?', [id]),
        all("SELECT date(v.created_at) AS d, COUNT(*) AS c FROM listing_views v JOIN listings l ON l.id = v.listing_id WHERE l.user_id = ? AND v.created_at >= date('now', '-13 days') GROUP BY d", [id]),
        all(`SELECT l.id, l.title, l.status,
               (SELECT COUNT(*) FROM listing_views WHERE listing_id = l.id) AS views,
               (SELECT COUNT(*) FROM listing_votes WHERE listing_id = l.id AND vote = 1) AS likes,
               (SELECT COUNT(*) FROM listing_votes WHERE listing_id = l.id AND vote = -1) AS dislikes
             FROM listings l WHERE l.user_id = ? ORDER BY views DESC, l.id DESC LIMIT 5`, [id]),
        all('SELECT status, COUNT(*) AS c FROM quote_requests WHERE transporter_id = ? GROUP BY status', [id]),
        all("SELECT date(created_at) AS d, COUNT(*) AS c FROM quote_requests WHERE transporter_id = ? AND created_at >= date('now', '-13 days') GROUP BY d", [id]),
        get('SELECT COUNT(*) AS c, COALESCE(SUM(capacity_kg), 0) AS cap FROM routes WHERE user_id = ?', [id]),
        get('SELECT COUNT(*) AS c FROM follows WHERE followee_id = ?', [id]),
        get('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?', [id]),
        ratingOf(id),
        all('SELECT status, COUNT(*) AS c FROM adverts WHERE user_id = ? GROUP BY status', [id])
      ]);
      const st = Object.fromEntries(byStatus.map((r) => [r.status, r.c]));
      const q = Object.fromEntries(quotes.map((r) => [r.status, r.c]));
      res.json({
        role: u.role, plan: planOf(u), imageLimit: imageLimit(u), unitsNote: 'All counts come from your live account data.',
        seller: {
          listings: { total: byStatus.reduce((a, r) => a + r.c, 0), available: st.available || 0, almostOut: st.almost_out || 0, paused: st.paused || 0, sold: u.sold_count || 0 },
          views: { total: views.total || 0, last7: views.last7 || 0, series: fillSeries(viewSeries, 14) },
          likes: votes.likes || 0, dislikes: votes.dislikes || 0, top
        },
        transporter: {
          routes: routes.c, capacityKg: routes.cap,
          quotes: { total: Object.values(q).reduce((a, b) => a + b, 0), pending: q.pending || 0, accepted: q.accepted || 0, declined: q.declined || 0, series: fillSeries(quoteSeries, 14) }
        },
        followers: followers.c, following: following.c, rating,
        adverts: Object.fromEntries(adverts.map((r) => [r.status, r.c]))
      });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load statistics' }); }
  });

  /* ---------------- market insights (from live listings) ---------------- */
  // "Tomatoes (Nyanya)" and "tomatoes" count as the same commodity.
  function normCommodity(s) { return String(s || '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function median(a) { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

  app.get('/api/market/insights', publicLimiter, async (req, res) => {
    try {
      const rows = await all(`SELECT l.commodity, l.price_per_kg, l.quantity_kg, l.location, l.user_id, l.created_at
        FROM listings l WHERE l.status IN ('available', 'almost_out')`);
      const by = new Map(); const areas = new Map(); const sellers = new Set();
      let totalKg = 0;
      rows.forEach((r) => {
        const k = normCommodity(r.commodity); if (!k) return;
        if (!by.has(k)) by.set(k, { prices: [], kg: 0, sellers: new Set(), label: r.commodity.replace(/\(.*?\)/g, '').trim() });
        const g = by.get(k); g.prices.push(r.price_per_kg); g.kg += r.quantity_kg; g.sellers.add(r.user_id);
        sellers.add(r.user_id); totalKg += r.quantity_kg;
        const a = String(r.location || '').trim();
        if (a) areas.set(a, (areas.get(a) || 0) + 1);
      });
      const commodities = [...by.entries()].map(([key, g]) => ({
        key, commodity: g.label.charAt(0).toUpperCase() + g.label.slice(1), listings: g.prices.length, sellers: g.sellers.size, totalKg: Math.round(g.kg),
        avgPrice: Math.round(g.prices.reduce((a, b) => a + b, 0) / g.prices.length * 10) / 10, medianPrice: median(g.prices), minPrice: Math.min(...g.prices), maxPrice: Math.max(...g.prices)
      })).sort((a, b) => b.listings - a.listings || b.totalKg - a.totalKg);
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json({
        basis: 'asking', generatedAt: new Date().toISOString(),
        totals: { listings: rows.length, commodities: commodities.length, sellers: sellers.size, totalKg: Math.round(totalKg) },
        commodities, areas: [...areas.entries()].map(([area, listings]) => ({ area, listings })).sort((a, b) => b.listings - a.listings).slice(0, 8)
      });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load insights' }); }
  });

  /* ---------------- map data ---------------- */
  app.get('/api/map/data', publicLimiter, async (req, res) => {
    try {
      const people = await all(`SELECT id, full_name, role, location, lat, lng, badge_until, is_demo FROM users WHERE lat IS NOT NULL AND lng IS NOT NULL LIMIT 1000`);
      const listingRows = await all(`SELECT l.id, l.title, l.commodity, l.price_per_kg, l.quantity_kg, l.status, l.user_id,
          COALESCE(l.lat, u.lat) AS lat, COALESCE(l.lng, u.lng) AS lng,
          (SELECT id FROM listing_images i WHERE i.listing_id = l.id ORDER BY position, id LIMIT 1) AS image_id
        FROM listings l JOIN users u ON u.id = l.user_id WHERE l.status IN ('available', 'almost_out') LIMIT 1000`);
      const routeRows = await all('SELECT id, user_id, route_name, origin, destination, vehicle, capacity_kg, rate, service_days, pickup_lat, pickup_lng, dest_lat, dest_lng FROM routes LIMIT 1000');
      const ratings = await all('SELECT ratee_id AS id, AVG(stars) AS avg, COUNT(*) AS n FROM ratings GROUP BY ratee_id');
      const rmap = new Map(ratings.map((r) => [r.id, { avg: Math.round(r.avg * 10) / 10, count: r.n }]));
      const person = (p) => ({ id: p.id, name: p.full_name, area: p.location, lat: roundCoord(p.lat), lng: roundCoord(p.lng), verified: badgeActive(p), rating: rmap.get(p.id) || null, isDemo: !!p.is_demo });
      const sellers = people.filter((p) => p.role === 'seller').map((p) => Object.assign(person(p), { listings: listingRows.filter((l) => l.user_id === p.id).map((l) => ({ id: l.id, title: l.title, commodity: l.commodity, price: l.price_per_kg, kg: l.quantity_kg, status: l.status, imageId: l.image_id })).slice(0, 6) }));
      const transporters = people.filter((p) => p.role === 'transporter').map((p) => Object.assign(person(p), { routes: routeRows.filter((r) => r.user_id === p.id).map((r) => ({
        id: r.id, name: r.route_name, origin: r.origin, destination: r.destination, vehicle: r.vehicle, capacityKg: r.capacity_kg, rate: r.rate, days: r.service_days,
        from: r.pickup_lat != null ? [roundCoord(r.pickup_lat), roundCoord(r.pickup_lng)] : null, to: r.dest_lat != null ? [roundCoord(r.dest_lat), roundCoord(r.dest_lng)] : null })) }));
      const buyers = people.filter((p) => p.role === 'buyer').map(person);
      res.setHeader('Cache-Control', 'public, max-age=30');
      res.json({ sellers, transporters, buyers });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load map data' }); }
  });

  /* ---------------- admin tools ---------------- */
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      const one = async (sql, p) => (await get(sql, p || [])).c || 0;
      const [users, sellers, transporters, buyers, listings, active, routes, ratings, follows, views, votes, newUsers, bp, ba, ap, aa, quotes, notifs, images] = await Promise.all([
        one('SELECT COUNT(*) AS c FROM users'), one("SELECT COUNT(*) AS c FROM users WHERE role = 'seller'"), one("SELECT COUNT(*) AS c FROM users WHERE role = 'transporter'"), one("SELECT COUNT(*) AS c FROM users WHERE role = 'buyer'"),
        one('SELECT COUNT(*) AS c FROM listings'), one("SELECT COUNT(*) AS c FROM listings WHERE status IN ('available', 'almost_out')"), one('SELECT COUNT(*) AS c FROM routes'),
        one('SELECT COUNT(*) AS c FROM ratings'), one('SELECT COUNT(*) AS c FROM follows'), one('SELECT COUNT(*) AS c FROM listing_views'), one('SELECT COUNT(*) AS c FROM listing_votes'),
        one("SELECT COUNT(*) AS c FROM users WHERE created_at >= datetime('now', '-7 days')"),
        one("SELECT COUNT(*) AS c FROM badge_requests WHERE status = 'pending'"), one("SELECT COUNT(*) AS c FROM users WHERE badge_until >= date('now')"),
        one("SELECT COUNT(*) AS c FROM adverts WHERE status = 'pending'"), one("SELECT COUNT(*) AS c FROM adverts WHERE status = 'active' AND (ends_at IS NULL OR ends_at >= date('now'))"),
        one('SELECT COUNT(*) AS c FROM quote_requests'), one('SELECT COUNT(*) AS c FROM notifications'), one('SELECT COUNT(*) AS c FROM listing_images')
      ]);
      const signups = await all("SELECT date(created_at) AS d, COUNT(*) AS c FROM users WHERE created_at >= date('now', '-13 days') GROUP BY d");
      const plans = await all("SELECT COALESCE(plan, 'free') AS plan, COUNT(*) AS c FROM users GROUP BY COALESCE(plan, 'free')");
      res.json({ users, sellers, transporters, buyers, listings, activeListings: active, routes, ratings, follows, views, votes, newUsers7d: newUsers,
        badgesPending: bp, badgesActive: ba, advertsPending: ap, advertsActive: aa, quotes, notifications: notifs, photos: images,
        signups: fillSeries(signups, 14), plans: Object.fromEntries(plans.map((r) => [r.plan, r.c])) });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load stats' }); }
  });

  app.get('/api/admin/badges', requireAdmin, async (req, res) => {
    try {
      const status = String(req.query.status || '');
      const rows = await all(`SELECT b.*, u.full_name, u.email, u.phone, u.role, u.location, u.badge_until FROM badge_requests b JOIN users u ON u.id = b.user_id
        ${['pending', 'verified', 'rejected'].includes(status) ? 'WHERE b.status = ?' : ''} ORDER BY (b.status = 'pending') DESC, b.id DESC LIMIT 200`,
      ['pending', 'verified', 'rejected'].includes(status) ? [status] : []);
      res.json(rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load badge requests' }); }
  });

  // verify = the visit happened and payment is confirmed: the badge runs 6 months (renewals extend from the old end date).
  app.post('/api/admin/badges/:id/decision', requireAdmin, async (req, res) => {
    try {
      const action = String(req.body && req.body.action);
      if (!['verify', 'reject'].includes(action)) return res.status(400).json({ error: 'action must be verify or reject' });
      const b = await get('SELECT * FROM badge_requests WHERE id = ?', [Number(req.params.id)]);
      if (!b) return res.status(404).json({ error: 'Request not found' });
      if (b.status !== 'pending') return res.status(409).json({ error: 'This request was already decided' });
      const note = str(req.body.note, 300) || null;
      if (action === 'verify') {
        const u = await get('SELECT badge_until FROM users WHERE id = ?', [b.user_id]);
        const start = u.badge_until && u.badge_until >= today() ? u.badge_until : today();
        const until = addMonths(start, BADGE_MONTHS);
        await run('UPDATE users SET badge_until = ? WHERE id = ?', [until, b.user_id]);
        await run("UPDATE badge_requests SET status = 'verified', decided_at = CURRENT_TIMESTAMP, period_end = ?, note = ? WHERE id = ?", [until, note, b.id]);
        await notify(b.user_id, 'badge_verified', { until }, '#/dashboard');
      } else {
        await run("UPDATE badge_requests SET status = 'rejected', decided_at = CURRENT_TIMESTAMP, note = ? WHERE id = ?", [note, b.id]);
        await notify(b.user_id, 'badge_rejected', { note }, '#/dashboard');
      }
      clearPublicCache();
      res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save decision' }); }
  });

  // Direct grant or revoke (for a badge verified in person).
  app.post('/api/admin/users/:id/badge', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const u = await get('SELECT id, badge_until FROM users WHERE id = ?', [id]);
      if (!u) return res.status(404).json({ error: 'User not found' });
      if (req.body && req.body.action === 'revoke') {
        await run('UPDATE users SET badge_until = NULL WHERE id = ?', [id]);
        return res.json({ ok: true, until: null });
      }
      const start = u.badge_until && u.badge_until >= today() ? u.badge_until : today();
      const until = addMonths(start, BADGE_MONTHS);
      await run('UPDATE users SET badge_until = ? WHERE id = ?', [until, id]);
      await run("INSERT INTO badge_requests (user_id, status, amount, decided_at, period_end, note) VALUES (?, 'verified', ?, CURRENT_TIMESTAMP, ?, 'Granted by admin')", [id, BADGE_PRICE, until]);
      await notify(id, 'badge_verified', { until }, '#/dashboard');
      clearPublicCache();
      res.json({ ok: true, until });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update badge' }); }
  });

  app.get('/api/admin/adverts', requireAdmin, async (req, res) => {
    try {
      const status = String(req.query.status || '');
      const ok = ['pending', 'active', 'rejected', 'ended'].includes(status);
      const rows = await all(`SELECT a.*, u.full_name, u.email, l.title AS listing_title FROM adverts a JOIN users u ON u.id = a.user_id LEFT JOIN listings l ON l.id = a.listing_id
        ${ok ? 'WHERE a.status = ?' : ''} ORDER BY (a.status = 'pending') DESC, a.id DESC LIMIT 200`, ok ? [status] : []);
      res.json(rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load adverts' }); }
  });

  app.post('/api/admin/adverts/:id/decision', requireAdmin, async (req, res) => {
    try {
      const action = String(req.body && req.body.action);
      if (!['approve', 'reject', 'end'].includes(action)) return res.status(400).json({ error: 'action must be approve, reject or end' });
      const a = await get('SELECT * FROM adverts WHERE id = ?', [Number(req.params.id)]);
      if (!a) return res.status(404).json({ error: 'Advert not found' });
      const note = str(req.body.note, 300) || null;
      if (action === 'approve') {
        if (a.status !== 'pending') return res.status(409).json({ error: 'Only pending adverts can be approved' });
        const days = Math.min(Math.max(Number(req.body.days) || 30, 1), 365);
        await run("UPDATE adverts SET status = 'active', starts_at = ?, ends_at = ?, admin_note = ? WHERE id = ?", [today(), addDays(today(), days), note, a.id]);
        await notify(a.user_id, 'advert_approved', { title: a.title, days }, '#/dashboard');
      } else if (action === 'reject') {
        if (a.status !== 'pending') return res.status(409).json({ error: 'Only pending adverts can be rejected' });
        await run("UPDATE adverts SET status = 'rejected', admin_note = ? WHERE id = ?", [note, a.id]);
        await notify(a.user_id, 'advert_rejected', { title: a.title, note }, '#/dashboard');
      } else {
        await run("UPDATE adverts SET status = 'ended', ends_at = ? WHERE id = ?", [today(), a.id]);
        await notify(a.user_id, 'advert_ended', { title: a.title }, '#/dashboard');
      }
      clearPublicCache();
      res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save decision' }); }
  });

  app.get('/api/admin/ratings', requireAdmin, async (req, res) => {
    try {
      res.json(await all(`SELECT r.id, r.stars, r.comment, r.created_at, a.full_name AS rater_name, b.full_name AS ratee_name
        FROM ratings r JOIN users a ON a.id = r.rater_id JOIN users b ON b.id = r.ratee_id ORDER BY r.id DESC LIMIT 200`));
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load ratings' }); }
  });
  app.delete('/api/admin/ratings/:id', requireAdmin, async (req, res) => {
    try {
      const r = await run('DELETE FROM ratings WHERE id = ?', [Number(req.params.id)]);
      if (!r.changes) return res.status(404).json({ error: 'Rating not found' });
      clearPublicCache();
      res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete rating' }); }
  });

  app.put('/api/admin/users/:id/plan', requireAdmin, async (req, res) => {
    try {
      const plan = String(req.body && req.body.plan);
      if (!PLANS[plan]) return res.status(400).json({ error: 'Plan must be free, biashara or agribusiness' });
      const r = await run('UPDATE users SET plan = ? WHERE id = ?', [plan, Number(req.params.id)]);
      if (!r.changes) return res.status(404).json({ error: 'User not found' });
      await notify(Number(req.params.id), 'plan_changed', { plan: PLANS[plan].label, images: PLANS[plan].images }, '#/dashboard');
      res.json({ ok: true, plan });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update plan' }); }
  });

  return helpers;
};
