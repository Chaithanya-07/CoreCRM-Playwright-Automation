// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Load an optional local .env file (see .env.example). dotenv is declared as a
// dev dependency, but the suite still works if it is missing, as long as the
// environment variables are provided some other way.
try {
  require('dotenv').config();
} catch {
  // dotenv not installed — environment variables can still be set directly.
}

/**
 * Base URL can be overridden with the BASE_URL environment variable.
 */
const BASE_URL = process.env.BASE_URL || 'https://crm.demo.horilla.com';

/**
 * Shared storage state written by the "setup" project (tests/auth.setup.js).
 * It contains session cookies for the logged-in demo user and must never be
 * committed (see .gitignore).
 */
const AUTH_STORAGE_STATE = 'playwright/.auth/user.json';

module.exports = defineConfig({
  testDir: './tests',
  /* The demo site can be slow on first load; 60s covers login + page loads. */
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  /* Run test files one after another. The application under test is a
     shared public demo, so tests are deliberately serialized (workers: 1)
     to avoid simultaneous sessions colliding with each other. */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Always run serially — the shared demo is a single public instance. */
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
  },

  projects: [
    /* Logs in once, stores the session, and does not run the app tests. */
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    /* CRM module workflows (Leads, Contacts, Accounts, Opportunities,
       Activities, Campaigns, Lead Conversion): reuse the authenticated
       session. */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_STORAGE_STATE,
      },
      dependencies: ['setup'],
      testIgnore: /(?:auth\.setup|login)\.spec\.js/,
    },
    /* Login page tests must run WITHOUT authentication. */
    {
      name: 'chromium-login',
      testMatch: /login\.spec\.js/,
    },
  ],

  /* Cross-browser (Firefox / WebKit) enablement is a later, opt-in step:
     the browser binaries are not installed yet and the workflows are only
     validated on Chromium. Example:

     {
       name: 'firefox',
       use: { ...devices['Desktop Firefox'] },
       dependencies: ['setup'],
       testIgnore: /(?:auth\.setup|login)\.spec\.js/,
     },
  */
});