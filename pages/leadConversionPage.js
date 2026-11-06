const { expect } = require('@playwright/test');

class LeadConversionPage {
    constructor(page) {
        this.page = page;

        // The conversion UI is not the shared create-record modal: it loads
        // into the lead detail page's own content modal (#contentModal /
        // #contentModalBox), verified live on 2026-11-04.
        this.container = page.locator('#contentModalBox');

        // "Lead Conversion" form title, rendered when the modal opens.
        this.formTitle = this.container.getByText('Lead Conversion', { exact: true });

        // The conversion form itself (hx-post to /crm/leads/convert-lead/<id>/).
        this.form = this.container.locator('form');

        // Opened from the lead detail page: the stage-pipeline "Convert"
        // step (the detail page also has an action-menu link with the same
        // hx-get; that link renders zero-size, so only the visible pipeline
        // control is targeted here).
        this.convertTrigger = page
            .locator('[hx-target="#contentModalBox"]')
            .filter({ hasText: 'Convert' })
            .filter({ visible: true });

        // The submit button of the conversion form.
        this.convertButton = this.form.getByRole('button', { name: 'Convert' });

        // Default "Create New" mode pre-fills (values observed live, exactly
        // as the server renders them when the modal opens):
        // - Account Name            <- the Lead's Lead Company
        // - Contact First/Last Name <- the Lead's First/Last Name
        // - Opportunity Name        <- "<Lead Company> - Opportunity"
        this.accountName = this.form.locator('input[name="account_name"]');
        this.contactFirstName = this.form.locator('input[name="first_name"]');
        this.contactLastName = this.form.locator('input[name="last_name"]');
        this.opportunityName = this.form.locator('input[name="opportunity_name"]');

        // The three entity mode radios ("Create New" is the rendered default
        // for all three; no skip/omit option exists in the form).
        this.accountModeCreateNew = this.form.locator(
            'input[name="account_action"][value="create_new"]'
        );
        this.contactModeCreateNew = this.form.locator(
            'input[name="contact_action"][value="create_new"]'
        );
        this.opportunityModeCreateNew = this.form.locator(
            'input[name="opportunity_action"][value="create_new"]'
        );

        // After a successful conversion the form is replaced by a result
        // panel (verified: NOT a SweetAlert2 dialog like the create flows):
        // a tick image, the heading "Your lead has been converted", and
        // three result cards (Account / Contact / Opportunity), each showing
        // the created record's name as a link to its detail page.
        this.convertedHeading = this.container
            .locator('h2')
            .filter({ hasText: 'Your lead has been converted' });
    }

    // Open the conversion modal from the (already open) lead detail page.
    async openConversionForm() {
        await this.convertTrigger.click();
        await expect(
            this.formTitle,
            'the Lead Conversion form did not open'
        ).toBeVisible();
    }

    // The application pre-fills the conversion form from the lead. The test
    // asserts the observed pre-filled mappings instead of re-typing them,
    // so the lead's field mapping is verified, not invented.
    async expectPreFilledFromLead({ company, firstName, lastName, opportunity }) {
        await expect(
            this.accountName,
            'the conversion form should pre-fill the account name from the lead company'
        ).toHaveValue(company);
        await expect(
            this.contactFirstName,
            'the conversion form should pre-fill the contact first name from the lead'
        ).toHaveValue(firstName);
        await expect(
            this.contactLastName,
            'the conversion form should pre-fill the contact last name from the lead'
        ).toHaveValue(lastName);
        await expect(
            this.opportunityName,
            'the conversion form should pre-fill the opportunity name from the lead company'
        ).toHaveValue(opportunity);

        // "Create New" must be the selected option for all three entities.
        await expect(
            this.accountModeCreateNew,
            'the account conversion mode should default to Create New'
        ).toBeChecked();
        await expect(
            this.contactModeCreateNew,
            'the contact conversion mode should default to Create New'
        ).toBeChecked();
        await expect(
            this.opportunityModeCreateNew,
            'the opportunity conversion mode should default to Create New'
        ).toBeChecked();
    }

    // Submit the conversion (all three entities in their default
    // "Create New" mode) and wait for the verified success panel.
    async convert() {
        await this.convertButton.click();
        await expect(
            this.convertedHeading,
            'the conversion did not show the "Your lead has been converted" result panel'
        ).toBeVisible();
    }

    // The three result cards each hold the created record's name as a link
    // (with the real detail URL in its `hx-get` attribute). The URL is
    // extracted from the panel's DOM — never constructed — and asserted to
    // match the record's route before it is navigated to by the test.
    createdRecordLink(sectionLabel, routePattern) {
        return this.container
            .locator('.col-span-4')
            .filter({ hasText: sectionLabel })
            .locator(`[hx-get*="${routePattern}"]`);
    }

    async getCreatedRecordUrl(sectionLabel, routePattern, name, urlMatcher) {
        const link = this.createdRecordLink(sectionLabel, routePattern);
        await expect(
            link,
            `the conversion result panel did not show the created ${name} link`
        ).toBeVisible();
        const url = await link.getAttribute('hx-get');
        await expect(
            url,
            `the created ${name} link did not expose its detail URL`
        ).toMatch(urlMatcher);
        return url;
    }

    // The leads list's view-type selector includes a verified
    // "Converted Lead" view; converted leads appear there and disappear
    // from the default list.
    async openConvertedLeadsView() {
        await this.page.goto('/crm/leads/leads-view/?section=sales&view_type=converted_lead', {
            waitUntil: 'domcontentloaded',
        });
        await expect(
            this.page.locator('#viewTypeSelect'),
            'the Converted Lead leads view did not load'
        ).toBeVisible();
    }

    // Relationship verification on authoritative views (live-verified):
    // - the opportunity's Details tab holds an Account row for the created
    //   account (rendered "<account name> - <account id>");
    // - the account's Related Lists tab holds the created contact under
    //   "Related Contacts" and the created opportunity under "Opportunities"
    //   (the contact itself exposes no account field on its visible details
    //   view, so the account side is the authoritative one).
    // recordUrls are the detail URLs extracted from the conversion result
    // panel; the record ids are read from them, never guessed.
    async expectOpportunityAccountLink(opportunityAccountRow, accountName) {
        await expect(
            opportunityAccountRow.getByText(accountName),
            'the created opportunity Details tab must link the converted account'
        ).toBeVisible();
    }

    // The demo persists the last active detail tab per user (verified: the
    // account detail page did not always open on the Details tab), so every
    // tab-scoped assertion opens its tab explicitly first.
    async openDetailsTab() {
        const detailsTab = this.page.getByRole('tab', { name: 'Details' });
        await expect(
            detailsTab,
            'the record detail page did not show the Details tab'
        ).toBeVisible();
        await detailsTab.click();
    }

    // Relationship assertions DEFERRED beyond expectOpportunityAccountLink
    // (demo limitation, verified live 2026-11-04): the account detail
    // page's Related Lists side lists — the only view listing the created
    // contact/opportunity on the account side — sit inside a tab panel
    // whose `#tab-related-lists-indicator` overlay (htmx-indicator
    // tabloading) is permanently rendered with opacity 0 and
    // pointer-events: auto, so it intercepts every pointer event over the
    // side-list anchors (real-user clicks included); the anchors are not
    // keyboard-bound in the demo's markup; and their `hx-get` content URL
    // is an htmx-only route (405 without the htmx request header). The
    // relationship is therefore asserted only on the surfaces the demo
    // still exposes (opportunity Details-tab account link) and documented
    // in the phase discovery report.
}

module.exports = { LeadConversionPage };