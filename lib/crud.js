/* Create / read / update / delete routes for listings, transport routes, the user's own
   profile and account, and admin user management. Owners can only change their own rows. */

const LISTING_STATUSES = ['available', 'almost_out', 'paused', 'sold'];
const UNITS = ['kg', 'crate', 'bag', 'box', 'piece', 'litre'];
const ROLES = ['buyer', 'seller', 'transporter'];

function str(v, max) {
  const s = v == null ? '' : String(v).trim();
  return s.length > max ? null : s;
}

module.exports = function registerCrud(app, deps) {
  const { run, get, all, bcrypt, requireAuth, requireAdmin, publicLimiter, authLimiter, clearPublicCache, validLatLng, roundCoord } = deps;

  // ---------- Listings ----------
  function validateListing(b, partial) {
    const out = {};
    const has = (k) => !partial || b[k] !== undefined;
    if (has('title')) { out.title = str(b.title, 120); if (!out.title) return { error: 'Title is required (max 120 characters)' }; }
    if (has('commodity')) { out.commodity = str(b.commodity, 60); if (!out.commodity) return { error: 'Commodity is required' }; }
    if (has('grade')) { out.grade = str(b.grade, 40); if (out.grade === null) return { error: 'Grade is too long' }; }
    if (has('quantityKg')) { out.quantity_kg = Number(b.quantityKg); if (!(out.quantity_kg > 0)) return { error: 'Quantity must be greater than 0' }; }
    if (has('pricePerKg')) { out.price_per_kg = Number(b.pricePerKg); if (!(out.price_per_kg > 0)) return { error: 'Price must be greater than 0' }; }
    if (has('unit')) { out.unit = UNITS.includes(b.unit) ? b.unit : 'kg'; }
    if (has('location')) { out.location = str(b.location, 80); if (out.location === null) return { error: 'Location is too long' }; }
    if (has('description')) { out.description = str(b.description, 2000); if (out.description === null) return { error: 'Description is too long (max 2000 characters)' }; }
    if (has('status')) { out.status = b.status || 'available'; if (!LISTING_STATUSES.includes(out.status)) return { error: 'Invalid listing status' }; }
    if (b.lat !== undefined || b.lng !== undefined) {
      const lat = b.lat === null || b.lat === '' ? null : Number(b.lat);
      const lng = b.lng === null || b.lng === '' ? null : Number(b.lng);
      if (lat !== null || lng !== null) {
        if (!validLatLng(lat, lng)) return { error: 'Invalid coordinates' };
      }
      out.lat = lat; out.lng = lng;
    }
    return { value: out };
  }

  async function ownListing(req, res) {
    const row = await get('SELECT * FROM listings WHERE id = ?', [Number(req.params.id)]);
    if (!row) { res.status(404).json({ error: 'Listing not found' }); return null; }
    if (row.user_id !== req.session.userId) { res.status(403).json({ error: 'You can only change your own listings' }); return null; }
    return row;
  }

  // Read one listing: anyone can see active listings; the owner can see any of theirs.
  app.get('/api/listings/:id', publicLimiter, async (req, res) => {
    try {
      const row = await get(`SELECT l.*, u.full_name AS seller_name, u.lat AS u_lat, u.lng AS u_lng
        FROM listings l JOIN users u ON u.id = l.user_id WHERE l.id = ?`, [Number(req.params.id)]);
      if (!row) return res.status(404).json({ error: 'Listing not found' });
      const isOwner = req.session.userId === row.user_id;
      if (!isOwner && !['available', 'almost_out'].includes(row.status)) return res.status(404).json({ error: 'Listing not found' });
      if (isOwner) {
        const { u_lat, u_lng, ...own } = row;
        return res.json(own);
      }
      res.json({
        id: row.id, title: row.title, commodity: row.commodity, grade: row.grade, quantity_kg: row.quantity_kg,
        price_per_kg: row.price_per_kg, price_type: 'asking', unit: row.unit, area: row.location, description: row.description,
        status: row.status, seller_name: row.seller_name, listed_on: row.created_at, is_demo: !!row.is_demo,
        lat: roundCoord(row.lat ?? row.u_lat), lng: roundCoord(row.lng ?? row.u_lng)
      });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load listing' }); }
  });

  // Update (full or partial)
  app.put('/api/listings/:id', requireAuth, async (req, res) => {
    try {
      if (!(await ownListing(req, res))) return;
      const v = validateListing(req.body || {}, true);
      if (v.error) return res.status(400).json({ error: v.error });
      const keys = Object.keys(v.value);
      if (!keys.length) return res.status(400).json({ error: 'Nothing to update' });
      await run(`UPDATE listings SET ${keys.map((k) => k + ' = ?').join(', ')} WHERE id = ?`, [...keys.map((k) => v.value[k]), Number(req.params.id)]);
      clearPublicCache();
      res.json({ ok: true, message: 'Listing updated' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update listing' }); }
  });

  // Quick stock/status change
  app.patch('/api/listings/:id/status', requireAuth, async (req, res) => {
    try {
      if (!(await ownListing(req, res))) return;
      const status = String(req.body?.status || '');
      if (!LISTING_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid listing status' });
      await run('UPDATE listings SET status = ? WHERE id = ?', [status, Number(req.params.id)]);
      clearPublicCache();
      res.json({ ok: true, message: 'Status updated', status });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update status' }); }
  });

  app.delete('/api/listings/:id', requireAuth, async (req, res) => {
    try {
      if (!(await ownListing(req, res))) return;
      await run('DELETE FROM listings WHERE id = ?', [Number(req.params.id)]);
      clearPublicCache();
      res.json({ ok: true, message: 'Listing deleted' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete listing' }); }
  });

  // ---------- Transport routes ----------
  function validateRoute(b, partial) {
    const out = {};
    const has = (k) => !partial || b[k] !== undefined;
    if (has('routeName')) { out.route_name = str(b.routeName, 100); if (!out.route_name) return { error: 'Route name is required' }; }
    if (has('origin')) { out.origin = str(b.origin, 80); if (!out.origin) return { error: 'Origin is required' }; }
    if (has('destination')) { out.destination = str(b.destination, 80); if (!out.destination) return { error: 'Destination is required' }; }
    if (has('vehicle')) { out.vehicle = str(b.vehicle, 60); if (out.vehicle === null) return { error: 'Vehicle is too long' }; }
    if (has('capacityKg')) { out.capacity_kg = Number(b.capacityKg) || 0; if (out.capacity_kg < 0) return { error: 'Capacity cannot be negative' }; }
    if (has('rate')) { out.rate = Number(b.rate); if (!(out.rate > 0)) return { error: 'Rate must be greater than 0' }; }
    if (has('serviceDays')) { out.service_days = str(b.serviceDays, 60); if (out.service_days === null) return { error: 'Service days is too long' }; }
    if (has('description')) { out.description = str(b.description, 2000); if (out.description === null) return { error: 'Description is too long' }; }
    return { value: out };
  }

  async function ownRoute(req, res) {
    const row = await get('SELECT * FROM routes WHERE id = ?', [Number(req.params.id)]);
    if (!row) { res.status(404).json({ error: 'Route not found' }); return null; }
    if (row.user_id !== req.session.userId) { res.status(403).json({ error: 'You can only change your own routes' }); return null; }
    return row;
  }

  // Public list of transport routes (no contact details).
  app.get('/api/transport/routes', publicLimiter, async (req, res) => {
    try {
      const q = String(req.query.q || '').trim().toLowerCase().slice(0, 60);
      const rows = await all(`SELECT r.id, r.route_name, r.origin, r.destination, r.vehicle, r.capacity_kg, r.rate, r.service_days, r.description,
          u.full_name AS transporter_name, r.is_demo
        FROM routes r JOIN users u ON u.id = r.user_id
        ${q ? 'WHERE LOWER(r.origin) LIKE ? OR LOWER(r.destination) LIKE ? OR LOWER(r.route_name) LIKE ? OR LOWER(r.vehicle) LIKE ?' : ''}
        ORDER BY r.created_at DESC LIMIT 100`, q ? [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`] : []);
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json({ routes: rows.map((r) => ({ ...r, is_demo: !!r.is_demo, rate_note: 'Rate set by the transporter. Ask for a quote for your load.' })) });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load routes' }); }
  });

  app.get('/api/routes/:id', requireAuth, async (req, res) => {
    const row = await ownRoute(req, res);
    if (row) res.json(row);
  });

  app.put('/api/routes/:id', requireAuth, async (req, res) => {
    try {
      if (!(await ownRoute(req, res))) return;
      const v = validateRoute(req.body || {}, true);
      if (v.error) return res.status(400).json({ error: v.error });
      const keys = Object.keys(v.value);
      if (!keys.length) return res.status(400).json({ error: 'Nothing to update' });
      await run(`UPDATE routes SET ${keys.map((k) => k + ' = ?').join(', ')} WHERE id = ?`, [...keys.map((k) => v.value[k]), Number(req.params.id)]);
      clearPublicCache();
      res.json({ ok: true, message: 'Route updated' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update route' }); }
  });

  app.delete('/api/routes/:id', requireAuth, async (req, res) => {
    try {
      if (!(await ownRoute(req, res))) return;
      await run('DELETE FROM routes WHERE id = ?', [Number(req.params.id)]);
      clearPublicCache();
      res.json({ ok: true, message: 'Route deleted' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete route' }); }
  });

  // ---------- Own profile and account ----------
  app.put('/api/users/me', requireAuth, async (req, res) => {
    try {
      const b = req.body || {};
      const fields = { fullName: ['full_name', 120], phone: ['phone', 30], location: ['location', 80], businessType: ['business_type', 80], speciality: ['speciality', 200] };
      const sets = []; const params = [];
      for (const [k, [col, max]] of Object.entries(fields)) {
        if (b[k] === undefined) continue;
        const v = str(b[k], max);
        if (v === null) return res.status(400).json({ error: `${k} is too long` });
        if (k === 'fullName' && !v) return res.status(400).json({ error: 'Name is required' });
        sets.push(col + ' = ?'); params.push(v || null);
      }
      if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
      await run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...params, req.session.userId]);
      const u = await get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
      req.session.user = { id: u.id, fullName: u.full_name, email: u.email, phone: u.phone, role: u.role, location: u.location, businessType: u.business_type, speciality: u.speciality };
      clearPublicCache();
      res.json({ ok: true, message: 'Profile updated', user: req.session.user });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update profile' }); }
  });

  app.put('/api/users/me/password', requireAuth, authLimiter, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (String(newPassword || '').length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
      const u = await get('SELECT password_hash FROM users WHERE id = ?', [req.session.userId]);
      if (!u || !(await bcrypt.compare(String(currentPassword || ''), u.password_hash))) return res.status(401).json({ error: 'Current password is wrong' });
      await run('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(String(newPassword), 10), req.session.userId]);
      res.json({ ok: true, message: 'Password changed' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to change password' }); }
  });

  // Delete my account and everything I posted (Data Protection Act: right to erasure).
  app.delete('/api/users/me', requireAuth, authLimiter, async (req, res) => {
    try {
      const u = await get('SELECT password_hash FROM users WHERE id = ?', [req.session.userId]);
      if (!u || !(await bcrypt.compare(String(req.body?.password || ''), u.password_hash))) return res.status(401).json({ error: 'Password is wrong' });
      const id = req.session.userId;
      await run('DELETE FROM routes WHERE user_id = ?', [id]);
      await run('DELETE FROM listings WHERE user_id = ?', [id]);
      await run('DELETE FROM users WHERE id = ?', [id]);
      clearPublicCache();
      req.session.destroy(() => res.json({ ok: true, message: 'Account deleted' }));
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete account' }); }
  });

  // ---------- Admin: update a user ----------
  app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const sets = []; const params = [];
      if (b.role !== undefined) { if (!ROLES.includes(b.role)) return res.status(400).json({ error: 'Invalid role' }); sets.push('role = ?'); params.push(b.role); }
      if (b.fullName !== undefined) { const v = str(b.fullName, 120); if (!v) return res.status(400).json({ error: 'Invalid name' }); sets.push('full_name = ?'); params.push(v); }
      if (b.phone !== undefined) { const v = str(b.phone, 30); if (v === null) return res.status(400).json({ error: 'Invalid phone' }); sets.push('phone = ?'); params.push(v); }
      if (b.location !== undefined) { const v = str(b.location, 80); if (v === null) return res.status(400).json({ error: 'Invalid location' }); sets.push('location = ?'); params.push(v); }
      if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
      const r = await run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...params, Number(req.params.id)]);
      if (!r.changes) return res.status(404).json({ error: 'User not found' });
      clearPublicCache();
      res.json({ ok: true, message: 'User updated' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update user' }); }
  });
};
