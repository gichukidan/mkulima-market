// Every page loads without errors, shows its main heading, and fits a phone screen.
const { test, expect } = require('@playwright/test');
const { view, login, watchErrors } = require('./helpers');

const PAGES = [
  { hash: '#/home', view: 'home', heading: /Sell your harvest/i },
  { hash: '#/map', view: 'map', heading: /near you/i },
  { hash: '#/ai', view: 'ai', heading: /Ask Mkulima AI/i },
  { hash: '#/login', view: 'auth', heading: /Welcome back/i },
  { hash: '#/signup', view: 'auth', heading: /Create your account/i },
  { hash: '#/seller-form', view: 'seller-form', heading: /Post a fresh produce listing/i },
  { hash: '#/transporter-form', view: 'transporter-form', heading: /Offer a transport route/i }
];

for (const p of PAGES) {
  test(`page ${p.hash} renders cleanly`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/' + p.hash);
    const v = view(page, p.view);
    await expect(v).toBeVisible();
    if (p.heading) await expect(v.locator('h1:visible').first()).toHaveText(p.heading);
    // No horizontal scrolling on any screen size.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
}

test('dashboard sends guests to login', async ({ page }) => {
  await page.goto('/#/dashboard');
  await expect(page).toHaveURL(/#\/login/);
});

test('dashboard shows the signed-in seller and their demo listings', async ({ page }) => {
  await login(page, 'seller');
  await page.goto('/#/dashboard');
  const d = view(page, 'dashboard');
  await expect(d.locator('#profileName')).toHaveText('John Kamau');
  await expect(d.locator('#listingGrid .listing-card')).toHaveCount(3);
  await expect(d.locator('#listingGrid .demo').first()).toBeVisible();
});

test('mobile menu opens and navigates', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/#/home');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.locator('#sl').getByRole('link', { name: 'Ask Mkulima' }).click();
  await expect(page).toHaveURL(/#\/ai/);
  await expect(view(page, 'ai')).toBeVisible();
});

// Regression: in dark mode the login page text turned white on a white card.
// For every page, headings and labels must stay readable (contrast >= 3:1) in dark mode.
test.describe('dark mode readability', () => {
  test.use({ colorScheme: 'dark' });
  for (const p of PAGES) {
    test(`text is readable in dark mode on ${p.hash}`, async ({ page }) => {
      await page.goto('/' + p.hash);
      await expect(view(page, p.view)).toBeVisible();
      const worst = await page.evaluate((id) => {
        const root = document.getElementById(id).shadowRoot;
        const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
        const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        function bg(el) {
          for (let n = el; n; n = n.parentElement || (n.getRootNode && n.getRootNode().host)) {
            const cs = getComputedStyle(n);
            if (cs.backgroundImage !== 'none') return null; // gradient or photo: cannot measure, skip
            const c = rgb(cs.backgroundColor);
            if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) return c;
          }
          return rgb(getComputedStyle(document.body).backgroundColor);
        }
        let min = 21, where = '';
        root.querySelectorAll('h1, h2, label, .role-card').forEach((el) => {
          if (!el.offsetParent || !el.textContent.trim()) return;
          const back = bg(el);
          if (!back) return;
          const a = lum(rgb(getComputedStyle(el).color)), b = lum(back);
          const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          if (ratio < min) { min = ratio; where = el.tagName + ': ' + el.textContent.trim().slice(0, 40); }
        });
        return { min, where };
      }, 'v-' + p.view);
      expect(worst.min, `low contrast at ${worst.where}`).toBeGreaterThanOrEqual(3);
    });
  }
});

test('landing page shows live listings and switches to Kiswahili', async ({ page, isMobile }) => {
  await page.goto('/#/home');
  const h = view(page, 'home');
  await expect(h.locator('#rail .card').first()).toBeVisible();
  await h.locator('#q').fill('potato');
  await h.getByRole('button', { name: 'Search' }).click();
  await expect(h.locator('#rail .card')).toHaveCount(1);
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click(); // language switch lives in the mobile menu
  await page.locator('#sl2').click(); // global language switch
  await expect(h.locator('h1')).toContainText('Uza mavuno yako');
  await expect(page.locator('#sl a[data-k="map"]')).toHaveText('Usafiri');
});
