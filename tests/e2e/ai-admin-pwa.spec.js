// Ask Mkulima AI, Auto-write, the admin knowledge base, security and the installable PWA.
const { test, expect } = require('@playwright/test');
const { view, login, ADMIN, unique } = require('./helpers');

test('Ask Mkulima AI shows the answer, sources and listing cards (mocked AI)', async ({ page }) => {
  // The browser call to /api/ai is mocked so the test is fast, free and repeatable.
  await page.route('**/api/ai', (route) => route.fulfill({
    json: {
      text: 'I found **1 listing**: [Shangi potatoes, Grade A](#l-1). Distances are straight-line.',
      tools: ['search_listings', 'search_knowledge'],
      listings: [{ id: 1, title: 'Shangi potatoes, Grade A', commodity: 'Potatoes', quantity_kg: 4500, price_per_kg: 38, seller_name: 'John Kamau', area: 'Ol Kalou', distance_km: 87, is_demo: true }],
      sources: [{ id: 3, title: 'Trading safely on Mkulima Market' }]
    }
  }));
  await page.goto('/#/ai');
  const ai = view(page, 'ai');
  await ai.locator('#q').fill('Find potatoes near me');
  await ai.locator('#send').click();
  await expect(ai.locator('.b.a').last()).toContainText('1 listing');
  await expect(ai.locator('.src')).toContainText('Trading safely');
  await expect(ai.locator('#l-1')).toContainText('KSh 38');
});

test('AI endpoint validates input (real server)', async ({ request }) => {
  const res = await request.post('/api/ai', { data: { messages: [] } });
  expect(res.status()).toBe(400);
});

test('Auto-write fills the listing title and description (mocked AI)', async ({ page }) => {
  await login(page, 'seller');
  await page.route('**/api/ai/autowrite', (route) => route.fulfill({ json: { title: 'Shangi potatoes, Grade A', description: 'Fresh Shangi potatoes from Ol Kalou.' } }));
  await page.goto('/#/seller-form');
  const f = view(page, 'seller-form');
  await f.locator('input[name="title"]').fill('');
  await f.locator('input[name="commodity"]').fill('Potatoes');
  await f.getByRole('button', { name: /Auto-write/ }).click();
  await expect(f.locator('input[name="title"]')).toHaveValue('Shangi potatoes, Grade A');
  await expect(f.locator('textarea[name="description"]')).toHaveValue(/Ol Kalou/);
});

test('admin manages knowledge base articles (create, edit, delete)', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/admin');
  await page.locator('#adminEmail').fill(ADMIN.email);
  await page.locator('#adminPassword').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.locator('#kbTable tr').first()).toBeVisible();

  const title = unique('Maize drying tips');
  await page.locator('#kbTitle').fill(title);
  await page.locator('#kbBody').fill('Dry maize well before storage and keep it off the floor.');
  await page.locator('#kbSave').click();
  const row = page.locator('#kbTable tr', { hasText: title });
  await expect(row).toBeVisible();

  // The new article is searchable by the AI's retrieval endpoint.
  const found = await (await page.request.get('/api/kb?q=' + encodeURIComponent('maize drying'))).json();
  expect(found.articles.some((a) => a.title === title)).toBeTruthy();

  await row.getByRole('button', { name: 'Edit' }).click();
  await page.locator('#kbPublished').uncheck();
  await page.locator('#kbSave').click();
  await expect(row).toContainText('No');

  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('#kbTable tr', { hasText: title })).toHaveCount(0);
});

test('private files are never served and assets are cached', async ({ request }) => {
  for (const p of ['/mkulima.db', '/server.js', '/.env', '/lib/ai.js', '/package.json']) {
    expect((await request.get(p)).status(), p).toBe(404);
  }
  const html = await (await request.get('/')).text();
  const v = html.match(/data-v="([a-f0-9]+)"/)[1];
  const css = await request.get('/css/shell.css?v=' + v);
  expect(css.headers()['cache-control']).toContain('immutable');
  const sellers = await (await request.get('/api/nearby/sellers?lat=-0.27&lng=36.38&radiusKm=50')).json();
  expect(JSON.stringify(sellers)).not.toMatch(/@|\+2547/); // no emails or phone numbers
});

test('PWA: manifest is valid, service worker installs and the app opens offline', async ({ page, context }) => {
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('Mkulima Market');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some((i) => i.sizes === '512x512')).toBeTruthy();

  await page.goto('/#/home');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); // now controlled by the service worker
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });

  await context.setOffline(true);
  await page.reload();
  await expect(view(page, 'home').locator('h1').first()).toBeVisible();
  await context.setOffline(false);
});
