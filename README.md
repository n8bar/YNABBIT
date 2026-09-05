# YNABBIT

## Install YNABBIT

1. Install [Tampermonkey]([https://www.tampermonkey.net/](https://chromewebstore.google.com/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo)) in your browser.
2. Make sure Tampermonkey is allowed to run user scripts on `app.ynab.com`.
3. Open [Install the latest YNABBIT](https://raw.githubusercontent.com/n8bar/YNABBIT/main/ynabbit.user.js) and click **Install**.
4. Reload YNAB.

That install link always points to the latest version on GitHub.

YNABBIT is a small, auditable userscript for adding useful information and enhancements directly to the YNAB web app without rebuilding YNAB's interface.

The first enhancement adds a **Still Needed to Fund Plan** amount in its own YNABBIT card in the right-side Plan inspector.

## Security / privacy

YNABBIT is intentionally public and small enough to audit.

The current version does not request YNAB API access, does not store credentials, and does not send YNAB data anywhere. It runs only on `https://app.ynab.com/*` and reads/modifies the page DOM in your browser.

If future enhancements need the official YNAB API, credential handling and network permissions will be added explicitly and documented here.

## How the first enhancement works

YNABBIT:

1. Reads each category's current **more needed** amount from the Plan page.
2. Adds those amounts together.
3. Subtracts money already sitting in **Ready to Assign**.
4. Shows the result as **Still Needed to Fund Plan** in the YNABBIT card.
5. Keeps the amount synchronized as YNAB changes, regardless of category selection.

## Updates

YNABBIT includes `@updateURL` and `@downloadURL` metadata so Tampermonkey can pull future versions directly from this repository.

## Status

Early prototype. YNAB's web UI is not a public API, so DOM selectors may occasionally need adjustment when YNAB changes its interface.

## License

MIT. See [LICENSE](LICENSE).
