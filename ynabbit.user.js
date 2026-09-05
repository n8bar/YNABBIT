// ==UserScript==
// @name         YNABBIT
// @namespace    https://github.com/n8bar/YNABBIT
// @version      0.0.4
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

  console.info('[YNABBIT] 0.0.4 loaded');

  function findSummaryBreakdown() {
    return document.querySelector('.budget-inspector .ynab-breakdown');
  }

  function findUnderfundedAmount() {
    return document.querySelector(
      '.budget-inspector .budget-breakdown-auto-assign .budget-inspector-button.underfunded .currency'
    );
  }

  function findReadyToAssignAmount() {
    return document.querySelector('.budget-header .to-be-budgeted-amount .currency');
  }

  function parseCurrencyAmount(element) {
    if (!element) return null;

    const text = element.textContent?.trim() || '';
    const isNegative = text.includes('-') || (text.includes('(') && text.includes(')'));
    const numeric = Number.parseFloat(text.replace(/[^0-9.]/g, ''));

    if (!Number.isFinite(numeric)) return null;
    return isNegative ? -numeric : numeric;
  }

  function makeNativeAmount(sourceAmount, value) {
    const clone = sourceAmount.cloneNode(true);
    const symbol = clone.querySelector('bdi')?.textContent || '$';
    const formatted = value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    clone.classList.remove('positive', 'negative', 'zero');
    clone.classList.add(value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero');

    const symbolNode = document.createElement('bdi');
    symbolNode.textContent = symbol;
    clone.replaceChildren(symbolNode, document.createTextNode(formatted));

    return clone;
  }

  function syncStillNeededRow() {
    const breakdown = findSummaryBreakdown();
    const underfundedAmount = findUnderfundedAmount();
    const readyToAssignAmount = findReadyToAssignAmount();

    if (!breakdown || !underfundedAmount || !readyToAssignAmount) return;

    const underfunded = parseCurrencyAmount(underfundedAmount);
    const readyToAssign = parseCurrencyAmount(readyToAssignAmount);
    if (underfunded === null || readyToAssign === null) return;

    // Ready to Assign is money already available to cover the plan, so it reduces
    // how much additional money is still needed. "Still needed" cannot be negative.
    const stillNeeded = Math.max(0, underfunded - readyToAssign);
    const renderedAmount = makeNativeAmount(underfundedAmount, stillNeeded);

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
      row.classList.add(ROW_CLASS);
      row.removeAttribute('id');
      row.removeAttribute('aria-describedby');

      const labelHost = row.firstElementChild;
      const valueHost = row.children[1];
      if (!labelHost || !valueHost) return;

      labelHost.textContent = LABEL;
      valueHost.replaceChildren(renderedAmount);
      breakdown.appendChild(row);
      console.info('[YNABBIT] Added Still Needed to Fund Plan row');
      return;
    }

    const valueHost = row.children[1];
    const currentAmount = valueHost?.querySelector('.currency');

    if (!valueHost) return;

    if (
      !currentAmount ||
      currentAmount.textContent !== renderedAmount.textContent ||
      currentAmount.className !== renderedAmount.className
    ) {
      valueHost.replaceChildren(renderedAmount);
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
