// ==UserScript==
// @name         YNABBIT
// @namespace    https://github.com/n8bar/YNABBIT
// @version      0.0.11
// @description  Small, auditable enhancements for the YNAB web app.
// @author       Nate Barlow
// @license      MIT
// @match        https://app.ynab.com/*
// @grant        GM_info
// @updateURL    https://raw.githubusercontent.com/n8bar/YNABBIT/main/ynabbit.user.js
// @downloadURL  https://raw.githubusercontent.com/n8bar/YNABBIT/main/ynabbit.user.js
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = GM_info.script.version;
  const ROW_CLASS = 'ynabbit-still-needed-to-fund-plan';
  const VERSION_CARD_CLASS = 'ynabbit-version-card';
  const CARD_BREAKDOWN_CLASS = 'ynabbit-card-breakdown';
  const CARD_TITLE_ROW_CLASS = 'ynabbit-card-title-row';
  const UPDATE_BUTTON_CLASS = 'ynabbit-update-button';
  const LABEL = 'Still Needed to Fund Plan';
  const SCRIPT_URL = 'https://raw.githubusercontent.com/n8bar/YNABBIT/main/ynabbit.user.js';

  console.info(`[YNABBIT] ${VERSION} loaded`);

  function findReadyToAssignAmount() {
    return document.querySelector('.budget-header .to-be-budgeted-amount .currency');
  }

  function parseCurrencyText(text) {
    const normalized = text?.trim() || '';
    if (!normalized) return null;

    const isNegative = normalized.includes('-') ||
      (normalized.includes('(') && normalized.includes(')'));
    const numeric = Number.parseFloat(normalized.replace(/[^0-9.]/g, ''));

    if (!Number.isFinite(numeric)) return null;
    return isNegative ? -numeric : numeric;
  }

  function parseCurrencyAmount(element) {
    return element ? parseCurrencyText(element.textContent) : null;
  }

  function findGlobalUnderfunded() {
    // Category selection changes the inspector's Underfunded figure, so do not use it.
    // Instead, read each category's month-wide "more needed" amount from the budget
    // table, which remains independent of which categories are selected.
    const categoryRows = [
      ...document.querySelectorAll('.budget-table .budget-table-row.is-sub-category')
    ];

    if (!categoryRows.length) return null;

    let total = 0;

    for (const row of categoryRows) {
      let amount = null;

      // Preferred source: the same "X more needed" text YNAB shows beside a target.
      const goalStatus = row.querySelector('.budget-table-cell-goal-status');
      const goalStatusText = goalStatus?.textContent?.trim() || '';
      const highlightedAmount = goalStatus?.querySelector('.highlighted-message-part');

      if (highlightedAmount && /\bmore needed\b/i.test(goalStatusText)) {
        amount = parseCurrencyText(highlightedAmount.textContent);
      }

      // Fallback for target types whose status wording/markup differs.
      if (amount === null) {
        const availableButton = row.querySelector(
          '.budget-table-cell-available .ynab-new-budget-available-number'
        );
        const title = availableButton?.getAttribute('title') || '';
        const match = title.match(/\bAssign\s+([^\s]+)\s+more\b/i);

        if (match) {
          amount = parseCurrencyText(match[1]);
        }
      }

      if (amount !== null && amount > 0) {
        total += amount;
      }
    }

    return total;
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

  function makeUpdateButton() {
    const link = document.createElement('a');
    link.className = UPDATE_BUTTON_CLASS;
    link.href = SCRIPT_URL;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = '✔️ 4 updates';
    link.style.display = 'inline-flex';
    link.style.alignItems = 'center';
    link.style.justifyContent = 'center';
    link.style.marginLeft = 'auto';
    link.style.height = '1.5rem';
    link.style.boxSizing = 'border-box';
    link.style.padding = '0 0.5rem';
    link.style.border = '1px solid currentColor';
    link.style.borderRadius = '0.375rem';
    link.style.whiteSpace = 'nowrap';
    link.style.textDecoration = 'none';
    link.style.fontWeight = '600';
    link.style.fontSize = '0.8125rem';
    link.style.lineHeight = '1';
    link.style.cursor = 'pointer';

    // Refresh the URL at the moment of the real user click so GitHub/raw caches
    // cannot hand Tampermonkey an older copy of the script.
    link.addEventListener('pointerdown', () => {
      link.href = `${SCRIPT_URL}?ynabbit-update=${Date.now()}`;
    });

    link.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        link.href = `${SCRIPT_URL}?ynabbit-update=${Date.now()}`;
      }
    });

    return link;
  }

  function styleCard(card) {
    card.style.overflow = 'hidden';
    card.style.marginTop = '1rem';

    const body = card.querySelector('.card-body');
    if (body) {
      body.style.padding = '0';
    }

    const titleRow = card.querySelector(`.${CARD_TITLE_ROW_CLASS}`);
    if (titleRow) {
      titleRow.style.display = 'flex';
      titleRow.style.alignItems = 'center';
      titleRow.style.justifyContent = 'space-between';
      titleRow.style.gap = '1rem';
      titleRow.style.padding = '1.25rem 1.5rem';
      titleRow.style.borderBottom = '1px solid color-mix(in srgb, currentColor 12%, transparent)';
    }

    const heading = card.querySelector('h2');
    if (heading) {
      heading.style.margin = '0';
      heading.style.padding = '0';
      heading.style.fontSize = '1rem';
      heading.style.lineHeight = '1.5rem';
      heading.style.fontWeight = '700';
    }

    const breakdown = card.querySelector(`.${CARD_BREAKDOWN_CLASS}`);
    if (breakdown) {
      breakdown.style.padding = '1rem 1.5rem 1.25rem';
      breakdown.style.margin = '0';
    }
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

      const titleRow = document.createElement('div');
      titleRow.className = CARD_TITLE_ROW_CLASS;

      const heading = document.createElement('h2');
      heading.textContent = `YNABBIT v${VERSION}`;

      titleRow.append(heading, makeUpdateButton());

      const breakdown = document.createElement('div');
      breakdown.className = `ynab-breakdown ${CARD_BREAKDOWN_CLASS}`;

      body.append(titleRow, breakdown);
      card.appendChild(body);
      console.info(`[YNABBIT] Added version card for v${VERSION}`);
    } else {
      const heading = card.querySelector('h2');
      if (heading && heading.textContent !== `YNABBIT v${VERSION}`) {
        heading.textContent = `YNABBIT v${VERSION}`;
      }

      let titleRow = card.querySelector(`.${CARD_TITLE_ROW_CLASS}`);
      if (!titleRow) {
        titleRow = document.createElement('div');
        titleRow.className = CARD_TITLE_ROW_CLASS;
        const body = card.querySelector('.card-body');
        if (heading && body) {
          body.insertBefore(titleRow, body.firstChild);
          titleRow.appendChild(heading);
        }
      }

      const oldButton = card.querySelector(`.${UPDATE_BUTTON_CLASS}`);
      if (oldButton && oldButton.parentElement !== titleRow) {
        oldButton.remove();
      }

      if (titleRow && !titleRow.querySelector(`.${UPDATE_BUTTON_CLASS}`)) {
        titleRow.appendChild(makeUpdateButton());
      }
    }

    styleCard(card);

    if (lastNativeCard.nextElementSibling !== card) {
      lastNativeCard.insertAdjacentElement('afterend', card);
    }

    return card;
  }

  function syncStillNeededRow() {
    const card = document.querySelector(`.${VERSION_CARD_CLASS}`);
    const breakdown = card?.querySelector(`.${CARD_BREAKDOWN_CLASS}`);
    if (!breakdown) return;

    const underfunded = findGlobalUnderfunded();
    const readyToAssignAmount = findReadyToAssignAmount();
    const readyToAssign = parseCurrencyAmount(readyToAssignAmount);

    if (underfunded === null || !readyToAssignAmount || readyToAssign === null) return;

    // Ready to Assign is money already available to cover the plan, so it reduces
    // how much additional money is still needed. "Still needed" cannot be negative.
    const stillNeeded = Math.max(0, underfunded - readyToAssign);
    const renderedAmount = makeNativeAmount(readyToAssignAmount, stillNeeded);

    let row = breakdown.querySelector(`.${ROW_CLASS}`);

    if (!row) {
      row = document.createElement('div');
      row.className = ROW_CLASS;
      row.style.display = 'grid';
      row.style.gridTemplateColumns = 'minmax(0, 1fr) auto';
      row.style.alignItems = 'center';
      row.style.gap = '1rem';
      row.style.padding = '0';
      row.style.margin = '0';

      const labelHost = document.createElement('div');
      labelHost.textContent = LABEL;
      labelHost.style.minWidth = '0';

      const valueHost = document.createElement('div');
      valueHost.style.textAlign = 'right';
      valueHost.replaceChildren(renderedAmount);

      row.append(labelHost, valueHost);
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
    attributeFilter: ['class', 'aria-hidden', 'title']
  });

  window.addEventListener('popstate', scheduleSync);
  scheduleSync();
})();
