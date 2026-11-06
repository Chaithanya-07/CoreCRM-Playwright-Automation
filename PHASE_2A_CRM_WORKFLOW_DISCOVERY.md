# Phase 2A — CRM Domain Discovery & Workflow Mapping

**Project:** Horilla CRM demo automation (`D:\CRM Demo Automation`)
**Application:** `https://crm.demo.horilla.com`
**Date:** 2026-11-03
**Scope:** Discovery and planning only — no automation code, configuration, README, or AUTOMATION_GUIDE was modified; no CRM records were created or changed.

Observation labels used throughout:

- **[Observed live]** — verified by inspecting the running application in a logged-in browser session today.
- **[Observed in existing source/docs]** — verified from this project's code or documentation.
- **[Proposed — not yet validated]** — a plan or workflow that has not been executed against the app.
- **[Unavailable / blocked]** — not visible or not accessible; documented as such, never guessed.

---

## 1. Executive summary

The demo instance is a full Horilla CRM with six primary sections — **Home,
Sales, People, Analytics, Schedule, My Jobs** — plus a separate **Settings**
administration area. Accessible CRM business modules observed: **Leads,
Accounts, Contacts, Opportunities, Campaigns, Activities, Forecast,
Reports, Calendar, Review/Approval Jobs**. All module create-forms are
single-step by default with a **Single-Step / Multi-Step form-mode toggle**,
which retroactively explains the "wizard" assumptions in the pre-Phase-1
code. The entity graph is well connected: Opportunities link to Accounts
and Campaigns, Contacts link to Accounts/Opportunities/Campaigns and to
parent/child contacts, Leads link to Campaigns, and **Activities are
polymorphically linkable to Account, Contact, Lead, Campaign, or
Opportunity**. A **Convert** stage is visible on lead detail, but actual
conversion creates records and was deliberately **not** executed.

Recommended Phase 2B order: (1) independent persistence verification for the
existing Leads/Contacts tests, (2) Accounts (foundation of the graph), then
(3) Opportunities with account linkage, (4) Activities with the polymorphic
Related To, (5) Campaigns + lead–campaign association, and last (6) lead
conversion, which mutates multiple entities and needs controlled validation.

## 2. Current automation baseline (no files modified)

### Automated today

| Area | Automation | Source of observation |
|---|---|---|
| Authentication | Setup project logs in once, stores `playwright/.auth/user.json`; login spec tests positive + negative login unauthenticated | [Observed in existing source/docs] |
| Leads | Create lead → assert "Lead created successfully." dialog + `leads-detail/<id>/` URL | [Observed in existing source/docs] |
| Contacts | Create contact → assert dialog + `contact-detail-view/<id>/` URL | [Observed in existing source/docs] |
| Execution | Serialized (`workers: 1`, `fullyParallel: false`) against the shared demo; credentials via env only | [Observed in existing source/docs] |

### Known limitations (carried from Phase 1/1.1)

- Created records are only proven via the detail page the app opens after
  save; **no independent list/search-view persistence check yet**.
- Records are never cleaned up; unique fictional data only.
- Chromium-only; Firefox/WebKit opt-in and unvalidated.

## 3. Navigation / module inventory [all Observed live]

| Section | Sub-navigation | Route | Availability to current user |
|---|---|---|---|
| Home | View All Dashboards → `/dashboard/dashboard-list-view/?section=analytics` | `/dashboard/?section=home` | Accessible; shows recent items + dashboard widgets |
| Sales | Leads, Campaigns, Opportunities, Forecast | `/crm/leads/…`, `/crm/campaigns/…`, `/crm/opportunities/…`, `/crm/forecast/…` | All accessible |
| People | Accounts, Contacts | `/crm/accounts/…`, `/crm/contacts/…` | All accessible |
| Analytics | Reports (folders, All Reports…) | `/reports/reports-list-view/?section=analytics` | Accessible; report list **empty** ("Nothing to show yet"); buttons New Report / New Folder / Load Default Reports present |
| Schedule | Calendar; Activities | `/calendar/calendar-view/…`, `/activity/activity-view/…` | Accessible |
| My Jobs | Review Jobs, Approval Jobs, My Bookings, My Review Jobs | `/review-process/review-jobs/…` | Accessible; content **empty** |
| Settings (gear in header) | Company Information, Users, Roles and Permissions, Booking Pages, Base Department, Branches, Role, Team Role, Customer Role, Partner Role, Scoring Rule, Outgoing/Incoming Mail Server, Mail Template, Outbox, Inbox, Integrations (Google Calendar Sync, Meeting, Call), Notifications, Notification Template, Automations, Cadences, Workflow Rules (Lead: Stage, Assignment Rules, Email to Record, Web to Lead, Process Builder, Review/Approval Processes, Duplicate Control: Matching/Duplicate Rules; Opportunity: Stage, Team Settings, Big Deal) | `/company-information/` + settings routes | Settings home page labels [Observed live]; individual settings pages **not entered** in this phase |

Notes on availability:

- The current demo user ("Adam", CEO) sees **no module greyed out or hidden
  in the primary navigation**. [Observed live]
- Permission-restricted behavior was **not probed** beyond this (rule 8:
  minimal, read-only activity). Marked as unknown, not asserted either way.
- Reports and My Jobs contain **no records** — automation value is low; not
  recommended for Phase 2B.

## 4. Per-module field and behavior observations

All observations below are **[Observed live]** unless noted. Forms are
defaulted to single-step and show `Save` / `Save & New` buttons; a
**Single-Step / Multi-Step toggle** sits in the modal header [Observed live].
No form was saved at any point.

### 4.1 Leads

- **List:** columns include Account Name/Account Number/Account Owner/… on
  Accounts; the Leads list offers `Apply` filters, `Group By`, `Chart View`,
  `Split View`, `Import`, `Export`, `Save to List`, `Select (490)`,
  `Bulk Update`, `Bulk Delete` [Observed live; also Observed in existing source].
- **Create form fields** (required `*`): First Name*, Last Name*, Email*,
  Lead Company*, Lead Owner (pre-filled by app), Lead Source*,
  Lead Stage* (HTML name `lead_status`), Industry*, Country*; optional:
  Title, Total Employees, Annual Revenue, State, City, Zip, Requirements,
  phone/fax.
- **Detail** (e.g. `/crm/leads/leads-detail/505/`):
  - Header shows the record as `<Title value>-<record id>` (e.g.
    "QA Engineer-505") [Observed live — verify this naming behavior before
    asserting it in tests].
  - **Stage pipeline chips:** New → Contacted → Qualified → Proposal → Lost
    → **Convert** [Observed live].
  - Header quick actions: Edit Details, Edit, Change Owner, Convert,
    Duplicate [Observed live].
  - Tabs: Details, Activity, Cadence, Related Lists (**Campaigns**,
    with `Add`), Notes & Attachments, History, **Potential Duplicates**
    [Observed live].
  - Activity tab groups: Tasks, Meetings, Call, Email, Events; Pending
    Tasks, Completed Tasks; `Add Task` [Observed live].

### 4.2 Contacts

- **List:** table + standard list controls as above; route
  `/crm/contacts/contacts-view/`.
- **Create form:** Contact Owner* (starts empty — `---------`), First
  Name*, Last Name*, Email*; optional: Title, Contact Source, Parent
  Contact, Is Primary, Birth Date, Assistant, assistant phone, phone/fax,
  secondary phone, address (Country, State, City, Zip), Languages (multi),
  Description.
- **Detail** (e.g. `/crm/contacts/contact-detail-view/506/`): header shows
  `<First Name> <Last Name>`; tabs: Details, Activity, Related Lists,
  Notes & Attachments, History, **Child Contacts, Related Campaigns,
  Related Opportunities, Related Accounts**, Add, **View Hierarchy**
  [Observed live].

### 4.3 Accounts [Observed live]

- **List:** columns Account Name, Account Number, Account Owner, Account
  Type, Account Source, Annual Revenue, Actions; `Select (490)` demo
  records; route `/crm/accounts/accounts-view/`.
- **Create form:** Account Owner* (starts empty), Account Name*,
  Industry*; optional: Account Source, Account Type, Rating, **Parent
  Account**, Account Number, Website, Account Site, phone, fax, Billing
  Address (City/State/District/Zip), Shipping Address (City/State/District/
  Zip), Annual Revenue, Is Partner (toggle), Number of Employees,
  Ownership, Description. No email field exists on accounts.
- **Detail:** not opened in this phase (kept activity minimal); form and
  list behavior verified.

### 4.4 Opportunities [Observed live]

- **List:** columns Opportunity Name, Amount, Close Date, Stage, Type,
  Primary Campaign Source; route `/crm/opportunities/opportunities-view/`.
- **Create form:** Opportunity Name*, Stage*, Owner*; optional: Amount,
  Quantity, Close Date, Probability (read-only field), **Account**
  (select listing 491 accounts), Lead Source, Type, **Primary Campaign
  Source**, Next Step, Order Number, Delivery Installation Status,
  Tracking Number, Main Competitors, Description.
- **Stage options captured:** Prospecting, Qualification, Needs Analysis,
  Value Proposition, Id. Decision Makers, Perception Analysis,
  Proposal/Price Quote (first available options; full list also editable
  under Settings → Opportunity Stage).
- **Type options captured:** Existing Customer – Upgrade, – Replacement,
  – Downgrade, New Customer.

### 4.5 Campaigns [Observed live]

- **List:** columns Campaign Name, Type, Campaign Owner, Status, Expected
  Revenue, Budget Cost; route `/crm/campaigns/campaign-view/`.
- **Create form:** Campaign Owner*, Campaign Name*, Type*, Number Sent in
  Campaign*; Status (label shows `*`, DOM-required false; options: New,
  Planned, In Progress, Completed, Aborted), **Parent Campaign**, Start
  Date, End Date, Expected Revenue, Budget Cost, Actual Cost, Expected
  Response (%), Description.

### 4.6 Activities [Observed live]

- **Module:** `/activity/activity-view/?section=schedule` (also reachable
  from the Schedule sidebar → Activities; the Calendar at
  `/calendar/calendar-view/` shows Today/Day/Week/Month/Year, Mine/Team,
  Color by Type/Status, and My Calendars: Tasks, Events, Meetings,
  Unavailability).
- **List:** columns Subject, Due Date, Priority, Related To, Status;
  `New` opens type tabs **Tasks / Meetings / Calls / Events**; status
  labels observed on records: Scheduled, In Progress, Waiting on Someone.
- **Create form ("Create Activity"):** Activity Type* (`Event`, `Meeting`,
  `Task`, `Log Call`), Subject*, **Related To** (polymorphic: `Account`,
  `Contact`, `Lead`, `Campaign`, `Opportunity` — via generic
  `content_type`/`object_id`), Owner, Assigned To, Status (Not Started,
  Scheduled, In Progress, Waiting on Someone, Completed, Cancelled,
  Deferred), Start/End Datetime, Location, Is All Day, Participants,
  Description.

### 4.7 Forecast / Reports / My Jobs

- **Forecast:** per-user forecast card view (All Users + named users
  including the lead owner "Jennifer Williams"); **no create/New button**
  [Observed live] — verification module, not a CRUD module.
- **Reports:** empty; New Report / New Folder / Load Default Reports
  present [Observed live]. Excluded from Phase 2B (low value, high admin
  complexity).
- **My Jobs:** Review Jobs with Approval Jobs, My Bookings, My Review Jobs
  sections; all empty [Observed live]. Excluded from Phase 2B.

### 4.8 Login

- Positive + invalid-credential behavior verified in Phase 1 and still
  passing [Observed live during Phase 1 validation; unchanged in this
  phase]. No new inspection performed here (rule 8: minimal activity).

## 5. Entity relationship map

Edges marked ✚ are **[Observed live]**; none are guessed.

```mermaid
graph TD
  Account["Account<br/>(owner*, name*, industry*, parent_account)"]
  Contact["Contact<br/>(owner*, first*, last*, email*, parent_contact)"]
  Lead["Lead<br/>(company*, owner, source*, stage*, industry*, country*, convert stage)"]
  Opportunity["Opportunity<br/>(name*, stage*, owner*, amount, close_date)"]
  Campaign["Campaign<br/>(owner*, name*, type*, number_sent*, parent_campaign)"]
  Activity["Activity<br/>(type*, subject*, related_to, status, schedule)"]
  Note["Notes & Attachments"]

  Opportunity -- "account (491 options)" --> Account
  Opportunity -- "primary_campaign_source" --> Campaign
  Contact -- "related_accounts / view hierarchy" --> Account
  Contact -- "related_opportunities" --> Opportunity
  Contact -- "related_campaigns" --> Campaign
  Contact -- "parent_contact / child_contacts" --> Contact
  Lead -- "related_list: campaigns" --> Campaign
  Activity -- "related to (polymorphic)" --> Account
  Activity -- "related to (polymorphic)" --> Contact
  Activity -- "related to (polymorphic)" --> Lead
  Activity -- "related to (polymorphic)" --> Campaign
  Activity -- "related to (polymorphic)" --> Opportunity
  Lead -. "tabs (observed) ." -> Note
  Contact -. "tabs (observed) ." -> Note
  Lead -- "convert stage (visible, not executed)" -.-> Account
  Lead -- "convert stage (visible, not executed)" -.-> Contact
  Lead -- "convert stage (visible, not executed)" -.-> Opportunity
```

The dotted **Convert** edges are the app's visible affordance; what records
conversion actually creates is **[Proposed — not yet validated]**.

## 6. Candidate end-to-end business workflows

### WF-1 — Lead lifecycle with independent persistence verification

- **Status:** partially **[Observed live]**; persistence-by-list part is
  [Proposed — not yet validated].
- Preconditions: authenticated session. Start: Sales → Leads.
- Actions: create lead (fictional unique data) → confirm detail page and
  success dialog (already automated) → **search the lead by its unique
  email/name in the list view** → open it from the list and assert detail
  fields equal the created values.
- Expected outcome: record persists with the entered data; independently
  verifiable via list search + detail page fields.
- Risks/cleanup: adds one lead per run (as today). No cleanup available
  without destructive actions — accepted in Phase 1 policy.

### WF-2 — Account → Contact association

- **Status:** [Proposed — not yet validated].
- Preconditions: authenticated session; a known account (create one
  fictional account in-test).
- Start: People → Accounts.
- Actions: create account → create/contact associate: create contact with
  the account (the contact form has no account field; account linkage is
  reflected via Contact → Related Accounts) or use the account detail's
  related panel — needs controlled validation to pick the verified path.
- Expected outcome: contact detail page lists the account under
  **Related Accounts**.
- Risks: two records per run; association path must be confirmed live
  before coding.

### WF-3 — Opportunity with account linkage and stage movement

- **Status:** [Proposed — not yet validated].
- Precondition: an account exists (created in WF-2 or by the test).
- Start: Sales → Opportunities.
- Actions: create opportunity (name*, stage*, owner*, account) → open
  detail → move stage via pipeline (e.g. Prospecting → Qualification) →
  verify stage on detail/list.
- Expected outcome: stage movement is reflected independently (detail
  page stage chip and/or list column).
- Risks: stage update mechanism (chips vs. edit form) must be confirmed;
  moves record state (not destructive; demo-safe).

### WF-4 — Activity attached to a business record

- **Status:** [Proposed — not yet validated] (create modal only inspected).
- Preconditions: an existing lead/contact (created in-test).
- Start: Schedule → Activities.
- Actions: New → Task → subject + activity type + **Related To: Lead** +
  (optional) due date/priority → save → open the related lead's Activity
  tab → assert the task is listed under Pending Tasks.
- Expected outcome: the activity is independently reflected on the parent
  record tab.
- Risks: polymorphic Related To widget behavior must be verified on the
  live widget; adds one activity record per run.

### WF-5 — Lead conversion

- **Status:** [Proposed — requires controlled validation]. The Convert
  stage chip and quick action are **[Observed live]**; the actual conversion
  flow was **not opened beyond reading**, and no conversion was executed
  (it would create linked account/contact/opportunity records).
- Plan for later: open Convert with controlled fictional data ONCE (with
  mentor approval), observe what entities it creates, verify them via their
  own detail pages, and only then automate.

### WF-6 — Campaign → related Lead

- **Status:** [Proposed — not yet validated].
- Actions: create campaign → attach a lead via the lead's Related Lists →
  Campaigns `Add` → verify on both records.
- Risks: association mechanism needs live verification.

Workflows that could NOT be mapped read-only (conversion, record
association mechanics, stage movement) are deliberately left as
proposals — no mutation was performed in Phase 2A.

## 7. Proposed test scenario matrix

Concise, high-value only. Naming: `module › scenario`.

### P0 — critical happy paths

| Test | Business rule validated |
|---|---|
| `leads › create and persist lead` | A lead created with valid data persists and is findable via list search; detail shows entered values (WF-1) |
| `contacts › create and persist contact` | Same persistence rule for contacts |
| `accounts › create account` | An account with required owner/name/industry is created and reachable by search |
| `opportunities › create with account` | An opportunity can be linked to an account and persists |
| `activities › create task related to lead` | Activities can be attached to a lead and appear on the lead's Activity tab |
| `login › positive` | Valid credentials land outside the login page (existing) |
| `login › negative` | Invalid credentials are rejected with the site's error (existing) |

### P1 — validations and relationships

| Test | Business rule validated |
|---|---|
| `leads › required dropdowns enforced` | Lead Source/Stage/Industry/Country are mandatory; save blocked with empty values (server-side validation evidence) |
| `contacts › contact owner mandatory` | Contact Owner must be chosen; save blocked otherwise |
| `contacts › parent contact hierarchy` | Child Contacts / View Hierarchy reflect the parent_contact relationship |
| `opportunities › stage moved via pipeline` | Stage reflects business progression and is visible on detail |
| `accounts › parent account hierarchy` | parent_account creates a visible account hierarchy |
| `leads › campaign association` | Leads can be attached to campaigns and shown in Related Lists (WF-6) |
| `search › unique record findable` | List search returns exactly the uniquely-named record created in-test |

### P2 — boundaries, permissions, negative

| Test | Business rule validated |
|---|---|
| `leads › duplicate detection` | The Potential Duplicates feature reacts to duplicate data (needs Duplicate Control settings inspection) [Proposed] |
| `opportunities › type/stage combos` | Business type taxonomy (New vs Existing Customer…) accepted per stage |
| `activities › all-day and scheduling boundaries` | Start/end datetime and is_all_day consistency |
| `permissions › settings area restricted (user role)` | Only verified if a restricted user is available — [Unavailable / blocked] until credentials of another role exist |
| `bulk › select and export` | List bulk controls operate on ≥1 selected record (non-destructive select only) |

Deliberately excluded as low-value on this demo: Reports admin, My Jobs
(empty), Forecast (no create affordance), Web-to-Lead/Email-to-Record
(external integrations).

## 8. Recommended Phase 2B implementation order

1. **Persistence upgrade for existing Leads/Contacts** — add list-search
   verification to the existing two workflow tests (no rewrite; one helper:
   `verifyRecordInList`). Rationale: closes the Phase 1 known limitation,
   foundational pattern for every later module; no new entities.
2. **Accounts module** (`pages/accountsPage.js`, `tests/accounts.spec.js`)
   — simplest form of the new modules; account is the hub three other
   entities reference; enables WF-2's first half.
3. **Opportunities module** — create with account linkage + stage
   assertion; strongest "business process" signal in the portfolio
   (WF-3). Requires Accounts first.
4. **Activities module** — task creation with polymorphic Related To on a
   lead created in-test (WF-4); exercises the trickiest shared modal so
   far (type tabs inside Create Activity).
5. **Campaigns + lead–campaign association** (WF-6) — closes the sales
   loop; association mechanics verified during a controlled validation
   session first.
6. **Lead conversion (WF-5)** — only after a controlled, mentor-approved
   validation run of the Convert flow; it is the only workflow expected to
   create multiple linked records per execution.

Cross-cutting rules carried into 2B: JavaScript/CommonJS only, POM as-is,
`workers: 1` / fully serial, unique fictional `example.com` data, no
deletes, credentials via env, README + AUTOMATION_GUIDE updated at the end
of the implementation phase.

## 9. Risks, unknowns, and clarification requests

1. **Record naming on detail pages** — headers follow the pattern
   `<input value>-<id>` (leads) and `<First Last>` (contacts) [Observed
   live]; needs confirmation that this is stable before tests rely on it.
2. **Stage movement mechanics** — whether stage chips are clickable
   actions or read-only indicators [Proposed]; controlled validation
   needed.
3. **Convert output entities** — unknown until one controlled conversion
   is executed [Proposed]; requires mentor approval per the demo-safety
   rules.
4. **Association mechanics (WF-2, WF-6)** — the exact widget (type-ahead
   select vs related-list Add panel) must be verified live during 2B's
   controlled validation before tests are written.
5. **Role permissions** — only the CEO/admin view was observed; restricted
   role behavior is [Unavailable / blocked] until a second-role credential
   is supplied by the user.
6. **Duplicate rules / Potential Duplicates** — feature visible; behavior
   depends on settings pages not entered in this phase.
7. **Demo data volatility** — demo list counts (e.g. `Select (490)`) can
   change at any time as other users use the shared instance; tests must
   search by unique values only, never by row counts.
8. **User input needed:** approval for one controlled lead-conversion
   validation; credentials of a non-admin role if permission tests are
   wanted in P2.

## 10. What was NOT tested or changed

**Files read (no modification):** `README.md`, `AUTOMATION_GUIDE.md`,
`package.json`, `package-lock.json`, `playwright.config.js`, all
`pages/*.js` and `tests/*.js`, `utils/env.js`, `utils/test-data.js`,
`.gitignore`, `.env.example`, `PHASE_1_REPORT.md`, `PHASE_1_1_REPORT.md`
(project baseline — all already in context from Phases 1/1.1).

**Pages/modules inspected live** (read-only): Dashboard/Home, Sales
section sidebar, Leads list + create form + lead detail (505) incl. tabs,
Accounts list + create form, Contacts (detail 506, form known from Phase 1),
Opportunities list + create form, Campaigns list + create form, Forecast
view, Reports list view, Calendar view, Activities list + Create Activity
form, My Jobs, Settings home page.

**Unavailable / not entered:** individual Settings admin pages, Reports/
My Jobs content areas, permission-restricted views.

**Not done, per the rules:**

- No CRM records were created, edited, converted, or deleted — the New
  forms were opened and read, then closed without saving.
- No automation source code, configuration, package files, `.gitignore`,
  `.env.example`, README, or AUTOMATION_GUIDE was modified in this phase.
- The existing Playwright suite was not re-run (no new record creation);
  no commit, push, remote, or `.git` interaction occurred beyond no-op
  queries, none this phase.
- All live inspection was performed in the serial inspection browser
  session already authenticated from the existing setup flow; the
  storage-state file remained deleted during discovery (regenerated only
  if the suite is run next time).

**Blocking note:** none — one prior live session was required to
authenticate, which is the same read-only session pattern as Phases 1/1.1.

---

*Report generated for mentor review. Phase 2B starts only after approval.*