# Phase 2B.6 Discovery Report — Lead Conversion

**Project:** CoreCRM – E2E Automation Suite
**Application under test:** Horilla CRM Demo
**Application:** https://crm.demo.horilla.com · **Discovery performed:** 2026-11-04 (read-only inspection; conversion submitted once on a disposable fictional lead, as the instructions allow)
**Test records created during discovery:** lead "Aurora / Convert1793775656884" (Lead id **507**) and, from its conversion, **Account id 510**, **Contact id 507**, **Opportunity id 507** — all fictional with unique timestamps, none deleted. The implemented test likewise creates its own 4 fresh records per run (see `PHASE_2B_6_REPORT.md`).
**Baseline state:** 13 tests confirmed before inspection (setup + 2 login + 2 leads + 1 contact + 2 accounts + 2 opportunities + 2 activities + 2 campaigns), `workers: 1`, `fullyParallel: false`; no source file modified during discovery.

---

## 1. Where the Convert action is exposed

The Convert action is on the **Lead detail page**, in two places, both loading into the same modal:

| Element | DOM | Behavior |
|---|---|---|
| Stage-pipeline step "Convert" | `DIV` with class containing `bg-primary-400`, inside a `DIV.flex-auto.relative.cursor-pointer`, `hx-get="/crm/leads/convert-lead/<id>/"`, `hx-target="#contentModalBox"` | Same modal load |
| Detail-page action link "Convert" | `A` with `hx-get="/crm/leads/convert-lead/<id>/"`, `hx-target="#contentModalBox"`, `onclick="openContentModal()"` (rendered zero-size on 506-style detail pages but present) | Same modal load |

- Conversion route: **`GET /crm/leads/convert-lead/<id>/`** — it returns the conversion form; no detail-route variant exists. The action is **not** on the leads list row, not a bulk action, and not an inline row control — verified.
- The pipeline steps on the lead detail page (Contacts/Accounts/Opportunities progress bars area) include the Convert step; the detail header card itself has no Convert control.

## 2. The "Lead Conversion" form (modal `#contentModalBox`)

`GET /crm/leads/convert-lead/<id>/` returns a single form titled **"Lead Conversion"** with:

- `hx-post="/crm/leads/convert-lead/<id>/?"`, `hx-target="#contentModalBox"`, `hx-swap="innerHTML"`; submit button text **"Convert"** (`button[type=submit]`).
- **No `novalidate` attribute** — but also **no HTML `required` attribute on any field** (all fields verified: zero `required` occurrences in the form).

### Sections (in page order)

**Account** — radio group `name="account_action"`:
| Option | Default | Rendered field |
|---|---|---|
| `create_new` | **checked** | text input `name="account_name"` (id `id_existing_account` is reused inside the rendered block), placeholder *"Enter Account Name"*, **pre-filled from the Lead's Lead Company** |
| `select_existing` | — | remote Select2 widget `name="existing_account"` (`class="select2-pagination"`, `data-url="/generics/accounts/Account/select2/"`, `data-placeholder="Select account"`), options rendered server-side (*"Horizon Hustle - 2"*, *"Summit Seekers - 3"*, …). The Select2 `selectOption({ force: true })` project pattern applies. Selecting an account `hx-get`-re-renders `#opportunity-field` (`hx-include="[name='opportunity_action']:checked"`) |

The radio itself carries the re-render (`hx-get="/crm/leads/convert-lead/507/?account_action=select_existing"`, `hx-target="#account-field"`, `hx-include="#id_existing_account"`) — the section's field block is **server-rendered per mode** (verified by fetching each mode's GET: the same form is returned with that radio `checked` and the corresponding field rendered).

**Contact** — radio group `name="contact_action"`:
| Option | Default | Rendered field |
|---|---|---|
| `create_new` | **checked** | **First Name** (`name="first_name"`) + **Last Name** (`name="last_name")` text inputs, **pre-filled from the Lead's First/Last Name** |
| `select_existing` | — | remote Select2 widget `name="existing_contact"` (`data-url="/generics/contacts/Contact/select2/"`, `data-placeholder="Select Contact"`), options rendered server-side (*"Michelle May"*, *"Scott Coleman"*, …) |

There is no "Select contact" field in create_new mode and no Lead→Contact email/title mapping UI — only the two name inputs are offered.

**Opportunity** — radio group `name="opportunity_action"`:
| Option | Default | Rendered field |
|---|---|---|
| `create_new` | **checked** | text input `name="opportunity_name"` (id `id_existing_opportunity`), placeholder *"Enter Opportunity Name"*, **pre-filled with `<account name> - Opportunity`** (e.g. *"Aurora Convert Company 1793775656884 - Opportunity"*) |
| `select_existing` | — | Select2 widget `name="existing_opportunity"` rendered **disabled** until an account is chosen: `"<option value=''>Please select an account first</option>"` + hint *"Select an account to see available opportunities"* — existing-opportunity lookup is **account-scoped** (server-side dependency) |

**Owner** — remote Select2 widget `name="owner"` (`class="select2-pagination"`, `data-url="/generics/core/HorillaUser/select2/"`, `data-placeholder="Select owner"`), **pre-selected with the Lead's Lead Owner** (verified: Harry Mills, option value `30` — the same user shown as Lead Owner on the header card).

### Fields/defaults/mapping summary (all live-verified)

| Input | Pre-filled from | Required indicator |
|---|---|---|
| `account_name` | Lead **Lead Company** | none |
| `first_name` / `last_name` | Lead **First/Last Name** | none |
| `opportunity_name` | `<Lead's Lead Company> - Opportunity` | none |
| `owner` select | Lead **Lead Owner** | none |

**No "skip" option exists**: each of Account/Contact/Opportunity offers exactly *Create New* or *Select Existing*; there is no omit/none choice, and no field is client-required.

## 3. Conversion submission — verified end-to-end (lead 507)

Submitted exactly once, with all three defaults (create_new × 3) and the server's own pre-filled values:

- **Server response:** an HTML success panel rendered into `#contentModalBox` (htmx swap of the post target), **not a SweetAlert2 dialog**:
  - message block: *"Lead \"Aurora Convert Company 1793775656884/Aurora/<created-by user>\" has been successfully converted!"* (the app renders `<lead company>/<first name>/<logged-in user>` — the demo username is redacted here; `div.message data-level="success"` inside `#messages-container`, initially `display:none` — shown by the page's message machinery),
  - visible panel: tick image + heading **"Your lead has been converted"**,
  - three result cards — **Account**, **Contact**, **Opportunity** — each rendering the created record's name as a link (`hx-get`) to its detail page: **Account → `/crm/accounts/account-detail-view/510/?section=people`**, Contact and Opportunity → their detail routes. The panel's close button also triggers `$('#reloadButton').click()` to refresh the lead page.
- The success message's lead name format is `<Lead Company>/<First Name>/<created-by>` — the same concatenation the lists display as the lead row name.

## 4. Resulting records — independently verified on authoritative views

**Account (id 510)** — `/crm/accounts/accounts-view/?section=people&search=Aurora%20Convert` returns exactly **1 row** with: Account Name *Aurora Convert Company 1793775656884*, **Account Owner: Harry Mills**, **Account Source: Website** (mapped from the Lead's Lead Source), Account Type/Number/Annual Revenue empty. Detail route `/crm/accounts/account-detail-view/510/?section=people` loads (header card title = account name).

**Contact (id 507)** — `/crm/contacts/contacts-view/?section=people&search=Aurora%20Convert` returns exactly **1 row**: First *Aurora*, Last *Convert1793775656884*, **Email = the Lead's email** `lead.convert.1793775656884@example.com` (mapping verified on list + detail), Contact Owner **Harry Mills**. Detail `/crm/contacts/contact-detail-view/507/?section=people` shows the account name and the created opportunity in its related links.

**Opportunity (id 507)** — `/crm/opportunities/opportunities-view/?section=sales&search=Aurora%20Convert` returns exactly **1 row**: Name *"Aurora Convert Company 1793775656884 - Opport…"* (the pre-filled default), **Close Date 2026-12-04** (exactly one month after conversion; conversion date 2026-11-04), **Stage: Prospecting** (default), Probability 10.00, Forecast Category: Pipeline, Amount/Expected Revenue empty. Detail `/crm/opportunities/opportunity-detail-view/507/?section=sales` header card shows the same values.

**Relationships (authoritative, verified after reload):**

- **Opportunity → Account (authoritative, UI-visible):** the opportunity's **Details tab** holds an `Account` row rendering **"Aurora Convert Company 1793775656884 - 510"** (`#Account-details-tab`, `<account name> - <account id>` format) — the created opportunity links the created account.
- **Account → created contact/opportunity (verified via the related-list content responses; see the limitation below):** the account's Related Lists tab renders side lists — "Related Contacts" (`field_name=contact_relationships`) contains a **`contact-detail-view/507/`** link, and "Opportunities" (`field_name=opportunity_account`) contains a **`opportunity-detail-view/507/`** link for the discovery records.
- **Contact:** the contact's **Details tab exposes no Account field** (verified row-by-row: Contact Owner, Title, First/Last Name, Email, numbers, address, Parent Contact, Contact Source, Description, Birth Date, Assistant, Languages, Is Primary, Contact Score — no Account row), and its Related Lists tab offers only **Child Contacts** and **Campaigns**. The contact–account link is therefore verifiable **only from the account side** (deferred, below).
- All created records were re-read after navigations (server-rendered responses) — **persistence verified**.

## 5. Lead converted-state behavior (all live-verified)

- The lead **disappears from the default leads list**: immediately before conversion `?search=Aurora Convert` returned the 507 row; after conversion `/crm/leads/leads-list/?section=sales&search=...` returns **"No matching records"** and no 507 link, while the lead **still appears in the list view's type selector "Converted Lead"** (`#viewTypeSelect`, option `value="converted_lead"`).
- The **Converted Lead view** — `/crm/leads/leads-view/?section=sales&view_type=converted_lead` — returns exactly **the converted lead 507** as its row (detail link `leads-detail/507`), with the lead's status column rendering **"Convert"** (the demo's label for the converted status).
- The lead **detail page remains reachable** (`/crm/leads/leads-detail/507/?section=sales` loads normally, header card unchanged with original field values), and its **Convert action is gone** — zero elements referencing `convert-lead/507` on the detail page of the converted lead (verified on 507; the sibling lead 506 still shows both Convert controls).
- **Re-conversion is blocked:** `GET /crm/leads/convert-lead/507/` on the converted lead returns only `<script>$('#reloadButton').click();$('#reloadMessagesButton').click();closeContentModal();</script>` (99 bytes) — **no conversion form**. (A POST was not attempted on the converted lead; the removed UI/form is the demonstrated guard.)

## 6. HTMX/list navigation findings

- The known transparent `#loading-indicator` overlay (`htmx-indicator tabloading`, `pointer-events: auto`) applies to the leads list as everywhere else; the mentor-approved fallback applies. The converted-lead row and the matching list row carry the real `hx-get` detail URL (td index 1: `/crm/leads/leads-detail/<id>/`), never constructed.
- **Detail-page Related Lists tab panel is pointer-blocked (new evidence, verified live 2026-11-04):** the account detail's `#tab-related-lists-indicator` overlay (same `htmx-indicator tabloading` class) is **permanently rendered** with `opacity: 0`, `display: flex`, `pointer-events: auto` — it intercepts every pointer event over the related-lists side-list anchors (`#related-tabs a`, e.g. "Related Contacts" / "Opportunities"), real-user clicks included (verified under Playwright: ~90 click retries all intercepted). The anchors have no `href` and no keyboard binding (**keyboard activation does not trigger htmx** — focus + Enter verified live with no effect), and their `hx-get` content route is **htmx-only**: a direct navigation returns **405** (the response requires the htmx request context — real users cannot open those content URLs directly either). The account-side related-list assertions are therefore **documented and deferred** (this matches the known demo overlay regression family; no force-click or header-spoofing workaround was introduced).
- **Last-active detail tab persists per user (server side):** detail pages do not always open on the "Details" tab — the app's `saveActiveTab` persists the last active tab; a detail page was observed opening with "Related Lists" already selected after that tab had been used earlier by the same user. Tab-scoped assertions must open their target tab explicitly.
- The conversion modal is **separate from the shared `#modalBox`/`#dbmodal` pair**: it renders in **`#contentModalBox`** (inside `#contentModal`, hidden with `display:none` until `openContentModal()`).
- Section re-renders: switching a *Select Existing* radio triggers a server re-render of the section field block (full form returned with the mode applied, new csrf token); *Select Existing* widgets are the established remote Select2 (`select2-pagination`) pattern — options pre-rendered in the response.
- The success panel replaces the form in `#contentModalBox` and its close button triggers the leads-page reload button.

## 7. Tooling note (discovery-only workaround, documented)

The preview tool used for discovery repeatedly failed to deliver real clicks on this page (the New-Lead button and the Convert button reported clicks but did not trigger the application's htmx handlers — the same tool-only artifact observed in the Phase 2B.5 Campaigns discovery; it does **not** reproduce under Playwright, where plain `.click()` on these elements has worked in every prior phase). Discovery therefore used the application's own HTTP endpoints for data creation/submission (form GET → POST with the page-returned csrf token and the form's own pre-filled field values). This is a **discovery-observability workaround only**: Stage B's tests drive the real UI via Playwright locator clicks, exactly as the approved modules do.

## 8. Candidate tests (Stage B)

1. **Positive end-to-end conversion** (the single verified path): create a unique fictional Lead via the real leads UI (existing `createLead` conventions) → search by its unique email → open the row via the `hx-get` fallback (route pattern `/^\/crm\/leads\/leads-detail\/\d+\/?/`) → click the detail page's Convert pipeline control → assert the "Lead Conversion" form's pre-filled mappings and "Create New" defaults → click the form's **Convert** submit → assert the "*Your lead has been converted*" result panel and extract the three created-record URLs from it (route patterns asserted) → open each created record on its authoritative view and assert its created/mapped values (account name, Account Source *Website*, Industry *Finance*; contact email; opportunity name, `#Account-details-tab` account link) → verify the converted state: the lead is absent from the default leads search and **present — as the exact same record — in the Converted Lead view** (`?view_type=converted_lead`).
2. **Negative test: not automated.** The conversion form has **no client-side required field and no stable validation message was observed**; any server-side empty-field behavior is unknown and probing it would consume a second conversion of a persistent lead. Documented as deferred rather than risk a partial/undefined conversion with an unverified contract.

A create-existing/link branch is documented (§2) but **not automated**: the link-existing flows depend on account-scoped opportunity lookup and a shared Select2 search; covering them doubles persistent test data conversion for the same business assertion, so only the verified default path is covered.

## 9. Unsupported, unstable, or unverified behavior (not automated)

- **Account-side related-list relationship assertions: deferred (demo-blocked).** The account's Related Lists side lists are unreachable in the browser (permanently rendered invisible `#tab-related-lists-indicator` overlay intercepting all pointer events, no keyboard path, htmx-only content route 405ing on direct navigation — full evidence in §6). The related-list content **responses** (fetched during discovery with the app's own htmx context) do contain the created records, so the relationships persist; only their browser-driven assertion is deferred until the demo removes the overlay. No force-click, JS click dispatch, or header-spoofing workaround was introduced.
- **Select-existing branches** (existing Account/Contact/Opportunity): structure verified (§2) but not exercised end-to-end in discovery; deferred.
- **Skip/omit options: do not exist** in the UI — conversion always produces or links all three entities via the verified form; no "skip" claim is made beyond the observed radio pair.
- **Atomicity/partial-failure behavior:** not safely observable without submitting invalid conversions of persistent leads; deferred per instructions.
- **Field mapping breadth:** only the observed mappings are asserted (account name + Account Source + Industry, contact first/last/email, opportunity name + account link, owner ← lead owner); the full server mapping (e.g. additional hidden fields) is not asserted. The Owner pre-selection follows the lead's owner, which varies between sessions, so no test hard-asserts owner identity.
- **Opportunity defaults** (Close Date exactly one month after conversion, Stage *Prospecting*, Probability 10.00, Forecast Category *Pipeline*): verified in discovery (§4) but not asserted in the test (the close date depends on the conversion date, making it timezone-fragile as a fixed expectation).
- **Opportunity "Select Existing" empty-state** (disabled widget until an account is selected): verified as a UI state; not driven end-to-end.
- Search quirk (pre-existing, pre-conversion): searching the leads list by the bare last-name token failed to match while the email-based and name-fragment searches matched; the module's approved search convention (by unique email) is unaffected.
- The conversion-created opportunity's contact relationship (visible in the demo's fetched "Contact Roles" related-list response) belongs to the same deferred related-lists surface (§6).

## 10. Stop-point decision

The conversion workflow (action location, form structure, defaults and mappings, submission, success panel, resulting records, relationships, converted-state visibility, re-conversion guard) was fully observed live, is stable across repeated reads, and its consequences are completely understood → proceeding to **Stage B in the same run**, per the instructions.