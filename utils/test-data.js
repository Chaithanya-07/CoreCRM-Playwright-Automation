/**
 * Small helper for generating unique test data at runtime.
 * Contains no real personal information — only fictional names and
 * example.com addresses, made unique with a timestamp + counter.
 */
let counter = 0;

function uniqueEmail(prefix = 'user') {
    counter += 1;
    return `${prefix}.${Date.now()}.${counter}@example.com`;
}

// Accounts have no email field, so their uniqueness comes from a
// timestamp-based fictional name instead (verified live: the account-name
// list search matches rows by a substring of the name).
function uniqueAccountName() {
    counter += 1;
    return `Aurora Systems ${Date.now()}.${counter}`;
}

// Opportunity names are not unique in real data either; a timestamp-based
// fictional name keeps the exactly-one-row search reliable (same approach
// as account names).
function uniqueOpportunityName() {
    counter += 1;
    return `Aurora Opportunity ${Date.now()}.${counter}`;
}

// Activities have no email field either; their search anchor is the unique
// Subject (verified live: the activities list URL search matches subjects).
function uniqueActivitySubject() {
    counter += 1;
    return `Aurora Activity ${Date.now()}.${counter}`;
}

// Campaigns have no email field; their uniqueness anchor is the campaign
// NAME (verified live: the campaigns list URL search matches names).
function uniqueCampaignName() {
    counter += 1;
    return `Aurora Campaign ${Date.now()}.${counter}`;
}

// Lead conversion flows on to Account/Contact/Opportunity records, so the
// LEAD itself must be unique enough to keep every resulting record
// searchable without collisions with previous runs (the conversion copies
// the lead's company into the account name, the lead's names into the
// contact, and derives the opportunity name from the account name).
// One helper keeps those values consistent within a run.
function uniqueConvertLead() {
    counter += 1;
    const stamp = `${Date.now()}.${counter}`;
    return {
        firstName: 'Aurora',
        lastName: `Convert${stamp}`,
        email: `lead.convert.${stamp}@example.com`,
        company: `Aurora Convert Company ${stamp}`,
    };
}

// A lead created purely as a related record (e.g. an activity's "Related
// To" association). Must be created by the test itself so the Select2
// search term always matches — the demo site's seeded data resets and
// cannot be relied on for hard-coded terms.
function uniqueRelatedLead() {
    counter += 1;
    const stamp = `${Date.now()}.${counter}`;
    return {
        firstName: 'Aurora',
        lastName: `Related${stamp}`,
        email: `lead.related.${stamp}@example.com`,
        company: `Aurora Related Company ${stamp}`,
    };
}

module.exports = { uniqueEmail, uniqueAccountName, uniqueOpportunityName, uniqueActivitySubject, uniqueCampaignName, uniqueConvertLead, uniqueRelatedLead };