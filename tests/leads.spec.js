import { test, expect } from '@playwright/test';
import { LeadsPage } from '../pages/leadsPage';
import { uniqueEmail } from '../utils/test-data';

const LEAD_DATA = {
    firstName: 'John',
    lastName: 'Doe',
    title: 'QA Engineer',
    company: 'Acme',
};

test('user should be able to create a lead and find it again in the leads list', async ({ page }) => {
    const leadsPage = new LeadsPage(page);
    const email = uniqueEmail('john.doe');

    // 1. Create the lead.
    await leadsPage.open();
    await leadsPage.createLead({ ...LEAD_DATA, email });

    await expect(
        page,
        'expected to land on the detail page of the newly created lead'
    ).toHaveURL(/\/crm\/leads\/leads-detail\/\d+\/?/);

    // 2. Independent persistence verification through the leads list:
    //    search for the lead by its unique email.
    await leadsPage.searchLeadByEmail(email);
    const matchingRow = leadsPage.getLeadRowByEmail(email);
    await expect(
        matchingRow,
        `the leads list should contain exactly one row with the unique lead email ${email}`
    ).toHaveCount(1);
    await expect(
        matchingRow.getByText(email),
        'the matching list row should show the created lead email'
    ).toBeVisible();

    // 3. Open the matched row and verify the persisted detail fields. The
    //    row's record is opened through the approved verified-URL fallback
    //    (the demo's HTMX overlay currently blocks row clicks; the detail
    //    URL is extracted from the matching row's own `hx-get` attribute).
    await leadsPage.openRowDetail(matchingRow);
    await expect(
        page,
        'opening the search result should land on that lead detail page'
    ).toHaveURL(/\/crm\/leads\/leads-detail\/\d+\/?/);
    // The demo repeats record values on the detail page (header card and
    // details tab), so the assertions are scoped to the detail header card
    // — the visible record summary — to match exactly one element each.
    await expect(
        page.locator('#detailHeaderCard').getByText(email),
        'the persisted lead detail must show the exact unique email'
    ).toBeVisible();
    await expect(
        page.locator('#detailHeaderCard').getByText('Lead Source: Website'),
        'the persisted lead detail must show the selected lead source'
    ).toBeVisible();
});