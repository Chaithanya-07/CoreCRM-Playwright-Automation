# Phase 2B.3 Discovery Report — Opportunities

**Application:** https://crm.demo.horilla.com · **Discovery performed:** 2026-11-04 (read-only inspection, plus one clearly fictional test record allowed by the instructions)
**Baseline state:** Phases 1, 1.1, 2A, 2B.1, 2B.2 approved — 7 tests in 5 files, `workers: 1`, `fullyParallel: false` verified intact before any inspection.
**One test record created during discovery:** "Nova Pipeline 1793768886328.1" (opportunity id 501) — fictional, unique, not deleted, per instructions §5 A2.

---

## 1. Module route and navigation

| Observed | Verified value |
|---|---|
| List route | `/crm/opportunities/opportunities-view/?section=sales` |
| Navigation | Sales section (dashboard cards carry `hx-get="/crm/opportunities/opportunities-view/?section=sales"`; sidebar label follows the same Sales group as Leads) |
| Detail route | `/crm/opportunities/opportunity-detail-view/<id>/?section=sales` |
| Create form | `#modalBox` modal, title **"Create Opportunity"**, with Single-Step/Multi-Step toggle |

## 2. Create form fields (exact DOM names/ids, verified from the live modal)

| Field | Control | DOM name / id | Required | Notes |
|---|---|---|---|---|
| Opportunity Name | text | `name` / `#id_name` | **Yes** | starts empty |
| Amount | number | `amount` / `#id_amount` | No | |
| Quantity | number | `quantity` / `#id_quantity` | No | |
| Close Date | date | `close_date` / `#id_close_date` | No | native date input |
| Stage | select2 | `stage` / `#id_stage` | **Yes** | 11 options, starts "- Select an option -": Prospecting, Qualification, Needs Analysis, Value Proposition, Id. Decision Makers, Perception Analysis, Proposal/Price Quote, … (9 further fixed demo options) |
| Probability | number | `probability` / `#id_probability` | — | **read-only in the DOM** (`readonly`), auto-derived |
| Account | select2 pagination (+`data-url`) | `account` / `#id_account` | No | 494 options preloaded, label format "Account Name - <id>" (e.g. "Horizon Ventures - 14") |
| Lead Source | select2 | `lead_source` / `#id_lead_source` | No | 10 options (Website, Referral, Event, Campaign, phone, …) |
| Type | select2 | `opportunity_type` / `#id_opportunity_type` | No | 5 options (Existing Customer - Upgrade/Replacement/Downgrade, New Customer) |
| Primary Campaign Source | select2 pagination | `primary_campaign_source` / `#id_primary_campaign_source` | No | 491 options |
| Next Step | text | `next_step` / `#id_next_step` | No | |
| Owner | select2 pagination | `owner` / `#id_owner` | **Yes** | 991 options, starts "- Select an option -" |
| Order Number | text | `order_number` | No | |
| Delivery Installation Status | select2 | `delivery_installation_status` | No | 4 options |
| Tracking Number | text | `tracking_number` | No | |
| Main Competitors | text | `main_competitors` | No | |
| Description | textarea | `description` | No | |

**All dropdowns are Select2 widgets** — the original `<select>` stays in the DOM with `select2-hidden-accessible`; some carry `select2-pagination` classes with `data-url` (AJAX pagination), but their options are pre-rendered in the DOM, so the established `selectOption({ force: true })` pattern applies unchanged (same as the approved modules).

## 3. Account association behavior (the key B4 investigation)

- The **Account selector exists** (`#id_account`, 494 options, optional) and an existing demo account can be selected.
- **Association persists.** Live evidence: "Horizon Ventures - 14" was selected at create time; after saving, the record's detail page rendered **"Horizon Ventures - 14"** inside `#Account-details-tab` (single occurrence). This is a select in a different code path from the Accounts module's `parent_account`, which did **not** persist (deferred in 2B.2 and not revisited here).
- The test will select a real option at runtime (index 1 of the select) and assert the **same label captured from the DOM** on the detail tab — no hard-coded account name, no fake passing test needed.

## 4. Required-field behavior (verified live)

Leaving only the Opportunity Name empty (owner and stage filled) and clicking **Save**: the submission is blocked client-side by native HTML5 validation — `#id_name` reports `validity.valueMissing === true` with the message **"Please fill out this field."**, the modal stays open, URL unchanged, no record created. (Buttons in the modal: **Save & New** and **Save**.)

## 5. Create → redirect → detail behavior

- Saving navigates to the created record: `/crm/opportunities/opportunity-detail-view/501/?section=sales`.
- SweetAlert2 confirmation **"Opportunity created successfully."** (same auto-dismiss behavior as the other modules; tests assert appearance only).
- Detail page (verified on id 501): record header card `#detailHeaderCard` contains heading **Nova Pipeline 1793768886328.1** (name only, like accounts) and field rows:
  - `Amount: INR 4,500.00` (formatted currency — a raw typed `4500` renders with the demo's currency formatting),
  - `Expected Revenue: INR 450.00` (auto, = amount × probability),
  - `Close Date: 2027-06-30`,
  - `Probability: 10.00`, `Forecast Category: Pipeline` (auto-derived from stage Prospecting).
- **Stage** renders in the stage-pipeline kanban (`#kanban-choices`): "Prospecting" — single DOM occurrence.
- **Account** renders in `#Account-details-tab`: the "Name - <id>" label, single occurrence.
- Values repeat across containers (header card + per-field `#<Field>-details-tab` + breadcrumb + hidden Recently-viewed copies), so detail assertions must be scoped (same `#detailHeaderCard` findings as 2B.2).

## 6. Search behavior

- URL-driven, same as the other modules: `/crm/opportunities/opportunities-view/?section=sales&search=<text>` returned **exactly 1 row** (`tbody tr` count = 1) for the unique name, with the row text containing name, amount, close date and stage.

## 7. HTMX / row interaction findings

- The opportunities list rows are the **partially-converted HTMX rows**: the name cell (`td` index 1) carries
  `hx-get="/crm/opportunities/opportunity-detail-view/501/?section=sales"`, `hx-target="#mainContent"`, `hx-swap="outerHTML"`, `hx-push-url="true"`, `hx-select="#mainContent"`.
- The `#loading-indicator` overlay (`htmx-indicator tabloading`) is present here too, so **the approved `openRowDetail` fallback (extract `hx-get` from the matched row, assert route pattern, navigate) applies unchanged** to Opportunities. No direct row-click path was created — this module has no previously approved click method to preserve.

## 8. Candidate tests (Stage B)

1. **Create + persistence:** open list → create form → fill unique name + amount 4500 + close date 2027-06-30 + stage Prospecting + owner (first user option) + account (first option, label captured) → Save → success dialog → assert detail URL pattern → search by unique name → exactly 1 row → open matched record via `hx-get` fallback → assert heading (name), `Amount: INR 4,500.00`, `Close Date: 2027-06-30` (scoped to `#detailHeaderCard`), stage in the pipeline kanban, and the captured account label in `#Account-details-tab`.
2. **Required-field negative:** leave the (required) Opportunity Name empty with owner + stage valid → Save → `validity.valueMissing` true, message "Please fill out this field.", modal open, no success dialog, URL unchanged.

## 9. Unsupported or unverified behavior (not automated)

- Stage pipeline progression/kanban dragging: not verified, not covered.
- Probability / Expected Revenue / Forecast Category auto-derivation rules: asserted only indirectly (not part of the tests' claims).
- Primary Campaign Source (491 options), Link Leads, Duplicate, Change Owner: not verified, not covered.
- No Activities, Campaigns, Lead conversion — per scope.
- Opportunity names are not unique in real data; uniqueness is guaranteed by the per-run timestamp/counter generator (same approach as account names).