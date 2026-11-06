# CoreCRM – E2E Automation Suite — Beginner's Guide

This guide explains the **entire automation flow** of this project step by
step, from scratch. By the end you will understand what each file does, how
the login → leads → contacts → accounts → opportunities → activities →
campaigns → lead conversion flow works, and how to run it yourself — even
if you have never used Playwright before.

---

## 1. What is this project?

**CoreCRM** is the name of this project: a Playwright end-to-end QA
automation portfolio project/framework, written in JavaScript with the Page
Object Model. CoreCRM **automates a web browser** to test the Horilla CRM
Demo — an existing public demo CRM (Customer Relationship Management)
application located at:

```
https://crm.demo.horilla.com
```

CoreCRM **tests this application; it does not develop it** — Horilla CRM
Demo is the application under test (AUT).

The automation currently covers **seven areas**: it logs into the site and
creates a **Lead**, a **Contact**, an **Account**, an **Opportunity**, an
**Activity** and a **Campaign** — just like a real person would by clicking
and typing — and then checks that each record was actually created **and
persists**: each test searches the module's list view for the record it
just created, opens the matching row (through the app's own verified detail
URL), and verifies the saved values on the record's detail page (Activities
persistence is verified through the list row instead, because that module's
detail page does not display the record's association). It then goes one
step further than record creation: it **converts a lead** — the demo's
built-in business process that turns one lead into an Account, a Contact
and an Opportunity — and verifies all four outcomes on their authoritative
pages.

The tool we use is **Playwright**. Playwright is a library that can open a
real browser (Chrome/Chromium) and control it from code.

---

## 2. Prerequisites (set up once)

You only do these steps **once** on your computer.

### 2.1 Install Node.js

Playwright runs on Node.js (version 20 or newer). Download the LTS version
from https://nodejs.org. To confirm it is installed, open a terminal and run:

```bash
node -v
npm -v
```

You should see version numbers (not errors).

### 2.2 Open a terminal in the project folder

Open a terminal (PowerShell on Windows) and navigate to the project folder:

```bash
cd "D:\CoreCRM-Playwright-Automation"
```

### 2.3 Install the project dependencies

This downloads Playwright and everything the project needs:

```bash
npm install
```

### 2.4 Install the browsers Playwright will use

```bash
npx playwright install chromium
```

### 2.5 Provide the login credentials

The tests never hard-code credentials. They read them from environment
variables:

```bash
CRM_USERNAME   # the demo account username
CRM_PASSWORD   # the demo account password
```

The easiest way is to create a local `.env` file from the provided template:

```powershell
Copy-Item .env.example .env   # PowerShell (Windows)
```

or `cp .env.example .env` on macOS/Linux/Git Bash.

Then open `.env` and fill in the real values. `.env` is **git-ignored** — it
will never be committed. If the variables are missing, the tests stop
immediately with a clear message telling you how to fix it, instead of
silently guessing a password.

That's it — you are ready to run the automation.

---

## 3. Project structure (the files)

```
CoreCRM-Playwright-Automation/
├── pages/                  ← Page Objects (the "how to use each page" code)
│   ├── loginPage.js        ← knows how to log in
│   ├── leadsPage.js        ← knows how to create a lead
│   ├── contactsPage.js     ← knows how to create a contact
│   ├── accountsPage.js     ← knows how to create an account
│   ├── opportunitiesPage.js← knows how to create an opportunity
│   ├── activitiesPage.js   ← knows how to create an activity
│   ├── campaignsPage.js    ← knows how to create a campaign
│   └── leadConversionPage.js ← knows how to convert a lead
├── tests/
│   ├── auth.setup.js       ← setup: log in once, store the session
│   ├── login.spec.js       ← tests the login page itself (never pre-authenticated)
│   ├── leads.spec.js       ← create a lead (reuses the stored session)
│   ├── contacts.spec.js    ← create a contact (reuses the stored session)
│   ├── accounts.spec.js    ← create an account (reuses the stored session)
│   ├── opportunities.spec.js ← create an opportunity (reuses the stored session)
│   ├── activities.spec.js  ← create an activity (reuses the stored session)
│   ├── campaigns.spec.js   ← create a campaign (reuses the stored session)
│   └── lead-conversion.spec.js ← convert a lead (reuses the stored session)
├── utils/
│   ├── env.js              ← reads credentials, fails clearly when missing
│   └── test-data.js        ← generates unique test data for every run
├── playwright.config.js    ← Playwright settings (browser, timeouts, projects)
├── .env.example            ← template for the local .env
├── package.json            ← project info and npm scripts
└── AUTOMATION_GUIDE.md     ← this guide
```

There are two kinds of code files, and understanding the split is the key to
the whole project:

- **`pages/` = Page Objects.** These describe *how* to interact with a page
  (which fields to fill, which buttons to click). They do **not** run on
  their own.
- **`tests/` = Tests.** These describe *what* to do, in order, and *what to
  check*. They use the page objects to do the work.
- **`utils/` = Helpers.** Small shared tools (credentials, test data).

This separation is called the **Page Object Model (POM)**. The benefit: if
the website changes a button label, you update one line in the page object,
and every test that uses it keeps working.

---

## 4. How the authentication works

A fresh browser context knows nothing about the site. Logging in takes
several seconds, so doing it in every test would be slow. The project solves
this with **Playwright projects**:

1. The **`setup`** project runs `tests/auth.setup.js`: it opens the login
   page, signs in, and saves the session cookies to a file
   (`playwright/.auth/user.json`, git-ignored).
2. The **`chromium`** project (Leads, Contacts, Accounts, Opportunities,
   Activities, Campaigns and Lead-conversion workflows) is configured to
   *depend* on `setup` and to start every test from that saved session — no
   repeated logins.
3. The **`chromium-login`** project deliberately does **not** use the saved
   session, so `tests/login.spec.js` can test the login page itself — both
   the happy path and an invalid-password rejection.

If you ever change the demo password, just delete
`playwright/.auth/user.json` (or re-run the tests — `setup` runs first every
time and refreshes it). That file contains live authenticated session
cookies: it is git-ignored, is regenerated on every run, and must never be
committed, shared, or included in handoffs.

---

## 5. How to run the automation

All commands run from the project folder in a terminal.

The tests run **serially, one browser session at a time** (`workers: 1`).
This is deliberate: the application under test is a shared public demo
instance, and simultaneous test sessions would collide with each other and
add load to it.

### Run everything (setup → login → leads → contacts → accounts → opportunities → activities → campaigns → lead conversion)

```bash
npm test                # headless
npm run test:headed     # visible browser so you can watch it
npm run test:chromium   # chromium projects only
```

### Run a single test file

```bash
npx playwright test tests/leads.spec.js
npx playwright test tests/login.spec.js --headed
```

### Debug step by step

```bash
npm run test:debug
```

### View the HTML report after a run

```bash
npm run report
```

---

## 6. The website flow we are automating

1. **Login** — open the site, type the username and password, click
   **Sign In**.
2. **Create a Lead** — go to **Sales → Leads**. Click **New**. A popup (the
   `#modalBox` element) opens with one form: First Name, Last Name, Email,
   Title, Lead Company, plus the dropdowns **Lead Owner, Lead Source, Lead
   Stage, Industry, Country**. Click **Save**.
3. The site navigates to the new lead's **detail page** and shows a
   confirmation dialog: **"Lead created successfully."** — the tests treat
   reaching the detail page as the real proof of creation.
4. **Create a Contact** — go to **People → Contacts**. Click **New**. Same
   idea: First Name, Last Name, Email, Title, and the **Contact Owner**
   dropdown. Click **Save** → contact detail page with
   **"Contact created successfully."**
5. **Create an Account** — go to **People → Accounts**. Click **New** (the
   list's *Single-Step Form* is the active default). The form has no email
   field; Account Name is the text field, and **Account Owner** and
   **Industry** are required dropdowns. Click **Save** → account detail page
   with **"Account created successfully."** The account is then found again
   by searching the list for its unique name — accounts have no email, so
   the unique search value is the name itself.
6. **Create an Opportunity** — go to **Sales → Opportunities**. Click
   **New**. The **Create Opportunity** modal has no email field either; the
   text field is **Opportunity Name**, the required dropdowns are **Stage**
   (the test fills *Prospecting*) and **Owner**, and the optional-but-persisted
   **Amount**, **Close Date** and **Account** (an association to an existing
   account) are filled too. Click **Save** → opportunity detail page with
   **"Opportunity created successfully."** The opportunity is found again by
   searching the list for its unique name.
7. **Create an Activity** — go to **Schedule → Activities** (the module lives
   under `/activity/`). Click **New**. The **Create Activity** modal has no
   email field either; the required fields are **Activity Type** (the test
   uses *Task*), **Subject** and **Status** (pre-filled with *Not Started*).
   The test also sets **Related Content Type** to *Lead* and, in the
   dependent **Related To** widget, searches for a lead and selects it
   through the real widget (the options load remotely — see the quirks
   below). Click **Save** → the demo shows
   **"Activity created successfully."** and — unlike the other modules —
   **stays on the activities list**. The activity is found again by
   searching the list for its unique subject, and the selected lead is
   asserted on the matching list row's **Related To** cell (the list row is
   the module's persisted view of the association — the detail page does not
   display it).
8. **Create a Campaign** — go to **Sales → Campaigns**. Click **New**. The
   **Create Campaign** modal has no email field; the required fields are
   **Campaign Name**, **Campaign Owner** and **Type** (the test fills
   *Email*), while **Status** comes pre-filled with the *Planned* default
   and **Number Sent in Campaign** is required but pre-filled with `0`.
   The test also fills the persisted **Expected Revenue** (`2500`) and
   **Budget Cost** (`1000`) numbers, which the demo renders with currency
   formatting (`INR 2,500.00` / `INR 1,000.00`). Click **Save** → campaign
   detail page with **"Campaign created successfully."** The campaign is
   found again by searching the list for its unique name; the fresh row
   shows the type, owner, *Planned* status and both rendered amounts, and
   the detail header card shows the name, owner, type and expected revenue.
9. **Convert a Lead** — the conversion test first creates its **own unique
   lead** through the leads UI (step 2's flow), finds it by its unique
   email, and opens its detail page. There it clicks the detail page's
   **Convert** step (in the lead's stage pipeline). The conversion form is
   different from the create modals: it loads into the lead page's own
   content modal (`#contentModalBox` — not the shared `#modalBox`), is
   titled **"Lead Conversion"**, and comes **pre-filled from the lead**:
   Account Name = the lead's Lead Company, Contact First/Last Name = the
   lead's names, Opportunity Name = `<lead company> - Opportunity`, and the
   Owner select already shows the lead's owner. Each of the three sections
   (Account, Contact, Opportunity) offers exactly two modes — **Create New**
   (the default) or **Select Existing** — with no skip option. The test
   asserts those pre-fills and defaults (verifying the lead→record field
   mapping), clicks **Convert**, and the form is replaced by a result panel
   ("Your lead has been converted") holding three cards — **Account**,
   **Contact**, **Opportunity** — each linking the created record. The test
   extracts each card's real detail URL (never constructed), opens each
   created record, and verifies it: the account shows the company name and
   the mapped Account Source (*Website*) and Industry (*Finance*); the
   contact shows the lead's unique email; the opportunity shows its name
   and links the created account in its Details tab. Finally it proves the
   lead's converted state: the lead is **gone from the default leads list
   search** and appears — as the exact same record (its detail URL is
   compared) — in the leads list's **"Converted Lead"** view
   (`?view_type=converted_lead`, where its status column renders
   "Convert"). The detail page of a converted lead no longer shows the
   Convert control, and its conversion route returns only a modal-close
   script instead of a form — re-conversion is blocked.

### Quirks the code handles for you

- **List search is applied via the list URL.** The module lists have a quick
  search widget, but the app applies a search by navigating to the list with
  a `search` query parameter — for example
  `/crm/leads/leads-view/?section=sales&search=<text>` returns only the rows
  containing `<text>` (verified live on 2026-11-03). The persistence checks
  use this verified URL so a unique email (or unique account name) always
  filters the list to exactly one row.

- **Temporary demo regression: list-row clicks are blocked (verified live on
  2026-11-04).** The demo's lists were converted to HTMX partial navigation,
  and a transparent full-table `#loading-indicator` overlay now intercepts
  every pointer event over the rows — a real user cannot click a row either.
  The approved workaround (mentor-approved fallback): the matching row's
  name cell still carries the exact `hx-get` detail URL the row action
  follows, so the page objects extract that URL from the DOM — never
  construct it — assert it matches the module's detail-route pattern, open
  it directly, and then verify the persisted record on the loaded detail
  page. The original click methods (`openLeadRow`, `openContactRow`,
  `openAccountRow`) are kept in the page objects, clearly marked as
  currently unusable, so they can be restored the moment the demo removes
  the overlay.

- **Detail pages repeat record values.** A value (email, industry, title…)
  appears in both the record header card (`#detailHeaderCard`) and the
  per-field *Details* tab, and the account name also appears in the
  breadcrumb and in hidden "Recently viewed" copies. The persistence
  assertions are therefore scoped to the visible record header card so each
  one matches exactly one element (verified live on 2026-11-04).

- **The Lead Conversion modal is a separate one.** Unlike every create form
  (which loads into the shared `#modalBox`), the conversion form loads into
  the lead detail page's own `#contentModalBox` and its success panel
  replaces the form there — it is *not* a SweetAlert2 dialog like the
  create flows.

- **Detail pages remember your last tab.** The demo persists the last
  active detail tab per user (server-side), so a detail page does not
  always open on the *Details* tab. Every tab-scoped assertion opens its
  tab explicitly first (click the `Details` tab) instead of assuming the
  default view.

- **The Related Lists tab is currently unusable in the browser.** On
  account detail pages the `#tab-related-lists-indicator` overlay is
  permanently rendered invisible (opacity 0) yet still intercepts every
  pointer event over its side-list anchors — a real user cannot open them
  either (verified live on 2026-11-04; the anchors also have no keyboard
  binding, and their content URLs are htmx-only, returning 405 on direct
  navigation). Relationship assertions use the surfaces the demo still
  exposes (the opportunity's Details-tab Account link) and the rest is
  deferred, documented in `PHASE_2B_6_DISCOVERY.md` §6 — no force-click or
  JavaScript workaround was added.

- **Dropdowns are Select2 widgets.** The original `<select>` stays in the DOM
  but is visually hidden and wrapped by a visible widget. The page objects
  address the original `<select>` element directly and let Playwright's
  `selectOption` do the rest.
- **Required dropdowns start empty** (`---------` as the first option). The
  page objects pick verified valid options captured from the live site
  (Lead Source: *Website*, Lead Stage: *New*, Industry: *Finance*,
  Country: *India*; Opportunity Stage: *Prospecting*; Campaign Type:
  *Email*; Contact Owner, Account Owner and Opportunity Owner: first
  available user; Campaign Owner: first available user and Campaign Type:
  *Email*). Lead Owner comes pre-selected by the site, and the Campaign
  **Status** ("Planned") and **Number Sent** (0) defaults are pre-filled by
  the site too.
- **The success dialog closes by itself.** The tests assert that the
  "created successfully" dialog appears, but do not click anything on it —
  the record is already saved, and the dialog dismisses itself.
- **After login/navigating, a popup or the dashboard switcher may open over
  the page.** The page objects press `Escape` after navigating.

- **The Create Activity form re-renders through HTMX (verified live on
  2026-11-04).** Picking an **Activity Type** or **Related Content Type**
  makes the app asynchronously re-render the whole form (and the re-render
  keeps the values you already typed). Two pending re-renders can even
  arrive out of order and reset fields, and the Select2 label span updates
  *before* the re-render — so the page object waits for the actual DOM swap
  (marked with a one-off probe attribute on the Subject input) before the
  next field is touched. No fixed sleeps anywhere.

- **The Related To widget loads its options remotely.** The **Related To**
  control on the Create Activity form is a `select2-pagination` widget: its
  options are *not* pre-rendered in the DOM — they are fetched from the
  server only when the widget is opened and searched. The page object
  therefore opens the widget with a real click, types into the open
  dropdown's search field, waits for a real option matching the search term
  (skipping the transient "Searching…" placeholder), and clicks that
  option. The exact label it selected is returned to the test so the later
  assertion uses the same value the form was given — never a hard-coded
  one. Note: on this form the multi-value widgets keep their own search
  field in the DOM, so the code targets the search field of the *open
  dropdown* specifically.

Verified completion signals (captured from the live site on 2026-11-03):

- Lead → URL `/crm/leads/leads-detail/<id>/` plus the
  "Lead created successfully." dialog.
- Contact → URL `/crm/contacts/contact-detail-view/<id>/` plus the
  "Contact created successfully." dialog.
- Account → URL `/crm/accounts/account-detail-view/<id>/` plus the
  "Account created successfully." dialog (verified live on 2026-11-03).
- Opportunity → URL `/crm/opportunities/opportunity-detail-view/<id>/` plus
  the "Opportunity created successfully." dialog (verified live on
  2026-11-04).
- Campaign → URL `/crm/campaigns/campaign-detail-view/<id>/?section=sales`
  plus the "Campaign created successfully." dialog (verified live on
  2026-11-04).
- Activity → the dialog "Activity created successfully." and the app
  **stays on the activities list URL** (`/activity/activity-view/?section=schedule`)
  — no detail redirect. The record's detail page
  (`/activity/activity-detail/<id>/?section=schedule`) exists and is reached
  through the verified-URL fallback (verified live on 2026-11-04).
- Lead conversion → the "Your lead has been converted" result panel
  (rendered into `#contentModalBox` in place of the form — the conversion's
  success signal is a panel, not a dialog), with the three created-record
  links inside it; the converted lead then appears in the leads list's
  "Converted Lead" view and disappears from the default list (verified live
  on 2026-11-04).

Note: the linked **Company** shown on a lead's detail page is the account the
site attaches the lead to (e.g. the demo's default), not necessarily the
value typed into the form's *Lead Company* field.

---

## 7. The tests explained

### 7.1 `tests/auth.setup.js`

Runs once per run, before the workflow tests:

```js
setup('login once and store the session', async ({ page }) => {
    const { username, password } = demoCredentials();
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(username, password);
    await expect(page, 'expected to leave the login page after signing in')
        .not.toHaveURL(/\/login\//);
    await page.context().storageState({ path: AUTH_STORAGE_STATE });
});
```

If the credentials are missing or wrong, the whole run stops here with a
clear message instead of letting the rest of the 14-test suite fail in
confusing ways.

### 7.2 `tests/login.spec.js`

Two tests, always unauthenticated:

- **Valid login** — signs in with the credentials from the environment and
  asserts the site leaves the login page.
- **Invalid password** — signs in with a deliberately wrong password and
  asserts the site shows *"Invalid credentials. Please check and try
  again."* This never touches the real account (no lockout behavior was
  observed on the demo).

### 7.3 `tests/leads.spec.js` and `tests/contacts.spec.js`

Each starts from the stored session, opens its list page, creates one record
with a unique `example.com` email, waits for the success dialog, and asserts
it landed on the record's detail page:

```js
await expect(page, 'expected to land on the detail page of the newly created lead')
    .toHaveURL(/\/crm\/leads\/leads-detail\/\d+\/?/);
```

Then each test verifies persistence **independently of the create flow**:

1. Navigate to the list again with the app's verified search URL parameter
   and the record's unique email (`searchLeadByEmail` /
   `searchContactByEmail`).
2. Assert the list contains **exactly one matching row** and that the row
   shows the email (`getLeadRowByEmail` / `getContactRowByEmail`).
3. Open the matched row's record through the verified-URL fallback
   (`openRowDetail(matchingRow)`): extract the exact `hx-get` detail URL the
   row carries, assert it matches the module's detail-route pattern, and
   navigate to it. (Direct row clicks are temporarily blocked by the demo's
   HTMX overlay — see section 6.)
4. Assert the detail page shows the exact unique email plus a second
   persisted field (`Lead Source: Website` for leads, `Title: <value>` for
   contacts), scoped to the visible record header card, with descriptive
   failure messages.

This means a record that silently failed to save — or was created with wrong
values — is caught even if the app's success dialog still appeared.

### 7.4 `tests/accounts.spec.js`

Two tests on the accounts module:

- **Create an account and find it again** — same flow as leads/contacts,
  with two module-specific differences:
  - Accounts have **no email field**, so the uniqueness/persistence anchor
    is the account **name**, generated as `Aurora Systems <timestamp>.<n>`
    (an account name is *not* unique in real CRMs, but the per-run timestamp
    makes this one unique; the test asserts the list holds exactly one row
    with it).
  - The name has to be filled, so the form is filled with name + Industry,
    the required Owner picks the first available user, and the created
    account's detail page must show the account name in its heading and
    `Industry: <selected>` in the record header card.
- **Missing required field is blocked** — the account name is left empty
  while owner and industry are filled, **Save** is clicked, and the test
  asserts the form stays open with native HTML5 validation
  (`valueMissing` = `true`, message *"Please fill out this field."*), no
  success dialog, and no navigation — no record is created.

The accounts spec deliberately has **no Parent Account test**: the dropdown
exists in the form, but the demo does not persist the selection (verified
live during Phase 2B.2; see `PHASE_2B_2_REPORT.md`). No fake coverage was
added.

### 7.5 `tests/opportunities.spec.js`

Two tests on the opportunities module, following the accounts pattern (no
email field — the unique anchor is the opportunity **name**):

- **Create an opportunity and find it again** — unique name + required
  Stage (*Prospecting*) + required Owner, plus the persisted-optional
  **Amount** (`4500`, rendered by the demo as `Amount: INR 4,500.00`),
  **Close Date** and an **Account association**. For the association the
  test selects the **first option of the Account dropdown at runtime** and
  asserts that exact "Name - <id>" label (captured from the DOM, never
  hard-coded) on the detail page — verified live that the association
  persists, unlike the Accounts module's Parent Account. Detail assertions:
  heading (name), `Amount: INR 4,500.00`, `Close Date: 2027-06-30` (scoped
  to the record header card), the selected stage in the stage pipeline
  (`#kanban-choices`), and the account label in `#Account-details-tab`.
- **Missing required field is blocked** — the Opportunity Name is left
  empty while stage and owner are filled, **Save** is clicked, and the test
  asserts the form stays open with native HTML5 validation
  (`valueMissing` = `true`, message *"Please fill out this field."*), no
  success dialog and no navigation — no record is created.

### 7.6 `tests/activities.spec.js`

Two tests on the activities module, following the accounts/opportunities
pattern (no email field — the unique anchor is the activity **Subject**):

- **Create an activity and find it again, with its association** — the flow
  is: open **Schedule → Activities**, click **New**, pick **Activity Type**
  (*Task*) and **Related Content Type** (*Lead*) — each followed by a wait
  for the form's HTMX re-render — fill the unique **Subject**
  (`Aurora Activity <timestamp>.<n>`), then open the **Related To** widget,
  search for a lead and click the first matching real option (its exact
  label is captured, never hard-coded). After **Save** the test asserts the
  app **stays on the activities list** (this module has no detail-page
  redirect), then searches the list for the unique subject and asserts
  **exactly one row**, that the row shows the subject, and that the row's
  **Related To cell shows the selected lead** — the list row is the
  module's authoritative persisted view of the association, because the
  activity detail page does not display it (verified live;
  `PHASE_2B_4_DISCOVERY.md`). The test then opens the matched row's detail
  page through its `hx-get` URL and asserts the header card shows the
  subject, `Activity Type: Task` and the default `Status: Not Started`.
- **Missing required field is blocked** — the Activity Type is selected,
  the **Subject** is left empty, **Save** is clicked, and the test asserts
  the form stays open with native HTML5 validation (`valueMissing` =
  `true`, message *"Please fill out this field."*), no success dialog and
  no navigation — no record is created.

### 7.7 `tests/campaigns.spec.js`

Two tests on the campaigns module, following the accounts/opportunities
pattern (no email field — the unique anchor is the campaign **name**):

- **Create a campaign and find it again** — unique name
  (`Aurora Campaign <timestamp>.<n>`) + required owner (**first available
  user option, selected at runtime** and captured — like the Opportunities
  owner — never hard-coded) + required Type (*Email*, one of the seven
  verified live options), plus the persisted **Expected Revenue** (`2500`)
  and **Budget Cost** (`1000`). After **Save** the test asserts the success
  dialog and the detail-page URL (same as the other CRM modules), then
  searches the list for the unique name and asserts **exactly one row**
  showing the type, owner, the pre-filled *Planned* status default and the
  currency-rendered amounts `INR 2,500.00` / `INR 1,000.00`. It then opens
  the row's detail page through its `hx-get` URL (route pattern asserted)
  and asserts the header card shows the heading (name), `Campaign Owner:
  <captured>`, `Type: Email` and `Expected Revenue: INR 2,500.00`, scoped
  to the header card's own label-value rows (each label matches exactly one
  row there, verified live).
- **Missing required field is blocked** — the owner and Type are given real
  choices, the Campaign Name is left empty, **Save** is clicked, and the
  test asserts the form stays open with native HTML5 validation
  (`valueMissing` = `true`, message *"Please fill out this field."*), no
  success dialog and no navigation — no record is created. (Status "Planned"
  and Number Sent 0 are pre-filled by the app, so only the name can block.)

The **Lead ↔ Campaign association is deliberately not covered**: the Create
Campaign form has no lead selector and the detail page only shows read-only
aggregates, so the relationship cannot be verified from the campaigns side
(verified live; `PHASE_2B_5_DISCOVERY.md` §5).

### 7.8 `tests/lead-conversion.spec.js`

One end-to-end test — the demo's verified default conversion path — using a
brand-new unique lead built by the `uniqueConvertLead()` helper (one call
returns the consistent first/last name, email and company used everywhere in
the test), which means **each run creates 4 persistent records**: 1 lead
(the test creates it) plus 1 account, 1 contact and 1 opportunity (the
conversion creates them). All are fictional and timestamp-unique, so no run
collides with another.

The test, step by step:

1. **Create the lead** through the real leads UI (reusing
   `leadsPage.createLead` from the Leads module) and wait for the
   "Lead created successfully." dialog.
2. **Select the exact lead**: search the leads list by the lead's unique
   email and assert **exactly one row** matches.
3. **Open it** through the approved verified-URL fallback (the demo's HTMX
   overlay still blocks row clicks) and assert the URL is the lead's
   `/crm/leads/leads-detail/<id>/` page. The URL is captured here and used
   again in step 7.
4. **Convert through the actual UI**: click the detail page's *Convert*
   stage step; the page object then asserts the conversion form's
   **pre-filled field mapping** (Account Name = company, Contact
   First/Last Name = the lead's names, Opportunity Name =
   `<company> - Opportunity`) and its **Create New defaults** for all three
   sections — so the lead→record mapping is verified rather than invented.
   Then it clicks **Convert** and waits for the "Your lead has been
   converted" result panel.
5. **Verify the three created records**, each independently: the result
   panel links them; the page object extracts each link's real `hx-get`
   detail URL (asserted against the verified route pattern, never
   constructed), navigates to it and asserts the persisted values —
   account: the company name in the header card and Details tab plus the
   mapped `Account Source: Website` and `Industry: Finance`; contact: the
   lead's unique email in the header card; opportunity: the generated name
   in the header card plus the **account link in its Details tab**
   (`#Account-details-tab`, rendered as `<account name> - <account id>` —
   the demo's authoritative opportunity→account surface).
6. **Verify the converted state**: the same email search that found the
   lead in step 2 now matches **0 rows** in the default leads list, and the
   **Converted Lead view** (`?view_type=converted_lead`) matches **exactly
   1 row** — whose name cell carries the *identical* detail URL captured in
   step 3, proving it is the exact same lead record.
7. No negative test: the conversion form has **no client-side required
   fields and no stable validation scenario**, so nothing stable to
   assert (documented in `PHASE_2B_6_DISCOVERY.md` §8.2). The
   **select-existing branches** are also not covered — they were verified
   structurally (each mode's lookup widget exists; the existing-opportunity
   lookup is disabled until an account is chosen) but exercising them
   would double the persistent conversion data for the same business
   assertion.

One relationship assertion is **deferred as demo-blocked**: the account
side of the relationship (the Related Lists side lists) is currently
unreachable in the browser — a permanently rendered invisible overlay
blocks its clicks and its content URLs are htmx-only (see section 6 and
`PHASE_2B_6_DISCOVERY.md` §6). The opportunity→account link is asserted
instead, on the surface the demo still exposes.

---

## 8. Reading the results

After a run you will see a summary like:

```
Running 14 tests using 1 worker

  ok 1 [chromium-login] › tests\login.spec.js:21:5 › user cannot log in with an invalid password (4.4s)
  ...
  14 passed
```

- `ok` / `✓` = the test passed.
- A failure shows which step failed, plus a screenshot of the moment of
  failure (saved in `test-results/`; the project is configured to capture
  screenshots on failure and traces on retry).

For the detailed visual report:

```bash
npm run report
```

---

## 9. Common problems and fixes

**Error: "CRM credentials are missing"**
→ Set `CRM_USERNAME` and `CRM_PASSWORD` (see section 2.5). Ask the project
owner for the current demo credentials.

**Error about browsers not installed**
→ Run `npx playwright install chromium`.

**Test fails on login**
→ The demo site may be slow or temporarily down. Re-run it. If the demo
credentials changed, update `.env` and delete
`playwright/.auth/user.json`.

**A form field is filled by mistake or a locator fails**
→ The site may have changed. Open the relevant page object and compare the
labels there with the live site. Dropdown option lists can also be re-checked
in the live UI (the values used are documented in section 6).

**Test fails at the confirmation dialog**
→ The demo dialog may behave differently (e.g. wording). The final proof of
creation is the detail-page URL assertion, so check whether the record was
actually created before digging into the dialog code.

---

## 10. Adding a new test (for a new page)

If you want to automate a new page (say, another CRM module) in a later
phase, follow the pattern the
leads/contacts/accounts/opportunities/activities/campaigns pages already
use:

1. **Create a page object** `pages/<module>Page.js`, modeled on
   `campaignsPage.js`:
   - locators scoped to `#modalBox` in the constructor;
   - an `open()` method that navigates, waits for the list to be ready, and
     presses `Escape`;
   - a create/data method that fills the fields, selects the required
     dropdowns with verified options, clicks **Save**, and waits for the
     success dialog (which closes by itself);
   - a `openRowDetail(matchingRow)` method that resolves the matched row's
     `hx-get` detail URL and navigates to it (see section 6 for why).
2. **Create a test file** `tests/<module>.spec.js`, modeled on
   `campaigns.spec.js`: reuse the stored session, create the record,
   assert the detail-page URL (or the documented list-URL completion, like
   Activities), then verify persistence through the list search and the
   detail-page fields.
3. **Run it:**

```bash
npx playwright test tests/campaigns.spec.js --headed
```

---

## 11. Quick reference — commands

| What you want | Command |
|---|---|
| Install dependencies (once) | `npm install` |
| Install Chromium (once) | `npx playwright install chromium` |
| Configure credentials (once) | `cp .env.example .env`, then edit it |
| Run all tests (headless) | `npm test` |
| Run all tests, watch the browser | `npm run test:headed` |
| Chromium projects only | `npm run test:chromium` |
| Run one test file | `npx playwright test tests/leads.spec.js` |
| Debug with the Playwright inspector | `npm run test:debug` |
| Open the HTML report | `npm run report` |

---

## 12. Summary

- **Playwright** controls a real browser to test the CRM demo site.
- **Page Objects** (`pages/`) know *how* to use each page; **Tests**
  (`tests/`) know *what* to do and *what to check*; **utils** provide
  credentials and unique test data.
- The login form and the
  lead/contact/account/opportunity/activity/campaign forms live inside a
  `#modalBox` popup; the page objects fill the fields, select the required
  dropdowns, click **Save**, wait for the confirmation dialog, and verify
  completion by landing on the record's detail page — except for
  **activities**, where the demo stays on the list after saving and the
  persisted association is asserted on the list row. The **lead conversion
  form** is separate (`#contentModalBox` on the lead detail page) and its
  success signal is a "Your lead has been converted" panel, not a dialog.
- After creation, persistence is proven **independently**: the tests search
  the module list for the record's unique email (or unique account /
  opportunity / activity / campaign name), open the matched row's record
  through the mentor-approved verified-URL fallback (the demo's HTMX
  overlay currently blocks row clicks), and check the persisted detail
  fields. The conversion test applies the same discipline to all four
  outcomes: the created account, contact and opportunity are each opened
  and checked on their own detail pages, and the converted lead is checked
  in the leads list's "Converted Lead" view.
- Credentials come from environment variables only, and the session is
  logged in once per run via a setup project.

You now have everything you need to run, understand, and extend this
automation.