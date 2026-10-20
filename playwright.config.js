// Playwright end-to-end tests. Run with:  npm test
// Starts its own server on port 3210 with a throwaway database (tests/.tmp/test.db) seeded with demo data,
// so your real mkulima.db is never touched. Uses the Chrome already installed on this machine.
const { defineConfig, devices } = require('@playwright/test');

const PORT = 3210;

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } }
  ],
  webServer: {
    command: 'node -e "require(\'fs\').rmSync(\'tests/.tmp\',{recursive:true,force:true});require(\'fs\').mkdirSync(\'tests/.tmp\',{recursive:true})" && node server.js --seed && node server.js',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      DB_PATH: 'tests/.tmp/test.db',
      SESSION_SECRET: 'playwright-test-secret',
      ADMIN_EMAIL: 'admin@test.local',
      ADMIN_PASSWORD: 'TestAdmin-Password-1',
      AUTH_RATE_LIMIT: '10000',
      AI_RATE_LIMIT_PER_HOUR: '1000'
    }
  }
});
