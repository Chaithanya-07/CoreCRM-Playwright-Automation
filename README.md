# CoreCRM – Playwright Automation Suite

[![Playwright Tests](https://github.com/Chaithanya-07/CoreCRM-Playwright-Automation/actions/workflows/playwright.yml/badge.svg?branch=master)](https://github.com/Chaithanya-07/CoreCRM-Playwright-Automation/actions/workflows/playwright.yml)

A JavaScript Page Object Model (POM) test framework for the
[**Horilla CRM Demo**](https://crm.demo.horilla.com), covering the core CRM
journey from login through lead, contact, account, opportunity, activity and
campaign creation to full lead conversion.

CoreCRM **tests this application; it does not develop it** — the Horilla CRM
Demo is the application under test (AUT).

## Objective

Automate the CRM's record lifecycle end to end using Playwright Test and the
Page Object Model, so that:

- tests describe **business behaviour**, not CSS selectors
- selectors live in **one place per page**, so a UI change is fixed once
- credentials and record data are **separated from test logic** and generated
  uniquely per run
- persistence is verified **independently of the create flow**, not trusted to
  the app's own success dialog
- the suite runs reliably with Playwright's auto-waiting instead of hard sleeps

## Tech stack

| Tool | Version | Purpose |
| --- | --- | --- |
| JavaScript | ES2022 (CommonJS) | Language — **not** TypeScript |
| Node.js | 20+ | Runtime |
| @playwright/test | ^1.62.1 | Test runner, assertions, browser automation |
| Chromium | via Playwright | The validated browser |
| dotenv | ^16.4.5 | Optional local `.env` loading (suite works without it too) |
| GitHub Actions | — | CI: Chromium-only workflow on `master` (push + pull request) |

## Framework structure

```text
CoreCRM-Playwright-Automation/
│
├── tests/                      # The test specs
│   ├── auth.setup.js           # setup project: log in once, store the session
│   ├── login.spec.js           # login page itself (always unauthenticated)
│   ├── leads.spec.js           # create a lead + verify persistence
│   ├── contacts.spec.js        # create a contact + verify persistence
│   ├── accounts.spec.js        # create an account + required-field negative
│   ├── opportunities.spec.js   # create an opportunity + required-field negative
│   ├── activities.spec.js      # create an activity (+ association) + negative
│   ├── campaigns.spec.js       # create a campaign + required-field negative
│   └── lead-conversion.spec.js # convert a lead, verify the 4 resulting records
│
├── pages/                      # Page objects - all selectors live here
│   ├── loginPage.js            # the login form controls
│   ├── leadsPage.js            # leads list + New Lead form + row/detail actions
│   ├── contactsPage.js         # contacts list + New Contact form
│   ├── accountsPage.js         # accounts list + New Account form
│   ├── opportunitiesPage.js    # opportunities list + Create Opportunity modal
│   ├── activitiesPage.js       # activities list + Create Activity modal
│   ├── campaignsPage.js        # campaigns list + Create Campaign modal
│   └── leadConversionPage.js   # the conversion form + result panel
│
├── utils/
│   ├── env.js                  # credential resolution; fails clearly when missing
│   └── test-data.js            # unique, timestamp-stamped test data per run
│
├── .github/workflows/
│   └── playwright.yml          # CI: Chromium-only suite on push/PR to master
│
├── playwright.config.js        # projects, timeouts, reporters (serialized)
├── .env.example                # template for the local .env
├── package.json
├── .gitignore
└── README.md
```

Generated / session artifact directories (gitignored — none of these are
committed):

```text
playwright/.auth/    the saved authenticated session (user.json) written by setup
test-results/        per-test artifacts: failure screenshots, retry traces
playwright-report/   the Playwright HTML report
```

### How the layers fit together

```text
tests     →  describe business behaviour; contain the assertions
  ↓
pages     →  know the selectors and the actions for one screen
  ↓
utils     →  reads credentials, generates the unique record data per run
  ↓
playwright.config.js →  projects, the saved session, the shared demo constraints
```

- **tests** should read like a manual test script: create a record, prove it
  persisted, check what the app got right and wrong. Any raw selector in a
  test belongs in a page object instead.
- **pages** answer "what can I do on this screen?". Each page object owns its
  module fully: navigation, the create form, the row search, and the
  detail-page access path (see [Persistence verification](#persistence-verification)).
- **utils** keeps values that change (credentials, unique record names) out of
  the test code — `env.js` fails with an actionable message instead of
  guessing, `test-data.js` generates fresh data so every run is re-runnable.
- **playwright.config.js** encodes the operational constraints of the demo:
  one worker, serialized files, one login per run, Chromium only (for now).

The interview answer this implements: *"My tests describe business flows, my
page objects own the selectors, my data layer keeps credentials and record
values out of the tests — so when the application changes, I fix it in exactly
one place."*

## Setup

### Prerequisites

- Node.js 20 or newer
- Network access to `https://crm.demo.horilla.com`
- Demo credentials for the Horilla CRM demo account (from the project owner)

### Installation

```bash
npm install
npx playwright install chromium
```

### Credentials

The tests never hard-code credentials. They read them from environment
variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `CRM_USERNAME` | yes | the demo account username |
| `CRM_PASSWORD` | yes | the demo account password |
| `BASE_URL` | no | override to run against a different environment (default: the Horilla demo) |

The easiest way is to create a local `.env` file from the provided template:

```bash
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

```text
CRM_USERNAME=your demo username
CRM_PASSWORD=your demo password
BASE_URL=https://crm.demo.horilla.com
```

`.env` is listed in `.gitignore` and must never be committed. If the
variables are missing, the tests stop immediately with a clear message
(`utils/env.js`) instead of silently falling back to a default account. On CI
the same variable names are provided as repository secrets — see
[Continuous integration](#continuous-integration).

## Execution commands

```bash
npm test                     # run everything, headless: setup → login → the 6 modules → lead conversion
npm run test:headed          # watch the browser while it runs
npm run test:chromium        # Chromium projects only (also what CI runs)
npx playwright test tests/leads.spec.js        # one file
npx playwright test tests/login.spec.js --headed # one file, visible browser
npm run test:debug           # step through with the Playwright inspector
npm run report               # open the HTML report of the last run
```

The same commands live in `package.json` as npm scripts — `npm test`,
`npm run test:headed`, `npm run test:chromium`, `npm run test:debug`,
`npm run report` — which is shorter to type and what CI calls.

## Execution model

The suite runs on **Chromium** through three Playwright projects, all
deliberately **serialized**:

```text
setup          ── logs in once, saves storageState to playwright/.auth/user.json
  │
  ├── chromium ── the 6 CRM modules + lead conversion; depends on setup,
  │               starts every test from the saved session
  └── chromium-login ── login.spec.js only; deliberately NOT authenticated

workers: 1, fullyParallel: false  ── one browser session at a time
```

- **Serialized on purpose.** The application under test is a shared public
  demo instance; simultaneous sessions would collide with each other and add
  load to it. Test files also run one after another.
- **One login per run.** The `setup` project signs in once; every
  authenticated test reuses the saved `storageState` — see
  [Authentication architecture](#authentication-architecture).
- **Chromium-validated only.** Firefox/WebKit are documented in
  `playwright.config.js` as an opt-in, later step; they are not currently
  installed, configured as projects, or validated, and nothing in this README
  claims otherwise.
- **CI retries only.** Locally `retries: 0`; on CI the config enables
  `retries: 2` and `forbidOnly` (a stray `test.only` fails the build instead
  of silently skipping the rest).

## Test coverage

**14 tests per full run**: 1 auth setup test + 13 workflow tests across 8 spec
files, plus the shared demo's six create-and-verify modules and the
conversion flow — all passing, locally and in CI.

### Setup — `tests/auth.setup.js`
- logs in once with the provided credentials and saves the authenticated
  session for every workflow test (missing credentials fail the run here,
  with an actionable message, instead of letting 13 tests fail confusingly)

### Login — `tests/login.spec.js` (always unauthenticated)
- user can log in with valid credentials
- user cannot log in with an invalid password — the demo answers *"Invalid
  credentials. Please check and try again."* (no lockout behavior observed)

### Leads — `tests/leads.spec.js`
- user should be able to create a lead and find it again in the leads list —
  unique `example.com` email, then an independent search + detail-page
  persistence check

### Contacts — `tests/contacts.spec.js`
- user should be able to create a contact and find it again in the contacts
  list — same discipline, anchored on the unique email + persisted Title

### Accounts — `tests/accounts.spec.js`
- user should be able to create an account and find it again in the accounts
  list — accounts have no email, so the anchor is the unique name + Industry
- the New Account form blocks submission when required fields are missing —
  native HTML5 `valueMissing` validation, no success dialog, no navigation

### Opportunities — `tests/opportunities.spec.js`
- user should be able to create an opportunity and find it again in the
  opportunities list — unique name + Stage (*Prospecting*) + owner + persisted
  Amount (`INR 4,500.00`), Close Date and a live Account association
- the New Opportunity form blocks submission when required fields are missing

### Activities — `tests/activities.spec.js`
- user should be able to create an activity and find it again with its
  association in the list — Task type, unique Subject, and a Lead picked
  through the real remote Select2 search widget; the association is asserted
  on the list row (the module's authoritative persisted view of it)
- the Create Activity form blocks submission when the required subject is
  missing

### Campaigns — `tests/campaigns.spec.js`
- user should be able to create a campaign and find it again in the campaigns
  list — unique name + owner + Type (*Email*) + the pre-filled *Planned*
  status default + the currency-rendered `INR 2,500.00` / `INR 1,000.00`
- the Create Campaign form blocks submission when the required campaign name
  is missing

### Lead Conversion — `tests/lead-conversion.spec.js`
- converting a lead creates the account, contact and opportunity and marks
  the lead converted — the demo's verified default path, asserting the
  form's pre-filled lead→record field mapping, each created record's own
  detail page, and the lead's converted state in the leads list's
  "Converted Lead" view (one run creates 4 persistent records)

## Persistence verification

The signature discipline of this framework: **a success dialog is not
evidence**. The demo confirms every create with a SweetAlert2 dialog — but a
record that silently failed to save, or was saved with wrong values, would
still get one. So after every creation the test goes back through the
application's real surfaces:

```text
create the record (form → Save → success dialog observed)
  ↓
navigate to the module list with the app's verified `search` query parameter
(verified live on 2026-11-03) + the record's unique value
  ↓
assert EXACTLY ONE matching row, and open it via the row's own hx-get detail
URL — extracted from the DOM, asserted against the module's route pattern,
never constructed  (direct row clicks are demo-blocked today; see
[Known demo limitations](#known-demo-limitations))
  ↓
assert the persisted fields on the detail page, scoped to the visible record
header card (a value repeats in the breadcrumb, tabs and hidden copies —
verified live on 2026-11-04 — so an unscoped assert can false-pass)
```

The unique per-module anchors: email for Leads and Contacts; the generated
unique name for Accounts, Opportunities and Campaigns; the unique Subject for
Activities (whose association is asserted on the list row, because that
module's detail page does not display the Related To record). The
conversion test applies the same discipline to all four outcomes. Test-created
records are never deleted — they are fictional, timestamp-unique, and the
shared demo resets periodically.

## Reporting

Every run produces complementary forms of evidence:

| Evidence | When it is captured | Where it is stored |
| --- | --- | --- |
| List output | every run (live in the terminal) | — |
| HTML report | every run | `playwright-report/` |
| Screenshot | failed tests (`only-on-failure`) | `test-results/<test>/` |
| Trace | first retry of a failed test (`on-first-retry`) | `test-results/<test>/` |

### Commands

```bash
npm run report   # open the last HTML report (playwright show-report)
```

### Screenshot

A PNG of the page state at the moment a test fails, attached to the test in
the HTML report, stored under `test-results/`.

### Trace

Captured on the **first retry** of a failed test (`retries: 2` on CI): every
action, network request and DOM snapshot leading to the failure. Locally
(`retries: 0`) traces appear only for a deliberately retried run.

### Reporting configuration

The settings live in `playwright.config.js`:

```js
reporter: [['list'], ['html', { open: 'never' }]],

use: {
  screenshot: 'only-on-failure',
  trace: 'on-first-retry',
},
```

- `reporter` pairs the terminal list output with the HTML report; `open:
  'never'` keeps the report from stealing focus mid-run.
- `screenshot: 'only-on-failure'` — a PNG only when a test fails.
- `trace: 'on-first-retry'` — full debugging evidence only where failure
  evidence is needed, so clean runs stay lightweight.

All generated artifact directories (`playwright-report/`, `test-results/`,
`playwright/.auth/`) are gitignored and are never committed.

## Authentication architecture

Authenticated tests do not log in through the UI. Login happens **once** and
its result is reused:

```text
tests/auth.setup.js   (setup project, runs first)
    UI login with credentials from the environment / .env
    ↓
    save cookies  →  playwright/.auth/user.json  (gitignored)
    ↓
chromium project  (dependencies: ['setup'], storageState: the saved file)
    ↓
every module test starts already signed in — no repeated logins
    ↓
chromium-login project  deliberately skips the saved state, so
login.spec.js genuinely tests the login page, positive and negative
```

- The **setup project** runs before the workflow projects
  (`dependencies: ['setup']`), so the state file always exists before
  authenticated tests run — and if credentials are missing or wrong, the run
  stops there with a clear message.
- `user.json` is a live authenticated session cookie file, like a password:
  gitignored, regenerated by setup on every run, never committed, never
  shared, and never part of a handoff.
- If the demo password ever changes, deleting `user.json` is enough — the
  next run recreates it.

The interview answer this implements: *"How do you avoid logging in before
every test?"* — log in once in a setup project, save the storage state, and
configure the authenticated projects to reuse it; keep the login tests in a
separate project so negative tests genuinely start without a session.

## Test data

All record data is generated per run by `utils/test-data.js` — fictional,
timestamp-unique, deterministic in shape, no real personal data:

| Module | Unique value per run | Also filled and verified |
| --- | --- | --- |
| Lead | unique `example.com` email | first/last name, title, Lead Company, Lead Source (*Website*), Lead Stage (*New*), Industry (*Finance*), Country (*India*) |
| Contact | unique `example.com` email | first/last name, title, owner |
| Account | unique `Aurora Systems <timestamp>.<n>` name | Industry (*Finance*), owner |
| Opportunity | unique `Aurora Opportunity <timestamp>.<n>` name | Stage (*Prospecting*), owner, Amount `4500` (rendered `INR 4,500.00`), Close Date `2027-06-30`, Account association (captured live from the dropdown, never hard-coded) |
| Activity | unique `Aurora Activity <timestamp>.<n>` subject | Activity Type (*Task*), Status (*Not Started*, pre-filled), Related Content Type (*Lead*) + Related To lead selected through the remote widget |
| Campaign | unique `Aurora Campaign <timestamp>.<n>` name | owner (first available user, captured), Type (*Email*), pre-filled Status (*Planned*) and Number Sent (`0`), Expected Revenue `2500`, Budget Cost `1000` |
| Conversion lead | one consistent set from `uniqueConvertLead()`: names, unique email, company | drives 4 persistent records per run (the lead + the conversion's account, contact, opportunity) |

Required dropdown options were **captured from the live demo and verified
(2026-11-03)** — no guessed values. Record data accumulates by design: tests
only create, never edit or delete (see
[Known demo limitations](#known-demo-limitations)).

## Design notes

**Dropdowns are Select2 widgets.** The original `<select>` stays in the DOM,
visually hidden behind the widget. The page objects address the native
`<select>` element directly and let Playwright's `selectOption` do the rest —
the one approved `force` exception in the suite.

**The Create Activity form re-renders through HTMX** (verified live on
2026-11-04). Picking an Activity Type or Related Content Type makes the app
asynchronously re-render the whole form; two pending re-renders can arrive
out of order and reset fields, and the Select2 label updates *before* the
swap. The page object waits for the actual DOM swap (marked with a one-off
probe attribute on the Subject input) before touching the next field — no
fixed sleeps anywhere in the suite.

**The Related To widget loads its options remotely.** It is a
`select2-pagination` control: options are fetched from the server only when
the widget is opened and searched. The page object opens it with a real
click, types into the open dropdown's search field, waits for a real option
(skipping the transient "Searching…" placeholder), clicks it, and returns
the exact selected label so the later assertion uses the same value the form
was given — never a hard-coded one.

**Detail pages repeat record values.** A value (email, industry, title…)
appears in the header card, the Details tab, the breadcrumb, and hidden
"Recently viewed" copies. Persistence assertions are scoped to the visible
record header card so each matches exactly one element.

**Detail pages remember your last tab.** The demo persists the last active
detail tab server-side, so every tab-scoped assertion opens the Details tab
explicitly first instead of assuming the default view.

**Popups and the dashboard switcher can overlay the page** after login or
navigation — the page objects press `Escape` after navigating.

**The success dialog closes by itself.** The tests assert its appearance and
move on; the record is already saved, and the real proof comes from the
[persistence check](#persistence-verification).

## Continuous integration

The suite runs on **GitHub Actions** (`.github/workflows/playwright.yml`),
triggered on **push** and **pull_request** to `master`, running the
Chromium-only script (`npm run test:chromium`) with demo credentials supplied
as repository secrets. Latest run: **success, `14 passed (2.4m)`**
([run 42390250164](https://github.com/Chaithanya-07/CoreCRM-Playwright-Automation/actions/runs/42390250164),
2026-11-07).

The credentials step branches three ways — implemented with public event
metadata only, no `pull_request_target`, no secret values ever echoed or
persisted:

| Context | Behavior |
| --- | --- |
| External fork pull request (secrets absent by design) | Skip the authenticated suite with an explicit `::notice::` — nothing fails, nothing is exposed |
| Push / non-fork context with missing `CRM_USERNAME`/`CRM_PASSWORD` | **Workflow fails loudly** with an actionable `::error::` pointing at the Settings → Secrets fix |
| Both secrets present (trusted context) | The Chromium suite runs exactly as designed |

On CI the config also enables `retries: 2` and `forbidOnly` — a leaked
`test.only` fails the build instead of silently skipping the rest of the
suite. The status badge at the top of this README links to the live workflow.

## Known demo limitations

What this suite deliberately does *not* cover, verified against the live
application rather than assumed. No fake coverage was added anywhere.

### Demo platform constraints

- The demo site is **shared and public**: test-created data is visible to
  everyone and resets periodically. Tests only create records — and run
  serialized for the same reason — they never edit or delete anything.
- **Lead conversion creates 4 persistent records per run**: 1 lead created
  through the leads UI plus, from its conversion, 1 account, 1 contact and 1
  opportunity, all fictional and timestamp-unique; the converted lead moves
  out of the default leads list into the "Converted Lead" view
  (`?view_type=converted_lead`). Records are never deleted.
- The demo is **Chromium-validated only**; Firefox/WebKit are documented as
  an opt-in, later step in `playwright.config.js`.

### Workarounds currently in force

- **Temporary demo regression: list-row clicks are blocked** (verified live
  on 2026-11-04, affects all list modules). The demo's lists were converted
  to HTMX partial navigation, and a transparent full-table
  `#loading-indicator` overlay intercepts every pointer event over the rows —
  a real user cannot click a row either. Mentor-approved temporary
  workaround: the tests extract the exact detail URL the matched row's name
  cell carries in its `hx-get` attribute (never constructed), assert it
  matches the module's detail-route pattern, and navigate to it directly.
  The original click methods (`openLeadRow`, `openContactRow`,
  `openAccountRow`) are kept in the page objects, clearly marked as currently
  unusable, so they can be restored the moment the demo removes the overlay.
- **The success confirmation is a SweetAlert2 dialog that closes
  automatically** after a few seconds. The tests assert its appearance, then
  independently verify persistence through the list search and detail page.
- **Saving an activity behaves differently from the other modules**: the demo
  shows "Activity created successfully." and **stays on the activities list**
  (`/activity/activity-view/?section=schedule`) — there is no detail-page
  redirect. The record's detail page exists and is reached through the
  verified-URL fallback.
- **The Lead Conversion modal is a separate one**: unlike every create form
  (which loads into the shared `#modalBox`), the conversion form loads into
  the lead detail page's own `#contentModalBox`, and its success signal is a
  "Your lead has been converted" panel rendered in place of the form — not a
  dialog.

### Module coverage boundaries

- **Accounts — Parent Account is deferred**: the dropdown exists in the form,
  but the demo does not persist the selection (verified live during Phase
  2B.2).
- **Opportunities — only the verified behaviors are covered**: the create
  form, the required Opportunity Name, the persisted amount (currency-
  rendered), close date, stage and Account association. Stage pipeline
  progression, Probability auto-derivation, Primary Campaign Source, Link
  Leads, Duplicate and Change Owner are not verified and not covered (verified
  live during Phase 2B.3 discovery).
- **Campaigns — only the verified behaviors are covered**: the create form,
  the required Campaign Name / Campaign Owner / Type, the pre-filled *Planned*
  status default and the rendered Expected Revenue/Budget amounts. **The
  Lead ↔ Campaign association is deferred**: the Create Campaign form has no
  lead selector and the detail page only shows read-only aggregate counts
  ("Leads in Campaign" etc.), so the relationship cannot be verified from the
  Campaigns side without modifying Lead records — verified live during
  Phase 2B.5 discovery). Parent Campaign is deferred like Parent
  Account; Save & New, Import, Filters, other views, date persistence and
  status editing are not verified and not covered.
- **Activities — covered where the demo's behavior could be verified
  end-to-end**: Task-type activities only (the module's tab-default type), a
  Lead association selected through the real Select2 search widget, and the
  persisted association asserted on the **activities list row** — the
  activity detail page does **not** visibly display the Related To record
  (verified live on 2026-11-04). Meetings/
  Calls/Events flows, multi-assignee/participant fields, reminders, start/end
  datetimes, priority and status editing are not verified and not covered.
- **Lead Conversion — only the verified default path is covered**: converting
  a lead with all three entities in their rendered default "Create New" mode.
  The conversion form offers only Create New or Select Existing for
  Account/Contact/Opportunity — there is **no skip option** — and no
  client-side required fields, so no negative test was automated (no stable
  validation scenario exists — verified live during Phase 2B.6 discovery).
  The **select-existing branches** (existing
  Account/Contact/Opportunity lookups; the existing-opportunity lookup is
  account-scoped and disabled until an account is chosen) are documented but
  not covered, to avoid doubling persistent conversion data for the same
  business assertion — verified live during Phase 2B.6 discovery).
- **Account-side related-list relationship assertions are deferred
  (demo-blocked).** The opportunity's Details tab authoritatively shows the
  created account link, but the account detail page's Related Lists side
  lists — the only surface listing the created contact/opportunity on the
  account side — sit under a permanently rendered, invisible
  `#tab-related-lists-indicator` overlay that intercepts every pointer event
  over their anchors (real-user clicks included; verified live on
  2026-11-04). The anchors have no keyboard binding and their content routes
  are htmx-only (405 on direct navigation), so the browser-driven assertion
  is deferred; no force-click or JavaScript workaround was introduced
  (verified live during Phase 2B.6 discovery).
- **Detail pages do not always open on the "Details" tab**: the demo persists
  the last active detail tab per user (server-side `saveActiveTab`), so the
  tests explicitly click the Details tab before any tab-scoped assertion.

## Documentation

This README is the project's **single documentation file**: the objective,
tech stack, framework structure, setup, commands, execution model, test
coverage, persistence discipline, reporting, authentication architecture,
test data, design notes, CI, and all verified demo limitations live here,
kept up to date with the code. Earlier phase-by-phase reports existed
separately and have been consolidated into this README (they remain
retrievable from the repository's git history if ever needed).
