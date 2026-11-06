import { test, expect } from '@playwright/test';
import { AccountsPage } from '../pages/accountsPage';
import { uniqueAccountName } from '../utils/test-data';

// Verified live 2026-11-03: a fixed demo dropdown option for the required
// Industry field.
const ACCOUNT_INDUSTRY = 'Finance';

test('user should be able to create an account and find it again in the accounts list', async ({ page }) => {
    const accountsPage = new AccountsPage(page);
    const name = uniqueAccountName();

    // 1. Create the account.
    await accountsPage.open();
    await accountsPage.openCreateForm();
    await accountsPage.fillAccountForm({ name, industry: ACCOUNT_INDUSTRY });
    await accountsPage.saveAndExpectSuccess();

    await expect(
        page,
        'expected to land on the detail page of the newly created account'
    ).toHaveURL(/\/crm\/accounts\/account-detail-view\/\d+\/?/);

    // 2. Independent persistence verification through the accounts list:
    //    search for the account by its unique name.
    await accountsPage.searchAccountByName(name);
    const matchingRow = accountsPage.getAccountRowByName(name);
    await expect(
        matchingRow,
        `the accounts list should contain exactly one row with the unique account name ${name}`
    ).toHaveCount(1);
    await expect(
        matchingRow.getByText(name),
        'the matching list row should show the created account name'
    ).toBeVisible();

    // 3. Open the matched row and verify the persisted detail fields. The
    //    row's record is opened through the approved verified-URL fallback
    //    (the demo's HTMX overlay currently blocks row clicks; the detail
    //    URL is extracted from the matching row's own `hx-get` attribute).
    await accountsPage.openRowDetail(matchingRow);
    await expect(
        page,
        'opening the search result should land on that account detail page'
    ).toHaveURL(/\/crm\/accounts\/account-detail-view\/\d+\/?/);
    // The demo repeats record values on the detail page (header card,
    // details tab, breadcrumb, plus hidden "Recently viewed" copies), so
    // the assertions are scoped to the detail header card — the visible
    // record summary — to match exactly one element each.
    await expect(
        page.locator('#detailHeaderCard').getByRole('heading', { name }),
        'the account detail heading must show the created account name'
    ).toBeVisible();
    await expect(
        page.locator('#detailHeaderCard').getByText(`Industry: ${ACCOUNT_INDUSTRY}`),
        'the persisted account detail must show the entered industry'
    ).toBeVisible();
});

test('the New Account form blocks submission when required fields are missing', async ({ page }) => {
    const accountsPage = new AccountsPage(page);

    await accountsPage.open();
    await accountsPage.openCreateForm();
    // Leave the required Account Name empty; owner and industry are filled
    // so that only the missing name can block the submission.
    await accountsPage.fillAccountForm({ industry: ACCOUNT_INDUSTRY });
    await accountsPage.saveButton.click();

    // Verified live 2026-11-03: the app blocks the submission client-side
    // with native HTML5 validation — the input reports a missing value with
    // the message "Please fill out this field.", the modal stays open with
    // no redirect and no record is created.
    await expect(
        accountsPage.modal,
        'the create form must still be open after a blocked submission'
    ).toBeVisible();
    const nameValidity = await accountsPage.accountName.evaluate((el) => ({
        valueMissing: el.validity.valueMissing,
        message: el.validationMessage,
    }));
    expect(
        nameValidity.valueMissing,
        'the empty required Account Name must be reported as a missing value'
    ).toBe(true);
    expect(
        nameValidity.message,
        'the browser must report the missing required Account Name'
    ).toBe('Please fill out this field.');
    await expect(
        accountsPage.successDialog,
        'no success dialog may appear for a blocked submission'
    ).toHaveCount(0);
    await expect(
        page,
        'a blocked submission must not navigate away from the accounts list'
    ).toHaveURL(/\/crm\/accounts\/accounts-view/);
});

// NOTE: the Parent Account relationship test was deliberately NOT
// implemented. The Parent Account control exists in the form (verified
// live 2026-11-03), but the demo does not persist the selection — see the
// Phase 2B.2 report for the documented blocker. No fake coverage was
// added.