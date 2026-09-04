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
  const HELLO_ID = 'ynabbit-hello-world';

  console.info('[YNABBIT] 0.0.4 loaded');

  function ensureHelloWorld() {
    if (document.getElementById(HELLO_ID)) return;

    const hello = document.createElement('div');
    hello.id = HELLO_ID;
    hello.textContent = 'YNABBIT HELLO WORLD 0.0.4';
    Object.assign(hello.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: '2147483647',
      padding: '10px 14px',
      background: '#ffea00',
      color: '#111',
      border: '3px solid #111',
      borderRadius: '8px',
      font: 'bold 16px/1.2 sans-serif',
      boxShadow: '0 3px 12px rgba(0,0,0,.35)'
    });

    document.documentElement.appendChild(hello);
    console.info('[YNABBIT] Added Hello World badge');
  }

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
      ensureHelloWorld();
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
  ensureHelloWorld();
  scheduleSync();
})();
