# YNABBIT

YNABBIT is a small, auditable userscript for adding useful information and enhancements directly to the YNAB web app without rebuilding YNAB's interface.

The first enhancement adds **Still Needed to Fund Plan** to the monthly Summary card by totaling the positive `goal_under_funded` values reported by the official YNAB API for the displayed month.

## Install

1. Install Tampermonkey (or another compatible userscript manager).
2. Open the raw `ynabbit.user.js` file from this repository and install it.
3. In YNAB, use the Tampermonkey menu for YNABBIT and choose **Set YNAB Personal Access Token**.
4. Create a Personal Access Token in YNAB under **Account Settings → Developer Settings** and paste it into the prompt.
5. Refresh the YNAB budget page.

The token is stored locally by the userscript manager. It is never stored in this repository.

## Security / privacy

YNABBIT is intentionally public and small enough to audit. The userscript only requests access to `app.ynab.com` and `api.ynab.com`. Your YNAB Personal Access Token is saved with the userscript manager's local storage and sent only to the official YNAB API.

## Status

Early prototype. YNAB's web UI is not a public API, so DOM injection may occasionally need adjustment when YNAB changes its interface.

## License

MIT. See [LICENSE](LICENSE).
