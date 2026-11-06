/**
 * Credential resolution for the demo CRM.
 *
 * Credentials must come from the environment (or an optional .env file, see
 * .env.example) — never from source code. If they are missing we fail with an
 * actionable message instead of falling back silently to any default account.
 */
function demoCredentials() {
    const username = process.env.CRM_USERNAME;
    const password = process.env.CRM_PASSWORD;

    if (!username || !password) {
        throw new Error(
            'CRM credentials are missing.\n' +
            'Set CRM_USERNAME and CRM_PASSWORD as environment variables, or ' +
            'copy .env.example to .env and fill in the values.\n' +
            'Ask the project owner for the current demo account credentials.'
        );
    }

    return { username, password };
}

module.exports = { demoCredentials };