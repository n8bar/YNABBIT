# YNABBIT

YNABBIT is a small, auditable userscript for adding useful information and enhancements directly to the YNAB web app without rebuilding YNAB's interface.

The first enhancement adds **Still Needed to Fund Plan** to the monthly Summary card.

YNAB already calculates this value as **Underfunded** in the Auto-Assign card. YNABBIT surfaces that same native value in Summary instead of recalculating it or requiring API credentials.

## Install

1. Install Tampermonkey (or another compatible userscript manager).
2. Open the raw `ynabbit.user.js` file from this repository and install it.
3. Open or refresh YNAB's Plan view.

Tampermonkey can use the userscript's `@updateURL` and `@downloadURL` metadata to pull future versions directly from this repository.

## Security / privacy

YNABBIT is intentionally public and small enough to audit.

Version 0.2.0 does not request API access, does not store credentials, and does not send YNAB data anywhere. It runs only on `https://app.ynab.com/*` and reads/modifies the page DOM in your browser.

If future enhancements need the official YNAB API, credential handling and network permissions will be added explicitly and documented here.

## How the first enhancement works

In YNAB's current Plan UI, the monthly Summary and Auto-Assign cards are both already present in the Budget Inspector. YNABBIT:

1. Reads the native **Underfunded** amount from Auto-Assign.
2. Clones one of YNAB's existing Summary rows so the injected row inherits YNAB's styling and theme behavior.
3. Labels the row **Still Needed to Fund Plan**.
4. Keeps it synchronized when YNAB re-renders the inspector or changes the amount.

## Status

Early prototype. YNAB's web UI is not a public API, so DOM selectors may occasionally need adjustment when YNAB changes its interface.

## License

MIT. See [LICENSE](LICENSE).
