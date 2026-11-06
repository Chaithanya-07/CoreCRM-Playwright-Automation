const { expect } = require('@playwright/test');

class ActivitiesPage {

    constructor(page) {
        this.page = page;

        // The "New" activity form opens inside this shared modal.
        this.modal = page.locator('#modalBox');

        this.newButton = page.getByRole('button', { name: 'New', exact: true });
        // The create form has a single "Save" button.
        this.saveButton = this.modal.getByRole('button', { name: 'Save', exact: true });

        // Activities list page. As on the other module lists, the search is
        // applied by navigating to the list URL with a `search` query
        // parameter (verified live on 2026-11-04: navigating to
        // /activity/activity-view/?section=schedule&search=<text> lists
        // exactly the rows containing that text). The tests use that
        // verified route.
        this.listRows = page.locator('tbody tr');

        // Required/association controls (Select2-backed selects; the
        // original <select> stays in the DOM, so the established project
        // pattern applies — verified live 2026-11-04 that the change fires
        // the form's HTMX re-render).
        this.activityType = this.modal.locator('select[name="activity_type"]');
        this.relatedContentType = this.modal.locator('select[name="content_type"]');

        // The Select2 rendered value of the type selector — used as a
        // deterministic wait for the form's HTMX re-render to finish.
        this.activityTypeRendered = this.modal.locator('#select2-id_activity_type-container');
        this.relatedContentTypeRendered = this.modal.locator('#select2-id_content_type-container');

        // Required text field.
        this.subject = this.modal.locator('#id_subject');

        // The visible Select2 widget of the dependent "Related To" control.
        // Its options are NOT pre-rendered in the DOM; they load remotely
        // when the widget is opened and searched (verified live
        // 2026-11-04), so selection happens through the real widget.
        this.relatedToWidget = this.modal.locator('#select2-id_object_id-container');

        // Verified on 2026-11-04: saving shows this SweetAlert2
        // confirmation and stays on the activities list (no detail
        // redirect — different from the other modules).
        this.successDialog = page.locator('.swal2-title').filter({
            hasText: /activity created successfully/i,
        });
    }

    // Navigate to the activities list and dismiss any popup that opens
    // over it.
    async open() {
        await this.page.goto('/activity/activity-view/?section=schedule', { waitUntil: 'domcontentloaded' });
        await expect(
            this.newButton,
            'the Activities list page did not finish loading'
        ).toBeVisible();
        await this.page.keyboard.press('Escape');
    }

    // Open the New Activity create form.
    async openCreateForm() {
        await this.newButton.click();
        await expect(
            this.subject,
            'the Create Activity modal did not open'
        ).toBeVisible();
    }

    // Mark the current form DOM so a pending HTMX re-render can be
    // detected. The type selectors re-render the whole create form
    // asynchronously (verified live 2026-11-04
    // `hx-get="/activity/activity-create-form/"`): the Select2 rendered
    // span refreshes synchronously, so its text alone is NOT a
    // completion signal — the async re-render can still swap the whole
    // form afterwards, and two pending re-renders can arrive out of
    // order and reset fields. The re-render swap replaces the Subject
    // input with a fresh element, so the marker disappearing from the
    // current #id_subject element is the deterministic completion
    // signal.
    async markFormForReRender() {
        const marker = `automation-probe-${Date.now()}`;
        await this.subject.evaluate(
            (element, value) => { element.dataset.probeMarker = value; },
            marker
        );
        return marker;
    }

    // Wait until the form's HTMX re-render has actually swapped in fresh
    // DOM (the marked render probe is gone).
    async waitForFormReRender(marker) {
        await this.page.waitForFunction(
            (value) => {
                const subject = document.querySelector('#id_subject');
                return Boolean(subject) && subject.dataset.probeMarker !== value;
            },
            marker,
            { timeout: 30000 }
        );
    }

    // Select an Activity Type and wait for the form's HTMX re-render to
    // finish (verified live: picking a type re-renders the whole form and
    // the re-rendered widget shows the chosen label). When the form
    // already holds the requested type nothing changes and no re-render
    // fires.
    async selectActivityType(label) {
        const selected = await this.activityType.evaluate(
            (element) => {
                const option = element.options[element.selectedIndex];
                return option ? option.textContent.trim() : null;
            }
        );
        if (selected !== label) {
            const probe = await this.markFormForReRender();
            await this.activityType.selectOption({ label, force: true });
            await this.waitForFormReRender(probe);
        }
        await expect(
            this.activityTypeRendered,
            `selecting the activity type ${label} did not finish re-rendering the form`
        ).toHaveText(label);
    }

    // Select the Related Content Type (e.g. Lead) and wait for the
    // associated form re-render, after which the Related To widget becomes
    // available on the settled form.
    async selectRelatedContentType(label) {
        const selected = await this.relatedContentType.evaluate(
            (element) => {
                const option = element.options[element.selectedIndex];
                return option ? option.textContent.trim() : null;
            }
        );
        if (selected !== label) {
            const probe = await this.markFormForReRender();
            await this.relatedContentType.selectOption({ label, force: true });
            await this.waitForFormReRender(probe);
        }
        await expect(
            this.relatedContentTypeRendered,
            `selecting the related content type ${label} did not finish re-rendering the form`
        ).toHaveText(label);
    }

    // Fill the required Subject. Other form fields are optional.
    async fillSubject(subject) {
        await this.subject.fill(subject);
    }

    // Select the "Related To" record through the real Select2 widget: the
    // widget's options are not in the DOM, so a genuine open-search-select
    // interaction is used (real clicks and keyboard — no force clicks, no
    // JS dispatch). `term` narrows the remote options; the FIRST rendered
    // option is selected and its exact label is returned so the tests can
    // assert the saved association with the same value (never hard-coded).
    async selectFirstRelatedTo(term) {
        await this.relatedToWidget.click();
        // The open Select2 dropdown holds a focused search field.
        const searchBox = this.page.locator('.select2-dropdown input.select2-search__field');
        await expect(
            searchBox,
            'opening the Related To widget did not present its search field'
        ).toBeVisible();
        await searchBox.fill(term);
        // Wait for the remote, term-filtered options to arrive. Select2
        // first shows the results of the open-triggered initial fetch and
        // a disabled "Searching…" placeholder (`loading-results`) while a
        // request is in flight — the settled dropdown must contain a real,
        // selectable option matching the search term.
        await this.page.waitForFunction(
            (searchTerm) => {
                const opts = [
                    ...document.querySelectorAll('.select2-results__option:not(.loading-results)'),
                ];
                return opts.some(
                    (option) =>
                        option.getAttribute('aria-disabled') !== 'true' &&
                        option.textContent.toLowerCase().includes(String(searchTerm).toLowerCase())
                );
            },
            term,
            { timeout: 10000 }
        );
        // Select a real rendered option by clicking it — the same
        // interaction verified live 2026-11-04.
        const firstOption = this.page
            .locator(
                '.select2-results__option:not(.loading-results):not([aria-disabled="true"])'
            )
            .filter({ hasText: term })
            .first();
        const label = (await firstOption.textContent()).trim();
        await firstOption.click();
        await expect(
            this.relatedToWidget,
            'the selected Related To option should be shown in the widget'
        ).toHaveText(label);
        return label;
    }

    // Save and expect the confirmation dialog. The app stays on the
    // activities list (no redirect); the test handles that difference.
    async saveAndExpectSuccess() {
        await this.saveButton.click();
        await expect(
            this.successDialog,
            'expected the "Activity created successfully." confirmation after saving'
        ).toBeVisible();
    }

    // Search the activities list for a unique value (the activity subject)
    // via the app's verified search URL parameter.
    async searchActivityBySubject(subject) {
        await this.page.goto(
            `/activity/activity-view/?section=schedule&search=${encodeURIComponent(subject)}`,
            { waitUntil: 'domcontentloaded' }
        );
        await expect(
            this.newButton,
            'the Activities list did not load after searching'
        ).toBeVisible();
        await this.page.keyboard.press('Escape');
    }

    // The single list row matching the unique search value.
    getActivityRowBySubject(subject) {
        return this.listRows.filter({ hasText: subject });
    }

    // Open the matched row's record by its verified detail URL (approved
    // mentor-approved fallback; the known HTMX overlay blocks row clicks
    // app-wide, verified 2026-11-04 on this module too). The matching
    // row's subject cell carries the exact `hx-get` URL the app's row
    // action follows. The URL is extracted from that DOM attribute — never
    // constructed or guessed — and asserted to be the activity detail
    // route before it is navigated to.
    async openRowDetail(matchingRow) {
        const nameCell = matchingRow.locator('td').nth(1);
        await expect(
            nameCell,
            'no matching activity row was available to resolve its detail URL'
        ).toBeVisible();
        const detailUrl = await nameCell.getAttribute('hx-get');
        await expect(
            detailUrl,
            'the matching activity row did not expose its detail URL'
        ).toMatch(/^\/activity\/activity-detail\/\d+\/?/);
        await this.page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
        await expect(
            this.page,
            'opening the extracted detail URL should land on that activity detail page'
        ).toHaveURL(/\/activity\/activity-detail\/\d+\/?/);
    }
}

module.exports = { ActivitiesPage };