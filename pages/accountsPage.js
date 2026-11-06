const { expect } = require('@playwright/test');

class AccountsPage {

    constructor(page) {
        this.page = page;

        // The "New account" form opens inside this shared modal.
        this.modal = page.locator('#modalBox');

        this.newButton = page.getByRole('button', { name: 'New', exact: true });
        // There are two save buttons in the form: "Save & New" and "Save".
        this.saveButton = this.modal.getByRole('button', { name: 'Save', exact: true });

        // Accounts list page. As on the other module lists, the search is
        // applied by navigating to the list URL with a `search` query
        // parameter (verified live on 2026-11-03: navigating to
        // /crm/accounts/accounts-view/?section=people&search=<text> lists
        // exactly the rows containing that text). The tests use that
        // verified route.
        this.listRows = page.locator('tbody tr');

        // Required text field.
        this.accountName = this.modal.locator('#id_name');

        // Same Select2 pattern as the other Horilla forms: the original
        // <select> stays in the DOM (visually hidden) next to a visible
        // select2 widget, so the selects are addressed by their form name
        // and driven with selectOption({ force: true }), which still fires
        // the change events Select2 listens to (verified live 2026-11-03).
        this.accountOwner = this.modal.locator('select[name="account_owner"]');
        this.industry = this.modal.locator('select[name="industry"]');

        // Verified on 2026-11-03 (leads/contacts pattern): saving navigates
        // to the account detail page and shows the SweetAlert2 confirmation.
        this.successDialog = page.locator('.swal2-title').filter({
            hasText: /account created successfully/i,
        });
    }

    // Navigate to the accounts list and dismiss any popup that opens over it.
    async open() {
        await this.page.goto('/crm/accounts/accounts-view/?section=people', { waitUntil: 'domcontentloaded' });
        await expect(
            this.newButton,
            'the Accounts list page did not finish loading'
        ).toBeVisible();
        await this.page.keyboard.press('Escape');
    }

    // Open the New Account create form.
    async openCreateForm() {
        await this.newButton.click();
        await expect(
            this.accountName,
            'the New Account modal did not open'
        ).toBeVisible();
    }

    // Fill the form fields. `name` is optional: leaving it out tests the
    // required-field validation. Verified required fields: Account Owner
    // (starts empty "- Select an option -"), Account Name, Industry.
    async fillAccountForm({ name, industry } = {}) {
        if (name != null) {
            await this.accountName.fill(name);
        }

        // Account Owner is a required dropdown that starts empty. Pick the
        // first user option — any demo user is a valid owner.
        await this.accountOwner.selectOption({ index: 1, force: true });

        // Industry is a required dropdown with fixed demo options
        // (Finance, Healthcare, ... verified live 2026-11-03).
        await this.industry.selectOption({ label: industry, force: true });
    }

    // Save and expect the confirmation dialog and the detail-page redirect
    // handled by the test.
    async saveAndExpectSuccess() {
        await this.saveButton.click();
        await expect(
            this.successDialog,
            'expected the "Account created successfully." confirmation after saving'
        ).toBeVisible();
    }

    // Search the accounts list for a unique value (e.g. the account name)
    // via the app's verified search URL parameter. The applied search also
    // opens a "Filters" panel over the table (verified live), which is
    // dismissed the same way as the other overlays.
    async searchAccountByName(accountNameParam) {
        await this.page.goto(
            `/crm/accounts/accounts-view/?section=people&search=${encodeURIComponent(accountNameParam)}`,
            { waitUntil: 'domcontentloaded' }
        );
        await expect(
            this.newButton,
            'the Accounts list did not load after searching'
        ).toBeVisible();
        await this.page.keyboard.press('Escape');
    }

    // The single list row matching the unique search value.
    getAccountRowByName(accountNameParam) {
        return this.listRows.filter({ hasText: accountNameParam });
    }

    // Open the record of the row matching the unique search value. Rows are
    // not links in the DOM; verified live, clicking the name cell (td index
    // 1 — the first cell is a row checkbox) navigates to that account's
    // detail page. The row is resolved explicitly through
    // getAccountRowByName, so the click can never silently target an
    // unrelated first row.
    //
    // CURRENTLY UNUSABLE (demo regression, verified 2026-11-04): the demo's
    // lists were converted to HTMX partial navigation and the tables'
    // `#loading-indicator` overlay (transparent, pointer-events: auto)
    // intercepts every pointer event over the rows — real-user clicks
    // included. Kept so the direct row interaction can be restored the
    // moment the demo removes that overlay; the enabled path is the
    // approved verified-URL fallback, openRowDetail below.
    async openAccountRow(accountNameParam) {
        const matchingRow = this.getAccountRowByName(accountNameParam);
        const nameCell = matchingRow.locator('td').nth(1);
        await expect(
            nameCell,
            `no account row matching the unique name ${accountNameParam} was available to open`
        ).toBeVisible();
        await nameCell.click();
    }

    // Approved temporary fallback (mentor option (b), Phase 2B.2): open the
    // matched row's record by its verified detail URL. The matching row's
    // name cell carries the exact `hx-get` URL the app's row action follows
    // (verified live on 2026-11-04). The URL is extracted from that DOM
    // attribute — never constructed or guessed — and asserted to be the
    // account detail route before it is navigated to. The tests then verify
    // the persisted record fields on the loaded detail page.
    async openRowDetail(matchingRow) {
        const nameCell = matchingRow.locator('td').nth(1);
        await expect(
            nameCell,
            'no matching account row was available to resolve its detail URL'
        ).toBeVisible();
        const detailUrl = await nameCell.getAttribute('hx-get');
        await expect(
            detailUrl,
            'the matching account row did not expose its detail URL'
        ).toMatch(/^\/crm\/accounts\/account-detail-view\/\d+\/?/);
        await this.page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
        await expect(
            this.page,
            'opening the extracted detail URL should land on that account detail page'
        ).toHaveURL(/\/crm\/accounts\/account-detail-view\/\d+\/?/);
    }
}

module.exports = { AccountsPage };