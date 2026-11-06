import { test, expect } from '@playwright/test';
import { OpportunitiesPage } from '../pages/opportunitiesPage';
import { uniqueOpportunityName } from '../utils/test-data';

// Verified live on 2026-11-04: fixed demo dropdown options for the required
// fields. The persisted Amount renders with the demo's currency formatting
// (a typed 4500 shows as INR 4,500.00), and the selected close-date value
// is rendered verbatim.
const OPPORTUNITY_STAGE = 'Prospecting';
const OPPORTUNITY_AMOUNT = '4500';
const OPPORTUNITY_AMOUNT_RENDERED = 'Amount: INR 4,500.00';
const OPPORTUNITY_CLOSE_DATE = '2027-06-30';

test('user should be able to create an opportunity and find it again in the opportunities list', async ({ page }) => {
    const opportunitiesPage = new OpportunitiesPage(page);
    const name = uniqueOpportunityName();

    // 1. Create the opportunity. The first account option is selected at
    //    runtime and its exact "Name - <id>" label is captured so the
    //    detail-page assertion uses the same value the form was given
    //    (verified live 2026-11-04: the Account association persists).
    await opportunitiesPage.open();
    await opportunitiesPage.openCreateForm();
    const { accountLabel } = await opportunitiesPage.fillOpportunityForm(
        {
            name,
            stage: OPPORTUNITY_STAGE,
            amount: OPPORTUNITY_AMOUNT,
            closeDate: OPPORTUNITY_CLOSE_DATE,
        },
        { selectFirstAccount: true }
    );
    await opportunitiesPage.saveAndExpectSuccess();

    await expect(
        page,
        'expected to land on the detail page of the newly created opportunity'
    ).toHaveURL(/\/crm\/opportunities\/opportunity-detail-view\/\d+\/?/);

    // 2. Independent persistence verification through the opportunities
    //    list: search for the opportunity by its unique name.
    await opportunitiesPage.searchOpportunityByName(name);
    const matchingRow = opportunitiesPage.getOpportunityRowByName(name);
    await expect(
        matchingRow,
        `the opportunities list should contain exactly one row with the unique opportunity name ${name}`
    ).toHaveCount(1);
    await expect(
        matchingRow.getByText(name),
        'the matching list row should show the created opportunity name'
    ).toBeVisible();

    // 3. Open the matched record and verify the persisted detail fields. The
    //    row's record is opened through the approved verified-URL fallback
    //    (the demo's HTMX overlay currently blocks row clicks; the detail
    //    URL is extracted from the matching row's own `hx-get` attribute).
    await opportunitiesPage.openRowDetail(matchingRow);
    await expect(
        page,
        'opening the search result should land on that opportunity detail page'
    ).toHaveURL(/\/crm\/opportunities\/opportunity-detail-view\/\d+\/?/);

    // The demo repeats record values on the detail page (header card,
    // details tab, breadcrumb, plus hidden "Recently viewed" copies), so
    // the assertions are scoped to the detail header card / the specific
    // field container to match exactly one element each.
    await expect(
        page.locator('#detailHeaderCard').getByRole('heading', { name }),
        'the opportunity detail heading must show the created opportunity name'
    ).toBeVisible();
    await expect(
        page.locator('#detailHeaderCard').getByText(OPPORTUNITY_AMOUNT_RENDERED),
        'the persisted opportunity detail must show the entered amount'
    ).toBeVisible();
    await expect(
        page.locator('#detailHeaderCard').getByText(`Close Date: ${OPPORTUNITY_CLOSE_DATE}`),
        'the persisted opportunity detail must show the entered close date'
    ).toBeVisible();
    // The selected stage renders in the record's stage pipeline.
    await expect(
        page.locator('#kanban-choices').getByText(OPPORTUNITY_STAGE),
        'the persisted opportunity detail must show the selected stage'
    ).toBeVisible();
    await expect(
        page.locator('#Account-details-tab').getByText(accountLabel),
        'the persisted opportunity detail must show the selected account'
    ).toBeVisible();
});

test('the New Opportunity form blocks submission when required fields are missing', async ({ page }) => {
    const opportunitiesPage = new OpportunitiesPage(page);

    await opportunitiesPage.open();
    await opportunitiesPage.openCreateForm();
    // Leave the required Opportunity Name empty; stage and owner are filled
    // so that only the missing name can block the submission.
    await opportunitiesPage.fillOpportunityForm({ stage: OPPORTUNITY_STAGE });
    await opportunitiesPage.saveButton.click();

    // Verified live 2026-11-04: the app blocks the submission client-side
    // with native HTML5 validation — the input reports a missing value with
    // the message "Please fill out this field.", the modal stays open with
    // no redirect and no record is created.
    await expect(
        opportunitiesPage.modal,
        'the create form must still be open after a blocked submission'
    ).toBeVisible();
    const nameValidity = await opportunitiesPage.opportunityName.evaluate((el) => ({
        valueMissing: el.validity.valueMissing,
        message: el.validationMessage,
    }));
    expect(
        nameValidity.valueMissing,
        'the empty required Opportunity Name must be reported as a missing value'
    ).toBe(true);
    expect(
        nameValidity.message,
        'the browser must report the missing required Opportunity Name'
    ).toBe('Please fill out this field.');
    await expect(
        opportunitiesPage.successDialog,
        'no success dialog may appear for a blocked submission'
    ).toHaveCount(0);
    await expect(
        page,
        'a blocked submission must not navigate away from the opportunities list'
    ).toHaveURL(/\/crm\/opportunities\/opportunities-view/);
});