const { expect } = require('@playwright/test');

class OpportunitiesPage {

    constructor(page) {
        this.page = page;

        // The "New opportunity" form opens inside this shared modal.
        this.modal = page.locator('#modalBox');

        this.newButton = page.getByRole('button', { name: 'New', exact: true });
        // There are two save buttons in the form: "Save & New" and "Save".
        this.saveButton = this.modal.getByRole('button', { name: 'Save', exact: true });

        // Opportunities list page. As on the other module lists, the search
        // is applied by navigating to the list URL with a `search` query
        // parameter (verified live on 2026-11-04: navigating to
        // /crm/opportunities/opportunities-view/?section=sales&search=<text>
        // lists exactly the rows containing that text). The tests use that
        // verified route.
        this.listRows = page.locator('tbody tr');

        // Required text field.
        this.opportunityName = this.modal.locator('#id_name');

        // Same Select2 pattern as the other Horilla forms (including the
        // `select2-pagination` widgets on this form, whose options are
        // pre-rendered in the DOM — verified live 2026-11-04): the original
        // <select> stays in the DOM, so the selects are addressed by their
        // form name and driven with selectOption({ force: true }), which
        // still fires the change events Select2 listens to.
        this.stage = this.modal.locator('select[name="stage"]');
        this.owner = this.modal.locator('select[name="owner"]');
        this.account = this.modal.locator('select[name="account"]');

        // Verified on 2026-11-04 (leads/contacts/accounts pattern): saving
        // navigates to the opportunity detail page and shows the SweetAlert2
        // confirmation.
        this.successDialog = page.locator('.swal2-title').filter({
            hasText: /opportunity created successfully/i,
        });
    }

    // Navigate to the opportunities list and dismiss any popup that opens
    // over it.
    async open() {
        await this.page.goto('/crm/opportunities/opportunities-view/?section=sales', { waitUntil: 'domcontentloaded' });
        await expect(
            this.newButton,
            'the Opportunities list page did not finish loading'
        ).toBeVisible();
        await this.page.keyboard.press('Escape');
    }

    // Open the New Opportunity create form.
    async openCreateForm() {
        await this.newButton.click();
        await expect(
            this.opportunityName,
            'the New Opportunity modal did not open'
        ).toBeVisible();
    }

    // Fill the form fields. `name` is optional: leaving it out tests the
    // required-field validation. Verified required fields: Stage (starts
    // empty "- Select an option -"), Opportunity Name, Owner (also starts
    // empty). `amount` and `closeDate` are optional but persisted fields
    // (verified live). If `selectFirstAccount` is true, the first account
    // option is selected and its exact "Name - <id>" label is returned so
    // the test can assert it on the record's detail page (no hard-coded
    // account).
    async fillOpportunityForm({ name, stage, amount, closeDate } = {}, { selectFirstAccount = false } = {}) {
        if (name != null) {
            await this.opportunityName.fill(name);
        }

        // Stage is a required dropdown with fixed demo options (Prospecting,
        // Qualification, ... verified live 2026-11-04).
        await this.stage.selectOption({ label: stage, force: true });

        // Owner is a required dropdown that starts empty. Pick the first
        // user option — any demo user is a valid owner.
        await this.owner.selectOption({ index: 1, force: true });

        if (amount != null) {
            await this.modal.locator('#id_amount').fill(amount);
        }
        if (closeDate != null) {
            await this.modal.locator('#id_close_date').fill(closeDate);
        }

        let accountLabel = null;
        if (selectFirstAccount) {
            await this.account.selectOption({ index: 1, force: true });
            accountLabel = await this.account.evaluate((el) => {
                const option = el.options[el.selectedIndex];
                return option ? option.textContent.trim() : null;
            });
        }

        return { accountLabel };
    }

    // Save and expect the confirmation dialog; the detail-page redirect is
    // handled by the test.
    async saveAndExpectSuccess() {
        await this.saveButton.click();
        await expect(
            this.successDialog,
            'expected the "Opportunity created successfully." confirmation after saving'
        ).toBeVisible();
    }

    // Search the opportunities list for a unique value (the opportunity
    // name) via the app's verified search URL parameter. The applied search
    // also opens a "Filters" panel over the table (verified live), which is
    // dismissed the same way as the other overlays.
    async searchOpportunityByName(opportunityNameParam) {
        await this.page.goto(
            `/crm/opportunities/opportunities-view/?section=sales&search=${encodeURIComponent(opportunityNameParam)}`,
            { waitUntil: 'domcontentloaded' }
        );
        await expect(
            this.newButton,
            'the Opportunities list did not load after searching'
        ).toBeVisible();
        await this.page.keyboard.press('Escape');
    }

    // The single list row matching the unique search value.
    getOpportunityRowByName(opportunityNameParam) {
        return this.listRows.filter({ hasText: opportunityNameParam });
    }

    // Approved temporary fallback (the demo's HTMX overlay regression,
    // verified 2026-11-04, blocks row clicks on this module's list too): open
    // the matched row's record by its verified detail URL. The matching
    // row's name cell carries the exact `hx-get` URL the app's row action
    // follows. The URL is extracted from that DOM attribute — never
    // constructed or guessed — and asserted to be the opportunity detail
    // route before it is navigated to. The tests then verify the persisted
    // record fields on the loaded detail page.
    async openRowDetail(matchingRow) {
        const nameCell = matchingRow.locator('td').nth(1);
        await expect(
            nameCell,
            'no matching opportunity row was available to resolve its detail URL'
        ).toBeVisible();
        const detailUrl = await nameCell.getAttribute('hx-get');
        await expect(
            detailUrl,
            'the matching opportunity row did not expose its detail URL'
        ).toMatch(/^\/crm\/opportunities\/opportunity-detail-view\/\d+\/?/);
        await this.page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
        await expect(
            this.page,
            'opening the extracted detail URL should land on that opportunity detail page'
        ).toHaveURL(/\/crm\/opportunities\/opportunity-detail-view\/\d+\/?/);
    }
}

module.exports = { OpportunitiesPage };