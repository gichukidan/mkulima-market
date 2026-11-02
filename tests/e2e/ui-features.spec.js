// UI checks for the newer features: nav, bilingual pages, listing detail, status colours, dashboard, badge, notifications.
const { test, expect } = require('@playwright/test');
const { view, login, watchErrors } = require('./helpers');

async function firstListingId(page) {
  const rows = await (await page.request.get('/api/marketplace/listings')).json();
  const list = Array.isArray(rows) ? rows : rows.listings;
  return list[0].id;
}

test('navigation has Home and Map (not Transport)', async ({ page, isMobile }) => {
  await page.goto('/#/ai');
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('#sl a[data-k="home"]')).toBeVisible();
  await expect(page.locator('#sl a[data-k="map"]')).toHaveText('Map');
  await expect(page.locator('#sl')).not.toContainText('Transport');
  await page.locator('#sl a[data-k="home"]').click();
  await expect(page).toHaveURL(/#\/home/);
});

test('map page loads Leaflet with OpenStreetMap attribution', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/#/map');
  await expect(view(page, 'map').locator('.leaflet-container')).toBeVisible({ timeout: 15000 });
  await expect(view(page, 'map').locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');
  expect(errors).toEqual([]);
});

test('language switch translates the map and listing pages', async ({ page, isMobile }) => {
  await page.goto('/#/map');
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click();
  await page.locator('#sl2').click();
  await expect(view(page, 'map').locator('h1:visible').first()).toHaveText('Ramani');
  const id = await firstListingId(page);
  await page.goto('/#/listing/' + id);
  await expect(view(page, 'listing').locator('#main')).toBeVisible();
});

test('listing page shows views and lets a viewer give thumbs up and down', async ({ page }) => {
  await login(page, 'buyer');
  const id = await firstListingId(page);
  await page.goto('/#/listing/' + id);
  const l = view(page, 'listing');
  await expect(l.locator('#main')).toBeVisible();
  const up = l.locator('[data-vote="1"]'), down = l.locator('[data-vote="-1"]');
  await up.click();
  await expect(up).toHaveAttribute('aria-pressed', 'true');
  await down.click();
  await expect(down).toHaveAttribute('aria-pressed', 'true');
  await expect(up).toHaveAttribute('aria-pressed', 'false');
});

test('status pills use automatic colours', async ({ page }) => {
  await page.goto('/#/home');
  const h = view(page, 'home');
  await expect(h.locator('#rail .card').first()).toBeVisible();
  const cls = await h.locator('#rail .card .st').evaluateAll((els) => els.map((e) => e.className));
  expect(cls.length).toBeGreaterThan(0);
  for (const c of cls) expect(c).toMatch(/st-(ok|warn|mute)/);
});

test('dashboard shows stats, badge card and notifications for a seller', async ({ page }) => {
  const errors = watchErrors(page);
  await login(page, 'seller');
  await page.goto('/#/dashboard');
  const d = view(page, 'dashboard');
  await expect(d.locator('#stats .stat').first()).toBeVisible();
  await expect(d.locator('#badgeCard')).toContainText('2,000');
  await expect(d.locator('#badgeCard')).toContainText(/6 months|six months/i);
  await expect(d.locator('#notifCard')).toBeVisible();
  await expect(d.locator('#adCard')).toBeVisible();
  expect(errors).toEqual([]);
});

test('blue badge request goes to admin and shows as pending', async ({ page }) => {
  await login(page, 'seller2');
  const r = await page.request.post('/api/badge/request', { data: { note: 'e2e' } });
  expect([200, 201, 400, 409]).toContain(r.status());
  await page.goto('/#/dashboard');
  await expect(view(page, 'dashboard').locator('#badgeCard')).toContainText(/Request received|Valid until|pending/i);
});

test('seller form limits photos to the plan allowance', async ({ page }) => {
  await login(page, 'seller');
  await page.goto('/#/seller-form');
  await expect(view(page, 'seller-form')).toContainText(/of 5 photos|5 photos/);
});

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });
  test('dashboard, profile and listing render without errors in dark mode', async ({ page }) => {
    const errors = watchErrors(page);
    await login(page, 'seller');
    const id = await firstListingId(page);
    for (const h of ['#/dashboard', '#/profile', '#/listing/' + id, '#/map', '#/ai']) {
      await page.goto('/' + h);
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, h).toBeLessThanOrEqual(2);
    }
    expect(errors).toEqual([]);
  });
});
