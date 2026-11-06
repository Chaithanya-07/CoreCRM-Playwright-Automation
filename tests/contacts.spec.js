import { test, expect } from '@playwright/test';
import { ContactsPage } from '../pages/contactsPage';
import { uniqueEmail } from '../utils/test-data';

const CONTACT_DATA = {
    firstName: 'Jane',
    lastName: 'Smith',
    title: 'Account Manager',
};

test('user should be able to create a contact and find it again in the contacts list', async ({ page }) => {
    const contactsPage = new ContactsPage(page);
    const email = uniqueEmail('jane.smith');

    // 1. Create the contact.
    await contactsPage.open();
    await contactsPage.createContact({ ...CONTACT_DATA, email });

    await expect(
        page,
        'expected to land on the detail page of the newly created contact'
    ).toHaveURL(/\/crm\/contacts\/contact-detail-view\/\d+\/?/);

    // 2. Independent persistence verification through the contacts list:
    //    search for the contact by its unique email.
    await contactsPage.searchContactByEmail(email);
    const matchingRow = contactsPage.getContactRowByEmail(email);
    await expect(
        matchingRow,
        `the contacts list should contain exactly one row with the unique contact email ${email}`
    ).toHaveCount(1);
    await expect(
        matchingRow.getByText(email),
        'the matching list row should show the created contact email'
    ).toBeVisible();

    // 3. Open the matched row and verify the persisted detail fields. The
    //    row's record is opened through the approved verified-URL fallback
    //    (the demo's HTMX overlay currently blocks row clicks; the detail
    //    URL is extracted from the matching row's own `hx-get` attribute).
    await contactsPage.openRowDetail(matchingRow);
    await expect(
        page,
        'opening the search result should land on that contact detail page'
    ).toHaveURL(/\/crm\/contacts\/contact-detail-view\/\d+\/?/);
    // The demo repeats record values on the detail page (header card and
    // details tab), so the assertions are scoped to the detail header card
    // — the visible record summary — to match exactly one element each.
    await expect(
        page.locator('#detailHeaderCard').getByText(email),
        'the persisted contact detail must show the exact unique email'
    ).toBeVisible();
    await expect(
        page.locator('#detailHeaderCard').getByText(`Title: ${CONTACT_DATA.title}`),
        'the persisted contact detail must show the entered contact title'
    ).toBeVisible();
});