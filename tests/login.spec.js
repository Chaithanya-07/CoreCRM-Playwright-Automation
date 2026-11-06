import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { demoCredentials } from '../utils/env';

// These tests run in the dedicated "chromium-login" project, which is never
// pre-authenticated, so they exercise the login page itself.

test('user can log in with valid credentials', async ({ page }) => {
    const { username, password } = demoCredentials();

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(username, password);

    await expect(
        page,
        'expected to leave the login page after signing in with valid credentials'
    ).not.toHaveURL(/\/login\//);
});

test('user cannot log in with an invalid password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();

    // A deliberately wrong password; the shared demo account is untouched and
    // the site responds with an in-page error (no lockout observed).
    await loginPage.login('invalid-demo-user', 'wrong-password');

    await expect(
        loginPage.invalidCredentialsMessage,
        'expected the login page to reject an invalid password'
    ).toBeVisible();
});