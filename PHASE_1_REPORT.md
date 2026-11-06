# Phase 1 Completion Report — CRM Demo Automation

**Project:** Horilla CRM demo automation suite (`D:\CRM Demo Automation`)
**Phase:** 1 — Stabilization
**Date:** 2026-11-03
**Status:** ✅ **Phase 1 complete** (no commit or push performed; Phase 2 not started — awaiting approval)

---

## 1. Executive summary

The existing suite had **all 3 of its tests failing** against the live demo site.
Root cause was confirmed by live browser inspection before any code change: the
application's save flow and success messaging had changed. Phase 1 repaired the
configuration, replaced fixed sleeps and swallowed errors with Playwright
auto-waiting and explicit failures, introduced a single-login session design
(storageState setup project), moved credentials out of source code, separated
the redundant combined test into focused specs, and brought the documentation
(`README.md`, `AUTOMATION_GUIDE.md`) in line with the final project.

**Final validation: 5 passed / 0 failed / 0 skipped in 15.8s**, executed against
the live demo site using credentials supplied via shell environment variables
only (nothing committed, no `.env` created).

---

## 2. Issues found in the baseline (audit + live verification)

### 2.1 Root cause of the failing suite (verified live)

| # | Issue | Evidence |
|---|---|---|
| 1 | Saving a Lead or Contact now **redirects to the record detail page** (`/crm/leads/leads-detail/<id>/`, `/crm/contacts/contact-detail-view/<id>/`); there is no inline success toast | Navigation observed immediately after Save; `.oh-alert` absent |
| 2 | The success confirmation is now a **SweetAlert2 dialog** (`h2.swal2-title`) with the wording `Lead created successfully.` / `Contact created successfully.` — the old assertion regex `/Lead was successfully created/` never matches | DOM inspection on the detail page |
| 3 | The dialog **auto-dismisses after a few seconds**, leaving its OK button hidden in the DOM | Playwright click call log: resolved → "element is not visible" → "element was detached from the DOM" |
| 4 | Every form dropdown is a **Select2 widget** — the original `<select>` remains hidden in the DOM with a visible `role="combobox"` wrapper; naive `getByLabel` matches both (strict-mode violation) | Playwright strict-mode violation listing both elements |

### 2.2 Configuration issues

| # | Issue |
|---|---|
| 5 | `playwright.config.js` had a malformed comment (`}*\` instead of `*/`) at the Firefox/WebKit block — an unterminated block comment one edit away from breaking the whole config |
| 6 | Module-format inconsistency: ESM `import` config while `package.json` declares `"type": "commonjs"` |
| 7 | `fullyParallel: true` fired 3 simultaneous unauthenticated sessions at the shared demo, contradicting the guide's own `--workers=1` advice |

### 2.3 Reliability and design issues

| # | Issue |
|---|---|
| 8 | Fixed `waitForTimeout(3000)` calls (5×) and deprecated `waitForLoadState('networkidle')` waits |
| 9 | Wizard methods could **silently exit** when neither Next nor Save was found; dropdown failures were swallowed with `.catch(() => {})` |
| 10 | The live forms turned out to be **single-step** (Save / Save & New — no wizard "Next" steps); the wizard-walking assumption the page objects were built on no longer matched reality |

### 2.4 Hygiene and duplication issues

| # | Issue |
|---|---|
| 11 | The demo's credentials hard-coded in all 3 test files (literal values since removed from this document); login boilerplate duplicated per test |
| 12 | `01-login.spec.js` duplicated the coverage of the standalone lead/contact tests (and created duplicate records on the shared demo) |
| 13 | Empty unused directories (`utils/`, `fixtures/`, `test-data/`); `package.json` pointed `"main"` at a nonexistent file; page-object file naming inconsistent (`LoginPage.js` vs `leadsPage.js`) |
| 14 | No README; `AUTOMATION_GUIDE.md` described the (now gone) wizard flow |

### 2.5 Baseline facts verified on the live site (2026-11-03, before editing)

| Fact | Value |
|---|---|
| Login | Django form POST; labels `Username` / `Password`; button `Sign In` |
| Invalid login response | Text `Invalid credentials. Please check and try again.` — no lockout observed |
| Demo credentials | Publicly displayed on the login page itself (literal values not reproduced in documentation) |
| Lead required dropdowns | `lead_source`, `lead_status`, `industry`, `country` — all default to empty `---------` (index 0) |
| Lead Owner | Pre-filled automatically (verified) |
| Contact required dropdown | `contact_owner` — empty by default |
| Verified valid dropdown values | Lead Source: `Website` · Lead Stage: `New` · Industry: `Finance` · Country: `India` (all seeded demo data) |
| Form buttons | `Save`, `Save & New` (single step) |
| Session | Cookie `sessionid` is HttpOnly; `storageState` reuse verified working |
| Detail page | The linked **Company** shown is the demo account (e.g. "Horilla"), not the entered *Lead Company* value |

---

## 3. What was changed and why

| File | Change | Why |
|---|---|---|
| `playwright.config.js` | Rewritten: CommonJS (consistent with package.json), `BASE_URL` env override, 60s test timeout, `expect.timeout`, `list` + `html` reporters, screenshots on failure, trace on first retry, fixed the malformed comment, removed the accidental parallel-session pile-up, defined 3 projects | Configuration stabilization (goal 2) |
| `.gitignore` | Added `.env`, `.env.*`, `!.env.example` | Project hygiene (goal 1) |
| `.env.example` | New: placeholder `CRM_USERNAME`, `CRM_PASSWORD`, `BASE_URL` | Credential handling without committing anything real |
| `package.json` | Added scripts `test:chromium`; added `dotenv` dev dependency (lockfile synced); removed dead `"main"`; added description + node engines; `private: true` | Package scripts and hygiene (goal 6) |
| `utils/env.js` | New: credential resolution; **fails with an actionable message** when `CRM_USERNAME`/`CRM_PASSWORD` are missing — never silently falls back to hard-coded credentials | Authentication design (goal 3) |
| `utils/test-data.js` | New: unique `example.com` email generator (timestamp + counter) | Test design (goal 5) — unique data, no real personal data |
| `pages/loginPage.js` | Renamed from `LoginPage.js`; added auto-waiting `open()` and the invalid-credentials locator | Naming consistency; reliability |
| `pages/leadsPage.js` | Rewritten against the verified live form: single-step fill, name-based Select2 handling with `force: true`, verified dropdown values, waits for the success dialog, best-effort OK dismissal (dialog self-closes), no silent exits, no swallowed errors | Page object reliability (goal 4) |
| `pages/contactsPage.js` | Same treatment as leads | Page object reliability (goal 4) |
| `tests/auth.setup.js` | New: setup project — logs in once, verifies it left the login page, stores `playwright/.auth/user.json` | Reusable authenticated session; failing fast on bad credentials |
| `tests/login.spec.js` | New: positive login + invalid-password rejection; runs in the `chromium-login` project which is **never pre-authenticated** | Login coverage independent of stored session |
| `tests/leads.spec.js` | Rewritten from `02-leads.spec.js`: uses stored session, helper-generated unique email, waits for success dialog, asserts landing on the lead detail page | Independent, deterministic workflow test |
| `tests/contacts.spec.js` | Rewritten from `03-contacts.spec.js`: same treatment | Independent, deterministic workflow test |
| `tests/01-login.spec.js` | **Removed** | Redundant combined flow — the brief permits removal when the independent workflows provide equivalent coverage. They do: login is covered directly (positive + negative), and each creation workflow is covered end-to-end with an authenticated session. It also duplicated record creation on the shared demo. |
| `README.md` | New: professional overview — coverage, design, setup, commands, structure, known limitations | Documentation maintained for the phase |
| `AUTOMATION_GUIDE.md` | Rewritten to match the actual final structure, env variables, auth design, verified live UI behavior, demo limitations and troubleshooting | Documentation accuracy |

Design decisions honored from the brief: JavaScript only (no TypeScript), existing POM preserved, no speculative modules, cross-browser (Firefox/WebKit) left as documented opt-in, no commits/pushes/remotes.

---

## 4. Final project tree

```
CRM Demo Automation/
├── .env.example
├── .gitignore
├── AUTOMATION_GUIDE.md
├── README.md
├── package.json
├── package-lock.json
├── playwright.config.js
├── pages/
│   ├── contactsPage.js
│   ├── leadsPage.js
│   └── loginPage.js
├── tests/
│   ├── auth.setup.js
│   ├── contacts.spec.js
│   ├── leads.spec.js
│   └── login.spec.js
└── utils/
    ├── env.js
    └── test-data.js
```

Excluded by `.gitignore` (never committed/tracked): `node_modules/`,
`test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/`,
`playwright/.auth/`, `.env`, `.env.*` (except `.env.example`).

---

## 5. Validation executed

| # | Command / check | Result |
|---|---|---|
| 1 | `npm install` then `npm ci` | OK — lockfile synchronized after adding `dotenv`; clean install from lockfile succeeded |
| 2 | `npx playwright test --list` | OK — **5 tests in 4 files** discovered; config parses and all projects resolve |
| 3 | `CRM_USERNAME=… CRM_PASSWORD=… npx playwright test` | OK — run against the live site |
| 4 | Iterative debugging of the 2 workflow tests | Both failures root-caused (Select2 strict-mode violation; self-dismissing SweetAlert dialog) and fixed |
| 5 | HTML report + failure output inspection | Report generated (`playwright-report/index.html`); failure screenshots/traces present in `test-results/` during debugging; all clean on the final run |
| 6 | `git check-ignore node_modules test-results playwright-report playwright/.auth/user.json .env` | All correctly ignored |
| 7 | `git init` (only — no commit), `git status --short`, `git diff --check` | Only source files would be tracked; no generated artifacts, no `.env`, no auth state; no whitespace errors |

Live validation used the demo credentials that are **publicly displayed on the
site's own login page**, passed via shell environment
variables only — nothing written to source, no real `.env` file created.

---

## 6. Test results (as executed)

```
Running 5 tests using 3 workers

  ok 1 [chromium-login] › tests\login.spec.js:21:5 › user cannot log in with an invalid password (4.4s)
  ok 2 [chromium-login] › tests\login.spec.js:8:5 › user can log in with valid credentials (5.1s)
  ok 3 [setup] › tests\auth.setup.js:7:1 › login once and store the session (5.4s)
  ok 4 [chromium] › tests\contacts.spec.js:5:5 › user should be able to create a new contact (7.2s)
  ok 5 [chromium] › tests\leads.spec.js:5:5 › user should be able to create a new lead (8.6s)

  5 passed (15.8s)
```

**Passed: 5 · Failed: 0 · Skipped: 0**

---

## 7. How to run it yourself

```bash
cd "D:\CRM Demo Automation"
npm install                     # if node_modules is missing
npx playwright install chromium # once
cp .env.example .env            # then enter the demo credentials
npm test                        # or: npm run test:headed
npm run report                  # HTML report of the last run
```

To override the target environment: set `BASE_URL`.

---

## 8. Unresolved risks and decisions for the user

1. **Credentials** — validation used the demo's publicly displayed credentials
   via shell env only. Before normal use, copy `.env.example` → `.env` with the
   credentials you want; if the demo ever changes them, update `.env` and
   delete `playwright/.auth/user.json`.
2. **Record-persistence assertions** — per the brief, checking created records
   in the list views is deferred to the later workflow phase, once reliable
   list selectors are confirmed. Completion is currently proven by the
   detail-page URL plus the success dialog.
3. **Detail-page "Company" field** — shows the linked demo account ("Horilla"),
   not the value entered in the form's *Lead Company* field. Documented as a
   known demo behavior; not asserted in tests.
4. **Shared demo data** — validation runs (and any run) create fictional
   leads/contacts with `example.com` addresses on the public demo. No edit or
   delete operations are ever performed. The demo data resets periodically.
5. **Git repository** — `git init` was executed (no commits, no remote, no
   pushes) solely to enable the required tracking/whitespace checks. GitHub
   repository creation and pushing remain yours, as planned for a later phase.
6. **Cross-browser** — Firefox/WebKit are documented in the config as an
   opt-in later step; binaries are not installed and the flows are validated
   on Chromium only.

---

## 9. Statement

**Phase 1 complete.** Configuration stabilized, authentication designed and
verified live, page objects and tests rebuilt against verified application
behavior, scripts and documentation updated, and all required validations
executed with all tests passing. No commit or push was made. Phase 2
(additional CRM modules, list-view persistence checks, CI/CD) was **not**
started and awaits your and the mentor's approval of this diff.