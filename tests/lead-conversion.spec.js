import { test, expect } from '@playwright/test';

import { LeadsPage } from '../pages/leadsPage';
import { LeadConversionPage } from '../pages/leadConversionPage';
import { uniqueConvertLead } from '../utils/test-data';

// Verified demo conversion flow (Phase 2B.6 discovery): the lead detail
// page's Convert step opens the "Lead Conversion" modal pre-filled from the
// lead; submitting it creates a new Account, Contact and Opportunity and
// moves the lead to the leads list's "Converted Lead" view.
test('converting a lead creates the account, contact and opportunity and marks the lead converted', async ({ page }) => {
    const leadsPage = new LeadsPage(page);
    const conversion = new LeadConversionPage(page);
    const lead = uniqueConvertLead();
    const opportunityName = `${lead.company} - Opportunity`;

    // 1. Create a unique fictional lead through the leads UI.
    await leadsPage.open();
    await leadsPage.createLead({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        company: lead.company,
    });

    // 2. Independently find the exact lead: the leads list search by the
    //    unique email must return exactly one row.
    await leadsPage.searchLeadByEmail(lead.email);
    const matchingRow = leadsPage.getLeadRowByEmail(lead.email);
    await expect(
        matchingRow,
        `the leads list should contain exactly one row with the unique lead email ${lead.email}`
    ).toHaveCount(1);

    // 3. Open that exact lead via the approved verified-URL fallback (the
    //    demo's HTMX overlay blocks row clicks; the detail URL is extracted
    //    from the matching row's own `hx-get` attribute).
    await leadsPage.openRowDetail(matchingRow);
    const leadUrl = new URL(page.url());
    const leadDetailUrl = leadUrl.pathname + leadUrl.search;
    await expect(
        leadDetailUrl,
        'the opened lead page should be that lead detail page'
    ).toMatch(/^\/crm\/leads\/leads-detail\/\d+\/?/);

    // 4. Convert through the actual UI. The conversion modal pre-fills the
    //    form from the lead (the verified field mapping); the test asserts
    //    those pre-fills instead of re-typing them.
    await conversion.openConversionForm();
    await conversion.expectPreFilledFromLead({
        company: lead.company,
        firstName: lead.firstName,
        lastName: lead.lastName,
        opportunity: opportunityName,
    });
    await conversion.convert();

    // 5. The result panel links the three created records; each URL is
    //    extracted from the panel and asserted against its verified route.
    const accountUrl = await conversion.getCreatedRecordUrl(
        'Account',
        'account-detail-view',
        'account',
        /^\/crm\/accounts\/account-detail-view\/\d+\/?/
    );
    const contactUrl = await conversion.getCreatedRecordUrl(
        'Contact',
        'contact-detail-view',
        'contact',
        /^\/crm\/contacts\/contact-detail-view\/\d+\/?/
    );
    const opportunityUrl = await conversion.getCreatedRecordUrl(
        'Opportunity',
        'opportunity-detail-view',
        'opportunity',
        /^\/crm\/opportunities\/opportunity-detail-view\/\d+\/?/
    );

    // 6. Independently verify the created account on its authoritative
    //    detail page: the name (copied from the lead's company), and the
    //    verified field mappings — Account Source from the lead's Lead
    //    Source, Industry from the lead's Industry (verified live).
    await page.goto(accountUrl, { waitUntil: 'domcontentloaded' });
    await conversion.openDetailsTab();
    await expect(
        page.locator('#detailHeaderCard').getByText(lead.company),
        'the created account detail must show the company name from the converted lead'
    ).toBeVisible();
    await expect(
        page.locator('[id="Account Name-details-tab"]').getByText(lead.company),
        'the created account Details tab must show the account name'
    ).toBeVisible();
    await expect(
        page.locator('[id="Account Source-details-tab"]').getByText('Website'),
        'the created account Details tab must show the lead\'s lead source as account source'
    ).toBeVisible();
    await expect(
        page.locator('#Industry-details-tab').getByText('Finance'),
        'the created account Details tab must show the lead\'s industry'
    ).toBeVisible();

    // 7. Independently verify the created contact: its email is the lead's
    //    unique email.
    await page.goto(contactUrl, { waitUntil: 'domcontentloaded' });
    await expect(
        page.locator('#detailHeaderCard').getByText(lead.email),
        'the created contact detail must show the unique email from the converted lead'
    ).toBeVisible();

    // 8. Independently verify the created opportunity: its name and the
    //    authoritative account link in its Details tab.
    await page.goto(opportunityUrl, { waitUntil: 'domcontentloaded' });
    await expect(
        page.locator('#detailHeaderCard').getByText(opportunityName),
        'the created opportunity detail must show the opportunity name'
    ).toBeVisible();
    await conversion.openDetailsTab();
    await conversion.expectOpportunityAccountLink(
        page.locator('#Account-details-tab'),
        lead.company
    );

    // 9. The converted lead's state: it disappears from the default leads
    //    list search but appears in the verified "Converted Lead" view,
    //    whose matching row is the same lead record.
    await leadsPage.searchLeadByEmail(lead.email);
    await expect(
        leadsPage.getLeadRowByEmail(lead.email),
        'a converted lead must no longer appear in the default leads list search'
    ).toHaveCount(0);

    await conversion.openConvertedLeadsView();
    const convertedRow = leadsPage.getLeadRowByEmail(lead.email);
    await expect(
        convertedRow,
        'the Converted Lead view should contain exactly the converted lead row'
    ).toHaveCount(1);
    const convertedNameCell = convertedRow.locator('td').nth(1);
    await expect(
        convertedNameCell,
        'the converted lead row did not expose its detail URL'
    ).toBeVisible();
    await expect(
        await convertedNameCell.getAttribute('hx-get'),
        'the Converted Lead view must show the exact lead that was converted'
    ).toBe(leadDetailUrl);
});