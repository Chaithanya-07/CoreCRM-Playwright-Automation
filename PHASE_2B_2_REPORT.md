# Phase 2B.2 Completion Report — Accounts Automation

**Project:** CRM Demo Automation (Horilla CRM demo, Playwright + JavaScript + Page Object Model)
**Phase testing performed:** 2026-11-03 · **Report authored:** 2026-11-04
**Scope honored:** Accounts only — creation, required-field validation, list/search persistence, detail verification. No Opportunities, Activities, Campaigns, Lead conversion, API tests, or CI/CD. No Phase 2B.3 work.

**Headline:** the Accounts implementation is complete and the full serial suite (login, leads, contacts, accounts) passes — 7 passed. The list-row click was blocked by an external demo regression (§7); per the mentor-approved decision, the documented verified-detail-URL fallback (option b) is now implemented for Accounts, Leads and Contacts (see **Addendum A**). The Parent Account relationship remains deferred — the demo does not persist it server-side (§9, Addendum A).

**Addenda added after mentor review:** Addendum A (approved fallback, implemented), Addendum B (final validation results), Addendum C (updated files). The body below records the state that was reviewed (originally blocked).

---

## 1. Files changed and rationale

| File | Change |
|---|---|
| `pages/accountsPage.js` (**new**, 124 lines) | Accounts page object following the approved leads/contacts conventions: `open()`, `openCreateForm()`, `fillAccountForm({name, industry})`, `saveAndExpectSuccess()`, `searchAccountByName(name)` (verified `?section=people&search=` URL route), `getAccountRowByName(name)`, `openAccountRow(name)` (unique-name-anchored matching-row click, never `listRows.first()`), `successDialog` locator |
| `tests/accounts.spec.js` (**new**, 97 lines) | Test 1: create → success dialog → detail URL → list search → exactly-one-row → open matching row → detail assertions. Test 2: required-field validation (native HTML5; no record created). A `NOTE` documents why the Parent Account test was deliberately not implemented (§9) |
| `utils/test-data.js` | Added `uniqueAccountName()` — timestamp + counter fictional name. Accounts have no email field (discovered live), so uniqueness comes from the name |

**Unchanged by design:** `playwright.config.js` (`workers: 1`, `fullyParallel: false` intact), `tests/auth.setup.js`, `tests/login.spec.js`, `tests/leads.spec.js`, `tests/contacts.spec.js`, `pages/leadsPage.js`, `pages/contactsPage.js`, `pages/loginPage.js`, `utils/env.js`, `package.json`. No TypeScript introduced. Assertions never weakened; zero `waitForTimeout`; zero `catch(() => {})` (grep-verified). No commit, push, remote, or `.git` changes; no CRM records deleted.

## 2. Updated project tree

```
CRM Demo Automation/
├── pages/
│   ├── loginPage.js
│   ├── leadsPage.js
│   ├── contactsPage.js
│   └── accountsPage.js        ← NEW (Phase 2B.2)
├── tests/
│   ├── auth.setup.js
│   ├── login.spec.js
│   ├── leads.spec.js
│   ├── contacts.spec.js
│   └── accounts.spec.js       ← NEW (Phase 2B.2)
├── utils/
│   ├── env.js
│   └── test-data.js           ← + uniqueAccountName()
├── playwright.config.js       (unchanged, serial)
├── README.md                  (unchanged this phase — see §10)
├── AUTOMATION_GUIDE.md        (unchanged this phase — see §10)
├── PHASE_1_REPORT.md … PHASE_2B_1_REPORT.md
└── PHASE_2B_2_REPORT.md       ← this report
```

## 3. Exact Account fields and controls used (grounded in observed UI, verified live 2026-11-03 read-only before coding)

| Control | Observed facts |
|---|---|
| Route | `/crm/accounts/accounts-view/?section=people` (app appends `section=people`) |
| List columns | Account Name, Account Number, Account Owner, Account Type, Account Source, Annual Revenue, Actions; first cell of each row is a checkbox; the name cell is `td` index 1 |
| Create form | Single-step inside `#modalBox`; **Single-Step Form toggle is the active default** (highlight class `bg-primary-60` vs Multi-Step's `bg-primary-200`); Save / Save & New buttons |
| Account Owner\* | select `account_owner`, starts "- Select an option -", demo-user options; selects the first user via the established documented Select2 pattern |
| Account Name\* | text input `#id_name`; filled with the unique fictional name |
| Industry\* | select `industry`, 10 fixed demo options; test uses **Finance** |
| Select2 | Same hidden-`<select>` + visible combobox pattern as the other Horilla forms — the already-established, documented `selectOption({ force: true })` necessity for this application |
| List search | URL-driven: `?section=people&search=<text>` (verified: probe returned 26/26 matching rows). Applied search also opens a "Filters" panel over the table, dismissed with `Escape` (verified harmless) |
| Detail page | `/crm/accounts/account-detail-view/<id>/`; heading `<Name> - <id>`; field rows in `div.flex.flex-col.sm:flex-row` with the same `Label: value` pattern as leads/contacts |

No fields, labels, selectors, routes, or dropdown values were invented; the form was never saved during discovery.

## 4. Exact commands executed and results

```
npx playwright test --list
    Total: 7 tests in 5 files
    (8 before the Parent Account test removal; see §9)

CRM_USERNAME=… CRM_PASSWORD=… npx playwright test tests/accounts.spec.js
    ok  [setup]          login once and store the session                     (~4–5s)
    ok  [chromium]       required-field blocks submission                     (passed every run)
    x   [chromium]       create + find again in the accounts list             (1.0m)  → BLOCKED (§7)

CRM_USERNAME=… CRM_PASSWORD=… npx playwright test tests/leads.spec.js
    x   [chromium]       create + find again in the leads list                → SAME BLOCKER (§7)
```

## 5. Actual test counts and execution duration

- Accounts run tally: **2 passed** (setup + required-field negative test), **1 failed** (create+find, blocked step only) — ~1.3 min serial.
- Leads regression-check run: **1 failed** at the identical approved-2B.1 step, ~1.1 min serial.
- All run reports above include the standard list-reporter output; the HTML report was generated by the configured reporter (failures carry screenshots + error-context snapshots in `test-results/`).

## 6. Confirmation of serial execution

Every run reported `Running N tests using 1 worker`; `fullyParallel: false` and `workers: 1` verified intact in `playwright.config.js`.

## 7. The precise blocker: external demo regression (affects approved 2B.1 flows too)

Between the last fully passing suite run (2026-11-03 16:17, `5 passed (28.5s)`) and the 2B.2 runs, the demo lists were converted to **HTMX partial navigation** — row cells now carry
`hx-push-url="true"`, `hx-swap="outerHTML"`, `hx-target="#mainContent"`, `hx-select="#mainContent"` —
and the tables' `#loading-indicator` overlay (`opacity: 0`, `pointer-events: auto`, `z-30`, covering the entire table area) now **intercepts all pointer events**:

1. Playwright click logs, identical for accounts and the previously-approved leads flow:
   `<div id="loading-indicator" class="htmx-indicator tabloading">…</div> intercepts pointer events` —
   retried ~95×, then Test-timeout, both at the open-matching-row step
   (`AccountsPage.openAccountRow` / the approved `openLeadRow`).
2. An independent browser session (not controlled by the tests) confirms the same:
   `document.elementFromPoint()` at the name-cell centre returns `#loading-indicator` on **both** the
   accounts and the leads lists, and a real-pointer click attempt times out there — clicks are broken
   for human users too, on the previously approved flows.
3. Everything before that step passes: account creation, the success dialog, the detail-page redirect,
   the list search with a unique name, and the exactly-one-row assertion. The blockage is exclusively
   the list-row click interaction.

**Why there is no automation-side fix under the standing rules:** `force: true` is restricted to the
established Select2 interaction; arbitrary retries/tobeRemoved waits/suppression are banned; approved
assertions must not be weakened. The correct responses are the two options below.

**Minimum decision required from the mentor:**
- **(a)** wait for the demo reset/fix — I then re-validate the Accounts tests **and** the complete
  2B.1 suite (leads/contacts) with zero code changes expected; or
- **(b)** approve a documented fallback: after resolving the unique matching row, navigate to the row's
  own verified detail URL (exactly the `hx-get` target the click navigates to) for all three modules
  until the demo regression is fixed.

## 8. Required-field negative test behavior (implemented, executed, passing)

Open the New Account form, leave the required Account Name empty while owner/industry are valid, click
Save → the application blocks the submission **client-side** with native HTML5 validation:

- `#id_name` reports `validity.valueMissing === true` with validation message
  **"Please fill out this field."** (asserted in the test),
- the modal stays open, no redirect occurs (URL remains on the accounts list),
- the success dialog count remains 0, and **no record is created** (row counts unchanged, verified
  live during discovery and asserted via the absence signals in the test).

Assertions target the verified native signals — HTML `required` behavior was inspected live first and
not assumed ("Do not assume HTML required behavior; inspect the actual application response").

## 9. Parent Account relationship — explicitly DEFERRED with documented reason (not implemented, no fake coverage)

The Parent Account control exists in the New Account form (≈493 demo options, "Name - `<id>`" format)
and the selection code ran successfully (the option for the created parent was found, exactly one
match, selected by its exact label). However the demo **does not persist the relationship**:

- after create-time selection and after two edit-modal saves through the real control,
  a **server-rendered** edit form showed `parent_account` empty again, and
- a fresh server GET of the child account's detail page rendered **no Parent Account field anywhere**
  (`bodyMentionsParentField: false` — no field row, no hierarchy UI on the child detail).

With persistence unverifiable, and per the instruction "If … relationship persistence cannot be
verified, do not fake coverage. Document the blocker and leave relationship automation for a later
reviewed milestone", the parent/child test was **removed** and the page-object helper deleted. A NOTE
in `tests/accounts.spec.js` documents the decision. Neither account was deleted (records persist in
the shared demo, as documented).

## 10. README.md and AUTOMATION_GUIDE.md — intentionally not changed this phase

No Accounts coverage may be claimed, per the standing rule "Do not claim a scenario passed unless it
was executed successfully" — the persistence flow is externally blocked. Once the blocker decision
lands and the flow validates, these docs will be updated with actual results (coverage row, module
overview, tree entry, Accounts scenario documentation, `uniqueAccountName` test-data note, and the
permanent-record statement for Accounts). The previously required `Known demo limitations` wording
(Leads and Contacts verify persistence through list search and record detail-page assertions) is
verified present in the current `README.md` (added during the approved 2B.1 packaging step, lines 106–108).

## 11. Remaining risks and blockers

1. **Blocker (§7):** the demo's HTMX list regression breaks all list row interactions; pending the
   mentor's decision between option (a) and option (b).
2. **Relationship verification remains impossible** on this demo build (§9) — deferred to a later
   reviewed milestone.
3. The `htmx-indicator` regression may also affect the demo reset schedule unpredictably; a future fix
   could change the DOM again — the page objects keep the interaction isolated in one method per module.
4. Demo data collisions: unique timestamp-based account names make the exactly-one-row search robust;
   any collision would surface as an explicit `toHaveCount(1)` failure with a descriptive message.
5. Test-created Aurora Systems accounts (and one lead/contact pair from the 2B.1 runs) persist in the
   shared demo and were never deleted, per the standing rules.

## 12. Diff summary and git status

- **New files:** `pages/accountsPage.js`, `tests/accounts.spec.js`, `PHASE_2B_2_REPORT.md`.
- **Modified:** `utils/test-data.js` (+10 lines: `uniqueAccountName`).
- **Unchanged:** all approved modules (pages/tests/config/login), `README.md`, `AUTOMATION_GUIDE.md`,
  `package.json`, `.env.example`, `.gitignore`.
- `git diff --check`: clean. `git status --short` (untracked repository):

```
?? .env.example
?? .gitignore
?? AUTOMATION_GUIDE.md
?? PHASE_1_1_REPORT.md
?? PHASE_1_REPORT.md
?? PHASE_2A_CRM_WORKFLOW_DISCOVERY.md
?? PHASE_2B_1_REPORT.md
?? README.md
?? package-lock.json
?? package.json
?? pages/
?? playwright.config.js
?? tests/
?? utils/
```

No commit, push, remote, or `.git` metadata changes were performed.

---

## 13. Status

**Phase 2B.2 complete via the mentor-approved fallback — full suite green (7 passed).** See Addenda A–C below. No Phase 2B.3 work has been started.

---

# Addendum A — Mentor decision and implemented fallback (2026-11-04)

The mentor approved **option (b)**: implement the documented verified-URL row-opening fallback for **Accounts, Leads and Contacts**, because the external HTMX overlay regression affects all three modules. What was implemented, per the 15 approval requirements:

- **The fallback method (`openRowDetail(matchingRow)`, one per page object).** Applied uniformly to `pages/leadsPage.js`, `pages/contactsPage.js` and `pages/accountsPage.js`:
  1. It asserts the matched row's name cell (`td` index 1) is visible.
  2. It reads the cell's **actual `hx-get` DOM attribute** — the exact URL the app's row action follows. The URL is **never constructed or guessed**; it is copied from the record's own row.
  3. It asserts via `expect(detailUrl).toMatch(...)` that the extracted URL is that module's detail route, with the record's own id inside it (this confirms the URL belongs to the matched record — the row was already resolved to exactly one by the unique search value, and the id-bearing URL comes from that same row's DOM):
     - leads: `/^\/crm\/leads\/leads-detail\/\d+\/?/`
     - contacts: `/^\/crm\/contacts\/contact-detail-view\/\d+\/?/`
     - accounts: `/^\/crm\/accounts\/account-detail-view\/\d+\/?/`
  4. It navigates to the extracted URL (`page.goto`, `domcontentloaded`) and asserts the loaded page's URL matches the same module detail pattern — the complete detail page load is verified via the subsequent persisted-field assertions.
- **Assertion scoping after live verification (2026-11-04).** The demo's detail pages repeat record values in the record header card (`#detailHeaderCard`) and the per-field Details tab, and repeat the account name in the breadcrumb and hidden "Recently viewed" copies. Full-page `getByText` assertions therefore hit strict-mode violations (two–three matches) or resolved to a hidden copy. The detail-page assertions in all three specs are now scoped to the visible `#detailHeaderCard` (accounts: heading by role + `Industry: <value>`; leads: unique email + `Lead Source: Website`; contacts: unique email + `Title: <value>`). Nothing was weakened — the same values are asserted, at the same record, once and deterministically.
- **Original row-click methods preserved with limitation markers.** `openLeadRow(email)`, `openContactRow(email)` and `openAccountRow(name)` remain in the page objects, each under a `CURRENTLY UNUSABLE (demo regression, verified 2026-11-04)` comment block, so the direct interaction can be restored the moment the demo removes the overlay (`#loading-indicator`).
- **The tests call the fallback**; each spec comments the reason at the call site. Unique-row search and the exactly-one-row assertions are unchanged.
- **Rules honored:** no force clicks outside the established Select2 pattern, no JavaScript click bypasses, no arbitrary waits, no weakened assertions, no broad error suppression; `workers: 1` / `fullyParallel: false` untouched; no Opportunities/Activities/Campaigns/Lead conversion; Parent Account still deferred per §9.

# Addendum B — Final validation results (actual, after the fallback)

Full serial suite, `CRM_USERNAME=… CRM_PASSWORD=… npx playwright test` (setup + 7 tests, 1 worker):

```
  ok 1 [setup]           tests\auth.setup.js:8:5 › login once and store the session
  ok 2 [chromium]        tests\login.spec.js:8:5 › user can log in with valid credentials
  ok 3 [chromium]        tests\login.spec.js:21:5 › user cannot log in with an invalid password
  ok 4 [chromium]        tests\accounts.spec.js:9:5 › ... create an account and find it again (10.4s)
  ok 5 [chromium]        tests\accounts.spec.js:61:5 › ... blocks submission when required fields are missing
  ok 6 [chromium]        tests\contacts.spec.js:11:5 › ... create a contact and find it again (7.0s)
  ok 7 [chromium]        tests\leads.spec.js:12:5 › ... create a lead and find it again (12.1s)

  7 passed (51.4s)
```

- Every workflow test now completes **all** previously-approved steps, including opening the matched record's own detail page and asserting the persisted fields there — nothing was skipped, and no assertion was removed.
- Required-field negative test still passes unchanged. `git diff --check` clean; grep confirms zero `waitForTimeout` and zero `catch(() => {})` in `tests/`, `pages/`, `utils/`; `playwright.config.js` untouched.
- Two intermediate failures were diagnosed and fixed during integration (never weakened): first an un-scoped detail-heading `getByText` matched 3 elements (records render the name in the header card, details tab, breadcrumb, and hidden recently-viewed copies); then a `#header`-scoped attempt resolved to a hidden "Recently viewed" copy. The verified fix scopes assertions to the visible `#detailHeaderCard`.

# Addendum C — Files updated for the correction

| File | Change |
|---|---|
| `pages/leadsPage.js`, `pages/contactsPage.js`, `pages/accountsPage.js` | Added `openRowDetail(matchingRow)` (extract `hx-get` → assert detail-route pattern → `goto` → assert URL); original click methods kept with unusability comments |
| `tests/leads.spec.js`, `tests/contacts.spec.js` | Click replaced by the fallback call with an explanatory comment; detail assertions scoped to `#detailHeaderCard` |
| `tests/accounts.spec.js` | Fallback call; heading assertion scoped to `#detailHeaderCard` (heading-by-role, showing the created name) and `Industry: <value>` scoped the same way |
| `README.md` | Accounts coverage row; persistence bullet covers all three modules with unique account names; HTMX limitation + verified-URL workaround bullet; deferred Parent Account bullet; project tree with `accountsPage.js`/`accounts.spec.js`; report tree entry no longer "blocked" |
| `AUTOMATION_GUIDE.md` | Accounts in intro, flow (§6), quirks (HTMX fallback, detail-page value repetition), §7.4 accounts tests explained, §7.3 fallback wording, §10 extension example updated, summary updated |
| `PHASE_2B_2_REPORT.md` | This addendum; headline/status updated to the approved-fallback outcome |
| `utils/test-data.js` | (from the original implementation) `uniqueAccountName()` — unchanged by the addendum |