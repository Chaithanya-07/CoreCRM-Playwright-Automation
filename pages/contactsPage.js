const { expect } = require('@playwright/test');

class ContactsPage {

    constructor(page) {
        this.page = page;

        // The "New contact" form opens inside this shared modal.
        this.modal = page.locator('#modalBox');

        this.newButton = page.getByRole('button', { name: 'New', exact: true });
        // There are two save buttons in the form: "Save & New" and "Save".
        this.saveButton = this.modal.getByRole('button', { name: 'Save', exact: true });

        // Contacts list page. The module has a quick-search widget, but its
        // apply action is ambiguous under automation; the app itself applies
        // the search by navigating to the list with a `search` query
        // parameter (verified live on 2026-11-03: navigating to
        // /crm/contacts/contacts-view/?section=people&search=<text> lists
        // exactly the rows containing that text). The tests use that
        // verified route.
        this.listRows = page.locator('tbody tr');

        // Text fields.
        this.firstName = this.modal.getByLabel('First Name');
        this.lastName = this.modal.getByLabel('Last Name');
        this.email = this.modal.getByLabel('Email');
        this.title = this.modal.getByLabel('Title');

        // Every dropdown in this form is a Select2 widget: the original
        // <select> stays in the DOM but is visually hidden and wrapped by a
        // <span role="combobox">. Locating via getByLabel would resolve to
        // both elements (strict mode violation), so the select is addressed
        // by its form name and driven with selectOption({ force: true }),
        // which still fires the change events Select2 listens to.
        this.contactOwner = this.modal.locator('select[name="contact_owner"]');

        // Verified on 2026-11-03: saving a contact navigates to the contact
        // detail page and shows this SweetAlert2 confirmation dialog.
        this.successDialog = page.locator('.swal2-title').filter({
            hasText: /contact created successfully/i,
        });
    }

    // Navigate to the contacts list and dismiss any popup that opens over it.
    async open() {
        await this.page.goto('/crm/contacts/contacts-view/?section=people', { waitUntil: 'domcontentloaded' });
        await expect(
            this.newButton,
            'the Contacts list page did not finish loading'
        ).toBeVisible();
        await this.page.keyboard.press('Escape');
    }

    // Create a contact through the New Contact form.
    async createContact({ firstName, lastName, email, title }) {
        await this.newButton.click();
        await expect(this.firstName, 'the New Contact modal did not open').toBeVisible();

        await this.firstName.fill(firstName);
        await this.lastName.fill(lastName);
        await this.email.fill(email);
        if (title != null) {
            await this.title.fill(title);
        }

        // Contact Owner is a required dropdown and starts empty ("---------").
        // Pick the first user option — any demo user is a valid owner.
        await this.contactOwner.selectOption({ index: 1, force: true });

        await this.saveButton.click();

        // The site navigates to the new contact's detail page and raises this
        // confirmation dialog. The dialog dismisses itself after a few
        // seconds; the tests click no button on it, since the record is
        // already saved.
        await expect(
            this.successDialog,
            'expected the "Contact created successfully." confirmation after saving'
        ).toBeVisible();
    }

    // Search the contacts list for a unique value (e.g. the contact's email)
    // via the app's verified search URL parameter.
    async searchContactByEmail(email) {
        await this.page.goto(
            `/crm/contacts/contacts-view/?section=people&search=${encodeURIComponent(email)}`,
            { waitUntil: 'domcontentloaded' }
        );
        await expect(
            this.newButton,
            'the Contacts list did not load after searching'
        ).toBeVisible();
    }

    // The single list row matching the unique search value.
    getContactRowByEmail(email) {
        return this.listRows.filter({ hasText: email });
    }

    // Open the record of the row matching the unique search value. Rows are
    // not links in the DOM; verified live, clicking the first visible text
    // cell of a row navigates to that record's detail page. The row is
    // resolved explicitly through getContactRowByEmail, so the click can
    // never silently target an unrelated first row.
    //
    // CURRENTLY UNUSABLE (demo regression, verified 2026-11-04): the demo's
    // lists were converted to HTMX partial navigation and the tables'
    // `#loading-indicator` overlay (transparent, pointer-events: auto)
    // intercepts every pointer event over the rows — real-user clicks
    // included. Kept so the direct row interaction can be restored the
    // moment the demo removes that overlay; the enabled path is the
    // approved verified-URL fallback, openRowDetail below.
    async openContactRow(email) {
        const matchingRow = this.getContactRowByEmail(email);
        const nameCell = matchingRow.locator('td').nth(1);
        await expect(
            nameCell,
            `no contact row matching the unique email ${email} was available to open`
        ).toBeVisible();
        await nameCell.click();
    }

    // Approved temporary fallback (mentor option (b), Phase 2B.2): open the
    // matched row's record by its verified detail URL. The matching row's
    // name cell carries the exact `hx-get` URL the app's row action follows
    // (verified live on 2026-11-04). The URL is extracted from that DOM
    // attribute — never constructed or guessed — and asserted to be the
    // contact detail route before it is navigated to. The tests then verify
    // the persisted record fields on the loaded detail page.
    async openRowDetail(matchingRow) {
        const nameCell = matchingRow.locator('td').nth(1);
        await expect(
            nameCell,
            'no matching contact row was available to resolve its detail URL'
        ).toBeVisible();
        const detailUrl = await nameCell.getAttribute('hx-get');
        await expect(
            detailUrl,
            'the matching contact row did not expose its detail URL'
        ).toMatch(/^\/crm\/contacts\/contact-detail-view\/\d+\/?/);
        await this.page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
        await expect(
            this.page,
            'opening the extracted detail URL should land on that contact detail page'
        ).toHaveURL(/\/crm\/contacts\/contact-detail-view\/\d+\/?/);
    }
}

module.exports = { ContactsPage };