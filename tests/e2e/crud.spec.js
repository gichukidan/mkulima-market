// Create, read, update and delete through the real UI: account, listings, routes, profile.
const { test, expect } = require('@playwright/test');
const { view, login, unique } = require('./helpers');

test('register a new seller account from the sign-up form', async ({ page }) => {
  await page.goto('/#/auth');
  const a = view(page, 'auth');
  const email = unique('farmer') + '@example.com';
  const form = a.locator('#signupForm');
  await form.locator('input[name="fullName"]').fill('Wanjiku Test');
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="phone"]').fill('0712345678');
  await form.locator('input[name="password"]').fill('GoodPass123');
  await form.locator('[type="submit"]').click();
  await expect(page).toHaveURL(/#\/dashboard/);
  await expect(view(page, 'dashboard').locator('#profileName')).toHaveText('Wanjiku Test');
});

test('seller creates, edits, changes status of and deletes a listing', async ({ page }) => {
  await login(page, 'seller2');
  const title = unique('Sukuma wiki');

  // Create
  await page.goto('/#/seller-form');
  const f = view(page, 'seller-form');
  await f.locator('input[name="title"]').fill(title);
  await f.locator('input[name="commodity"]').fill('Kale');
  await f.locator('input[name="quantityKg"]').fill('300');
  await f.locator('input[name="pricePerKg"]').fill('25');
  await f.locator('input[name="location"]').fill('Mwea');
  await f.locator('#sfSubmit').click();
  await expect(f.locator('#formStatus')).toContainText('Listing created');
  await expect(page).toHaveURL(/#\/dashboard/);

  // Read (dashboard)
  const d = view(page, 'dashboard');
  const card = d.locator('.listing-card', { hasText: title });
  await expect(card).toBeVisible();

  // Update via the edit form
  await card.getByRole('link', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/#\/seller-form\/\d+/);
  await expect(f.locator('h1')).toHaveText('Update your listing');
  await expect(f.locator('input[name="title"]')).toHaveValue(title);
  await f.locator('input[name="pricePerKg"]').fill('28');
  await f.locator('#sfSubmit').click();
  await expect(f.locator('#formStatus')).toContainText('Listing updated');
  await page.goto('/#/dashboard');
  await expect(card.locator('.price')).toContainText('KSh 28');

  // Status change from the dashboard
  await card.locator('select[data-act="status"]').selectOption('sold');
  await expect(d.locator('#dashStatus')).toContainText('Status updated');
  await expect(card.locator('select[data-act="status"]')).toHaveValue('sold');

  // Delete (two taps)
  const del = card.getByRole('button', { name: 'Delete' });
  await del.click();
  await card.getByRole('button', { name: 'Tap again' }).click();
  await expect(d.locator('#dashStatus')).toContainText('Deleted');
  await expect(d.locator('.listing-card', { hasText: title })).toHaveCount(0);
});

test('another seller cannot edit someone else\'s listing (API)', async ({ page }) => {
  await login(page, 'seller');
  const mine = await (await page.request.get('/api/listings')).json();
  await login(page, 'seller2');
  const res = await page.request.put('/api/listings/' + mine[0].id, { data: { pricePerKg: 1 } });
  expect(res.status()).toBe(403);
});

test('transporter creates, edits and deletes a route', async ({ page }) => {
  await login(page, 'transporter');
  const name = unique('Nyeri to Nairobi');
  await page.goto('/#/transporter-form');
  const f = view(page, 'transporter-form');
  await f.locator('input[name="routeName"]').fill(name);
  await f.locator('input[name="vehicle"]').fill('Canter');
  await f.locator('input[name="origin"]').fill('Nyeri');
  await f.locator('input[name="destination"]').fill('Nairobi');
  await f.locator('input[name="capacityKg"]').fill('3000');
  await f.locator('input[name="rate"]').fill('95');
  await f.locator('#tfSubmit').click();
  await expect(page).toHaveURL(/#\/dashboard/);

  const d = view(page, 'dashboard');
  const card = d.locator('#routeGrid .listing-card', { hasText: name });
  await expect(card).toBeVisible();
  await card.getByRole('link', { name: 'Edit' }).click();
  await f.locator('input[name="rate"]').fill('110');
  await f.locator('#tfSubmit').click();
  await expect(f.locator('#formStatus')).toContainText('Route updated');
  await page.goto('/#/dashboard');
  await expect(card.locator('.price')).toContainText('KSh 110');

  await card.getByRole('button', { name: 'Delete' }).click();
  await card.getByRole('button', { name: 'Tap again' }).click();
  await expect(d.locator('#routeGrid .listing-card', { hasText: name })).toHaveCount(0);
});

test('user edits their profile', async ({ page }) => {
  await login(page, 'buyer');
  await page.goto('/#/dashboard');
  const d = view(page, 'dashboard');
  await d.getByRole('button', { name: 'Edit profile' }).click();
  const where = unique('Westlands');
  await d.locator('#profileForm input[name="location"]').fill(where);
  await d.locator('#profileForm').getByRole('button', { name: 'Save profile' }).click();
  await expect(d.locator('#dashStatus')).toContainText('Profile saved');
  await expect(d.locator('#profileLocation')).toHaveText(where);
});

test('new listing drafts are auto-saved on the device', async ({ page }) => {
  await login(page, 'seller');
  await page.goto('/#/seller-form');
  const f = view(page, 'seller-form');
  await f.locator('input[name="title"]').fill('Draft carrots');
  await page.reload();
  await expect(view(page, 'seller-form').locator('input[name="title"]')).toHaveValue('Draft carrots');
});
