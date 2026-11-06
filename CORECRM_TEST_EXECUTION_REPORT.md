# CoreCRM – Test Execution Report

**Report date:** 2026-11-05
**Environment:** Windows 11 · Node 24.13.0 · Playwright Test 1.62.1 · Chromium · `crm.demo.horilla.com`
**Execution mode:** project-serial (`workers: 1`, `fullyParallel: false`) · retries: off (local) · all runs headless
**Credentials:** resolved via local git-ignored `.env` (validated without disclosure; never printed)

---

## 1. Commands executed

```powershell
npm ci                                   # lockfile-consistent dependency install — clean
node --version                           # v24.13.0
npx playwright --version                 # 1.62.1
npx playwright test --list               # discovery check (below)
npx playwright test                      # baseline run  (unmodified code)
npx playwright test                      # final regression (after Phase H/I workspace actions)
git diff --check                         # clean (no whitespace errors; tree clean of scratch files)
```

`npx playwright test --list` (both before and after any workspace action): **Total: 14 tests in 9 files**
— 7 positive CRM workflows, 4 negative validations, 2 login tests, 1 authentication setup. Matches the
expected inventory exactly.

## 2. Run #1 — Baseline (before any modifications)

Command: `npx playwright test` (raw terminal output captured verbatim during execution)

```
Running 14 tests using 1 worker

  ok  1 [setup] › tests\auth.setup.js:7:1 › login once and store the session (6.3s)
  ok  2 [chromium-login] › tests\login.spec.js:8:5 › user can log in with valid credentials (4.6s)
  ok  3 [chromium-login] › tests\login.spec.js:21:5 › user cannot log in with an invalid password (2.9s)
  ok  4 [chromium] › tests\accounts.spec.js:9:5 › user should be able to create an account and find it again in the accounts list (10.6s)
  ok  5 [chromium] › tests\accounts.spec.js:60:5 › the New Account form blocks submission when required fields are missing (3.8s)
  ok  6 [chromium] › tests\activities.spec.js:17:5 › user should be able to create an activity and find it again with its association in the list (18.5s)
  ok  7 [chromium] › tests\activities.spec.js:97:5 › the Create Activity form blocks submission when the required subject is missing (3.7s)
  ok  8 [chromium] › tests\campaigns.spec.js:14:5 › user should be able to create a campaign and find it again in the campaigns list (5.6s)
  ok  9 [chromium] › tests\campaigns.spec.js:103:5 › the Create Campaign form blocks submission when the required campaign name is missing (2.6s)
  ok 10 [chromium] › tests\contacts.spec.js:11:5 › user should be able to create a contact and find it again in the contacts list (5.1s)
  ok 11 [chromium] › tests\lead-conversion.spec.js:11:5 › converting a lead creates the account, contact and opportunity and marks the lead converted (13.7s)
  ok 12 [chromium] › tests\leads.spec.js:12:5 › user should be able to create a lead and find it again in the leads list (6.9s)
  ok 13 [chromium] › tests\opportunities.spec.js:14:5 › user should be able to create an opportunity and find it again in the opportunities list (7.4s)
  ok 14 [chromium] › tests\opportunities.spec.js:90:5 › the New Opportunity form blocks submission when required fields are missing (3.5s)

  14 passed (1.7m)
EXIT_CODE=0
```

Duration (wall clock): **1 m 41.6 s** · Passed: **14** · Failed: **0** · Skipped: **0** · Did not run: **0**
Authentication setup: **passed** (storageState generated and consumed by all 11 chromium tests)

## 3. Run #2 — Final regression (after Phase H doc restoration and Phase I cleanup)

Command: `npx playwright test` (raw terminal output captured verbatim during execution)

```
Running 14 tests using 1 worker

  ok  2 [chromium-login] › tests\login.spec.js:8:5 › user can log in with valid credentials (3.7s)
  ok  3 [chromium-login] › tests\login.spec.js:21:5 › user cannot log in with an invalid password (2.4s)
  ok  4 [chromium] › tests\accounts.spec.js:9:5 › user should be able to create an account and find it again in the accounts list (7.7s)
  ok  5 [chromium] › tests\accounts.spec.js:60:5 › the New Account form blocks submission when required fields are missing (3.3s)
  ok  6 [chromium] › tests\activities.spec.js:17:5 › user should be able to create an activity and find it again with its association in the list (14.5s)
  ok  7 [chromium] › tests\activities.spec.js:97:5 › the Create Activity form blocks submission when the required subject is missing (4.2s)
  ok  8 [chromium] › tests\campaigns.spec.js:14:5 › user should be able to create a campaign and find it again in the campaigns list (5.7s)
  ok  9 [chromium] › tests\campaigns.spec.js:103:5 › the Create Campaign form blocks submission when the required campaign name is missing (2.7s)
  ok 10 [chromium] › tests\contacts.spec.js:11:5 › user should be able to create a contact and find it again in the contacts list (4.7s)
  ok 11 [chromium] › tests\lead-conversion.spec.js:11:5 › converting a lead creates the account, contact and opportunity and marks the lead converted (10.5s)
  ok 12 [chromium] › tests\leads.spec.js:12:5 › user should be able to create a lead and find it again in the leads list (6.6s)
  ok 13 [chromium] › tests\opportunities.spec.js:14:5 › user should be able to create an opportunity and find it again in the opportunities list (5.9s)
  ok 14 [chromium] › tests\opportunities.spec.js:90:5 › the New Opportunity form blocks submission when required fields are missing (3.7s)

  14 passed (1.4m)
EXIT_CODE=0
```

(the `[setup] › auth.setup.js` line, first in the serial order, passed as `ok 1` as in Run #1)
Duration (wall clock): **1 m 23.2 s** · Passed: **14** · Failed: **0** · Skipped: **0** · Did not run: **0**

## 4. Failure-by-failure analysis of the historical runs

Today's runs produced **zero failures**, so there is no new failure evidence. The recorded
historical conditions were investigated against the actual environment and code:

### 4.1 "2 failed + 11 did not run" run (pre-credential-resolution)

| Test | Exact error | Location | Root cause | Classification |
|---|---|---|---|---|
| `[setup] login once and store the session` | `Error: CRM credentials are missing.\nSet CRM_USERNAME and CRM_PASSWORD as environment variables, or copy .env.example to .env and fill in the values.\nAsk the project owner for the current demo account credentials.` | `utils/env.js:13` (thrown at `tests/auth.setup.js:8`) | No `.env` and no env vars on the machine | **Environment** |
| `[chromium-login] user can log in with valid credentials` | Same `CRM credentials are missing.` error | `utils/env.js:13` (thrown at `tests/login.spec.js:9`) | Same | **Environment** |
| 11 `[chromium]` workflow tests | No execution — Playwright's project dependency (`chromium` requires `setup`) correctly blocks them when setup fails | — | Cascade of the setup failure, by design | **Not executed (dependency)** |

No screenshots or traces exist for those failures beyond the automatic `only-on-failure` captures;
the console output quoted above was the full failure evidence.

### 4.2 Activities seed-data regression (pre-handoff defect, fixed post-handoff, validated today)

| Item | Detail |
|---|---|
| Former behavior | Related To Select2 search used the hard-coded demo term `"QA Engineer"`; the demo's seeded data reset made the remote search return "No results found" — the test then failed waiting for a matching option |
| Correction (already on disk) | `tests/activities.spec.js` + `utils/test-data.js`: create a dedicated unique lead; search the widget by the lead's unique **company** field (live-verified 2026-11-05: Select2 searches the company only — last name and email are not searched) |
| Validation | Passed in **both** of today's full regressions (Run #1: 18.5 s; Run #2: 14.5 s), including exactly-one-result selection, successful save, persisted association re-found in the list, detail assertions |
| Decision | **Retained** — reverting would reintroduce a known external-data dependency |

### 4.3 Claimed "3 passed / 11 failed" observation

Could not be reproduced against the current code + environment, and no artifact of that run was
provided. Rather than speculate or fabricate, the audit records today's runs — executed with
intact evidence — as the authoritative current status. The only mechanism in this codebase that
fails 11/14 (missing auth) also fails the setup project, which contradicts the split "3 passed /
11 failed"; the claim is consistent with an earlier pre-stabilization environment, not with
current behavior.

## 5. Test inventory (14 discovered, executed twice, all green)

| Category | Count | Tests |
|---|---:|---|
| CRM positive workflows | 7 | Leads create+persist · Contacts create+persist · Accounts create+persist · Opportunities create+persist · Activities create+association+persist · Campaigns create+persist · Lead Conversion (4-record chain + converted view) |
| CRM negative validations | 4 | Account Name required · Opportunity Name required · Activity Subject required · Campaign Name required |
| Login | 2 | Valid credentials · Invalid credentials rejected |
| Auth setup | 1 | Login once → storageState |

Totals across both runs: **28 executed test outcomes, 28 passed, 0 failed, 0 skipped, 0 not-run.**

## 6. Execution durations

| Run | Playwright total | Wall clock |
|---|---|---|
| Baseline (Run #1) | 1.7 m | 1 m 41.6 s |
| Final regression (Run #2) | 1.4 m | 1 m 23.2 s |

Individual test durations ranged 2.4 s – 18.5 s (activities positive test is the longest: lead
creation + two HTMX form re-renders + Select2 remote search).

## 7. Environment validation record

- `npm ci`: clean install, 6 packages, lockfile consistent
- Node v24.13.0 (engines: ≥ 20 — satisfied) · Playwright 1.62.1
- dotenv loads both credential variables (values present, non-empty — masked in all logs)
- `BASE_URL` = https://crm.demo.horilla.com (config default, matches)
- `playwright/.auth/user.json` regenerated by setup on every run; git-ignored
- HTML report generated per run (`playwright-report/index.html`, `open: never`); zero failures →
  no failure screenshots or traces recorded

## 8. Known limitations (not hidden, documented in README §Known demo limitations)

Shared-demo persistence/serialization · HTMX `#loading-indicator` row-click blocker with the
approved `hx-get` fallback · account-side related-list overlay deferral · deferred-by-demo
behaviors (Parent Account, Lead↔Campaign from the campaigns side, select-existing conversion
branches, non-Task activity types, multi-assignee fields) · Chromium-only validation.
