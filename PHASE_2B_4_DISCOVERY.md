# Phase 2B.4 Discovery Report — Activities

**Application:** https://crm.demo.horilla.com · **Discovery performed:** 2026-11-04 (read-only inspection; one clearly fictional test activity allowed by the instructions)
**Test record created during discovery:** activity "Review Nova Deal 1793769887342.1" (id 15, type Task, related to lead "QA Engineer-501") — fictional, unique, not deleted.
**Baseline state:** 9 tests in 6 files (approved 2B.3 + doc corrections), `workers: 1`, `fullyParallel: false` verified before inspection; no files modified during discovery.

---

## 1. Navigation path and routes

| Observed | Verified value |
|---|---|
| Navigation | **Schedule → Activities** (sidebar link `/activity/activity-view/?section=schedule`; Calendar is the sibling entry) |
| List route | `/activity/activity-view/?section=schedule` |
| Create form | `hx-get="/activity/activity-create-form/?new=true?section=schedule"` (modal) |
| Related-list detail | Activities row shows the related record as a real link (e.g. `/crm/leads/leads-detail/504/?section=sales`) |
| Activity detail | `/activity/activity-detail/<id>/?section=schedule` |

The module is inside `/activity/` (not `/crm/`): it is the generic Horilla Activities app, shared across sections.

## 2. List structure (Tasks tab is the selected default)

- Tabs: **Tasks / Meetings / Calls / Events** (plus Filters). Views: List / Kanban; New / Import buttons.
- List columns (List view): `Select` checkbox, **Subject**, **Due Date**, **Priority**, **Related To**, **Status** (status renders as an in-place select widget), **Actions** (Edit/Duplicate/Delete).
- Existing demo rows ("Call the new lead", priority High, status Not Started, related to lead "QA Engineer-504") already show the module's live shape.

## 3. Create form — "Create Activity" modal (every visible field, exact DOM)

**Required:** Activity Type (`activity_type`: *Event, Meeting, Task, Log Call* — the four types the UI offers; matches the module tabs), **Subject** (`#id_subject`), **Status** (`status`: *Not Started, Scheduled, In Progress, Waiting on Someone, Completed, Cancelled, Deferred* — labeled required but pre-filled with the default **not_started**).

**Association:** **Related Content Type** (`content_type`: *---------, Account, Contact, Lead, Campaign, Opportunity*) and its dependent **Related To** (`object_id`) — see §4.

**Optional:** Activity Owner (`owner`, 2 options, pre-selected *Adam Lui*), Assigned To (multi-select, ~990 demo users), Title, Start Date / End Date (`datetime-local`), Location, All Day (checkbox), Participants (multi), Description (textarea), and type-specific fields that appear per Activity Type: Event/Meeting → location/online meeting fields; **Task → Task Priority (empty default) and Due Date**; Log Call → call fields. Both modals carry `Save` (no "Save & New" observed on this form).

**Behaviors verified live:**
- Selecting an **Activity Type** or a **Related Content Type** triggers an HTMX **re-render of the whole form** (`hx-get="/activity/activity-create-form/"`, `hx-target="#activity-form-view-container"`, `hx-include="#activity-form-view"`) — current values (Subject, Related To, etc.) are preserved across the re-render (verified: subject + related survived the Event→Task re-render).
- The **Related To** select is a `select2-pagination` whose options are **not pre-rendered** (0 options in the DOM); they load from the remote endpoint shown in its `data-url`, e.g. `/generics/leads/lead/select2/`, when the widget is opened/searched. Verified: real click opens the widget, typing `QA Engineer-501` loads exactly one rendered option, real click selects it (`object_id` value `501`, rendered span text "QA Engineer-501").
- The Activity Type/Related Content Type selects follow the established project pattern: original `<select>` in the DOM (`select2-hidden-accessible`) driven with `selectOption({ force: true })` — verified live that the change fires the HTMX re-render.

## 4. Create → save → persistence (all verified on record id 15)

- **Save** shows the SweetAlert2 **"Activity created successfully."** and — unlike the other modules — **stays on the activities list URL** (no detail redirect).
- **Search is URL-driven:** `/activity/activity-view/?section=schedule&search=<subject>` → exactly **1** row for the unique subject, server-rendered after a fresh page load.
- **List row (authoritative persisted view):** Subject cell `Review Nova Deal 1793769887342.1`; **Related To cell: "QA Engineer-501"** — the Lead association persisted and survives a revisit (verified on a fresh page load, not just the post-save DOM). Status cell shows "Not Started".
- **Detail page exists:** row Subject cell carries the HTMX attrs (`hx-get="/activity/activity-detail/15/?section=schedule"`, `hx-target="#mainContent"`, `hx-push-url="true"`, `hx-select="#mainContent"`) — the same pattern as the other modules; the same `#loading-indicator` overlay (`htmx-indicator tabloading`) is present, so the approved `hx-get` fallback applies.
- **Detail page content:** heading = subject; header-card rows `Activity Type: Task`, `Status: Not Started`, `Assigned To:`, `Activity Owner: Adam Lui`, `Priority:`, `Due Date:` — values repeat containers as on the other modules (assertions must be scoped to `#detailHeaderCard`).
- **The activity detail page does NOT visibly display the Related To record** (verified: no visible occurrence of "QA Engineer-501" on the detail page — only hidden Recently-viewed panels). Therefore the association is asserted on the **list row**, which is the module's authoritative persisted view of the relationship; this is documented and NOT claimed on the detail page.

## 5. Required-field behavior (verified live)

Task type selected, Subject left empty, **Save** clicked: submission blocked client-side — `validity.valueMissing === true`, message **"Please fill out this field."**, modal stays open, URL unchanged, no record created. Same native-HTML5 pattern as the approved modules.

## 6. Candidate tests (Stage B)

1. **Positive create + persistence:** open list → New → Activity Type *Task* (wait re-render) → Related Content Type *Lead* (wait re-render) → unique Subject → Related To via the real widget (click widget → type a search term → the results render → select the first option → capture its exact label) → Save → "Activity created successfully." → URL still the activities list → search by unique subject → exactly 1 row → assert the row's Subject and its **Related To cell equals the captured label** → open the row's detail via the `hx-get` fallback (`/activity/activity-detail/<id>/` pattern) → assert scoped `#detailHeaderCard`: heading = subject, `Activity Type: Task`, `Status: Not Started`.
2. **Required-field negative:** Activity Type *Task*, Subject empty, Save → `valueMissing` true + "Please fill out this field.", modal open, no success dialog, URL unchanged.

## 7. Unsupported, unstable, or unverified (not automated)

- Meetings/Calls/Events flows (only Task is covered — most reliable, tab-default type with verified persistence).
- Assigned To / Participants multi-selects, Reminders, Google Calendar fields: not verified/persisted → not covered.
- Start/End datetime and Priority persistence: not asserted (left empty in discovery; "Due Date:" and "Priority:" rows rendered empty on the detail page — persistence of optional date/time was claimed nowhere).
- Status editing (in-row status select) and bulk actions: not covered.
- Campaign/Opportunity/Account/Contact associations: the control supports them, but only the **Lead** association was verified end-to-end; per the scope-control rule, coverage stays proportionate and no other relationship is claimed.
- No detail-page claim of the association (see §4).
- The HTMX overlay regression applies here as on all list modules → `openRowDetail` fallback for detail navigation; no direct row-click method is created for this new module.