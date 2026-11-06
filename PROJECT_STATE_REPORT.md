# CoreCRM – E2E Automation Suite · Project State Report

**Inspected:** 2026-11-05
**Location:** `D:\CRM Demo Automation`
**Comparison baseline:** the approved handoff ZIP
`CoreCRM-Playwright-Automation-Final-Handoff-Corrected.zip`
(SHA-256 `e5f13c49…cbcc2f84`, verified intact — a copy survives in the T3
session attachments; the `D:\` copy of the ZIP was deleted)

---

## 1. Overall summary

The framework itself is in **good shape** — a complete, working
Playwright + Page Object Model suite covering all 7 CRM modules of the
Horilla CRM demo, with demo credentials now present locally.

However, the workspace has **drifted from the approved handoff**, and the
git history is still **empty (zero commits)**.

| Aspect | State |
|---|---|
| Framework code | ✅ Complete and coherent (9 tests, 8 POMs, 2 utils, clean config) |
| Credentials | ✅ Resolved — local `.env` filled (git-ignored) |
| Last full test run | ⚠️ Blocked on credentials (run of 2026-11-05); fresh run now possible |
| Git history | ❌ Zero commits — everything untracked |
| Docs | ⚠️ All 16 phase/guide documents deleted from disk; README references them |
| Handoff fidelity | ⚠️ 2 code files changed post-handoff (a legitimate regression fix) |

---

## 2. Codebase inventory (2,278 lines of source)

| Layer | Files | Lines | Content |
|---|---|---:|---|
| `tests/` | 9 files | 818 | `auth.setup` (login once → storageState) + 2 login tests + 11 CRM workflow tests (Leads, Contacts, Accounts, Opportunities, Activities, Campaigns, Lead Conversion) |
| `pages/` | 8 POMs | 1,218 | `loginPage`, `leadsPage`, `contactsPage`, `accountsPage`, `opportunitiesPage`, `activitiesPage`, `campaignsPage`, `leadConversionPage` — role/label-based locators, demo quirks documented in comments |
| `utils/` | 2 files | 97 | `env.js` (credential resolution with actionable error), `test-data.js` (timestamp-unique fictional data generator) |
| Config | 2 files | 119 | `playwright.config.js`, `package.json` |
| Docs | 1 file | 232 | `README.md` (plus `.env.example`) |

### Test suite composition (14 tests total)

| Project | Tests |
|---|---|
| `setup` | 1 — login once, store session (`playwright/.auth/user.json`) |
| `chromium-login` | 2 — valid-credentials login, rejected-credentials login |
| `chromium` | 11 — create + independently-verify-persistence workflows for Leads, Contacts, Accounts, Opportunities, Activities, Campaigns, Lead Conversion; plus required-field negative tests for Accounts, Opportunities, Activities, Campaigns |

### Quality observations

- **No hard-coded credentials** anywhere — verified by full-tree search;
  credentials resolve only from env/`.env` and fail with an actionable
  message (`utils/env.js:13`).
- **Serialized on purpose** (`workers: 1`, `fullyParallel: false`) — the AUT
  is a shared public demo; sessions are reused via `storageState`, regenerated
  by the setup project every run.
- **Web-first design**: no fixed sleeps; auto-waiting, `expect` polling,
  screenshots on failure, trace on retry.
- **Unique-per-run data** (`Aurora <Timestamp>.<n>` pattern, `example.com`
  emails) keeps exactly-one-row list searches reliable on the shared demo;
  no real personal data, records never deleted.
- **Honest coverage**: persistence is verified through the app's own list
  search + detail pages; demo-blocked behaviors (documented in the README's
  "Known demo limitations") were deferred rather than faked.

---

## 3. Drift from the approved handoff ZIP (41 entries → 31 disk files)

Verified by reading every ZIP entry back and diffing against current disk
contents.

### Deleted from disk — 16 documentation files ⚠️

`AUTOMATION_GUIDE.md`, `FINAL_FRAMEWORK_AUDIT_REPORT.md`,
`PHASE_1_REPORT.md`, `PHASE_1_1_REPORT.md`,
`PHASE_2A_CRM_WORKFLOW_DISCOVERY.md`,
`PHASE_2B_1_REPORT.md`, `PHASE_2B_2_REPORT.md`,
`PHASE_2B_3_DISCOVERY.md`, `PHASE_2B_3_REPORT.md`,
`PHASE_2B_3_DOC_CORRECTIONS_REPORT.md`,
`PHASE_2B_4_DISCOVERY.md`, `PHASE_2B_4_REPORT.md`,
`PHASE_2B_5_DISCOVERY.md`, `PHASE_2B_5_REPORT.md`,
`PHASE_2B_6_DISCOVERY.md`, `PHASE_2B_6_REPORT.md`

Consequence: the README's "Project structure" section (lines 111–124) and
several body references (§"Known demo limitations") currently point at files
that no longer exist.

### Changed vs. baseline — 2 files ✅ (legitimate regression fix)

**`tests/activities.spec.js`** and **`utils/test-data.js`** (20 + 17 diff
lines, dated 2026-11-05, post-handoff):

- **Before:** the activities test searched the Related To (Select2) widget
  for a hard-coded demo-data term, `"QA Engineer"`.
- **What broke:** the demo's seeded data reset made that term match nothing
  ("No results found") — an environment regression, not a test defect.
- **The fix:** the test now **creates its own related lead** first
  (`uniqueRelatedLead()` in `utils/test-data.js`) and searches the widget by
  the lead's unique **company** field (verified live 2026-11-05: Select2's
  remote search matches only the company field — last name and email are not
  searched). The search term is now guaranteed to match exactly one record
  forever, independent of demo seed data.
- **Status:** soundly engineered and commented, but **not yet validated by a
  full test run**.

### New on disk, not in the handoff — 6 files ⚠️

| File | Nature |
|---|---|
| `.env` | ✅ Intentional (git-ignored, real credentials) — the unblock from §4 |
| `_build_zip_2b6.py`, `_build_zip_final.py` | ⚠️ Handoff ZIP builder scripts (pipeline artifacts) left in the project root |
| `_debug_inpage.js`, `_debug_q.js`, `_debug_select2.js` | ⚠️ Discovery-time debug scratch scripts left in the project root |

---

## 4. Git state — the biggest gap ❌

- Branch **`master`** with **no commits at all**; every project file is
  untracked (`git status`: all `??`).
- Nothing is committed anywhere — the approved handoff ZIP is currently the
  **only** durable record of the approved state, and its on-disk copy was
  itself deleted (the T3 attachment copy verified above is the surviving one).
- `.gitignore` is correct and complete: `.env`, `.env.*` (except example),
  auth storage state, test results/reports, node_modules all excluded.

---

## 5. Test status

**Last run (`npx playwright test`, 2026-11-05, with empty credentials):**

```
1 passed    [chromium-login] user cannot log in with an invalid password
2 failed    [setup] login once and store the session              ← credentials missing
2 failed    [chromium-login] user can log in with valid credentials ← credentials missing
11 did not run (all CRM workflow tests — depend on the setup session)
```

Both failures were `Error: CRM credentials are missing.` at
`utils/env.js:13` — an environment issue, not a test defect, and the
invalid-password test's pass genuinely exercised the login page.

**Since then:** a local `.env` has been created with `CRM_USERNAME` filled
and a password set → the full suite is now runnable, pending a fresh run.

---

## 6. Risks & known constraints (carried from the README)

- The AUT is a **shared public demo** — test-created records are visible to
  everyone, reset periodically, and are never deleted by the tests; that is
  also why the suite runs fully serialized.
- A **temporary demo regression** (verified live 2026-11-04) blocks list-row
  clicks site-wide: a transparent `#loading-indicator` overlay intercepts
  pointer events over rows. Approved workaround: tests extract the exact
  detail URL from the matched row's `hx-get` attribute and navigate directly;
  original click paths are kept in the POMs, marked unusable, for restoration.
- Account-side related-list relationship assertions are **deferred
  (demo-blocked)** by a permanently rendered invisible overlay.
- Chromium-validated only; Firefox/WebKit are documented as an opt-in later
  step.

---

## 7. Recommended next actions (in order)

1. **Run the full suite** (`npx playwright test`) — the credentials unblock
   is in place and the activities regression fix needs its first real
   validation.
2. **Restore the 16 deleted docs** from the verified handoff ZIP copy (or,
   if their deletion is intended, update the README's structure section).
3. **Make the first commit** of the framework files; keep the
   `_build_zip_*` / `_debug_*` scratch files out of the commit (move to a
   `scratch/` folder or delete).
4. **Push and open a PR** toward `main` (the branch is currently `master`
   with no remote relationship established).
