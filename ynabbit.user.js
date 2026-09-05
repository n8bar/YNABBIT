// ==UserScript==
// @name         YNABBIT
// @namespace    https://github.com/n8bar/YNABBIT
// @version      0.0.8
// @description  Small, auditable enhancements for the YNAB web app.
// @author       Nate Barlow
// @license      MIT
// @match        https://app.ynab.com/*
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/n8bar/YNABBIT/main/ynabbit.user.js
// @downloadURL  https://raw.githubusercontent.com/n8bar/YNABBIT/main/ynabbit.user.js
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = GM_info.script.version;
  const ROW_CLASS = 'ynabbit-still-needed-to-fund-plan';
  const VERSION_CARD_CLASS = 'ynabbit-version-card';
  const CARD_BREAKDOWN_CLASS = 'ynabbit-card-breakdown';
  const LABEL = 'Still Needed to Fund Plan';
  const SCRIPT_URL = 'https://raw.githubusercontent.com/n8bar/YNABBIT/main/ynabbit.user.js';

  console.info(`[YNABBIT] ${VERSION} loaded`);

  GM_registerMenuCommand('Check for YNABBIT update now', () => {
    const link = document.createElement('a');
    link.href = `${SCRIPT_URL}?ynabbit-update=${Date.now()}`;
    link.target = '_blank';
    link.rel = 'noopener';
    document.documentElement.appendChild(link);
    link.click();
    link.remove();
  });

  function findNativeSummaryRow() {
    return [...document.querySelectorAll(
      '.budget-inspector .ynab-breakdown-assigned-in-month'
    )].find((row) => !row.closest(`.${VERSION_CARD_CLASS}`)) || null;
  }

  function removeInjectedRows() {
    document.querySelectorAll(`.${ROW_CLASS}`).forEach((row) => row.remove());
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

  function syncVersionCard() {
    const inspectorContent = document.querySelector('.budget-inspector .budget-inspector-content');
    if (!inspectorContent) return null;

    const nativeCards = [
      ...inspectorContent.querySelectorAll(`section.card:not(.${VERSION_CARD_CLASS})`)
    ];
    const lastNativeCard = nativeCards.at(-1);
    if (!lastNativeCard) return null;

    let card = inspectorContent.querySelector(`.${VERSION_CARD_CLASS}`);

    if (!card) {
      card = document.createElement('section');
      card.className = `card ${VERSION_CARD_CLASS}`;

      const body = document.createElement('div');
      body.className = 'card-body';
      body.setAttribute('aria-hidden', 'false');

      const heading = document.createElement('h2');
      heading.textContent = `YNABBIT v${VERSION}`;
      heading.style.padding = '1rem 1rem 0';

      const breakdown = document.createElement('div');
      breakdown.className = `ynab-breakdown ${CARD_BREAKDOWN_CLASS}`;

      body.append(heading, breakdown);
      card.appendChild(body);
      console.info(`[YNABBIT] Added version card for v${VERSION}`);
    } else {
      const heading = card.querySelector('h2');
      if (heading && heading.textContent !== `YNABBIT v${VERSION}`) {
        heading.textContent = `YNABBIT v${VERSION}`;
      }
    }

    if (lastNativeCard.nextElementSibling !== card) {
      lastNativeCard.insertAdjacentElement('afterend', card);
    }

    return card;
  }

  function syncStillNeededRow() {
    const template = findNativeSummaryRow();
    const card = document.querySelector(`.${VERSION_CARD_CLASS}`);
    const breakdown = card?.querySelector(`.${CARD_BREAKDOWN_CLASS}`);

    // The native month Summary row only exists when no categories are selected.
    if (!template || !breakdown) {
      removeInjectedRows();
      return;
    }

    const underfundedAmount = findUnderfundedAmount();
    const readyToAssignAmount = findReadyToAssignAmount();

    if (!underfundedAmount || !readyToAssignAmount) {
      removeInjectedRows();
      return;
    }

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
      row = template.cloneNode(true);
      row.classList.add(ROW_CLASS);
      row.removeAttribute('id');
      row.removeAttribute('aria-describedby');

      const labelHost = row.firstElementChild;
      const valueHost = row.children[1];
      if (!labelHost || !valueHost) return;

      labelHost.textContent = LABEL;
      valueHost.replaceChildren(renderedAmount);
      breakdown.appendChild(row);
      console.info('[YNABBIT] Added Still Needed to Fund Plan row to YNABBIT card');
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
      syncVersionCard();
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
