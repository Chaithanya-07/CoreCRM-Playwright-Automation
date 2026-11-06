const { expect } = require('@playwright/test');

class LoginPage {

    constructor(page) {
        this.page = page;

        this.usernameInput = page.getByLabel('Username');
        this.passwordInput = page.getByLabel('Password');
        this.signInButton = page.getByRole('button', { name: 'Sign In' });
        // Shown by the site when a login attempt is rejected.
        this.invalidCredentialsMessage = page.getByText(
            'Invalid credentials. Please check and try again.'
        );
    }

    async open() {
        await this.page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(this.signInButton, 'the login form did not appear').toBeVisible();
    }

    async login(username, password) {
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.signInButton.click();
    }
}

module.exports = { LoginPage };