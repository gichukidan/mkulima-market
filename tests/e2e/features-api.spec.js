// API-level tests for photos, views and thumbs, follows, ratings, notifications, the blue badge (6-month renewal),
// adverts and sponsored listings, quote requests, statistics, market insights, sold-out removal and plans.
// Every test registers its own fresh accounts, so it can run on any database state and in both projects.
const { test, expect, request } = require('@playwright/test');
const { ADMIN, unique } = require('./helpers');

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function newUser(baseURL, role, name) {
  const ctx = await request.newContext({ baseURL });
  const email = unique(name) + '@example.com';
  const r = await ctx.post('/api/register', { data: { fullName: 'Test ' + name, email, phone: '0712345678', password: 'GoodPass123', role } });
  expect(r.status()).toBe(201);
  const me = (await (await ctx.get('/api/session')).json()).user;
  return { ctx, me, email };
}
async function newListing(u, over) {
  const r = await u.ctx.post('/api/listings', { data: Object.assign({ title: unique('Tomatoes (Nyanya)'), commodity: 'Tomatoes (Nyanya)', quantityKg: 100, pricePerKg: 60, location: 'Mwea' }, over) });
  expect(r.status()).toBe(201);
  return (await r.json()).id;
}
async function adminCtx(baseURL) {
  const ctx = await request.newContext({ baseURL });
  const r = await ctx.post('/api/admin/login', { data: ADMIN });
  expect(r.ok()).toBeTruthy();
  return ctx;
}

test.describe('listing photos, views, thumbs and sold-out removal', () => {
  test('photos obey the plan limit and are served with long caching', async ({ baseURL }) => {
    const seller = await newUser(baseURL, 'seller', 'photos');
    const id = await newListing(seller);
    expect((await seller.ctx.get('/api/session').then((r) => r.json())).user.imageLimit).toBe(5);
    let r = await seller.ctx.post(`/api/listings/${id}/images`, { data: { images: [PNG, PNG, PNG] } });
    expect(r.status()).toBe(201);
    r = await seller.ctx.post(`/api/listings/${id}/images`, { data: { images: [PNG, PNG, PNG] } });
    expect(r.status()).toBe(403); // 3 + 3 > 5 on the Free plan
    r = await seller.ctx.post(`/api/listings/${id}/images`, { data: { images: ['data:image/png;base64,AAAA'] } });
    expect(r.status()).toBe(400);
    r = await seller.ctx.post(`/api/listings/${id}/images`, { data: { images: ['data:text/html;base64,PHNjcmlwdD4='] } });
    expect(r.status()).toBe(400);
    const detail = await (await seller.ctx.get(`/api/listings/${id}`)).json();
    expect(detail.images).toHaveLength(3);
    const img = await seller.ctx.get(`/api/listing-images/${detail.images[0]}`);
    expect(img.headers()['content-type']).toBe('image/png');
    expect(img.headers()['cache-control']).toContain('immutable');
    // Only the owner can add or remove photos
    const other = await newUser(baseURL, 'seller', 'other');
    expect((await other.ctx.post(`/api/listings/${id}/images`, { data: { images: [PNG] } })).status()).toBe(403);
    expect((await other.ctx.delete(`/api/listings/${id}/images/${detail.images[0]}`)).status()).toBe(403);
    expect((await seller.ctx.delete(`/api/listings/${id}/images/${detail.images[0]}`)).status()).toBe(200);
  });

  test('a higher plan allows more photos (admin sets the plan)', async ({ baseURL }) => {
    const seller = await newUser(baseURL, 'seller', 'plan');
    const id = await newListing(seller);
    const admin = await adminCtx(baseURL);
    expect((await admin.put(`/api/admin/users/${seller.me.id}/plan`, { data: { plan: 'bogus' } })).status()).toBe(400);
    expect((await admin.put(`/api/admin/users/${seller.me.id}/plan`, { data: { plan: 'biashara' } })).status()).toBe(200);
    expect((await (await seller.ctx.get('/api/session')).json()).user.imageLimit).toBe(15);
    const r = await seller.ctx.post(`/api/listings/${id}/images`, { data: { images: Array(8).fill(PNG) } });
    expect(r.status()).toBe(201);
  });

  test('views count once per viewer, owners do not count, thumbs toggle, seller is notified', async ({ baseURL }) => {
    const seller = await newUser(baseURL, 'seller', 'views');
    const viewer = await newUser(baseURL, 'transporter', 'viewer');
    const guest = await request.newContext({ baseURL });
    const id = await newListing(seller);

    expect((await (await viewer.ctx.post(`/api/listings/${id}/view`)).json()).views).toBe(1);
    expect((await (await viewer.ctx.post(`/api/listings/${id}/view`)).json()).views).toBe(1);
    expect((await (await guest.post(`/api/listings/${id}/view`)).json()).views).toBe(2);
    expect((await (await seller.ctx.post(`/api/listings/${id}/view`)).json()).views).toBe(2);

    let v = await (await viewer.ctx.post(`/api/listings/${id}/vote`, { data: { vote: 1 } })).json();
    expect(v).toMatchObject({ likes: 1, dislikes: 0, my_vote: 1 });
    v = await (await guest.post(`/api/listings/${id}/vote`, { data: { vote: -1 } })).json();
    expect(v).toMatchObject({ likes: 1, dislikes: 1, my_vote: -1 });
    v = await (await viewer.ctx.post(`/api/listings/${id}/vote`, { data: { vote: 1 } })).json();
    expect(v).toMatchObject({ likes: 0, my_vote: 0 }); // same vote again removes it
    expect((await seller.ctx.post(`/api/listings/${id}/vote`, { data: { vote: 1 } })).status()).toBe(403);
    expect((await viewer.ctx.post(`/api/listings/${id}/vote`, { data: { vote: 5 } })).status()).toBe(400);

    const own = await (await seller.ctx.get('/api/listings')).json();
    expect(own[0]).toMatchObject({ views: 2, likes: 0, dislikes: 1 });
    const n = await (await seller.ctx.get('/api/notifications')).json();
    expect(n.items.map((i) => i.type)).toEqual(expect.arrayContaining(['listing_view', 'listing_dislike']));
    expect(n.unread).toBeGreaterThanOrEqual(2);
    expect((await (await seller.ctx.post('/api/notifications/read', { data: {} })).json()).unread).toBe(0);
  });

  test('Sold out removes the listing, its photos and keeps a sold count; sold cannot be posted', async ({ baseURL }) => {
    const seller = await newUser(baseURL, 'seller', 'sold');
    expect((await seller.ctx.post('/api/listings', { data: { title: 'x', commodity: 'y', quantityKg: 1, pricePerKg: 1, status: 'sold' } })).status()).toBe(400);
    const id = await newListing(seller);
    await seller.ctx.post(`/api/listings/${id}/images`, { data: { images: [PNG] } });
    const imgId = (await (await seller.ctx.get(`/api/listings/${id}`)).json()).images[0];
    const r = await (await seller.ctx.patch(`/api/listings/${id}/status`, { data: { status: 'sold' } })).json();
    expect(r.deleted).toBe(true);
    expect((await seller.ctx.get(`/api/listings/${id}`)).status()).toBe(404);
    expect((await seller.ctx.get(`/api/listing-images/${imgId}`)).status()).toBe(404);
    const stats = await (await seller.ctx.get('/api/dashboard/stats')).json();
    expect(stats.seller.listings).toMatchObject({ total: 0, sold: 1 });
    // via PUT too
    const id2 = await newListing(seller);
    const r2 = await (await seller.ctx.put(`/api/listings/${id2}`, { data: { status: 'sold' } })).json();
    expect(r2.deleted).toBe(true);
  });

  test('marketplace search finds Swahili names and lists sponsored listings first', async ({ baseURL }) => {
    const seller = await newUser(baseURL, 'seller', 'search');
    const id = await newListing(seller, { title: unique('Nyanya za Mwea'), commodity: 'Tomatoes (Nyanya)' });
    const guest = await request.newContext({ baseURL });
    let list = (await (await guest.get('/api/marketplace/listings?q=nyanya&limit=100')).json()).listings;
    expect(list.some((l) => l.id === id)).toBe(true);
    // sponsor it
    const sp = await (await seller.ctx.post('/api/adverts', { data: { kind: 'sponsored', listingId: id } })).json();
    const admin = await adminCtx(baseURL);
    expect((await admin.post(`/api/admin/adverts/${sp.id}/decision`, { data: { action: 'approve', days: 7 } })).status()).toBe(200);
    list = (await (await guest.get('/api/marketplace/listings?limit=100')).json()).listings;
    expect(list[0].id).toBe(id);
    expect(list[0].sponsored).toBe(true);
  });
});

test.describe('followers, ratings and profiles', () => {
  test('follow, suggestions, rating rules and privacy', async ({ baseURL }) => {
    const a = await newUser(baseURL, 'seller', 'ann');
    const b = await newUser(baseURL, 'transporter', 'bob');
    const guest = await request.newContext({ baseURL });

    expect((await b.ctx.post(`/api/users/${b.me.id}/follow`)).status()).toBe(400);
    let f = await (await b.ctx.post(`/api/users/${a.me.id}/follow`)).json();
    expect(f).toMatchObject({ following: true, followers: 1 });
    expect((await (await a.ctx.get('/api/users/me/followers')).json()).users.map((u) => u.id)).toEqual([b.me.id]);
    expect((await (await b.ctx.get('/api/users/me/following')).json()).users.map((u) => u.id)).toEqual([a.me.id]);
    expect((await (await a.ctx.get('/api/notifications')).json()).items.some((n) => n.type === 'new_follower')).toBe(true);
    const sug = (await (await a.ctx.get('/api/users/suggestions')).json()).users;
    expect(sug.some((u) => u.id === a.me.id)).toBe(false);
    expect(sug.some((u) => u.id === b.me.id)).toBe(true); // a does not follow b yet

    // ratings need the "completed a transaction" confirmation and are one per pair
    expect((await b.ctx.post(`/api/users/${a.me.id}/rate`, { data: { stars: 5, completedTransaction: false } })).status()).toBe(400);
    expect((await b.ctx.post(`/api/users/${a.me.id}/rate`, { data: { stars: 6, completedTransaction: true } })).status()).toBe(400);
    expect((await b.ctx.post(`/api/users/${b.me.id}/rate`, { data: { stars: 5, completedTransaction: true } })).status()).toBe(400);
    expect((await guest.post(`/api/users/${a.me.id}/rate`, { data: { stars: 5, completedTransaction: true } })).status()).toBe(401);
    await b.ctx.post(`/api/users/${a.me.id}/rate`, { data: { stars: 5, comment: 'Great produce', completedTransaction: true } });
    const r = await (await b.ctx.post(`/api/users/${a.me.id}/rate`, { data: { stars: 4, comment: 'Good', completedTransaction: true } })).json();
    expect(r.rating).toEqual({ avg: 4, count: 1 });

    const pub = await (await guest.get(`/api/profiles/${a.me.id}`)).json();
    expect(pub).toMatchObject({ fullName: 'Test ann', followers: 1, rating: { avg: 4, count: 1 } });
    expect(pub.email).toBeUndefined();
    expect(pub.phone).toBeUndefined();
    expect(pub.reviews[0].comment).toBe('Good');
    const mine = await (await a.ctx.get(`/api/profiles/${a.me.id}`)).json();
    expect(mine.email).toBe(a.email);
    expect(mine.isMe).toBe(true);

    expect((await (await b.ctx.delete(`/api/users/${a.me.id}/follow`)).json()).followers).toBe(0);
  });
});

test.describe('blue badge, adverts, quotes, statistics', () => {
  test('blue badge: KSh 2,000, request, admin verifies, valid for 6 months, no early renewal', async ({ baseURL }) => {
    const u = await newUser(baseURL, 'seller', 'badge');
    let s = await (await u.ctx.get('/api/badge/me')).json();
    expect(s).toMatchObject({ status: 'none', price: 2000, periodMonths: 6, canRequest: true });
    expect((await u.ctx.post('/api/badge/request', { data: { paymentRef: 'QWE123XYZ' } })).status()).toBe(201);
    expect((await u.ctx.post('/api/badge/request', { data: {} })).status()).toBe(409);
    expect((await (await u.ctx.get('/api/badge/me')).json()).status).toBe('pending');

    const admin = await adminCtx(baseURL);
    const pending = await (await admin.get('/api/admin/badges?status=pending')).json();
    const mine = pending.find((p) => p.user_id === u.me.id);
    expect(mine.payment_ref).toBe('QWE123XYZ');
    expect((await admin.post(`/api/admin/badges/${mine.id}/decision`, { data: { action: 'verify' } })).status()).toBe(200);
    expect((await admin.post(`/api/admin/badges/${mine.id}/decision`, { data: { action: 'verify' } })).status()).toBe(409); // already decided

    s = await (await u.ctx.get('/api/badge/me')).json();
    expect(s.status).toBe('active');
    expect(s.daysLeft).toBeGreaterThanOrEqual(180);
    expect(s.daysLeft).toBeLessThanOrEqual(184);
    expect(s.canRequest).toBe(false);
    expect((await u.ctx.post('/api/badge/request', { data: {} })).status()).toBe(409); // not renewable until the last 30 days
    expect((await (await u.ctx.get('/api/session')).json()).user.badge.active).toBe(true);
    expect((await (await u.ctx.get('/api/notifications')).json()).items.some((n) => n.type === 'badge_verified')).toBe(true);
    // admin can revoke
    expect((await admin.post(`/api/admin/users/${u.me.id}/badge`, { data: { action: 'revoke' } })).status()).toBe(200);
    expect((await (await u.ctx.get('/api/badge/me')).json()).canRequest).toBe(true);
  });

  test('adverts need admin approval, reject unsafe links, and go public only while active', async ({ baseURL }) => {
    const u = await newUser(baseURL, 'seller', 'ads');
    const guest = await request.newContext({ baseURL });
    expect((await u.ctx.post('/api/adverts', { data: { kind: 'advert', title: 'Hi', linkUrl: 'javascript:alert(1)' } })).status()).toBe(400);
    expect((await u.ctx.post('/api/adverts', { data: { kind: 'advert', body: 'no title' } })).status()).toBe(400);
    expect((await u.ctx.post('/api/adverts', { data: { kind: 'sponsored', listingId: 999999 } })).status()).toBe(400);
    const title = unique('Advert');
    const ad = await (await u.ctx.post('/api/adverts', { data: { kind: 'advert', title, body: 'Fresh produce', linkUrl: 'https://example.com' } })).json();
    let active = (await (await guest.get('/api/adverts/active')).json()).adverts;
    expect(active.some((a) => a.id === ad.id)).toBe(false);

    const admin = await adminCtx(baseURL);
    expect((await admin.post(`/api/admin/adverts/${ad.id}/decision`, { data: { action: 'approve', days: 14 } })).status()).toBe(200);
    active = (await (await guest.get('/api/adverts/active')).json()).adverts;
    expect(active.some((a) => a.id === ad.id && a.title === title)).toBe(true);
    expect((await guest.post(`/api/adverts/${ad.id}/click`)).status()).toBe(200);
    const mine = (await (await u.ctx.get('/api/adverts/me')).json()).adverts.find((a) => a.id === ad.id);
    expect(mine).toMatchObject({ status: 'active', clicks: 1 });
    expect(mine.impressions).toBeGreaterThanOrEqual(1);
    expect((await u.ctx.delete(`/api/adverts/${ad.id}`)).status()).toBe(404); // a running advert cannot be deleted by its owner
    await admin.post(`/api/admin/adverts/${ad.id}/decision`, { data: { action: 'end' } });
    active = (await (await guest.get('/api/adverts/active')).json()).adverts;
    expect(active.some((a) => a.id === ad.id)).toBe(false);
    expect((await u.ctx.delete(`/api/adverts/${ad.id}`)).status()).toBe(200);
  });

  test('transport quote requests reach the transporter and the answer reaches the requester', async ({ baseURL }) => {
    const t = await newUser(baseURL, 'transporter', 'haul');
    const s = await newUser(baseURL, 'seller', 'ship');
    const route = await (await t.ctx.post('/api/routes', { data: { routeName: 'Nakuru to Nairobi', origin: 'Nakuru', destination: 'Nairobi', rate: 100, capacityKg: 5000, vehicle: 'Lorry', pickupLat: -0.3031, pickupLng: 36.08, destLat: -1.2864, destLng: 36.8172 } })).json();
    expect((await t.ctx.post('/api/quote-requests', { data: { routeId: route.id, loadKg: 100 } })).status()).toBe(400); // own route
    expect((await s.ctx.post('/api/quote-requests', { data: { routeId: route.id, loadKg: 0 } })).status()).toBe(400);
    expect((await s.ctx.post('/api/quote-requests', { data: { routeId: route.id, loadKg: 800, pickup: 'Nakuru', destination: 'Nairobi', message: 'Cabbages' } })).status()).toBe(201);
    expect((await s.ctx.post('/api/quote-requests', { data: { routeId: route.id, loadKg: 800 } })).status()).toBe(409);
    const got = (await (await t.ctx.get('/api/quote-requests/me')).json()).received;
    expect(got).toHaveLength(1);
    expect(got[0].requester_phone).toBe('0712345678');
    expect((await s.ctx.patch(`/api/quote-requests/${got[0].id}`, { data: { status: 'accepted' } })).status()).toBe(403); // only the transporter answers
    expect((await t.ctx.patch(`/api/quote-requests/${got[0].id}`, { data: { status: 'accepted' } })).status()).toBe(200);
    const sent = (await (await s.ctx.get('/api/quote-requests/me')).json()).sent[0];
    expect(sent).toMatchObject({ status: 'accepted', transporter_phone: '0712345678' });
    // route coordinates were stored, so the map can draw it
    const map = await (await (await request.newContext({ baseURL })).get('/api/map/data')).json();
    expect(Array.isArray(map.sellers) && Array.isArray(map.transporters) && Array.isArray(map.buyers)).toBe(true);
    const stats = await (await t.ctx.get('/api/dashboard/stats')).json();
    expect(stats.transporter.quotes).toMatchObject({ total: 1, accepted: 1, pending: 0 });
    expect(stats.transporter.routes).toBe(1);
  });

  test('seller statistics and market insights come from real listings', async ({ baseURL }) => {
    const seller = await newUser(baseURL, 'seller', 'stats');
    const buyer = await newUser(baseURL, 'transporter', 'statsbuyer');
    const id = await newListing(seller, { commodity: 'Kale (Sukuma wiki)', pricePerKg: 30, quantityKg: 250 });
    await buyer.ctx.post(`/api/listings/${id}/view`);
    await buyer.ctx.post(`/api/listings/${id}/vote`, { data: { vote: 1 } });
    const st = await (await seller.ctx.get('/api/dashboard/stats')).json();
    expect(st.seller.listings).toMatchObject({ total: 1, available: 1 });
    expect(st.seller.views).toMatchObject({ total: 1, last7: 1 });
    expect(st.seller.views.series).toHaveLength(14);
    expect(st.seller.views.series[13].count).toBe(1);
    expect(st.seller.likes).toBe(1);
    expect(st.seller.top[0]).toMatchObject({ id, views: 1, likes: 1 });
    const ins = await (await (await request.newContext({ baseURL })).get('/api/market/insights')).json();
    expect(ins.basis).toBe('asking');
    const kale = ins.commodities.find((c) => c.key === 'kale');
    expect(kale.listings).toBeGreaterThanOrEqual(1);
    expect(kale.minPrice).toBeLessThanOrEqual(30);
    expect(ins.totals.listings).toBeGreaterThanOrEqual(1);
  });

  test('admin stats and moderation are admin only', async ({ baseURL }) => {
    const guest = await request.newContext({ baseURL });
    for (const p of ['/api/admin/stats', '/api/admin/badges', '/api/admin/adverts', '/api/admin/ratings']) expect((await guest.get(p)).status()).toBe(401);
    const u = await newUser(baseURL, 'seller', 'nonadmin');
    expect((await u.ctx.get('/api/admin/stats')).status()).toBe(401);
    expect((await u.ctx.put(`/api/admin/users/${u.me.id}/plan`, { data: { plan: 'agribusiness' } })).status()).toBe(401);
    const admin = await adminCtx(baseURL);
    const s = await (await admin.get('/api/admin/stats')).json();
    expect(s.users).toBeGreaterThan(0);
    expect(s.signups).toHaveLength(14);
  });

  test('deleting an account removes their data without errors (cascade)', async ({ baseURL }) => {
    const a = await newUser(baseURL, 'seller', 'gone');
    const b = await newUser(baseURL, 'seller', 'stays');
    const id = await newListing(a);
    await a.ctx.post(`/api/listings/${id}/images`, { data: { images: [PNG] } });
    await b.ctx.post(`/api/users/${a.me.id}/follow`);
    await b.ctx.post(`/api/users/${a.me.id}/rate`, { data: { stars: 3, completedTransaction: true } });
    await a.ctx.post('/api/adverts', { data: { kind: 'sponsored', listingId: id } });
    const r = await a.ctx.delete('/api/users/me', { data: { password: 'GoodPass123' } });
    expect(r.status()).toBe(200);
    const guest = await request.newContext({ baseURL });
    expect((await guest.get(`/api/profiles/${a.me.id}`)).status()).toBe(404);
    expect((await guest.get(`/api/listings/${id}`)).status()).toBe(404);
    expect((await (await b.ctx.get('/api/users/me/following')).json()).users).toHaveLength(0);
  });
});
