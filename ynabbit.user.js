// ==UserScript==
// @name         YNABBIT
// @namespace    https://github.com/n8bar/YNABBIT
// @version      0.1.0
// @description  Small, auditable enhancements for the YNAB web app.
// @author       Nate Barlow
// @license      MIT
// @match        https://app.ynab.com/*
// @connect      api.ynab.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/n8bar/YNABBIT/main/ynabbit.user.js
// @downloadURL  https://raw.githubusercontent.com/n8bar/YNABBIT/main/ynabbit.user.js
// ==/UserScript==

(() => {
  'use strict';

  const TOKEN_KEY = 'ynabPersonalAccessToken';
  const ROW_ID = 'ynabbit-still-needed-row';
  const API_ROOT = 'https://api.ynab.com/v1';

  GM_registerMenuCommand('Set YNAB Personal Access Token', () => {
    const existing = GM_getValue(TOKEN_KEY, '');
    const token = window.prompt(
      'Paste your YNAB Personal Access Token. It will be stored locally by Tampermonkey and sent only to api.ynab.com.',
      existing
    );

    if (token !== null) {
      const trimmed = token.trim();
      if (trimmed) GM_setValue(TOKEN_KEY, trimmed);
      else GM_deleteValue(TOKEN_KEY);
      refresh();
    }
  });

  GM_registerMenuCommand('Clear YNAB Personal Access Token', () => {
    GM_deleteValue(TOKEN_KEY);
    document.getElementById(ROW_ID)?.remove();
  });

  function parseBudgetAndMonth() {
    // Typical YNAB URLs include the budget/plan UUID and a YYYYMM month segment.
    // Examples seen in the web app have varied over time, so keep the parser loose.
    const path = window.location.pathname;

    const uuid = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0];
    const monthCompact = path.match(/(?:^|\/)(20\d{2})(0[1-9]|1[0-2])(?:\/|$)/);
    const monthDashed = path.match(/(?:^|\/)(20\d{2})-(0[1-9]|1[0-2])(?:\/|$)/);

    let month;
    if (monthCompact) month = `${monthCompact[1]}-${monthCompact[2]}-01`;
    else if (monthDashed) month = `${monthDashed[1]}-${monthDashed[2]}-01`;
    else {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }

    return { budgetId: uuid, month };
  }

  function apiGet(path) {
    const token = GM_getValue(TOKEN_KEY, '');
    if (!token) return Promise.reject(new Error('No YNAB Personal Access Token configured.'));

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `${API_ROOT}${path}`,
        headers: { Authorization: `Bearer ${token}` },
        onload: response => {
          try {
            const body = JSON.parse(response.responseText || '{}');
            if (response.status >= 200 && response.status < 300) resolve(body);
            else reject(new Error(body?.error?.detail || `YNAB API returned ${response.status}.`));
          } catch (error) {
            reject(error);
          }
        },
        onerror: () => reject(new Error('Could not reach the YNAB API.'))
      });
    });
  }

  function findSummaryCard() {
    const summaryText = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,div,span,p')]
      .find(el => el.textContent?.trim() === 'Summary');

    if (!summaryText) return null;

    let node = summaryText;
    for (let i = 0; i < 8 && node; i += 1, node = node.parentElement) {
      const text = node.textContent || '';
      if (text.includes('Summary') && (text.includes('Left Over from Last Month') || text.includes('Assigned in'))) {
        return node;
      }
    }

    return summaryText.parentElement;
  }

  function formatMilliunits(value) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(value / 1000);
  }

  function renderStillNeeded(milliunits) {
    const card = findSummaryCard();
    if (!card) return false;

    let row = document.getElementById(ROW_ID);
    if (!row) {
      row = document.createElement('div');
      row.id = ROW_ID;
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.gap = '1rem';
      row.style.padding = '0.35rem 0';
      row.style.fontSize = '0.95em';
      row.style.fontWeight = '600';
      row.style.borderTop = '1px solid color-mix(in srgb, currentColor 18%, transparent)';
      row.style.marginTop = '0.35rem';

      const label = document.createElement('span');
      label.textContent = 'Still Needed to Fund Plan';

      const value = document.createElement('span');
      value.dataset.ynabbitValue = 'true';

      row.append(label, value);
      card.appendChild(row);
    }

    row.querySelector('[data-ynabbit-value]').textContent = formatMilliunits(milliunits);
    return true;
  }

  async function refresh() {
    const token = GM_getValue(TOKEN_KEY, '');
    if (!token) return;

    const { budgetId, month } = parseBudgetAndMonth();
    if (!budgetId) return;

    try {
      const response = await apiGet(`/budgets/${encodeURIComponent(budgetId)}/months/${encodeURIComponent(month)}`);
      const categories = response?.data?.month?.categories || [];
      const stillNeeded = categories
        .filter(category => !category.deleted && !category.hidden)
        .reduce((sum, category) => sum + Math.max(0, Number(category.goal_under_funded) || 0), 0);

      renderStillNeeded(stillNeeded);
    } catch (error) {
      console.warn('[YNABBIT]', error);
    }
  }

  let lastLocation = window.location.href;
  let refreshTimer;

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 400);
  }

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastLocation) {
      lastLocation = window.location.href;
      document.getElementById(ROW_ID)?.remove();
    }
    scheduleRefresh();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  scheduleRefresh();
})();
