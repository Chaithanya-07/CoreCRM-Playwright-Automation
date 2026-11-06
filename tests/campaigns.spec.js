import { test, expect } from '@playwright/test';
import { CampaignsPage } from '../pages/campaignsPage';
import { uniqueCampaignName } from '../utils/test-data';

// Verified live on 2026-11-04: "Email" is one of the Create Campaign form's
// seven fixed Type options (Email, Event, Social Media, Other, Webinar,
// Referral, Advertisement). The required Status comes pre-filled with the
// "Planned" default; the persisted amount/budget numbers render with the
// demo's currency formatting (typed 2500 shows as INR 2,500.00).
const CAMPAIGN_TYPE = 'Email';
const CAMPAIGN_REVENUE = '2500';
const CAMPAIGN_BUDGET = '1000';

test('user should be able to create a campaign and find it again in the campaigns list', async ({ page }) => {
    const campaignsPage = new CampaignsPage(page);
    const name = uniqueCampaignName();

    // 1. Create the campaign. The first owner option is selected at runtime
    //    and its exact label is captured so the assertions use the same
    //    value the form was given (never hard-coded).
    await campaignsPage.open();
    await campaignsPage.openCreateForm();
    const { ownerLabel } = await campaignsPage.fillCampaignForm({
        name,
        type: CAMPAIGN_TYPE,
        revenue: CAMPAIGN_REVENUE,
        budget: CAMPAIGN_BUDGET,
    });
    await campaignsPage.saveAndExpectSuccess();

    // Verified live like the other CRM modules (unlike Activities): saving
    // redirects to the new campaign's detail page.
    await expect(
        page,
        'expected to land on the detail page of the newly created campaign'
    ).toHaveURL(/\/crm\/campaigns\/campaign-detail-view\/\d+\/?/);

    // 2. Independent persistence verification through the campaigns list:
    //    search for the campaign by its unique name.
    await campaignsPage.searchCampaignByName(name);
    const matchingRow = campaignsPage.getCampaignRowByName(name);
    await expect(
        matchingRow,
        `the campaigns list should contain exactly one row with the unique name ${name}`
    ).toHaveCount(1);
    await expect(
        matchingRow.getByText(name),
        'the matching list row should show the created campaign name'
    ).toBeVisible();
    // Verified live: type, owner, the pre-filled "Planned" status default and
    // the currency-rendered amounts all persist on the fresh list row.
    await expect(
        matchingRow.getByText(CAMPAIGN_TYPE, { exact: true }),
        'the persisted campaign row must show the selected type'
    ).toBeVisible();
    await expect(
        matchingRow.getByText(ownerLabel, { exact: true }),
        'the persisted campaign row must show the selected campaign owner'
    ).toBeVisible();
    await expect(
        matchingRow.getByText('Planned', { exact: true }),
        'the persisted campaign row must show the pre-filled status default'
    ).toBeVisible();
    await expect(
        matchingRow.getByText('INR 2,500.00'),
        'the persisted campaign row must show the rendered expected revenue'
    ).toBeVisible();
    await expect(
        matchingRow.getByText('INR 1,000.00'),
        'the persisted campaign row must show the rendered budget cost'
    ).toBeVisible();

    // 3. Open the matched row's detail page through the approved
    //    verified-URL fallback (the demo's HTMX overlay currently blocks
    //    row clicks; the detail URL is extracted from the matching row's
    //    own `hx-get` attribute).
    await campaignsPage.openRowDetail(matchingRow);

    // The demo repeats record values on the detail page (header card with
    // responsive row copies, details panel, breadcrumb, plus hidden
    // "Recently viewed" copies), so the assertions are scoped to the header
    // card's own label-value rows (verified live on 2026-11-04: exactly one
    // row per label — Campaign Owner, Start Date, End Date, Type, Expected
    // Revenue, Expected Response).
    await expect(
        page.locator('#detailHeaderCard').getByRole('heading', { name }),
        'the campaign detail heading must show the created campaign name'
    ).toBeVisible();
    await expect(
        page.locator('#detailHeaderCard').locator('div.flex.flex-col.sm\\:flex-row').filter({ hasText: `Campaign Owner: ${ownerLabel}` }),
        'the persisted campaign detail must show the selected campaign owner'
    ).toBeVisible();
    await expect(
        page.locator('#detailHeaderCard').locator('div.flex.flex-col.sm\\:flex-row').filter({ hasText: `Type: ${CAMPAIGN_TYPE}` }),
        'the persisted campaign detail must show the selected type'
    ).toBeVisible();
    await expect(
        page.locator('#detailHeaderCard').locator('div.flex.flex-col.sm\\:flex-row').filter({ hasText: 'Expected Revenue: INR 2,500.00' }),
        'the persisted campaign detail must show the rendered expected revenue'
    ).toBeVisible();
});

test('the Create Campaign form blocks submission when the required campaign name is missing', async ({ page }) => {
    const campaignsPage = new CampaignsPage(page);

    await campaignsPage.open();
    await campaignsPage.openCreateForm();
    // The required dropdowns (owner, type) are given real choices and the
    // required Campaign Name is left empty; Status and Number Sent come
    // pre-filled by the app ("Planned" and 0), so only the name can block
    // (verified live 2026-11-04).
    await campaignsPage.fillCampaignForm({ type: CAMPAIGN_TYPE });
    await campaignsPage.saveButton.click();

    // Verified live 2026-11-04 (form has no novalidate; the input carries the
    // HTML required attribute): the app blocks the submission client-side
    // with native HTML5 validation — the input reports a missing value with
    // the message "Please fill out this field.", the modal stays open with
    // no redirect and no record is created.
    await expect(
        campaignsPage.modal,
        'the create form must still be open after a blocked submission'
    ).toBeVisible();
    const nameValidity = await campaignsPage.campaignName.evaluate((el) => ({
        valueMissing: el.validity.valueMissing,
        message: el.validationMessage,
    }));
    expect(
        nameValidity.valueMissing,
        'the empty required Campaign Name must be reported as a missing value'
    ).toBe(true);
    expect(
        nameValidity.message,
        'the browser must report the missing required Campaign Name'
    ).toBe('Please fill out this field.');
    await expect(
        campaignsPage.successDialog,
        'no success dialog may appear for a blocked submission'
    ).toHaveCount(0);
    await expect(
        page,
        'a blocked submission must not navigate away from the campaigns list'
    ).toHaveURL(/\/crm\/campaigns\/campaign-view\/?/);
});