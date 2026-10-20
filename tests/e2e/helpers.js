const { expect } = require('@playwright/test');

const DEMO_PASSWORD = 'Mkulima@2026';
const USERS = {
  buyer: 'buyer@demo.mkulima.test',
  seller: 'seller@demo.mkulima.test',
  seller2: 'seller2@demo.mkulima.test',
  transporter: 'transporter@demo.mkulima.test'
};
const ADMIN = { email: 'admin@test.local', password: 'TestAdmin-Password-1' };

// A view is a shadow-DOM host: #v-home, #v-dashboard, #v-seller-form ...
function view(page, name) {
  return page.locator('#v-' + name);
}

// Log in through the API; the session cookie is shared with the page.
async function login(page, who) {
  const res = await page.request.post('/api/login', { data: { email: USERS[who] || who, password: DEMO_PASSWORD } });
  expect(res.ok()).toBeTruthy();
}

// Fail the test on uncaught page errors and console errors.
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Map tiles and third-party fonts can fail offline; they are not app errors.
    if (/tile\.openstreetmap|fonts\.g|net::ERR_INTERNET_DISCONNECTED|net::ERR_NAME_NOT_RESOLVED|Failed to load resource: the server responded with a status of 401/.test(t)) return;
    errors.push('console: ' + t);
  });
  return errors;
}

function unique(prefix) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

module.exports = { DEMO_PASSWORD, USERS, ADMIN, view, login, watchErrors, unique };
