const { test: setup, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/loginPage');
const { demoCredentials } = require('../utils/env');

const AUTH_STORAGE_STATE = 'playwright/.auth/user.json';

setup('login once and store the session', async ({ page }) => {
    const { username, password } = demoCredentials();

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(username, password);

    await expect(
        page,
        'expected to leave the login page after signing in — check the credentials'
    ).not.toHaveURL(/\/login\//);

    await page.context().storageState({ path: AUTH_STORAGE_STATE });
});