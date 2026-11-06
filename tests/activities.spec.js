import { test, expect } from '@playwright/test';
import { ActivitiesPage } from '../pages/activitiesPage';
import { LeadsPage } from '../pages/leadsPage';
import { uniqueActivitySubject, uniqueRelatedLead } from '../utils/test-data';

// Verified live on 2026-11-04: "Task" is one of the four fixed demo
// Activity Types (Event, Meeting, Task, Log Call). It is the module tab
// default and the type whose optional fields persist most reliably, so the
// positive test uses it. A new Task's Status defaults to "Not Started"
// (pre-filled; verified live).
const ACTIVITY_TYPE = 'Task';
const RELATED_CONTENT_TYPE = 'Lead';
// The Related To association is asserted on the activities list row —
// verified live (2026-11-04) that the activity detail page does NOT
// visibly display the related record.

test('user should be able to create an activity and find it again with its association in the list', async ({ page }) => {
    const activitiesPage = new ActivitiesPage(page);
    const leadsPage = new LeadsPage(page);
    const subject = uniqueActivitySubject();
    const relatedLead = uniqueRelatedLead();

    // 0. Create a dedicated lead to relate to. Previously the positive
    //    test searched the Related To widget for a hard-coded demo-data
    //    term, and the demo's seeded data reset made that term match
    //    nothing ("No results found"). Creating our own lead keeps the
    //    Select2 search term guaranteed to match exactly one record.
    await leadsPage.open();
    await leadsPage.createLead(relatedLead);

    // 1. Create the activity through the New Activity form.
    await activitiesPage.open();
    await activitiesPage.openCreateForm();
    await activitiesPage.selectActivityType(ACTIVITY_TYPE);
    await activitiesPage.selectRelatedContentType(RELATED_CONTENT_TYPE);
    await activitiesPage.fillSubject(subject);
    // Select the related Lead through the real widget and capture its
    // exact label so the persisted assertion uses the same value the form
    // was given (the association persists on the activities list row).
    // The widget's remote search matches the lead's COMPANY field (verified
    // live 2026-11-05: last name and email are not searched), so the unique
    // company is the guaranteed-to-match term.
    const relatedLabel = await activitiesPage.selectFirstRelatedTo(relatedLead.company);
    await activitiesPage.saveAndExpectSuccess();

    // Verified live: saving an activity stays on the activities list —
    // there is no detail-page redirect as on the other modules.
    await expect(
        page,
        'saving an activity must stay on the activities list'
    ).toHaveURL(/\/activity\/activity-view\/?/);

    // 2. Independent persistence verification through the activities list:
    //    search for the activity by its unique subject.
    await activitiesPage.searchActivityBySubject(subject);
    const matchingRow = activitiesPage.getActivityRowBySubject(subject);
    await expect(
        matchingRow,
        `the activities list should contain exactly one row with the unique subject ${subject}`
    ).toHaveCount(1);
    await expect(
        matchingRow.getByText(subject),
        'the matching list row should show the created activity subject'
    ).toBeVisible();
    // The saved Lead association is shown on the list row (the module's
    // authoritative persisted view of the relationship — the detail page
    // does not display it; verified live 2026-11-04).
    await expect(
        matchingRow.getByText(relatedLabel),
        'the saved activity row must show the selected related record'
    ).toBeVisible();

    // 3. Open the matched row's detail page through the approved
    //    verified-URL fallback (the demo's HTMX overlay currently blocks
    //    row clicks; the detail URL is extracted from the matching row's
    //    own `hx-get` attribute).
    await activitiesPage.openRowDetail(matchingRow);

    // The demo repeats record values on the detail page (header card,
    // details tab, breadcrumb, plus hidden "Recently viewed" copies), so
    // the assertions are scoped to the detail header card to match
    // exactly one element each.
    await expect(
        page.locator('#detailHeaderCard').getByRole('heading', { name: subject }),
        'the activity detail heading must show the created activity subject'
    ).toBeVisible();
    await expect(
        page.locator('#detailHeaderCard').getByText(`Activity Type: ${ACTIVITY_TYPE}`),
        'the persisted activity detail must show the selected activity type'
    ).toBeVisible();
    await expect(
        page.locator('#detailHeaderCard').getByText('Status: Not Started'),
        'the persisted activity detail must show the default status'
    ).toBeVisible();
});

test('the Create Activity form blocks submission when the required subject is missing', async ({ page }) => {
    const activitiesPage = new ActivitiesPage(page);

    await activitiesPage.open();
    await activitiesPage.openCreateForm();
    // Activity Type is selected (a real choice) and the required Subject
    // is left empty; the Status default and Owner defaults are pre-filled
    // by the app (verified live), so only the subject can block.
    await activitiesPage.selectActivityType(ACTIVITY_TYPE);
    await activitiesPage.saveButton.click();

    // Verified live 2026-11-04: the app blocks the submission client-side
    // with native HTML5 validation — the input reports a missing value
    // with the message "Please fill out this field.", the modal stays
    // open with no redirect and no record is created.
    await expect(
        activitiesPage.modal,
        'the create form must still be open after a blocked submission'
    ).toBeVisible();
    const subjectValidity = await activitiesPage.subject.evaluate((el) => ({
        valueMissing: el.validity.valueMissing,
        message: el.validationMessage,
    }));
    expect(
        subjectValidity.valueMissing,
        'the empty required Subject must be reported as a missing value'
    ).toBe(true);
    expect(
        subjectValidity.message,
        'the browser must report the missing required Subject'
    ).toBe('Please fill out this field.');
    await expect(
        activitiesPage.successDialog,
        'no success dialog may appear for a blocked submission'
    ).toHaveCount(0);
    await expect(
        page,
        'a blocked submission must not navigate away from the activities list'
    ).toHaveURL(/\/activity\/activity-view\/?/);
});