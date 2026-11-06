# Phase 2B.5 Discovery Report — Campaigns

**Project:** CoreCRM – E2E Automation Suite
**Application under test:** Horilla CRM Demo
**Application:** https://crm.demo.horilla.com · **Discovery performed:** 2026-11-04 (read-only inspection; one clearly fictional test campaign allowed by the instructions)
**Test record created during discovery:** campaign "Aurora Campaign 1793772347953" (id 501, type Email, owner Adam Lui, expected revenue 2500, budget 1000, default status Planned) — fictional, unique, not deleted.
**Baseline state:** 11 tests confirmed before inspection (setup + 2 login + 2 accounts + 2 activities + 1 contact + 1 lead + 2 opportunities), `workers: 1`, `fullyParallel: false`; no files modified during discovery.

---

## 1. Navigation path and routes

| Observed | Verified value |
|---|---|
| Navigation | **Sales → Campaigns** (sidebar link; the Campaigns list URL is the one recorded below) |
| List route | `/crm/campaigns/campaign-view/?section=sales` |
| Create form | The list **New** button (`#campaign-create`) carries `hx-get="/crm/campaigns/campaign-single-create/?new=true?section=sales"` with `hx-target="#modalBox"`, `onclick="openModal()"` — the same modal pattern as the other modules |
| Save submission | The form posts itself (`hx-post="/crm/campaigns/campaign-single-create/?new=true?section=sales"`) |
| Campaign detail | `/crm/campaigns/campaign-detail-view/<id>/?section=sales` |

## 2. List structure

- List columns (List view): `Select` checkbox, **Campaign Name**, **Type**, **Campaign Owner**, **Status**, **Expected Revenue**, **Budget Cost**, **Actions**.
- Views/sort controls (All Items, Recently Viewed/Created, List View) and New/Import actions are present as on the other modules.
- Seeded demo data: 490+ campaigns (e.g. "Revenue Focus 2025 (1)" — Email, Kelly Terrell, Completed, INR 46,920.09 / INR 9,819.67).
- List search is URL-driven exactly as on the other modules: navigating to `/crm/campaigns/campaign-view/?section=sales&search=<text>` server-returns exactly the matching rows (verified live: the unique test name returned exactly 1 row after a fresh page load).

## 3. Create form — "Create Campaign" modal (every visible field, exact DOM)

Buttons: **Save & New** and **Save** (single-step form; no wizard).

| Field | DOM | Type | Required | Default/options |
|---|---|---|---|---|
| Campaign Owner | `#id_campaign_owner` / `campaign_owner` | Select2 select | **required** (HTML `required` attribute) | empty `- Select an option -`; 991 user options (first real: *Adam Lui*) |
| Campaign Name | `#id_campaign_name` / `campaign_name` | text | **required** (`required` attr, maxlength) | empty; placeholder "Enter Campaign Name" |
| Parent Campaign | `#id_parent_campaign` / `parent_campaign` | Select2 select | optional | 491 pre-rendered options (self-referencing campaigns) |
| Type | `#id_campaign_type` / `campaign_type` | Select2 select | **required** | verbatim options: *Email, Event, Social Media, Other, Webinar, Referral, Advertisement* (8 incl. placeholder) |
| Status | `#id_status` / `status` | Select2 select | **not** required (the `*` in the label is cosmetic) | pre-filled **Planned**; options *New, Planned, In Progress, Completed, Aborted* |
| Start Date / End Date | `#id_start_date` / `#id_end_date` | date | optional | empty |
| Expected Revenue | `#id_expected_revenue` | number | optional | empty |
| Budget Cost | `#id_budget_cost` | number | optional | empty |
| Actual Cost | `#id_actual_cost` | number | optional | empty |
| Expected Response (%) | `#id_expected_response` | number | optional | empty |
| Number Sent in Campaign | `#id_number_sent` | number | **required** (HTML required attr) | pre-filled **0** |
| Description | `#id_description` | textarea | optional | empty |

All four selects are `select2-hidden-accessible` widgets — the established project pattern (`selectOption({ force: true })` on the original `<select>`) applies; unlike Activities' Related To, **all options are pre-rendered in the DOM** (no remote loading, no HTMX form re-render on change — no such trigger was observed).

## 4. Create → save → persistence (all verified on record id 501)

- **Save** shows the SweetAlert2 **"Campaign created successfully."** and **redirects to the campaign detail page** — same behavior as Leads/Contacts/Accounts/Opportunities (unlike Activities).
- **List search is URL-driven** (see §2): the unique name yields exactly 1 row, server-rendered after a fresh page load.
- **List row (fresh reload — all persisted values):** Campaign Name "Aurora Campaign 1793772347953"; **Type: Email; Campaign Owner: Adam Lui; Status: Planned; Expected Revenue: INR 2,500.00; Budget Cost: INR 1,000.00** (currency formatting identical to Opportunities' amount rendering: typed `2500` → `INR 2,500.00`).
- **Detail page content:** heading = campaign name; the record header card `#detailHeaderCard` holds **exactly 6 `div.flex.flex-col.sm:flex-row` label-value rows**: `Campaign Owner: Adam Lui`, `Start Date:`, `End Date:`, `Type: Email`, `Expected Revenue: INR 2,500.00`, `Expected Response (%):`. **Status is NOT displayed on the detail page** (asserted on the list row instead). The Details panel additionally shows Campaign Name, Type, Start/End Date, Expected Revenue `INR 2,500.00`, Budget Cost `INR 1,000.00`, Number Sent `0`, Parent Campaign (empty), Description, and read-only related aggregates (`Leads in Campaign: 0`, `Converted Leads in Campaign: 0`, `Contacts in Campaign: 0`, `Opportunities in Campaign: 0`, `Won Opportunities in Campaign: 0`, value/won-value `INR 0.00`, `Responses in Campaign: 0`).
- Values repeat containers on the detail page like the other modules (header card rows duplicate in responsive wrappers + breadcrumb "Name-<id>" + hidden Recently-viewed copies) → detail assertions scoped to `#detailHeaderCard`'s `.flex.flex-col.sm\:flex-row` rows (each row matched exactly once, verified live).

## 5. Relationship surface (Lead ↔ Campaign) — investigated, DEFERRED

- The **Create Campaign form has no Lead/related-record selector** of any kind (full field dump in §3).
- The campaign **detail page exposes only read-only aggregates** ("Leads in Campaign", "Contacts in Campaign", "Opportunities in Campaign" counts) — no attach/select flow was found in this pass on the campaign side.
- The Phase 2A lead for a lead-side Campaign link (Lead detail's related lists) would require modifying an existing Lead record (or creating one and editing it), which is outside the Campaigns module scope and touches approved-coverage records. Per the instructions ("cover only a stable, meaningful association that can be independently verified", "document and defer"), the relationship is **documented and deferred — no association claim is made and no fake coverage was added**.

## 6. HTMX findings

- The same known HTMX regression applies **to this module**: the transparent full-table `#loading-indicator` overlay (`htmx-indicator tabloading`, `pointer-events: auto`) intercepts pointer events over list rows — `elementFromPoint` at the matching row's campaign-name cell resolves to `DIV#loading-indicator` (verified live). The approved fallback therefore applies: the matched row's **Campaign Name cell (td index 1) carries the real `hx-get="/crm/campaigns/campaign-detail-view/501/?section=sales"`** — the exact detail URL the app follows; extract (never construct), assert the route pattern `/^\/crm\/campaigns\/campaign-detail-view\/\d+\/?/`, `goto()`.
- No HTMX form re-render is triggered by form-field changes (single form post to `campaign-single-create`).

## 7. Required-field behavior (verified live)

The create form has **no `novalidate` attribute** and `#id_campaign_name` carries the HTML `required` attribute → an empty Campaign Name blocks submission with native HTML5 validation (`validity.valueMissing === true`, message *"Please fill out this field."*), the same verified behavior as the Account Name and Activity Subject negatives. Note: `Number Sent in Campaign` is also HTML-required but comes pre-filled with `0`, so with owner/type filled only the name can block.

## 8. Candidate tests (Stage B)

1. **Positive create + persistence:** open list → New → Campaign Owner = **first option at runtime** (captured label, never hard-coded — follows the Opportunities owner pattern), Type = **Email** (verified fixed option), unique Campaign Name (`Aurora Campaign <ts>.<n>`), Expected Revenue `2500`, Budget Cost `1000` → Save → "Campaign created successfully." **and** URL matches `/crm/campaigns/campaign-detail-view/<id>/` → list search by unique name → exactly 1 row → assert row cells (Type *Email*, *Status: Planned* default, captured owner label, rendered `INR 2,500.00` revenue and `INR 1,000.00` budget) → open the row's detail via the `hx-get` fallback (route pattern asserted) → scoped `#detailHeaderCard` row assertions: heading = name, `Campaign Owner: <captured>`, `Type: Email`, `Expected Revenue: INR 2,500.00`.
2. **Required-field negative:** Campaign Owner + Type filled, Campaign Name empty → Save → `valueMissing` true + *"Please fill out this field."*, modal open, no success dialog, no navigation.

## 9. Unsupported, unstable, or unverified (not automated)

- **Lead ↔ Campaign association: not verified, deferred** (no selector in the create form; only read-only aggregates on the detail page — see §5).
- Parent Campaign (self-referencing): same class of deferred relationship as the Accounts module's Parent Account (which does not persist server-side); not verified here, not covered.
- Save & New, Import, Filters, Kanban/other views, sorting, in-place status editing, bulk actions: not covered.
- Start/End Date, Actual Cost, Expected Response (%), Description persistence: not asserted (left empty in discovery).
- In-place **status select appears in the header-card area** (the status option list *New/Planned/…* renders near the card) but not as a `Label: value` row — status is therefore asserted on the **list row**, which displays it plainly.

## 10. Stop-point decision

The positive workflow, persistence, required-field behavior, and the `hx-get` fallback were all verified live and stable → proceeding to Stage B in the same run, per the instructions.