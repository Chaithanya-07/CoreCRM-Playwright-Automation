const { expect } = require('@playwright/test');

class CampaignsPage {

    constructor(page) {
        this.page = page;

        // The "New" campaign form opens inside this shared modal.
        this.modal = page.locator('#modalBox');

        this.newButton = page.getByRole('button', { name: 'New', exact: true });
        // The create form has "Save & New" and "Save"; the tests use "Save"
        // (exact match so it never hits "Save & New").
        this.saveButton = this.modal.getByRole('button', { name: 'Save', exact: true });

        // Campaigns list page. As on the other module lists, the search is
        // applied by navigating to the list URL with a `search` query
        // parameter (verified live on 2026-11-04: navigating to
        // /crm/campaigns/campaign-view/?section=sales&search=<text>
        // server-returns exactly the rows containing that text).
        this.listRows = page.locator('tbody tr');

        // Required text field.
        this.campaignName = this.modal.locator('#id_campaign_name');

        // Select2-backed selects; the original <select> stays in the DOM, so
        // the established project pattern applies (verified live 2026-11-04
        // that all options are pre-rendered — no remote loading, and no HTMX
        // form re-render is triggered by these selects like on Activities).
        this.owner = this.modal.locator('select[name="campaign_owner"]');
        this.type = this.modal.locator('select[name="campaign_type"]');
        this.typeRendered = this.modal.locator('#select2-id_campaign_type-container');

        // Optional, persisted number fields (verified live: they save and
        // render with the demo's currency formatting).
        this.expectedRevenue = this.modal.locator('#id_expected_revenue');
        this.budgetCost = this.modal.locator('#id_budget_cost');

        // Verified on 2026-11-04: saving shows this SweetAlert2 confirmation
        // and redirects to the campaign detail page (like the other CRM
        // modules).
        this.successDialog = page.locator('.swal2-title').filter({
            hasText: /campaign created successfully/i,
        });
    }

    // Navigate to the campaigns list and dismiss any popup that opens
    // over it.
    async open() {
        await this.page.goto('/crm/campaigns/campaign-view/?section=sales', { waitUntil: 'domcontentloaded' });
        await expect(
            this.newButton,
            'the Campaigns list page did not finish loading'
        ).toBeVisible();
        await this.page.keyboard.press('Escape');
    }

    // Open the Create Campaign form.
    async openCreateForm() {
        await this.newButton.click();
        await expect(
            this.campaignName,
            'the Create Campaign modal did not open'
        ).toBeVisible();
    }

    // Fill the campaign form. The Campaign Owner dropdown is REQUIRED and
    // starts empty; like the Opportunities owner, the first available user
    // option is selected at runtime and its exact label is captured and
    // returned (never hard-coded). The Type dropdown is required too; a
    // verified option label is expected (e.g. "Email").
    async fillCampaignForm({ name, type, revenue, budget } = {}) {
        await expect(
            this.campaignName,
            'the Create Campaign modal did not open'
        ).toBeVisible();
        if (name != null) {
            await this.campaignName.fill(name);
        }
        // Select the first available user option.
        await this.owner.selectOption({ index: 1, force: true });
        const ownerLabelCaptured = await this.owner.evaluate((el) => {
            const option = el.options[el.selectedIndex];
            return option ? option.textContent.trim() : null;
        });
        let selectedType = null;
        if (type != null) {
            await this.type.selectOption({ label: type, force: true });
            // The Select2 rendered span refreshes synchronously on change;
            // assert it as the deterministic signal that the choice took.
            await expect(
                this.typeRendered,
                `selecting the campaign type ${type} did not render in the widget`
            ).toHaveText(type);
            selectedType = type;
        }
        if (revenue != null) {
            await this.expectedRevenue.fill(revenue);
        }
        if (budget != null) {
            await this.budgetCost.fill(budget);
        }
        return { ownerLabel: ownerLabelCaptured, type: selectedType };
    }

    // Save and expect the confirmation dialog. The app redirects to the
    // campaign detail page; the test asserts that URL separately.
    async saveAndExpectSuccess() {
        await this.saveButton.click();
        await expect(
            this.successDialog,
            'expected the "Campaign created successfully." confirmation after saving'
        ).toBeVisible();
    }

    // Search the campaigns list for a unique value (the campaign name) via
    // the app's verified search URL parameter.
    async searchCampaignByName(name) {
        await this.page.goto(
            `/crm/campaigns/campaign-view/?section=sales&search=${encodeURIComponent(name)}`,
            { waitUntil: 'domcontentloaded' }
        );
        await expect(
            this.newButton,
            'the Campaigns list did not load after searching'
        ).toBeVisible();
        await this.page.keyboard.press('Escape');
    }

    // The single list row matching the unique search value.
    getCampaignRowByName(name) {
        return this.listRows.filter({ hasText: name });
    }

    // Open the matched row's record by its verified detail URL (approved
    // mentor-approved fallback; the known HTMX overlay blocks row clicks
    // app-wide, verified live 2026-11-04 on this module too). The matching
    // row's campaign-name cell carries the exact `hx-get` URL the app's row
    // action follows. The URL is extracted from that DOM attribute — never
    // constructed or guessed — and asserted to be the campaign detail
    // route before it is navigated to.
    async openRowDetail(matchingRow) {
        const nameCell = matchingRow.locator('td').nth(1);
        await expect(
            nameCell,
            'no matching campaign row was available to resolve its detail URL'
        ).toBeVisible();
        const detailUrl = await nameCell.getAttribute('hx-get');
        await expect(
            detailUrl,
            'the matching campaign row did not expose its detail URL'
        ).toMatch(/^\/crm\/campaigns\/campaign-detail-view\/\d+\/?/);
        await this.page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
        await expect(
            this.page,
            'opening the extracted detail URL should land on that campaign detail page'
        ).toHaveURL(/\/crm\/campaigns\/campaign-detail-view\/\d+\/?/);
    }
}

module.exports = { CampaignsPage };