// ==UserScript==
// @name         YNABBIT
// @namespace    https://github.com/n8bar/YNABBIT
// @version      0.0.3
// @description  Small, auditable enhancements for the YNAB web app.
// @author       Nate Barlow
// @license      MIT
// @match        https://app.ynab.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/n8bar/YNABBIT/main/ynabbit.user.js
// @downloadURL  https://raw.githubusercontent.com/n8bar/YNABBIT/main/ynabbit.user.js
// ==/UserScript==

(() => {
  'use strict';

  const ROW_CLASS = 'ynabbit-still-needed-to-fund-plan';
  const LABEL = 'Still Needed to Fund Plan';

  console.info('[YNABBIT] 0.0.3 loaded');

  function findSummaryBreakdown() {
    return document.querySelector('.budget-inspector .ynab-breakdown');
  }

  function findUnderfundedAmount() {
    return document.querySelector(
      '.budget-inspector .budget-breakdown-auto-assign .budget-inspector-button.underfunded .currency'
    );
  }

  function cloneNativeAmount(sourceAmount) {
    return sourceAmount.cloneNode(true);
  }

  function syncStillNeededRow() {
    const breakdown = findSummaryBreakdown();
    const sourceAmount = findUnderfundedAmount();

    if (!breakdown || !sourceAmount) return;

    let row = breakdown.querySelector(`.${ROW_CLASS}`);

    if (!row) {
      // Clone a real Summary row so YNABBIT inherits YNAB's current layout,
      // typography, spacing, currency formatting, and theme behavior.
      const template =
        breakdown.querySelector('.ynab-breakdown-assigned-in-month') ||
        breakdown.firstElementChild;

      if (!template) return;

      row = template.cloneNode(true);

      // Keep YNAB's native row class for layout/styling and add our own marker.
      // Replacing className here made the injected row lose YNAB's row styles.
      row.classList.add(ROW_CLASS);
      row.removeAttribute('id');
      row.removeAttribute('aria-describedby');

      const labelHost = row.firstElementChild;
      const valueHost = row.children[1];
      if (!labelHost || !valueHost) return;

      labelHost.textContent = LABEL;
      valueHost.replaceChildren(cloneNativeAmount(sourceAmount));
      breakdown.appendChild(row);
      console.info('[YNABBIT] Added Still Needed to Fund Plan row');
      return;
    }

    const valueHost = row.children[1];
    const currentAmount = valueHost?.querySelector('.currency');

    if (!valueHost) return;

    // Only touch the DOM when the displayed Underfunded value actually changed.
    // This avoids a MutationObserver feedback loop.
    if (
      !currentAmount ||
      currentAmount.textContent !== sourceAmount.textContent ||
      currentAmount.className !== sourceAmount.className
    ) {
      valueHost.replaceChildren(cloneNativeAmount(sourceAmount));
    }
  }

  let syncScheduled = false;

  function scheduleSync() {
    if (syncScheduled) return;
    syncScheduled = true;

    requestAnimationFrame(() => {
      syncScheduled = false;
      syncStillNeededRow();
    });
  }

  // YNAB is a single-page app and frequently replaces portions of the Plan DOM.
  // Re-run after relevant mutations so the row survives month changes, navigation,
  // assignments, theme changes, and inspector re-renders.
  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'aria-hidden']
  });

  window.addEventListener('popstate', scheduleSync);
  scheduleSync();
})();
